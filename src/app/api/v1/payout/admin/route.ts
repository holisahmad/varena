import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { approvePayout } from '@/lib/payout';
import { verifyCorporateAdmin } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    const isAuthorized = await verifyCorporateAdmin(userId);
    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Akses ditolak: Hanya pengelola korporasi yang berhak melihat antrean pencairan dana.' },
        { status: 403 }
      );
    }

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

    const isAuthorized = await verifyCorporateAdmin(actorUserId);
    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Akses ditolak: User ID otorisator tidak memiliki peran korporasi untuk menyetujui pencairan.' },
        { status: 403 }
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

