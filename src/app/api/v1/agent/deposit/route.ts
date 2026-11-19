import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const memberCodeParam = searchParams.get('memberCode');
    const userId = req.headers.get('x-user-id');
    const userEmail = req.headers.get('x-user-email');

    let member: any = null;
    if (memberCodeParam) {
      member = await prisma.member.findUnique({
        where: { memberCode: memberCodeParam },
      });
    } else if (userId || userEmail) {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            ...(userId ? [{ id: userId }] : []),
            ...(userEmail ? [{ email: userEmail }] : []),
          ],
        },
        include: { member: true },
      });
      member = user?.member;
    }

    if (!member) {
      return NextResponse.json({ error: 'Data agen tidak ditemukan.' }, { status: 404 });
    }

    const transactions = await prisma.agentDepositTransaction.findMany({
      where: { memberId: member.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      balance: member.agentDepositBalance || 0,
      transactions,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memuat deposit agen.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { memberCode, amount, notes, proofUrl } = body;

    const nominal = parseInt(amount, 10);
    if (!nominal || nominal < 100000) {
      return NextResponse.json(
        { error: 'Minimal pengajuan top up deposit agen adalah Rp100.000.' },
        { status: 400 }
      );
    }

    const member = await prisma.member.findUnique({
      where: { memberCode },
    });

    if (!member) {
      return NextResponse.json({ error: 'Member agen tidak ditemukan.' }, { status: 404 });
    }

    const tx = await prisma.agentDepositTransaction.create({
      data: {
        memberId: member.id,
        type: 'TOPUP_DEPOSIT',
        amount: nominal,
        balanceBefore: member.agentDepositBalance || 0,
        balanceAfter: (member.agentDepositBalance || 0) + nominal,
        referenceId: `DEP-TOPUP-${Date.now().toString().slice(-6)}`,
        notes: notes || 'Pengajuan topup saldo deposit kas agen',
        proofUrl: proofUrl || null,
        status: 'PENDING', // Menunggu approval finance admin
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Pengajuan topup deposit berhasil dikirim dan menunggu verifikasi bagian keuangan.',
      transaction: tx,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal mengajukan top up deposit.' }, { status: 500 });
  }
}
