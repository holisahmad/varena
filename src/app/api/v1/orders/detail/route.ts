import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cancelExpiredOrder } from '@/lib/order';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get('orderNumber');

    if (!orderNumber) {
      return NextResponse.json(
        { error: 'orderNumber parameter is required.' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: true,
        payments: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Pesanan tidak ditemukan.' },
        { status: 404 }
      );
    }

    // Auto-cancel if 1 hour elapsed and not submitted confirmation
    let currentStatus = order.orderStatus;
    const isPast1Hour = Date.now() - new Date(order.createdAt).getTime() > 60 * 60 * 1000;
    if (
      order.orderStatus === 'PENDING_PAYMENT' &&
      isPast1Hour &&
      order.paymentConfirmationStatus !== 'SUBMITTED'
    ) {
      try {
        await cancelExpiredOrder(order.id, 'Batas waktu pembayaran 1 jam telah habis.');
        currentStatus = 'CANCELLED';
      } catch (e) {
        console.error('Failed to auto-cancel expired order:', e);
      }
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        buyerName: order.buyerName,
        buyerPhone: order.buyerPhone,
        shippingAddress: order.shippingAddress,
        orderStatus: currentStatus,
        orderType: order.orderType,
        subtotal: order.subtotal,
        discount: order.discount,
        shippingCost: order.shippingCost,
        uniqueCode: order.uniqueCode,
        total: order.total,
        status: currentStatus,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
        courierName: order.courierName,
        trackingNumber: order.trackingNumber,
        shippingExpense: order.shippingExpense,
        paymentConfirmationStatus: order.paymentConfirmationStatus,
        senderBankName: order.senderBankName,
        senderAccountName: order.senderAccountName,
        transferAmountPaid: order.transferAmountPaid,
        transferNotes: order.transferNotes,
        paymentProofUrl: order.paymentProofUrl,
        payments: order.payments.map((p) => ({
          id: p.id,
          provider: p.provider,
          amount: p.amount,
          status: p.status,
          paidAt: p.paidAt,
        })),
        items: order.items.map((it) => ({
          name: it.nameSnapshot,
          quantity: it.quantity,
          price: it.unitPrice,
          lineTotal: it.lineTotal,
        })),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
