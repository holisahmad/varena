import { NextResponse } from 'next/server';
import { cancelExpiredOrder } from '@/lib/order';
import { checkRateLimit } from '@/lib/security';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const rateCheck = checkRateLimit(`cancel-order:${ip}`, 30, 5 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan.' }, { status: 429 });
    }

    const body = await req.json();
    const orderNumber = body.orderNumber || body.orderId;

    if (!orderNumber) {
      return NextResponse.json({ error: 'orderNumber wajib diisi.' }, { status: 400 });
    }

    const result = await cancelExpiredOrder(orderNumber, body.reason);

    return NextResponse.json({
      success: true,
      message: 'Pesanan telah dibatalkan karena waktu pembayaran telah kedaluwarsa.',
      result,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal membatalkan pesanan.' }, { status: 500 });
  }
}
