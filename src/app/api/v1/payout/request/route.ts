import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requestPayout } from '@/lib/payout';
import { checkRateLimit } from '@/lib/security';
import { calculatePayoutFees, PAYOUT_CONFIG } from '@/config/payout';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const amount = parseInt(searchParams.get('amount') || '0', 10);
    const fees = calculatePayoutFees(amount);
    return NextResponse.json({
      success: true,
      config: {
        adminFeePercent: PAYOUT_CONFIG.adminFeePercent,
        transferFeeFlat: PAYOUT_CONFIG.transferFeeFlat,
        minimumAmount: PAYOUT_CONFIG.minimumAmount,
        xenditEnabled: PAYOUT_CONFIG.xendit.enabled,
      },
      calculation: fees,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const body = await req.json();
    const { memberCode, amount } = body;

    // 1. Rate limiting: max 5 requests per 10 minutes per IP/member
    const rateCheck = checkRateLimit(`payout:${memberCode || ip}`, 5, 10 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Terlalu banyak permintaan penarikan dana. Mohon tunggu ${rateCheck.retryAfterSec} detik.` },
        { status: 429 }
      );
    }

    if (!memberCode || !amount) {
      return NextResponse.json(
        { error: 'Kode member dan nominal penarikan wajib disertakan.' },
        { status: 400 }
      );
    }

    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount) || numAmount < 50000) {
      return NextResponse.json(
        { error: 'Nominal penarikan minimal Rp50.000 dan harus berupa angka valid.' },
        { status: 400 }
      );
    }

    const member = await prisma.member.findUnique({
      where: { memberCode },
    });

    if (!member) {
      return NextResponse.json({ error: 'Member tidak ditemukan.' }, { status: 404 });
    }

    // Security Check: Enforce Bound Bank Account
    if (!member.bankAccountNumber || !member.bankName || !member.bankAccountHolder) {
      return NextResponse.json(
        {
          error:
            'Rekening bank belum diikat. Demi keamanan dana Anda dari pembajakan akun, daftarkan rekening bank atas nama sendiri terlebih dahulu.',
        },
        { status: 400 }
      );
    }

    const withdrawal = await requestPayout({
      memberId: member.id,
      amount: numAmount,
    });

    return NextResponse.json({
      success: true,
      message: 'Pengajuan penarikan dana berhasil dikirim untuk review finance.',
      withdrawal,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Gagal mengajukan penarikan dana.' },
      { status: 400 }
    );
  }
}

