import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        buyerName: order.buyerName,
        buyerPhone: order.buyerPhone,
        shippingAddress: order.shippingAddress,
        orderStatus: order.orderStatus,
        orderType: order.orderType,
        subtotal: order.subtotal,
        discount: order.discount,
        shippingCost: order.shippingCost,
        uniqueCode: order.uniqueCode,
        total: order.total,
        status: order.orderStatus,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
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
