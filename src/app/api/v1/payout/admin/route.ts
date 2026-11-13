import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { approvePayout } from '@/lib/payout';

export async function GET() {
  try {
    const list = await prisma.withdrawalRequest.findMany({
      include: {
        member: {
          select: {
            memberCode: true,
            displayName: true,
          },
        },
      },
      orderBy: { requestedAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      withdrawals: list,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { withdrawalId, actorUserId, providerReference } = body;

    if (!withdrawalId || !providerReference) {
      return NextResponse.json(
        { error: 'Withdrawal ID dan nomor referensi transfer bank wajib diisi.' },
        { status: 400 }
      );
    }

    const updated = await approvePayout({
      withdrawalId,
      actorUserId: actorUserId || 'ADMIN_FINANCE',
      providerReference,
    });

    return NextResponse.json({
      success: true,
      message: 'Pencairan dana disetujui dan transaksi buku besar telah diposting.',
      withdrawal: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Gagal menyetujui pencairan dana.' },
      { status: 400 }
    );
  }
}
