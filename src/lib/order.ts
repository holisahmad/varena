import prisma from './prisma';
import { calculateOrderCommissions } from './commission';
import { postLedgerTransaction } from './ledger';
import { withTransactionRetry } from './security';
import { dispatchWaMessage, templateOrderInvoice, templateOrderShipped } from './whatsapp';

export interface CheckoutItem {
  variantId: string;
  quantity: number;
}

export interface CheckoutPayload {
  buyerName: string;
  buyerPhone: string;
  buyerEmail?: string;
  shippingAddress: string;
  referralCode?: string;
  buyerUserId?: string;
  items: CheckoutItem[];
}

/**
 * Create Order with verified referral attribution and price snapshots
 */
export async function createOrder(payload: CheckoutPayload) {
  const { buyerName, buyerPhone, buyerEmail, shippingAddress, referralCode, buyerUserId, items } = payload;

  if (!items || items.length === 0) {
    throw new Error('Order must contain at least 1 item.');
  }

  // 1. Resolve Referral Member if provided
  let referralMemberId: string | null = null;
  if (referralCode) {
    const member = await prisma.member.findUnique({
      where: { memberCode: referralCode.trim() },
    });
    if (member && member.memberStatus === 'ACTIVE') {
      referralMemberId = member.id;
    }
  }

  // 2. Fetch variants & calculate totals with server-side price authority
  const variantIds = items.map((i) => i.variantId);
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds }, status: 'ACTIVE' },
  });

  if (variants.length !== items.length) {
    throw new Error('One or more selected products are invalid or inactive.');
  }

  const variantMap = new Map(variants.map((v) => [v.id, v]));
  let subtotal = 0;
  let hasFirstPack = false;

  const orderItemsData = items.map((item) => {
    const v = variantMap.get(item.variantId)!;
    if (v.stockQuantity < item.quantity) {
      throw new Error(`Insufficient stock for ${v.name}. Available: ${v.stockQuantity}`);
    }
    const lineTotal = v.price * item.quantity;
    subtotal += lineTotal;
    if (v.packSize >= 10) {
      hasFirstPack = true;
    }

    return {
      productVariantId: v.id,
      skuSnapshot: v.sku,
      nameSnapshot: v.name,
      unitPrice: v.price,
      hppSnapshot: v.hpp,
      quantity: item.quantity,
      lineTotal,
    };
  });

  const orderNumber = `VRN-${Date.now().toString().slice(-8)}-${Math.floor(100 + Math.random() * 900)}`;

  // 3. Persist Order in transaction
  return withTransactionRetry(async (tx) => {
    const order = await tx.order.create({
      data: {
        orderNumber,
        buyerUserId: buyerUserId || null,
        buyerName,
        buyerPhone,
        buyerEmail: buyerEmail || null,
        shippingAddress,
        referralMemberId,
        orderStatus: 'PENDING_PAYMENT',
        orderType: hasFirstPack ? 'FIRST_PACK' : 'REPEAT_PURCHASE',
        subtotal,
        discount: 0,
        shippingCost: 0,
        total: subtotal,
      },
    });

    for (const oi of orderItemsData) {
      await tx.orderItem.create({
        data: {
          orderId: order.id,
          ...oi,
        },
      });

      // Deduct stock
      await tx.productVariant.update({
        where: { id: oi.productVariantId },
        data: { stockQuantity: { decrement: oi.quantity } },
      });
    }

    // Create Initial Payment Record
    await tx.payment.create({
      data: {
        orderId: order.id,
        amount: subtotal,
        status: 'PENDING',
        provider: 'SIMULATED',
      },
    });

    return order;
  }, { maxWait: 15000, timeout: 30000 });
}

/**
 * Simulate or verify successful payment and trigger downstream workflows
 */
export async function settleOrderPayment(orderId: string, providerRef = 'SIM-PAID') {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  if (order.orderStatus === 'PAID') {
    return { status: 'ALREADY_PAID', order };
  }

  // 1. Mark Order Paid
  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      orderStatus: 'PAID',
      paidAt: new Date(),
    },
  });

  await prisma.payment.updateMany({
    where: { orderId: order.id },
    data: {
      status: 'SUCCESS',
      providerReference: providerRef,
      paidAt: new Date(),
    },
  });

  // 2. Post Payment Receipt to Ledger:
  // DEBIT: Company Bank Clearing (`ACC-COMP-PAYOUT` or Bank)
  // CREDIT: Company Operations Revenue (`ACC-COMP-OPS`)
  await postLedgerTransaction({
    referenceType: 'ORDER_PAYMENT',
    referenceId: order.id,
    idempotencyKey: `LEDGER-ORDER-PAY-${order.id}`,
    memo: `Customer Payment Received for ${order.orderNumber}`,
    entries: [
      {
        accountCode: 'ACC-COMP-PAYOUT',
        direction: 'DEBIT',
        amount: order.total,
        memo: `Bank settlement for ${order.orderNumber}`,
      },
      {
        accountCode: 'ACC-COMP-OPS',
        direction: 'CREDIT',
        amount: order.total,
        memo: `Gross Sales Revenue for ${order.orderNumber}`,
      },
    ],
  });

  // 3. Trigger Deterministic Commission Calculation & Ledger Posting
  const commissionResult = await calculateOrderCommissions(order.id);

  // 4. Activate Member if this was their qualifying First Pack purchase
  if (order.orderType === 'FIRST_PACK') {
    let buyerMember = null;
    if (order.buyerUserId) {
      buyerMember = await prisma.member.findUnique({
        where: { userId: order.buyerUserId },
      });
    } else if (order.buyerEmail) {
      const u = await prisma.user.findUnique({
        where: { email: order.buyerEmail },
        include: { member: true },
      });
      buyerMember = u?.member;
    }

    if (buyerMember && !buyerMember.activatedAt) {
      await prisma.member.update({
        where: { id: buyerMember.id },
        data: {
          activatedAt: new Date(),
          memberStatus: 'ACTIVE',
        },
      });

      await prisma.auditLog.create({
        data: {
          actorUserId: null,
          action: 'MEMBER_ACTIVATED',
          entityType: 'MEMBER',
          entityId: buyerMember.id,
          beforeJson: JSON.stringify({ memberStatus: buyerMember.memberStatus, activatedAt: null }),
          afterJson: JSON.stringify({ memberStatus: 'ACTIVE', activatedAt: new Date(), qualifyingOrderId: order.id }),
          reason: `Aktivasi kemitraan otomatis setelah pembelanjaan paket perdana (${order.orderNumber})`,
        },
      });
    }
  }

  // 5. Dispatch WhatsApp notification (Async/Non-blocking)
  if (order.buyerPhone) {
    const summary = order.items?.map((it) => `${it.quantity}x ${it.nameSnapshot}`).join(', ') || 'Paket VARENA';
    dispatchWaMessage({
      recipientPhone: order.buyerPhone,
      recipientName: order.buyerName,
      templateType: 'ORDER_INVOICE',
      message: templateOrderInvoice({
        orderNumber: order.orderNumber,
        buyerName: order.buyerName,
        total: order.total,
        itemsSummary: summary,
      }),
      referenceId: order.id,
    }).catch((err) => console.error('WA Order notification error:', err));
  }

  return {
    status: 'PAYMENT_SETTLED',
    order: updatedOrder,
    commissionResult,
  };
}

/**
 * Admin action: Ship Order with Courier and Tracking Number
 */
export async function shipOrder({
  orderId,
  courierName,
  trackingNumber,
  actorUserId,
}: {
  orderId: string;
  courierName: string;
  trackingNumber: string;
  actorUserId?: string | null;
}) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new Error('Pesanan tidak ditemukan.');
  }

  if (order.orderStatus !== 'PAID' && order.orderStatus !== 'PROCESSING') {
    throw new Error(`Pesanan dengan status ${order.orderStatus} tidak dapat diproses kirim.`);
  }

  const result = await withTransactionRetry(async (tx) => {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        orderStatus: 'SHIPPED',
        courierName: courierName.trim(),
        trackingNumber: trackingNumber.trim(),
        shippedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: actorUserId || null,
        action: 'ORDER_SHIPPED',
        entityType: 'ORDER',
        entityId: order.id,
        beforeJson: JSON.stringify({ orderStatus: order.orderStatus }),
        afterJson: JSON.stringify({
          orderStatus: 'SHIPPED',
          courierName: courierName.trim(),
          trackingNumber: trackingNumber.trim(),
        }),
        reason: `Pengiriman pesanan via ${courierName} no. resi ${trackingNumber}`,
      },
    });

    return updated;
  });

  // Non-blocking WhatsApp shipping notification
  if (order.buyerPhone) {
    dispatchWaMessage({
      recipientPhone: order.buyerPhone,
      recipientName: order.buyerName,
      templateType: 'ORDER_SHIPPED',
      message: templateOrderShipped({
        orderNumber: order.orderNumber,
        buyerName: order.buyerName,
        courierName: courierName.trim(),
        trackingNumber: trackingNumber.trim(),
      }),
      referenceId: order.id,
    }).catch((err) => console.error('WA Ship notification error:', err));
  }

  return result;
}

/**
 * Admin or Consumer action: Complete Order (Delivered)
 */
export async function completeOrder({
  orderId,
  actorUserId,
}: {
  orderId: string;
  actorUserId?: string | null;
}) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new Error('Pesanan tidak ditemukan.');
  }

  if (order.orderStatus !== 'SHIPPED') {
    throw new Error(`Hanya pesanan berstatus SHIPPED yang dapat diselesaikan.`);
  }

  return withTransactionRetry(async (tx) => {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        orderStatus: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: actorUserId || null,
        action: 'ORDER_COMPLETED',
        entityType: 'ORDER',
        entityId: order.id,
        beforeJson: JSON.stringify({ orderStatus: 'SHIPPED' }),
        afterJson: JSON.stringify({ orderStatus: 'COMPLETED' }),
        reason: 'Pesanan telah diterima oleh pembeli / diverifikasi selesai.',
      },
    });

    return updated;
  });
}
