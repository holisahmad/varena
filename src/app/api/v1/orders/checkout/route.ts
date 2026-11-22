import { NextResponse } from 'next/server';
import { createOrder } from '@/lib/order';
import { checkRateLimit, detectSuspiciousPatterns } from '@/lib/security';
import { resolveMemberFromRequest } from '@/lib/api-auth';
import { getMaintenanceConfig } from '@/lib/maintenance';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

    // 0. Global Maintenance / Freeze Check
    const maintenance = await getMaintenanceConfig();
    if (maintenance.isActive && maintenance.freezePurchases) {
      return NextResponse.json(
        {
          error:
            maintenance.message ||
            'Pemesanan produk sedang dibekukan sementara untuk pemeliharaan sistem berkala. Mohon coba beberapa saat lagi.',
        },
        { status: 503 }
      );
    }

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

    // 3. Jika metode pembayaran DEPOSIT, harus ada sesi login yang valid
    if (body.paymentMethod === 'DEPOSIT') {
      const session = await resolveMemberFromRequest(req);
      if (!session) {
        return NextResponse.json(
          { error: 'Pembayaran via saldo deposit memerlukan login sebagai mitra.' },
          { status: 401 }
        );
      }
      // Pastikan buyerUserId terisi dari session jika tidak dikirim
      if (!body.buyerUserId) {
        body.buyerUserId = session.userId;
      }
    }

    const order = await createOrder(body);

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
        uniqueCode: order.uniqueCode,
        status: order.orderStatus,
        paidViaDeposit: (order as any).paidViaDeposit || false,
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

