import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rootCode = searchParams.get('rootCode') || 'VRN-LDR-03';

    // Find the focal node
    const focalMember = await prisma.member.findUnique({
      where: { memberCode: rootCode },
      include: {
        placementRel: {
          include: { parent: true },
        },
        sponsorRel: {
          include: { sponsor: true },
        },
      },
    });

    if (!focalMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Find immediate placed children
    const children = await prisma.placementRelationship.findMany({
      where: { parentMemberId: focalMember.id, status: 'ACTIVE' },
      include: {
        member: {
          include: {
            placedChildren: true,
            user: { select: { email: true, phone: true } },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      node: {
        id: focalMember.id,
        code: focalMember.memberCode,
        name: focalMember.displayName,
        status: focalMember.memberStatus,
        parent: focalMember.placementRel?.parent ? {
          code: focalMember.placementRel.parent.memberCode,
          name: focalMember.placementRel.parent.displayName,
        } : null,
        sponsor: focalMember.sponsorRel?.sponsor ? {
          code: focalMember.sponsorRel.sponsor.memberCode,
          name: focalMember.sponsorRel.sponsor.displayName,
        } : null,
        children: children.map((c) => ({
          id: c.member.id,
          code: c.member.memberCode,
          name: c.member.displayName,
          status: c.member.memberStatus,
          childCount: c.member.placedChildren.length,
        })),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

