import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const memberCode = searchParams.get('memberCode');
    const userId = searchParams.get('userId');

    if (!memberCode && !userId) {
      return NextResponse.json(
        { error: 'memberCode atau userId wajib disertakan.' },
        { status: 400 }
      );
    }

    // Find member and user
    let member: any = null;
    let user: any = null;

    if (memberCode) {
      member = await prisma.member.findUnique({
        where: { memberCode },
        include: { user: true },
      });
      user = member?.user;
    } else if (userId) {
      user = await prisma.user.findUnique({
        where: { id: userId },
        include: { member: true },
      });
      member = user?.member;
    }

    if (!member && !user) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan.' }, { status: 404 });
    }

    // 1. Personal orders placed by this user/member
    const personalOrders = await prisma.order.findMany({
      where: {
        OR: [
          ...(user ? [{ buyerUserId: user.id }] : []),
          ...(user?.email ? [{ buyerEmail: user.email }] : []),
        ],
      },
      include: {
        items: {
          include: { variant: true },
        },
        payments: {
          select: {
            id: true,
            provider: true,
            providerReference: true,
            status: true,
            paidAt: true,
          },
        },
        referralMember: {
          select: {
            memberCode: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Orders generated via this member's referral link
    const referralOrders = member
      ? await prisma.order.findMany({
          where: { referralMemberId: member.id },
          include: {
            items: {
              include: { variant: true },
            },
            commissionRuns: {
              include: {
                items: {
                  where: { beneficiaryMemberId: member.id },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 30,
        })
      : [];

    return NextResponse.json({
      success: true,
      personalOrders: personalOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        buyerName: o.buyerName,
        shippingAddress: o.shippingAddress,
        orderStatus: o.orderStatus,
        orderType: o.orderType,
        total: o.total,
        uniqueCode: o.uniqueCode,
        courierName: o.courierName,
        trackingNumber: o.trackingNumber,
        shippedAt: o.shippedAt,
        completedAt: o.completedAt,
        paidAt: o.paidAt,
        createdAt: o.createdAt,
        items: o.items.map((it) => ({
          name: it.nameSnapshot,
          quantity: it.quantity,
          price: it.unitPrice,
          lineTotal: it.lineTotal,
        })),
        referral: o.referralMember
          ? { code: o.referralMember.memberCode, name: o.referralMember.displayName }
          : null,
      })),
      referralOrders: referralOrders.map((ro) => {
        const myCommissions = ro.commissionRuns?.flatMap((cr) => cr.items) || [];
        const commissionTotal = myCommissions.reduce((acc, c) => acc + c.amount, 0);

        return {
          id: ro.id,
          orderNumber: ro.orderNumber,
          buyerName: ro.buyerName,
          total: ro.total,
          orderStatus: ro.orderStatus,
          orderType: ro.orderType,
          createdAt: ro.createdAt,
          commissionEarned: commissionTotal,
        };
      }),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
