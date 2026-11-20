import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkRateLimit } from '@/lib/security';

export async function GET(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

    // Rate limiting: max 30 tracking lookups per 5 minutes per IP
    const rateCheck = checkRateLimit(`track:${ip}`, 30, 5 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Terlalu banyak permintaan pelacakan. Tunggu ${rateCheck.retryAfterSec} detik.` },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') || '').trim();

    if (!query) {
      return NextResponse.json({ error: 'Nomor pesanan atau nomor HP wajib diisi.' }, { status: 400 });
    }

    // Clean query
    const cleanPhone = query.replace(/[\s-]/g, '');

    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { orderNumber: { equals: query, mode: 'insensitive' } },
          { trackingNumber: { equals: query, mode: 'insensitive' } },
          { buyerPhone: { contains: cleanPhone } },
        ],
      },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (!orders || orders.length === 0) {
      return NextResponse.json(
        { error: 'Pesanan tidak ditemukan. Pastikan nomor pesanan atau nomor HP yang dimasukkan sesuai.' },
        { status: 404 }
      );
    }

    // Sanitize and return safe tracking payload
    const safeOrders = orders.map((o) => {
      // Partial masking for phone and buyer name for privacy
      const maskedBuyer = o.buyerName
        ? o.buyerName.slice(0, 3) + '***'
        : 'Pelanggan';

      return {
        id: o.id,
        orderNumber: o.orderNumber,
        orderStatus: o.orderStatus,
        paymentConfirmationStatus: o.paymentConfirmationStatus,
        total: o.total,
        courierName: o.courierName,
        trackingNumber: o.trackingNumber,
        buyerNameMasked: maskedBuyer,
        shippingCity: o.shippingCity || 'Indonesia',
        shippingProvince: o.shippingProvince || '',
        createdAt: o.createdAt,
        paidAt: o.paidAt,
        shippedAt: o.shippedAt,
        completedAt: o.completedAt,
        items: o.items.map((it) => ({
          name: it.nameSnapshot,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          lineTotal: it.lineTotal,
        })),
      };
    });

    return NextResponse.json({
      success: true,
      orders: safeOrders,
    });
  } catch (err: any) {
    console.error('Order tracking error:', err);
    return NextResponse.json({ error: err.message || 'Gagal melacak pesanan.' }, { status: 500 });
  }
}
