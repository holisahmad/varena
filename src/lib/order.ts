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
  shippingCost?: number; // Biaya kirim yang dibebankan ke pembeli (jika member biasa)
  shippingExpense?: number; // Biaya kirim yang ditanggung kantor (jika pasokan stokis)
  isStockistOrder?: boolean; // True jika pesanan stokis (bebas ongkir bagi stokis, ditanggung kantor)
  stockistMemberId?: string;
  fulfillmentSource?: string;
  // Alamat Pengiriman Terstruktur
  recipientName?: string;
  recipientPhone?: string;
  addressDetail?: string;
  shippingProvince?: string;
  shippingCity?: string;
  shippingDistrict?: string;
  shippingPostalCode?: string;
  shippingNotes?: string;
  uniqueCode?: number; // Kode unik 3 digit otomatis (100 - 999)
  saveToProfile?: boolean; // Default true: simpan alamat ini ke profil mitra
  paymentMethod?: 'TRANSFER' | 'DEPOSIT'; // Metode pembayaran: transfer manual atau potong saldo deposit
}

/**
 * Create Order with verified referral attribution, shipping policy, unique code, and price snapshots
 */
export async function createOrder(payload: CheckoutPayload) {
  const {
    buyerName,
    buyerPhone,
    buyerEmail,
    shippingAddress,
    referralCode,
    buyerUserId,
    items,
    shippingCost: customShippingCost,
    shippingExpense: customShippingExpense,
    isStockistOrder,
    stockistMemberId,
    fulfillmentSource,
    shippingProvince,
    shippingCity,
    shippingDistrict,
    shippingPostalCode,
    shippingNotes,
    uniqueCode: customUniqueCode,
    recipientName: customRecipientName,
    recipientPhone: customRecipientPhone,
    addressDetail: customAddressDetail,
    saveToProfile,
    paymentMethod = 'TRANSFER',
  } = payload;

  if (!items || items.length === 0) {
    throw new Error('Order must contain at least 1 item.');
  }

  // Check if buyer is a registered regional stockist
  let isStockist = Boolean(isStockistOrder);
  let resolvedStockistId = stockistMemberId || null;
  let buyerMember: any = null;

  if (buyerUserId) {
    buyerMember = await prisma.member.findUnique({
      where: { userId: buyerUserId },
    });
    if (buyerMember && (buyerMember.stockistType === 'MASTER' || buyerMember.stockistType === 'MOBILE')) {
      isStockist = true;
      resolvedStockistId = buyerMember.id;
    }
  } else if (buyerEmail) {
    const u = await prisma.user.findUnique({
      where: { email: buyerEmail },
      include: { member: true },
    });
    buyerMember = u?.member || null;
  }

  // 1. Resolve Referral Member if provided
  let referralMemberId: string | null = null;
  if (referralCode) {
    const member = await prisma.member.findUnique({
      where: { memberCode: referralCode.trim() },
    });
    // Cegah self-referral: pesanan pribadi member bukan merupakan penjualan dari referral dirinya sendiri
    if (member && member.memberStatus === 'ACTIVE') {
      const isSelfReferral = buyerMember && buyerMember.id === member.id;
      if (!isSelfReferral) {
        referralMemberId = member.id;
      }
    }
  }

  // Jika pembeli adalah member terdaftar dan belum ada referralMemberId (misal referralCode kosong atau mencoba self-referral),
  // otomatis kaitkan ke Upline Sponsor langsungnya di jaringan
  if (!referralMemberId && buyerMember) {
    const sponsorRel = await prisma.sponsorRelationship.findUnique({
      where: { memberId: buyerMember.id },
      include: { sponsor: true },
    });
    if (sponsorRel?.sponsor && sponsorRel.sponsor.memberStatus === 'ACTIVE') {
      referralMemberId = sponsorRel.sponsor.id;
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
    if (v.allowFirstPack || v.packSize >= 10 || (v.price >= 500000 && v.variantType === 'PACK')) {
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

  // Shipping cost policy:
  // - If stockist order: shipping is FREE for stockist (shippingCost = 0), borne by corporate office as operational expense (shippingExpense = Rp35.000 or custom)
  // - If regular member/customer order: member is charged shipping cost (default Rp20.000), office does not absorb as special stockist expense (shippingExpense = 0)
  const shippingCost = isStockist
    ? 0
    : customShippingCost !== undefined
    ? customShippingCost
    : 20000;

  const shippingExpense = isStockist
    ? customShippingExpense !== undefined
      ? customShippingExpense
      : 35000
    : 0;

  // Kode unik 3 digit acak (100 - 999) untuk rekonsiliasi transfer bank otomatis
  const uniqueCode = customUniqueCode !== undefined
    ? customUniqueCode
    : Math.floor(100 + Math.random() * 900);

  const total = subtotal + shippingCost + uniqueCode;
  const orderNumber = `VRN-${Date.now().toString().slice(-8)}-${Math.floor(100 + Math.random() * 900)}`;

  // 3. Persist Order in transaction
  const isAlreadyActiveMember = Boolean(buyerMember && buyerMember.memberStatus === 'ACTIVE');
  const resolvedOrderType = hasFirstPack && !isAlreadyActiveMember ? 'FIRST_PACK' : 'REPEAT_PURCHASE';
  const useDeposit = paymentMethod === 'DEPOSIT';

  // Jika metode deposit, validasi saldo sebelum masuk transaksi
  if (useDeposit) {
    if (!buyerMember) {
      throw new Error('Pembayaran saldo deposit hanya tersedia untuk mitra yang terdaftar dan login.');
    }
    const depositBalance = buyerMember.shoppingDepositBalance || 0;
    // Untuk deposit, tidak ada kode unik (uniqueCode = 0)
    const depositTotal = subtotal + shippingCost;
    if (depositBalance < depositTotal) {
      throw new Error(
        `Saldo deposit belanja tidak cukup. Saldo Anda: Rp${depositBalance.toLocaleString('id-ID')}, diperlukan: Rp${depositTotal.toLocaleString('id-ID')}.`
      );
    }
  }

  const createdOrder = await withTransactionRetry(async (tx) => {
    // Jika metode deposit: hitung total tanpa kode unik
    const depositTotal = useDeposit ? subtotal + shippingCost : 0;
    const finalTotal = useDeposit ? depositTotal : total;
    const finalUniqueCode = useDeposit ? 0 : uniqueCode;

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
        orderType: resolvedOrderType,
        subtotal,
        discount: 0,
        shippingCost,
        shippingExpense,
        uniqueCode: finalUniqueCode,
        total: finalTotal,
        fulfillmentSource: isStockist ? 'REGIONAL_STOCKIST' : (fulfillmentSource || 'CENTRAL_WAREHOUSE'),
        stockistMemberId: resolvedStockistId,
        shippingProvince: shippingProvince || null,
        shippingCity: shippingCity || null,
        shippingDistrict: shippingDistrict || null,
        shippingPostalCode: shippingPostalCode || null,
        shippingNotes: shippingNotes || null,
      },
    });

    // Save / update default shipping address on member record if logged in (or resolved from email)
    const targetUserId = buyerUserId || (buyerMember ? buyerMember.userId : null);
    const shouldSaveToProfile = saveToProfile !== false;
    if (targetUserId && shouldSaveToProfile) {
      await tx.member.updateMany({
        where: { userId: targetUserId },
        data: {
          recipientName: customRecipientName || buyerName,
          recipientPhone: customRecipientPhone || buyerPhone,
          province: shippingProvince || null,
          city: shippingCity || null,
          district: shippingDistrict || null,
          postalCode: shippingPostalCode || null,
          addressDetail: customAddressDetail || shippingAddress,
        },
      });
    }

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

    // Create Initial Payment Record with exact total (including uniqueCode)
    await tx.payment.create({
      data: {
        orderId: order.id,
        amount: finalTotal,
        status: 'PENDING',
        provider: useDeposit ? 'SHOPPING_DEPOSIT' : 'SIMULATED',
        providerReference: useDeposit ? `DEPOSIT-${order.orderNumber}` : null,
      },
    });

    // Jika deposit: potong saldo shoppingDepositBalance member secara atomik
    if (useDeposit && buyerMember) {
      await tx.member.update({
        where: { id: buyerMember.id },
        data: { shoppingDepositBalance: { decrement: depositTotal } },
      });

      // Catat mutasi saldo di ledger deposit
      await tx.agentDepositTransaction.create({
        data: {
          memberId: buyerMember.id,
          type: 'SHOPPING_PAYMENT',
          amount: depositTotal,
          balanceBefore: buyerMember.shoppingDepositBalance || 0,
          balanceAfter: (buyerMember.shoppingDepositBalance || 0) - depositTotal,
          status: 'COMPLETED',
          referenceId: order.orderNumber,
          notes: `Pembayaran pesanan ${order.orderNumber} via saldo deposit belanja`,
        },
      });
    }

    return { ...order, paidViaDeposit: useDeposit, total: finalTotal, uniqueCode: finalUniqueCode };
  }, { maxWait: 15000, timeout: 30000 });

  // Jika pembayaran via saldo deposit, langsung jalankan settlement (ledger, komisi jaringan, aktivasi member, notifikasi WA)
  if (useDeposit) {
    try {
      await settleOrderPayment(createdOrder.id, `DEPOSIT-${createdOrder.orderNumber}`);
      createdOrder.orderStatus = 'PAID';
    } catch (settleErr) {
      console.error('Failed to auto-settle deposit order:', settleErr);
    }
  }

  return createdOrder;
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

  // 2. Post Payment Receipt to Double-Entry Ledger:
  // Jika bayar via Saldo Deposit:
  // DEBIT: ACC-LIAB-DEPOSIT-SHOPPING (Kewajiban saldo deposit berkurang)
  // Jika bayar via Bank Transfer:
  // DEBIT: Company Bank Clearing (`ACC-COMP-PAYOUT`) for total cash received
  // CREDIT: Company Operations Revenue (`ACC-COMP-OPS`) for product subtotal
  // CREDIT: Company Shipping Fee Inflow (`ACC-COMP-OPS`) for member shipping cost (if any)
  const isDepositSettlement = providerRef.startsWith('DEPOSIT-');
  const cashOrDepositAccount = isDepositSettlement ? 'ACC-LIAB-DEPOSIT-SHOPPING' : 'ACC-COMP-PAYOUT';

  const ledgerEntries: Array<{
    accountCode: string;
    direction: 'DEBIT' | 'CREDIT';
    amount: number;
    memo: string;
  }> = [
    {
      accountCode: cashOrDepositAccount,
      direction: 'DEBIT',
      amount: order.total,
      memo: isDepositSettlement
        ? `Pemotongan saldo deposit belanja untuk pesanan ${order.orderNumber}`
        : `Bank settlement received for ${order.orderNumber}`,
    },
    {
      accountCode: 'ACC-COMP-OPS',
      direction: 'CREDIT',
      amount: order.subtotal,
      memo: `Gross Product Sales Revenue for ${order.orderNumber}`,
    },
  ];

  if (order.shippingCost > 0) {
    ledgerEntries.push({
      accountCode: 'ACC-COMP-OPS',
      direction: 'CREDIT',
      amount: order.shippingCost,
      memo: `Shipping fee collected from member for ${order.orderNumber}`,
    });
  }

  // Credit unique bank confirmation code as member deposit/inflow
  if (order.uniqueCode > 0) {
    ledgerEntries.push({
      accountCode: 'ACC-COMP-OPS',
      direction: 'CREDIT',
      amount: order.uniqueCode,
      memo: `Bank confirmation unique code inflow from ${order.orderNumber}`,
    });
  }

  // If this order is a stockist supply order where shipping is absorbed by company:
  // Post company operational freight expense:
  // DEBIT ACC-COMP-OPS (Freight Operating Expense)
  // CREDIT ACC-COMP-PAYOUT (Freight Cash Outflow to Courier)
  if (order.shippingExpense > 0) {
    ledgerEntries.push({
      accountCode: 'ACC-COMP-OPS',
      direction: 'DEBIT',
      amount: order.shippingExpense,
      memo: `Company freight operational expense for stockist hub delivery ${order.orderNumber}`,
    });
    ledgerEntries.push({
      accountCode: 'ACC-COMP-PAYOUT',
      direction: 'CREDIT',
      amount: order.shippingExpense,
      memo: `Freight payment to courier for stockist delivery ${order.orderNumber}`,
    });
  }

  await postLedgerTransaction({
    referenceType: 'ORDER_PAYMENT',
    referenceId: order.id,
    idempotencyKey: `LEDGER-ORDER-PAY-${order.id}`,
    memo: `Payment Settlement & Ledger Posting for ${order.orderNumber}`,
    entries: ledgerEntries,
  });

  // Credit uniqueCode directly to Member's uniqueCodeBalance so it never expires/disappears
  if (order.uniqueCode > 0) {
    let targetMember = null;
    if (order.buyerUserId) {
      targetMember = await prisma.member.findUnique({
        where: { userId: order.buyerUserId },
      });
    } else if (order.buyerEmail) {
      const u = await prisma.user.findUnique({
        where: { email: order.buyerEmail },
        include: { member: true },
      });
      targetMember = u?.member;
    } else if (order.referralMemberId) {
      targetMember = await prisma.member.findUnique({
        where: { id: order.referralMemberId },
      });
    }

    if (targetMember) {
      await prisma.member.update({
        where: { id: targetMember.id },
        data: {
          uniqueCodeBalance: { increment: order.uniqueCode },
        },
      });
    }
  }

  // If order was manually confirmed via proof upload, mark verified
  if (order.paymentConfirmationStatus === 'SUBMITTED') {
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentConfirmationStatus: 'VERIFIED' },
    });
  }

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
  warehouseOriginName,
  warehouseOriginCity,
  actorUserId,
}: {
  orderId: string;
  courierName: string;
  trackingNumber: string;
  warehouseOriginName?: string;
  warehouseOriginCity?: string;
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
        warehouseOriginName: warehouseOriginName || 'Gudang Pusat VARENA',
        warehouseOriginCity: warehouseOriginCity || 'Jakarta',
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
          warehouseOriginName: warehouseOriginName || 'Gudang Pusat VARENA',
          warehouseOriginCity: warehouseOriginCity || 'Jakarta',
        }),
        reason: `Pengiriman pesanan via ${courierName} no. resi ${trackingNumber} dari ${warehouseOriginName || 'Gudang Pusat VARENA'}`,
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
    include: { items: true },
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

    // Sinkronisasi otomatis stok fisik agen jika pesanan ini adalah pasokan restock grosir agen
    const isRestockOrder = order.orderNumber.startsWith('AGN-RESTOCK') || order.fulfillmentSource === 'REGIONAL_AGENT';
    if (isRestockOrder && order.buyerUserId) {
      const buyerMember = await tx.member.findFirst({
        where: { userId: order.buyerUserId },
      });

      if (buyerMember && (buyerMember.isAgent || ['REGIONAL_AGENT', 'MASTER_AGENT'].includes(buyerMember.agentType))) {
        const existingMutation = await tx.agentStockMutation.findFirst({
          where: {
            memberId: buyerMember.id,
            referenceId: order.orderNumber,
          },
        });

        if (!existingMutation) {
          const totalItemsCount = (order.items || []).reduce((s, it) => s + it.quantity, 0);
          const newStock = buyerMember.agentInventory + totalItemsCount;

          await tx.member.update({
            where: { id: buyerMember.id },
            data: { agentInventory: newStock },
          });

          await tx.agentStockMutation.create({
            data: {
              memberId: buyerMember.id,
              type: 'RESTOCK_FROM_CENTRAL',
              quantity: totalItemsCount,
              balanceBefore: buyerMember.agentInventory,
              balanceAfter: newStock,
              referenceId: order.orderNumber,
              notes: `Penerimaan ${totalItemsCount} item pasokan dari pusat (${order.orderNumber}) diverifikasi selesai oleh kantor`,
            },
          });
        }
      }
    }

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

/**
 * Cancel an unpaid order that has passed the 24-hour expiration window or is cancelled by timeout
 * Restores product variant inventory stock and cancels pending payment records
 */
export async function cancelExpiredOrder(orderIdOrNumber: string, reason?: string) {
  const order = await prisma.order.findFirst({
    where: {
      OR: [{ id: orderIdOrNumber }, { orderNumber: orderIdOrNumber }],
    },
    include: { items: true, payments: true },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  if (order.orderStatus !== 'PENDING_PAYMENT') {
    return { status: 'NOT_PENDING', order };
  }

  // If already confirmed by buyer, do not auto-cancel without admin review
  if (order.paymentConfirmationStatus === 'SUBMITTED') {
    return { status: 'AWAITING_VERIFICATION', order };
  }

  return withTransactionRetry(async (tx) => {
    // 1. Update order status to CANCELLED
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        orderStatus: 'CANCELLED',
      },
    });

    // 2. Restore inventory stock
    for (const item of order.items) {
      await tx.productVariant.update({
        where: { id: item.productVariantId },
        data: { stockQuantity: { increment: item.quantity } },
      });
    }

    // 3. Mark pending payments as CANCELLED
    await tx.payment.updateMany({
      where: { orderId: order.id, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });

    // 4. Audit Log
    await tx.auditLog.create({
      data: {
        action: 'ORDER_EXPIRED_CANCELLED',
        entityType: 'ORDER',
        entityId: order.id,
        beforeJson: JSON.stringify({ orderStatus: 'PENDING_PAYMENT' }),
        afterJson: JSON.stringify({ orderStatus: 'CANCELLED' }),
        reason:
          reason ||
          'Pesanan dibatalkan otomatis oleh sistem karena melewati batas waktu pembayaran 24 jam tanpa konfirmasi.',
      },
    });

    return { status: 'CANCELLED', order: updated };
  });
}
