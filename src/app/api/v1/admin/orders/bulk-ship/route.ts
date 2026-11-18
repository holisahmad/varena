import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withTransactionRetry } from '@/lib/security';
import { dispatchWaMessage, templateOrderShipped } from '@/lib/whatsapp';

/**
 * POST /api/v1/admin/orders/bulk-ship
 * Batch update orders with courier tracking numbers and trigger WA alerts
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { shipments, actorUserId } = body;

    if (!shipments || !Array.isArray(shipments) || shipments.length === 0) {
      return NextResponse.json(
        { error: 'Daftar pengiriman (shipments) wajib diisi minimal 1 item.' },
        { status: 400 }
      );
    }

    const shippedResults: any[] = [];

    await withTransactionRetry(async (tx) => {
      for (const item of shipments) {
        const { orderNumber, courierName, trackingNumber } = item;
        if (!orderNumber || !trackingNumber) continue;

        const order = await tx.order.findUnique({
          where: { orderNumber },
        });

        if (!order || (order.orderStatus !== 'PAID' && order.orderStatus !== 'PROCESSING')) {
          continue;
        }

        const updated = await tx.order.update({
          where: { id: order.id },
          data: {
            orderStatus: 'SHIPPED',
            courierName: courierName || 'JNE Express',
            trackingNumber: trackingNumber.trim(),
            shippedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            actorUserId: actorUserId || null,
            action: 'ORDER_BULK_SHIPPED',
            entityType: 'ORDER',
            entityId: order.id,
            afterJson: JSON.stringify({
              orderNumber,
              courier: courierName || 'JNE Express',
              trackingNumber: trackingNumber.trim(),
            }),
            reason: 'Batch shipping manifest fulfilled by logistics',
          },
        });

        shippedResults.push({
          orderNumber,
          buyerName: order.buyerName,
          buyerPhone: order.buyerPhone,
          courierName: courierName || 'JNE Express',
          trackingNumber: trackingNumber.trim(),
        });
      }
    });

    // Asynchronous WhatsApp Dispatch
    for (const s of shippedResults) {
      if (s.buyerPhone) {
        dispatchWaMessage({
          recipientPhone: s.buyerPhone,
          recipientName: s.buyerName,
          templateType: 'ORDER_SHIPPED',
          message: templateOrderShipped({
            orderNumber: s.orderNumber,
            buyerName: s.buyerName,
            courierName: s.courierName,
            trackingNumber: s.trackingNumber,
          }),
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil memproses pengiriman untuk ${shippedResults.length} pesanan.`,
      shippedCount: shippedResults.length,
      shippedOrders: shippedResults,
    });
  } catch (err: any) {
    console.error('Bulk ship error:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal memproses pengiriman massal.' },
      { status: 500 }
    );
  }
}
