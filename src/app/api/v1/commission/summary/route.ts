import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const memberCode = searchParams.get('memberCode');

    if (!memberCode) {
      return NextResponse.json({ error: 'Member code required' }, { status: 400 });
    }

    const member = await prisma.member.findUnique({
      where: { memberCode },
      include: {
        commissionsEarned: {
          include: {
            commissionRun: {
              include: { order: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    let directTotal = 0;
    let devTotal = 0;
    let pendingTotal = 0;

    for (const item of member.commissionsEarned) {
      if (item.rewardType === 'DIRECT_SPONSOR') {
        directTotal += item.amount;
      } else if (item.rewardType === 'DEVELOPMENT_PLACEMENT') {
        devTotal += item.amount;
      }
      if (item.status === 'HELD' || item.status === 'PENDING') {
        pendingTotal += item.amount;
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalEarned: directTotal + devTotal,
        directSponsorEarned: directTotal,
        developmentPlacementEarned: devTotal,
        pendingOrHeld: pendingTotal,
      },
      history: member.commissionsEarned.map((c) => ({
        id: c.id,
        rewardType: c.rewardType,
        level: c.levelNumber,
        amount: c.amount,
        status: c.status,
        reason: c.reasonCode,
        orderNumber: c.commissionRun.order.orderNumber,
        createdAt: c.createdAt,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

