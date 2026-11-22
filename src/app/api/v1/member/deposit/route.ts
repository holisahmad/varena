import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getMemberFromJWT } from '@/lib/auth';
import { resolveCorporateAdmin } from '@/lib/api-auth';
import { sweepExpiredDeposits } from '@/lib/deposit';

export const dynamic = 'force-dynamic';

function generateUniqueCode(): number {
  return Math.floor(Math.random() * 900) + 100; // 100–999
}

// GET: Ambil saldo dan riwayat deposit belanja mitra
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const memberCode = searchParams.get('memberCode');
    if (!memberCode) {
      return NextResponse.json({ error: 'memberCode required.' }, { status: 400 });
    }

    // Auth guard
    const adminSession = await resolveCorporateAdmin(req);
    if (!adminSession) {
      const memberSession = await getMemberFromJWT(req);
      if (!memberSession) {
        return NextResponse.json({ error: 'Sesi tidak valid. Silakan login kembali.' }, { status: 401 });
      }
      if (memberSession.memberCode !== memberCode) {
        return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
      }
    }

    await sweepExpiredDeposits();

    const member = await prisma.member.findUnique({ where: { memberCode } });
    if (!member) {
      return NextResponse.json({ error: 'Member tidak ditemukan.' }, { status: 404 });
    }

    const transactions = await prisma.agentDepositTransaction.findMany({
      where: { memberId: member.id, type: { in: ['SHOPPING_TOPUP', 'SHOPPING_PAYMENT'] } },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    return NextResponse.json({
      success: true,
      balance: member.shoppingDepositBalance || 0,
      transactions,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memuat deposit belanja.' }, { status: 500 });
  }
}

// POST: Ajukan deposit belanja mitra
export async function POST(req: Request) {
  try {
    // Auth guard: Ambil memberCode dari JWT
    const memberSession = await getMemberFromJWT(req);
    if (!memberSession || !memberSession.memberCode) {
      return NextResponse.json({ error: 'Sesi tidak valid. Silakan login kembali.' }, { status: 401 });
    }
    const memberCode = memberSession.memberCode;

    const body = await req.json();
    const { amount, notes, proofUrl, bankName, accountNumber } = body;

    const nominal = parseInt(amount, 10);
    if (!nominal || nominal < 50000) {
      return NextResponse.json(
        { error: 'Minimal deposit belanja adalah Rp50.000.' },
        { status: 400 }
      );
    }

    await sweepExpiredDeposits();

    const member = await prisma.member.findUnique({ where: { memberCode } });
    if (!member) {
      return NextResponse.json({ error: 'Member tidak ditemukan.' }, { status: 404 });
    }

    const uniqueCode = generateUniqueCode();
    const transferTotal = nominal + uniqueCode;
    const refId = `DEP-SHOP-${Date.now().toString().slice(-8)}`;

    const tx = await prisma.agentDepositTransaction.create({
      data: {
        memberId: member.id,
        type: 'SHOPPING_TOPUP',
        amount: nominal,
        balanceBefore: member.shoppingDepositBalance || 0,
        balanceAfter: (member.shoppingDepositBalance || 0) + nominal,
        referenceId: refId,
        notes: notes || 'Pengajuan deposit saldo belanja mitra',
        proofUrl: proofUrl || null,
        status: 'PENDING_PAYMENT',
        uniqueCode,
        bankName: bankName || null,
        accountNumber: accountNumber || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Pengajuan deposit Rp${nominal.toLocaleString('id-ID')} berhasil dikirim. Transfer tepat Rp${transferTotal.toLocaleString('id-ID')} (termasuk kode unik +Rp${uniqueCode}).`,
      transactionId: tx.id,
      referenceId: refId,
      uniqueCode,
      transferTotal,
      transaction: { ...tx, transferTotal },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal mengajukan deposit belanja.' }, { status: 500 });
  }
}
