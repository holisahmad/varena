import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withTransactionRetry } from '@/lib/security';
import { recordDepositUsageLedger } from '@/lib/ledger';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const memberCodeParam = searchParams.get('memberCode');
    const userId = req.headers.get('x-user-id');
    const userEmail = req.headers.get('x-user-email');

    let member: any = null;
    if (memberCodeParam) {
      member = await prisma.member.findUnique({
        where: { memberCode: memberCodeParam },
      });
    } else if (userId || userEmail) {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            ...(userId ? [{ id: userId }] : []),
            ...(userEmail ? [{ email: userEmail }] : []),
          ],
        },
        include: { member: true },
      });
      member = user?.member;
    }

    if (!member) {
      return NextResponse.json({ error: 'Data agen tidak ditemukan.' }, { status: 404 });
    }

    const [restockOrders, assignedOrders] = await Promise.all([
      // 1. Pesanan Pasokan Grosir dari Kantor Pusat ke Agen
      prisma.order.findMany({
        where: {
          buyerUserId: member.userId,
          fulfillmentSource: 'REGIONAL_AGENT',
        },
        include: {
          items: { include: { variant: true } },
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      // 2. Pesanan Mitra/Konsumen yang Dialihkan Kantor ke Agen (Fulfillment Lokal)
      prisma.order.findMany({
        where: {
          assignedAgentMemberId: member.id,
        },
        include: {
          items: { include: { variant: true } },
          referralMember: { select: { memberCode: true, displayName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      restockOrders,
      assignedOrders,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memuat pesanan agen.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      action,
      memberCode,
      // Multi-item cart support: items = [{variantId, quantity}]
      // Legacy single-item fallback: variantId + quantity
      items: cartItems,
      quantity,
      variantId,
      paymentMethod,
      orderId,
      courierName,
      trackingNumber,
      agentNotes,
    } = body;

    const member = await prisma.member.findUnique({
      where: { memberCode },
      include: { user: true },
    });

    if (!member) {
      return NextResponse.json({ error: 'Member agen tidak ditemukan.' }, { status: 404 });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 1. ACTION: CREATE_RESTOCK (Pemesanan Pasokan Grosir Multi-Item ke Kantor Pusat)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'CREATE_RESTOCK') {
      const config = await prisma.agentConfig.findUnique({ where: { id: 'default' } }) || {
        minimumRestockBox: 10,
        defaultDiscountType: 'PERCENTAGE',
        defaultDiscountValue: 15.0,
      };

      // Normalise ke array multi-item (backward compatible dengan single-item lama)
      const rawItems: { variantId?: string; quantity: number }[] =
        Array.isArray(cartItems) && cartItems.length > 0
          ? cartItems
          : [{ variantId, quantity: parseInt(quantity, 10) || 0 }];

      // Validasi: minimal ada 1 item dengan qty > 0
      const cleanItems = rawItems.filter((it) => it.quantity > 0);
      if (cleanItems.length === 0) {
        return NextResponse.json({ error: 'Tidak ada item yang valid dalam pesanan.' }, { status: 400 });
      }

      // Ambil semua varian produk
      const allVariantIds = cleanItems.map((it) => it.variantId).filter(Boolean) as string[];
      const dbVariants = allVariantIds.length > 0
        ? await prisma.productVariant.findMany({ where: { id: { in: allVariantIds } } })
        : [];

      // Fallback jika tidak ada variantId: gunakan BOX default
      const defaultVariant =
        (await prisma.productVariant.findFirst({ where: { sku: { contains: 'BOX' } } })) ||
        (await prisma.productVariant.findFirst());

      if (!defaultVariant && dbVariants.length === 0) {
        return NextResponse.json({ error: 'Produk tidak ditemukan.' }, { status: 404 });
      }

      // Build resolved item list
      const resolvedItems: { variant: any; quantity: number }[] = [];
      for (const ci of cleanItems) {
        const variant = ci.variantId
          ? (dbVariants.find((v) => v.id === ci.variantId) || defaultVariant)
          : defaultVariant;
        if (!variant) continue;
        // Validasi minimal qty per jenis (optional: gunakan minimumRestockBox hanya untuk BOX PACK)
        resolvedItems.push({ variant, quantity: ci.quantity });
      }

      if (resolvedItems.length === 0) {
        return NextResponse.json({ error: 'Tidak ada item valid yang dapat diproses.' }, { status: 400 });
      }

      // Validasi Total Box terhadap Aturan Keagenan Kantor Pusat (MOQ)
      const totalOrderedQty = resolvedItems.reduce((s, ri) => s + ri.quantity, 0);
      const minMoq = config.minimumRestockBox || 10;
      if (totalOrderedQty < minMoq) {
        return NextResponse.json(
          {
            error: `Minimal pemesanan pasokan agen adalah ${minMoq} Box sesuai aturan keagenan kantor pusat. Pesanan Anda saat ini baru ${totalOrderedQty} Box.`,
          },
          { status: 400 }
        );
      }

      // Hitung total gross
      const discountType = member.agentDiscountType || config.defaultDiscountType;
      const discountVal = member.agentDiscountValue ?? config.defaultDiscountValue;

      let grossSubtotal = 0;
      for (const ri of resolvedItems) {
        grossSubtotal += ri.variant.price * ri.quantity;
      }

      let discountAmount = 0;
      if (discountType === 'PERCENTAGE') {
        discountAmount = Math.round((grossSubtotal * discountVal) / 100);
      } else {
        // FLAT per total qty (semua unit)
        const totalQty = resolvedItems.reduce((s, ri) => s + ri.quantity, 0);
        discountAmount = Math.round(discountVal * totalQty);
      }

      const netSubtotal = grossSubtotal - discountAmount;

      // ── Hitung Skema Pembayaran (DEPOSIT, MANUAL_TRANSFER, HYBRID) ──
      let uniqueCode = 0;
      let depositAmountUsed = 0;
      let manualTransferAmount = 0;
      let orderStatus = 'PENDING_PAYMENT';
      let paidAt: Date | null = null;

      if (paymentMethod === 'DEPOSIT') {
        if (member.agentDepositBalance < netSubtotal) {
          const deficit = netSubtotal - member.agentDepositBalance;
          return NextResponse.json(
            {
              error: `Saldo deposit agen tidak mencukupi (Tersedia: Rp${member.agentDepositBalance.toLocaleString('id-ID')}, Dibutuhkan: Rp${netSubtotal.toLocaleString('id-ID')}). Kurang Rp${deficit.toLocaleString('id-ID')}. Gunakan metode Transfer Manual atau Hybrid.`,
            },
            { status: 400 }
          );
        }
        uniqueCode = 0;
        depositAmountUsed = netSubtotal;
        manualTransferAmount = 0;
        orderStatus = 'PAID';
        paidAt = new Date();
      } else if (paymentMethod === 'HYBRID') {
        // Hybrid: Gunakan seluruh sisa deposit yang ada, sisanya ditransfer manual via bank (+ kode unik 3 digit)
        const availableDeposit = Math.max(0, member.agentDepositBalance);
        depositAmountUsed = Math.min(availableDeposit, netSubtotal);
        const remainingDebt = netSubtotal - depositAmountUsed;

        if (remainingDebt > 0) {
          uniqueCode = Math.floor(100 + Math.random() * 899);
          manualTransferAmount = remainingDebt + uniqueCode;
          orderStatus = 'PENDING_PAYMENT';
          paidAt = null;
        } else {
          uniqueCode = 0;
          manualTransferAmount = 0;
          orderStatus = 'PAID';
          paidAt = new Date();
        }
      } else {
        // MANUAL_TRANSFER: Transfer bank 100% (+ kode unik 3 digit)
        uniqueCode = Math.floor(100 + Math.random() * 899);
        depositAmountUsed = 0;
        manualTransferAmount = netSubtotal + uniqueCode;
        orderStatus = 'PENDING_PAYMENT';
        paidAt = null;
      }

      const grandTotal = depositAmountUsed + manualTransferAmount;
      const orderNumber = `AGN-RESTOCK-${Date.now().toString().slice(-6)}`;
      const itemSummary = resolvedItems.map((ri) => `${ri.quantity}x ${ri.variant.name}`).join(', ');

      const createdOrder = await withTransactionRetry(async (tx: any) => {
        // Buat Order Pasokan multi-item
        const ord = await tx.order.create({
          data: {
            orderNumber,
            buyerUserId: member.userId,
            buyerName: `${member.displayName} (Official Agent)`,
            buyerPhone: member.user.phone || '081234567890',
            buyerEmail: member.user.email,
            shippingAddress: member.agentAddress || member.addressDetail || 'Gudang Agen Resmi VARENA',
            shippingProvince: member.agentProvince || member.province || 'DKI Jakarta',
            shippingCity: member.agentCity || member.city || 'Jakarta Selatan',
            orderStatus,
            orderType: 'REPEAT_PURCHASE',
            fulfillmentSource: 'REGIONAL_AGENT',
            subtotal: grossSubtotal,
            discount: discountAmount,
            shippingCost: 0,
            shippingExpense: 50000,
            uniqueCode,
            total: grandTotal,
            paidAt,
            items: {
              create: resolvedItems.map((ri) => ({
                productVariantId: ri.variant.id,
                skuSnapshot: ri.variant.sku,
                nameSnapshot: ri.variant.name,
                quantity: ri.quantity,
                unitPrice: ri.variant.price,
                hppSnapshot: ri.variant.hpp || 250000,
                lineTotal: ri.variant.price * ri.quantity,
              })),
            },
          },
        });

        // Potong saldo deposit jika ada porsi deposit yang terpakai
        if (depositAmountUsed > 0) {
          // Atomic decrement to avoid race condition
          await tx.member.update({
            where: { id: member.id },
            data: { agentDepositBalance: { decrement: depositAmountUsed } },
          });

          await tx.agentDepositTransaction.create({
            data: {
              memberId: member.id,
              type: paymentMethod === 'HYBRID' ? 'RESTOCK_HYBRID_DEPOSIT' : 'RESTOCK_PAYMENT',
              amount: depositAmountUsed,
              balanceBefore: member.agentDepositBalance,
              balanceAfter: member.agentDepositBalance - depositAmountUsed,
              referenceId: orderNumber,
              notes: paymentMethod === 'HYBRID'
                ? `Pembayaran pasokan via Saldo Deposit (Sisa transfer manual: Rp${manualTransferAmount.toLocaleString('id-ID')})`
                : `Pembayaran penuh pasokan [${itemSummary}] via Saldo Deposit Agen`,
              status: 'COMPLETED',
            },
          });

          await tx.payment.create({
            data: {
              orderId: ord.id,
              provider: paymentMethod === 'HYBRID' ? 'HYBRID_DEPOSIT' : 'AGENT_DEPOSIT',
              providerReference: `DEP-${orderNumber}`,
              amount: depositAmountUsed,
              status: 'SUCCESS',
              paidAt: new Date(),
            },
          });

          // Post double-entry ledger journal for deposit usage
          await recordDepositUsageLedger({
            orderNumber,
            memberCode: member.memberCode,
            amount: depositAmountUsed,
            isShoppingDeposit: false,
            txClient: tx,
          });
        }

        // Catat payment record untuk porsi transfer manual jika ada
        if (manualTransferAmount > 0) {
          await tx.payment.create({
            data: {
              orderId: ord.id,
              provider: paymentMethod === 'HYBRID' ? 'HYBRID_MANUAL' : 'MANUAL_TRANSFER',
              providerReference: `INV-${orderNumber}`,
              amount: manualTransferAmount,
              status: 'PENDING',
            },
          });
        }

        return ord;
      });

      return NextResponse.json({
        success: true,
        message:
          orderStatus === 'PAID'
            ? `Pemesanan pasokan [${itemSummary}] berhasil dibayar dengan Saldo Deposit Agen. Kantor pusat akan segera memproses pengiriman.`
            : paymentMethod === 'HYBRID'
            ? `Pemesanan pasokan berhasil dibuat. Saldo deposit terpotong Rp${depositAmountUsed.toLocaleString('id-ID')}. Sisa Rp${manualTransferAmount.toLocaleString('id-ID')} silakan ditransfer manual sesuai kode unik.`
            : `Pemesanan pasokan berhasil dibuat. Silakan transfer Rp${manualTransferAmount.toLocaleString('id-ID')} sesuai kode unik.`,
        order: {
          ...createdOrder,
          depositAmountUsed,
          manualTransferAmount,
        },
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. ACTION: DISPATCH_ASSIGNED_ORDER (Agen Mengirimkan / Menyerahkan Barang ke Mitra)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'DISPATCH_ASSIGNED_ORDER') {
      if (!orderId) {
        return NextResponse.json({ error: 'ID pesanan wajib disertakan.' }, { status: 400 });
      }

      const targetOrder = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!targetOrder || targetOrder.assignedAgentMemberId !== member.id) {
        return NextResponse.json({ error: 'Pesanan yang dialihkan tidak ditemukan.' }, { status: 404 });
      }

      if (member.agentInventory < 1) {
        return NextResponse.json(
          { error: 'Stok fisik di gudang agen Anda tidak mencukupi (0 box). Segera lakukan restock ke kantor pusat.' },
          { status: 400 }
        );
      }

      const updated = await withTransactionRetry(async (tx: any) => {
        // Update Order
        const ord = await tx.order.update({
          where: { id: orderId },
          data: {
            orderStatus: 'SHIPPED',
            agentDispatchStatus: 'DISPATCHED',
            courierName: courierName || 'Kurir Lokal / Ambil di Agen',
            trackingNumber: trackingNumber || `AGENT-PICKUP-${Date.now().toString().slice(-6)}`,
            shippedAt: new Date(),
            agentNote: agentNotes || 'Barang telah diserahkan/dikirim oleh Agen Resmi',
          },
        });

        // Kurangi stok fisik agen & catat mutasi stok
        const newStock = Math.max(0, member.agentInventory - 1);
        await tx.member.update({
          where: { id: member.id },
          data: { agentInventory: newStock },
        });

        await tx.agentStockMutation.create({
          data: {
            memberId: member.id,
            type: 'DISPATCHED_TO_MEMBER',
            quantity: -1,
            balanceBefore: member.agentInventory,
            balanceAfter: newStock,
            referenceId: targetOrder.orderNumber,
            notes: `Distribusi pesanan ${targetOrder.orderNumber} kepada ${targetOrder.buyerName}`,
          },
        });

        return ord;
      });

      return NextResponse.json({
        success: true,
        message: `Pesanan ${targetOrder.orderNumber} berhasil diperbarui menjadi TERKIRIM. Stok agen tersisa ${member.agentInventory - 1} box.`,
        order: updated,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. ACTION: CONFIRM_RECEIPT (Agen Mengonfirmasi Penerimaan Pasokan dari Pusat)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'CONFIRM_RECEIPT') {
      if (!orderId) {
        return NextResponse.json({ error: 'ID pesanan wajib disertakan.' }, { status: 400 });
      }

      const targetOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: { include: { variant: true } } },
      });

      if (!targetOrder || targetOrder.buyerUserId !== member.userId) {
        return NextResponse.json({ error: 'Pesanan pasokan tidak ditemukan.' }, { status: 404 });
      }

      if (targetOrder.orderStatus !== 'SHIPPED') {
        return NextResponse.json(
          { error: 'Hanya pesanan berstatus PENGIRIMAN (SHIPPED) yang dapat dikonfirmasi penerimaannya.' },
          { status: 400 }
        );
      }

      const totalItemsCount = targetOrder.items.reduce((s, it) => s + it.quantity, 0);

      const updated = await withTransactionRetry(async (tx: any) => {
        const ord = await tx.order.update({
          where: { id: orderId },
          data: {
            orderStatus: 'COMPLETED',
            completedAt: new Date(),
          },
        });

        // Tambah stok fisik agen
        const newStock = member.agentInventory + totalItemsCount;
        await tx.member.update({
          where: { id: member.id },
          data: { agentInventory: newStock },
        });

        await tx.agentStockMutation.create({
          data: {
            memberId: member.id,
            type: 'RESTOCK_FROM_CENTRAL',
            quantity: totalItemsCount,
            balanceBefore: member.agentInventory,
            balanceAfter: newStock,
            referenceId: targetOrder.orderNumber,
            notes: `Penerimaan ${totalItemsCount} item pasokan resmi dari kantor pusat (${targetOrder.orderNumber})`,
          },
        });

        return ord;
      });

      return NextResponse.json({
        success: true,
        message: `Penerimaan barang berhasil dikonfirmasi! Stok fisik gudang agen bertambah +${totalItemsCount} unit.`,
        order: updated,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. ACTION: SIMULATE_PAYMENT (Simulasi Pembayaran Manual/Hybrid Restock Agen)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'SIMULATE_PAYMENT') {
      if (!orderId) {
        return NextResponse.json({ error: 'ID pesanan wajib disertakan.' }, { status: 400 });
      }

      const targetOrder = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!targetOrder || targetOrder.buyerUserId !== member.userId) {
        return NextResponse.json({ error: 'Pesanan pasokan tidak ditemukan.' }, { status: 404 });
      }

      const updated = await withTransactionRetry(async (tx: any) => {
        const ord = await tx.order.update({
          where: { id: orderId },
          data: {
            orderStatus: 'PAID',
            paidAt: new Date(),
          },
        });

        await tx.payment.updateMany({
          where: { orderId: orderId, status: 'PENDING' },
          data: { status: 'SUCCESS', paidAt: new Date() },
        });

        return ord;
      });

      return NextResponse.json({
        success: true,
        message: 'Pembayaran transfer berhasil diverifikasi dan pesanan telah lunas.',
        order: updated,
      });
    }

    return NextResponse.json({ error: 'Aksi agen tidak dikenali.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memproses pesanan agen.' }, { status: 500 });
  }
}
