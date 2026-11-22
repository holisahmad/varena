import { NextResponse } from 'next/server';
import { resolveCorporateAdmin } from '@/lib/api-auth';
import prisma from '@/lib/prisma';
import { verifyCorporateAdmin } from '@/lib/auth';
import { settleOrderPayment, shipOrder, completeOrder, sweepExpiredOrders } from '@/lib/order';
import { enqueueWaMessage } from '@/lib/wa-queue';

export async function GET(req: Request) {
  try {
    const authUser = await resolveCorporateAdmin(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 401 });
    }

    // Auto-expire unpaid orders older than 1 hour and return stock to inventory
    await sweepExpiredOrders();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'ALL';
    const q = searchParams.get('q')?.trim() || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '15', 10));
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (status !== 'ALL') {
      if (status === 'MANUAL_CONFIRMATION' || status === 'SUBMITTED') {
        whereClause.paymentConfirmationStatus = 'SUBMITTED';
      } else {
        whereClause.orderStatus = status;
      }
    }

    if (q) {
      whereClause.OR = [
        { orderNumber: { contains: q, mode: 'insensitive' } },
        { buyerName: { contains: q, mode: 'insensitive' } },
        { buyerPhone: { contains: q, mode: 'insensitive' } },
        { trackingNumber: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [orders, filteredCount, pendingPaymentCount, paidCount, shippedCount, completedCount, manualConfirmationCount, totalCount] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        include: {
          items: {
            include: { variant: true },
          },
          referralMember: {
            select: {
              id: true,
              memberCode: true,
              displayName: true,
            },
          },
          payments: {
            select: {
              id: true,
              provider: true,
              providerReference: true,
              status: true,
              paidAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where: whereClause }),
      prisma.order.count({ where: { orderStatus: 'PENDING_PAYMENT' } }),
      prisma.order.count({ where: { orderStatus: 'PAID' } }),
      prisma.order.count({ where: { orderStatus: 'SHIPPED' } }),
      prisma.order.count({ where: { orderStatus: 'COMPLETED' } }),
      prisma.order.count({ where: { paymentConfirmationStatus: 'SUBMITTED' } }),
      prisma.order.count(),
    ]);

    return NextResponse.json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total: filteredCount,
        totalPages: Math.ceil(filteredCount / limit) || 1,
      },
      summary: {
        totalOrders: totalCount,
        pendingPayment: pendingPaymentCount,
        paidReadyToShip: paidCount,
        shipped: shippedCount,
        completed: completedCount,
        manualConfirmation: manualConfirmationCount,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authUser = await resolveCorporateAdmin(req);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Akses ditolak: Hanya pengelola korporasi yang berhak memproses pesanan.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action, orderId, providerReference, courierName, trackingNumber, warehouseOriginName, warehouseOriginCity, actorUserId } = body;

    const actor = authUser.userId;

    if (!orderId || !action) {
      return NextResponse.json({ error: 'orderId dan action wajib diisi.' }, { status: 400 });
    }

    if (action === 'CONFIRM_PAYMENT') {
      const result = await settleOrderPayment(orderId, providerReference || `MANUAL-CONFIRMED-${Date.now().toString().slice(-6)}`);
      
      // Log audit
      await prisma.auditLog.create({
        data: {
          actorUserId: actor,
          action: 'ORDER_PAYMENT_CONFIRMED',
          entityType: 'ORDER',
          entityId: orderId,
          beforeJson: JSON.stringify({ orderStatus: 'PENDING_PAYMENT' }),
          afterJson: JSON.stringify({ orderStatus: 'PAID', providerReference: providerReference || 'MANUAL-CONFIRMED' }),
          reason: 'Verifikasi konfirmasi pembayaran manual oleh admin penjualan/keuangan',
        },
      });

      // Kirim notifikasi WA ke pembeli bahwa pembayaran disetujui (async/non-blocking tanpa query DB tambahan)
      if (result?.order?.buyerPhone) {
        enqueueWaMessage({
          to: result.order.buyerPhone,
          message:
            `✅ *PEMBAYARAN PESANAN DIKONFIRMASI!*\n\n` +
            `Halo *${result.order.buyerName}*,\n` +
            `Pembayaran pesanan Anda telah diverifikasi oleh tim keuangan VARENA:\n\n` +
            `📦 *No. Pesanan:* ${result.order.orderNumber}\n` +
            `💰 *Total:* Rp${(result.order.total || 0).toLocaleString('id-ID')}\n\n` +
            `Pesanan Anda sedang diproses dan akan segera dikirim. Terima kasih! 🌿`,
        }).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        message: 'Pembayaran pesanan berhasil dikonfirmasi dan komisi jaringan telah dialokasikan.',
        result,
      });
    }

    if (action === 'SHIP_ORDER') {
      if (!courierName || !trackingNumber) {
        return NextResponse.json({ error: 'Nama kurir / ekspedisi dan nomor resi pengiriman wajib diisi.' }, { status: 400 });
      }

      const updated = await shipOrder({
        orderId,
        courierName,
        trackingNumber,
        warehouseOriginName,
        warehouseOriginCity,
        actorUserId: actor,
      });

      return NextResponse.json({
        success: true,
        message: `Pesanan berhasil diperbarui menjadi TERKIRIM dengan nomor resi ${trackingNumber} (${courierName}).`,
        order: updated,
      });
    }

    if (action === 'COMPLETE_ORDER') {
      const updated = await completeOrder({
        orderId,
        actorUserId: actor,
      });

      return NextResponse.json({
        success: true,
        message: 'Pesanan telah berhasil diselesaikan.',
        order: updated,
      });
    }

    return NextResponse.json({ error: `Aksi ${action} tidak dikenali.` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memproses pesanan.' }, { status: 400 });
  }
}
