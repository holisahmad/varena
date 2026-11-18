import { NextResponse } from 'next/server';
import { createOrder } from '@/lib/order';
import { checkRateLimit, detectSuspiciousPatterns } from '@/lib/security';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

    // 1. Rate limiting: max 20 checkouts per 5 minutes per IP
    const rateCheck = checkRateLimit(`checkout:${ip}`, 20, 5 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Terlalu banyak permintaan pemesanan. Coba lagi dalam ${rateCheck.retryAfterSec} detik.` },
        { status: 429 }
      );
    }

    const body = await req.json();

    // 2. Suspicious injection check on customer text inputs
    const rawInputs = [body.buyerName, body.buyerPhone, body.buyerEmail, body.shippingAddress].filter(Boolean).join(' ');
    if (detectSuspiciousPatterns(rawInputs)) {
      return NextResponse.json(
        { error: 'Input terdeteksi mengandung format yang tidak diperbolehkan.' },
        { status: 400 }
      );
    }

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

