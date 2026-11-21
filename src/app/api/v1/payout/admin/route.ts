import { NextResponse } from 'next/server';
import { resolveCorporateAdmin } from '@/lib/api-auth';
import prisma from '@/lib/prisma';
import { approvePayout } from '@/lib/payout';

export async function GET(req: Request) {
  try {
    const authUser = await resolveCorporateAdmin(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '15', 10));
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      prisma.withdrawalRequest.findMany({
        include: {
          member: {
            select: {
              memberCode: true,
              displayName: true,
            },
          },
        },
        orderBy: { requestedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.withdrawalRequest.count(),
    ]);

    return NextResponse.json({
      success: true,
      withdrawals: list,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authUser = await resolveCorporateAdmin(req);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Akses ditolak: User ID otorisator tidak memiliki peran korporasi untuk menyetujui pencairan.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { withdrawalId, providerReference } = body;

    if (!withdrawalId || !providerReference) {
      return NextResponse.json(
        { error: 'Withdrawal ID dan nomor referensi transfer bank wajib diisi.' },
        { status: 400 }
      );
    }

    const updated = await approvePayout({
      withdrawalId,
      actorUserId: authUser.userId,
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
