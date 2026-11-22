import { NextResponse } from 'next/server';
import { cancelDepositPayment } from '@/lib/deposit';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/agent/deposit/cancel
 * Agen membatalkan pengajuan top up kas deposit yang masih PENDING_PAYMENT.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { transactionId, memberCode } = body;

    if (!transactionId) {
      return NextResponse.json({ error: 'transactionId wajib diisi.' }, { status: 400 });
    }

    const cancelled = await cancelDepositPayment({ transactionId, memberCode });

    return NextResponse.json({
      success: true,
      message: 'Pengajuan top up kas agen berhasil dibatalkan.',
      transaction: cancelled,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal membatalkan pengajuan.' }, { status: 400 });
  }
}
