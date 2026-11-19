import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withTransactionRetry } from '@/lib/security';

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
    const { action, memberCode, quantity, variantId, paymentMethod, orderId, courierName, trackingNumber, agentNotes } = body;

    const member = await prisma.member.findUnique({
      where: { memberCode },
      include: { user: true },
    });

    if (!member) {
      return NextResponse.json({ error: 'Member agen tidak ditemukan.' }, { status: 404 });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 1. ACTION: CREATE_RESTOCK (Pemesanan Pasokan Grosir ke Kantor Pusat)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'CREATE_RESTOCK') {
      const config = await prisma.agentConfig.findUnique({ where: { id: 'default' } }) || {
        minimumRestockBox: 10,
        defaultDiscountType: 'PERCENTAGE',
        defaultDiscountValue: 15.0,
      };

      const qty = parseInt(quantity, 10) || 0;
      if (qty < config.minimumRestockBox) {
        return NextResponse.json(
          { error: `Minimal pemesanan pasokan grosir adalah ${config.minimumRestockBox} box.` },
          { status: 400 }
        );
      }

      // Ambil varian produk box
      const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
      }) || (await prisma.productVariant.findFirst({
        where: { sku: { contains: 'BOX' } },
      })) || (await prisma.productVariant.findFirst());

      if (!variant) {
        return NextResponse.json({ error: 'Produk tidak ditemukan.' }, { status: 404 });
      }

      const grossPrice = variant.price * qty;

      // Hitung Diskon Keagenan Resmi (Mendukung Persentase & Potongan Nominal)
      const discountType = member.agentDiscountType || config.defaultDiscountType;
      const discountVal = member.agentDiscountValue ?? config.defaultDiscountValue;

      let discountAmount = 0;
      if (discountType === 'PERCENTAGE') {
        discountAmount = Math.round((grossPrice * discountVal) / 100);
      } else {
        // FLAT_PER_BOX (misal potongan Rp50.000 per box)
        discountAmount = Math.round(discountVal * qty);
      }

      const netSubtotal = grossPrice - discountAmount;
      const uniqueCode = Math.floor(100 + Math.random() * 899);
      const grandTotal = netSubtotal + (paymentMethod === 'DEPOSIT' ? 0 : uniqueCode);

      // Cek Saldo jika bayar via Saldo Deposit Agen
      if (paymentMethod === 'DEPOSIT') {
        if (member.agentDepositBalance < grandTotal) {
          return NextResponse.json(
            {
              error: `Saldo deposit agen tidak mencukupi (Tersedia: Rp${member.agentDepositBalance.toLocaleString('id-ID')}, Dibutuhkan: Rp${grandTotal.toLocaleString('id-ID')}). Silakan topup deposit atau pilih pembayaran transfer.`,
            },
            { status: 400 }
          );
        }
      }

      const orderNumber = `AGN-RESTOCK-${Date.now().toString().slice(-6)}`;

      const createdOrder = await withTransactionRetry(async (tx: any) => {
        // Buat Order Pasokan (Ongkir ditanggung kantor pusat = shippingExpense)
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
            orderStatus: paymentMethod === 'DEPOSIT' ? 'PAID' : 'PENDING_PAYMENT',
            orderType: 'REPEAT_PURCHASE',
            fulfillmentSource: 'REGIONAL_AGENT',
            subtotal: grossPrice,
            discount: discountAmount,
            shippingCost: 0, // Bebas ongkir untuk agen
            shippingExpense: 50000, // Beban ongkir ditanggung kantor pusat
            uniqueCode: paymentMethod === 'DEPOSIT' ? 0 : uniqueCode,
            total: grandTotal,
            paidAt: paymentMethod === 'DEPOSIT' ? new Date() : null,
            items: {
              create: [
                {
                  productVariantId: variant.id,
                  skuSnapshot: variant.sku,
                  nameSnapshot: variant.name,
                  quantity: qty,
                  unitPrice: variant.price,
                  hppSnapshot: variant.hpp || 250000,
                  lineTotal: grossPrice,
                },
              ],
            },
          },
        });

        // Jika bayar pakai Deposit, potong saldo deposit seketika
        if (paymentMethod === 'DEPOSIT') {
          const newBal = member.agentDepositBalance - grandTotal;
          await tx.member.update({
            where: { id: member.id },
            data: { agentDepositBalance: newBal },
          });

          await tx.agentDepositTransaction.create({
            data: {
              memberId: member.id,
              type: 'RESTOCK_PAYMENT',
              amount: grandTotal,
              balanceBefore: member.agentDepositBalance,
              balanceAfter: newBal,
              referenceId: orderNumber,
              notes: `Pembayaran pasokan grosir ${qty} box via Saldo Deposit Agen`,
              status: 'COMPLETED',
            },
          });
        }

        return ord;
      });

      return NextResponse.json({
        success: true,
        message:
          paymentMethod === 'DEPOSIT'
            ? 'Pemesanan pasokan grosir berhasil dibayar dengan Saldo Deposit Agen. Kantor pusat akan segera mengirimkan paket.'
            : 'Pemesanan pasokan berhasil dibuat. Silakan transfer nominal sesuai kode unik.',
        order: createdOrder,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. ACTION: DISPATCH_ASSIGNED_ORDER (Agen Mengirimkan / Menyerahkan Barang ke Mitra)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'DISPATCH_ASSIGNED_ORDER') {
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

    return NextResponse.json({ error: 'Aksi agen tidak dikenali.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memproses pesanan agen.' }, { status: 500 });
  }
}
