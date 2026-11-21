import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getMemberFromJWT } from '@/lib/auth';
import { resolveCorporateAdmin } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const memberCode = searchParams.get('memberCode') || 'VRN-0001';

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

    const member = await prisma.member.findUnique({
      where: { memberCode },
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const referrals = await prisma.sponsorRelationship.findMany({
      where: { sponsorMemberId: member.id },
      include: {
        member: {
          include: {
            placementRel: { include: { parent: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      referrals: referrals.map((r) => ({
        id: r.member.id,
        code: r.member.memberCode,
        name: r.member.displayName,
        joinedAt: r.member.joinedAt,
        status: r.member.memberStatus,
        placementParent: r.member.placementRel?.parent ? {
          code: r.member.placementRel.parent.memberCode,
          name: r.member.placementRel.parent.displayName,
        } : null,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
