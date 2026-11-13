import { NextResponse } from 'next/server';
import { settleOrderPayment } from '@/lib/order';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, providerRef } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID wajib diisi.' }, { status: 400 });
    }

    const result = await settleOrderPayment(orderId, providerRef || 'SIM-PAY');

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: any) {
    console.error('Payment settlement error:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal menyelesaikan pembayaran.' },
      { status: 500 }
    );
  }
}
