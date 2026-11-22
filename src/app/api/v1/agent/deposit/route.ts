import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { sweepExpiredDeposits } from '@/lib/deposit';

export const dynamic = 'force-dynamic';

function generateUniqueCode(): number {
  return Math.floor(Math.random() * 900) + 100; // 100–999
}

export async function GET(req: Request) {
  try {
    await sweepExpiredDeposits();
    const { searchParams } = new URL(req.url);
    const memberCodeParam = searchParams.get('memberCode');

    // JWT-first, then fallback to legacy headers
    const jwtSession = await getAuthenticatedUser(req);
    const userId = jwtSession?.userId || req.headers.get('x-user-id');
    const userEmail = jwtSession?.email || req.headers.get('x-user-email');

    let member: any = null;
    if (memberCodeParam) {
      member = await prisma.member.findUnique({ where: { memberCode: memberCodeParam } });
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
      return NextResponse.json({ error: 'Data member tidak ditemukan.' }, { status: 404 });
    }

    const transactions = await prisma.agentDepositTransaction.findMany({
      where: { memberId: member.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Determine deposit type (agent vs mitra shopping)
    const isAgent = member.isAgent || member.agentStatus === 'ACTIVE';

    return NextResponse.json({
      success: true,
      balance: isAgent ? (member.agentDepositBalance || 0) : (member.shoppingDepositBalance || 0),
      agentDepositBalance: member.agentDepositBalance || 0,
      shoppingDepositBalance: member.shoppingDepositBalance || 0,
      isAgent,
      transactions,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memuat deposit.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { memberCode, amount, notes, proofUrl, bankName, accountNumber, depositType } = body;

    const nominal = parseInt(amount, 10);
    if (!nominal || nominal < 50000) {
      return NextResponse.json(
        { error: 'Minimal pengajuan deposit adalah Rp50.000.' },
        { status: 400 }
      );
    }

    const member = await prisma.member.findUnique({ where: { memberCode } });
    if (!member) {
      return NextResponse.json({ error: 'Member tidak ditemukan.' }, { status: 404 });
    }

    await sweepExpiredDeposits();

    const uniqueCode = generateUniqueCode();
    // Total yang harus ditransfer = nominal + kode unik
    const transferTotal = nominal + uniqueCode;
    const refId = `DEP-${depositType === 'SHOPPING' ? 'SHOP' : 'AGT'}-${Date.now().toString().slice(-8)}`;

    const tx = await prisma.agentDepositTransaction.create({
      data: {
        memberId: member.id,
        type: depositType === 'SHOPPING' ? 'SHOPPING_TOPUP' : 'TOPUP_DEPOSIT',
        amount: nominal,
        balanceBefore: depositType === 'SHOPPING'
          ? (member.shoppingDepositBalance || 0)
          : (member.agentDepositBalance || 0),
        balanceAfter: depositType === 'SHOPPING'
          ? (member.shoppingDepositBalance || 0) + nominal
          : (member.agentDepositBalance || 0) + nominal,
        referenceId: refId,
        notes: notes || `Pengajuan deposit ${depositType === 'SHOPPING' ? 'belanja mitra' : 'kas agen'}`,
        proofUrl: proofUrl || null,
        status: 'PENDING_PAYMENT',
        uniqueCode,
        bankName: bankName || null,
        accountNumber: accountNumber || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Pengajuan deposit berhasil dikirim dan menunggu verifikasi keuangan.',
      transactionId: tx.id,
      referenceId: refId,
      uniqueCode,
      transferTotal,
      transaction: {
        ...tx,
        transferTotal,  // amount + uniqueCode — ini yang harus ditransfer
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal mengajukan deposit.' }, { status: 500 });
  }
}
