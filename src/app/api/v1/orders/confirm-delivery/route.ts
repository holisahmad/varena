import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { completeOrder } from '@/lib/order';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, userId } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID wajib disertakan.' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan.' }, { status: 404 });
    }

    // Security check: order must belong to this buyer if userId provided
    if (userId && order.buyerUserId && order.buyerUserId !== userId) {
      return NextResponse.json(
        { error: 'Akses ditolak: Anda hanya dapat mengonfirmasi pesanan milik Anda sendiri.' },
        { status: 403 }
      );
    }

    const updated = await completeOrder({
      orderId,
      actorUserId: userId || null,
    });

    return NextResponse.json({
      success: true,
      message: 'Konfirmasi penerimaan barang berhasil disimpan. Pesanan selesai.',
      order: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal mengonfirmasi penerimaan pesanan.' }, { status: 400 });
  }
}
