import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requestPayout } from '@/lib/payout';
import { checkRateLimit, detectSuspiciousPatterns } from '@/lib/security';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const body = await req.json();
    const { memberCode, amount, bankName, accountNumber, accountHolder } = body;

    // 1. Rate limiting: max 5 requests per 10 minutes per IP/member
    const rateCheck = checkRateLimit(`payout:${memberCode || ip}`, 5, 10 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Terlalu banyak permintaan penarikan dana. Mohon tunggu ${rateCheck.retryAfterSec} detik.` },
        { status: 429 }
      );
    }

    // 2. Suspicious injection check
    const rawInputs = [memberCode, bankName, accountNumber, accountHolder].filter(Boolean).join(' ');
    if (detectSuspiciousPatterns(rawInputs)) {
      return NextResponse.json(
        { error: 'Input mengandung karakter atau pola yang dilarang.' },
        { status: 400 }
      );
    }

    if (!memberCode || !amount || !bankName || !accountNumber || !accountHolder) {
      return NextResponse.json(
        { error: 'Semua field penarikan saldo wajib diisi lengkap.' },
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

    const withdrawal = await requestPayout({
      memberId: member.id,
      amount: numAmount,
      bankName,
      accountNumber,
      accountHolder,
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

