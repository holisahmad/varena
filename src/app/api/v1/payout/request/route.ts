import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requestPayout } from '@/lib/payout';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { memberCode, amount, bankName, accountNumber, accountHolder } = body;

    if (!memberCode || !amount || !bankName || !accountNumber || !accountHolder) {
      return NextResponse.json(
        { error: 'Semua field penarikan saldo wajib diisi lengkap.' },
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
      amount: parseInt(amount, 10),
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

