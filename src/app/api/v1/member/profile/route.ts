import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/v1/member/profile?memberCode=VRN-XXXX
 * Returns member profile including shipping address and uniqueCodeBalance
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const memberCode = searchParams.get('memberCode');
    const userId = searchParams.get('userId');

    if (!memberCode && !userId) {
      return NextResponse.json({ error: 'memberCode atau userId wajib diisi.' }, { status: 400 });
    }

    const member = await prisma.member.findFirst({
      where: memberCode ? { memberCode } : { userId: userId! },
      select: {
        id: true,
        userId: true,
        memberCode: true,
        displayName: true,
        legalName: true,
        uniqueCodeBalance: true,
        recipientName: true,
        recipientPhone: true,
        province: true,
        city: true,
        district: true,
        postalCode: true,
        addressDetail: true,
        bankName: true,
        bankAccountNumber: true,
        bankAccountHolder: true,
        bankLockedAt: true,
        isAgent: true,
        agentType: true,
        agentStatus: true,
        agentCity: true,
        agentInventory: true,
        user: {
          select: {
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: 'Member tidak ditemukan.' }, { status: 404 });
    }

    const { user, ...rest } = member;
    return NextResponse.json({
      success: true,
      member: {
        ...rest,
        isBankLocked: Boolean(member.bankAccountNumber && member.bankLockedAt),
        phone: user?.phone || null,
        email: user?.email || null,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
