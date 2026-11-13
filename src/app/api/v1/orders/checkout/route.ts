import { NextResponse } from 'next/server';
import { createOrder } from '@/lib/order';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const order = await createOrder(body);

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.orderStatus,
      },
    });
  } catch (err: any) {
    console.error('Checkout error:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal memproses checkout pesanan.' },
      { status: 400 }
    );
  }
}

