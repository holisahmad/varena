import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { transferPlacement } from '@/lib/network';
import { verifyCorporateAdmin } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { memberCode, newParentCode, actorUserId, reason } = body;

    const isAuthorized = await verifyCorporateAdmin(actorUserId);
    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Akses ditolak: Hanya manajemen korporasi yang berhak memindahkan node penempatan jaringan.' },
        { status: 403 }
      );
    }

    if (!memberCode || !newParentCode || !reason) {
      return NextResponse.json(
        { error: 'Member code, new parent code, dan alasan pemindahan wajib diisi.' },
        { status: 400 }
      );
    }

    const member = await prisma.member.findUnique({ where: { memberCode } });
    const newParent = await prisma.member.findUnique({ where: { memberCode: newParentCode } });

    if (!member || !newParent) {
      return NextResponse.json({ error: 'Member atau node tujuan tidak ditemukan.' }, { status: 404 });
    }

    const result = await transferPlacement({
      memberId: member.id,
      newParentId: newParent.id,
      actorUserId: actorUserId || 'SYSTEM_ADMIN',
      reason,
    });

    return NextResponse.json({
      success: true,
      message: `Berhasil memindahkan penempatan ${memberCode} di bawah ${newParentCode}.`,
      result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Gagal memproses pemindahan placement.' },
      { status: 400 }
    );
  }
}

