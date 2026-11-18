import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    const userEmail = req.headers.get('x-user-email');

    if (!userId && !userEmail) {
      return NextResponse.json({ role: 'guest', total: 0 });
    }

    // Resolve user & roles
    const user = await prisma.user.findFirst({
      where: userId ? { id: userId } : { email: userEmail! },
      include: {
        userRoles: { include: { role: true } },
        member: { select: { id: true } },
      },
    });

    if (!user) return NextResponse.json({ role: 'guest', total: 0 });

    const roleCodes = user.userRoles.map((ur) => ur.role.code.toLowerCase());
    const isAdmin = roleCodes.some((r) => ['owner', 'operations', 'admin_1', 'admin_2', 'koperasi', 'auditor', 'superadmin'].includes(r));

    // ── ADMIN BADGES ───────────────────────────────────────────────
    if (isAdmin) {
      const [pendingPayment, needShipping, pendingPayout] = await Promise.all([
        // Orders waiting payment confirmation
        prisma.order.aggregate({
          where: { orderStatus: 'PENDING_PAYMENT' },
          _count: { id: true },
          _max: { createdAt: true },
        }),
        // Orders paid but resi not yet input
        prisma.order.aggregate({
          where: { orderStatus: 'PAID' },
          _count: { id: true },
          _max: { paidAt: true },
        }),
        // Withdrawal requests needing action
        prisma.withdrawalRequest.aggregate({
          where: { status: { in: ['REQUESTED', 'UNDER_REVIEW'] } },
          _count: { id: true },
          _max: { requestedAt: true },
        }),
      ]);

      const pendingPaymentCount = pendingPayment._count.id;
      const needShippingCount = needShipping._count.id;
      const pendingPayoutCount = pendingPayout._count.id;

      // latestAt = most recent of pending-payment orders or paid orders
      const orderTimes = [pendingPayment._max.createdAt, needShipping._max.paidAt].filter(Boolean) as Date[];
      const latestOrderAt = orderTimes.length
        ? new Date(Math.max(...orderTimes.map((d) => d.getTime())))
        : null;

      return NextResponse.json({
        role: 'admin',
        orders: {
          pendingPaymentCount,
          needShippingCount,
          totalCount: pendingPaymentCount + needShippingCount,
          latestAt: latestOrderAt,
        },
        payout: {
          pendingCount: pendingPayoutCount,
          latestAt: pendingPayout._max.requestedAt ?? null,
        },
        total: pendingPaymentCount + needShippingCount + pendingPayoutCount,
      });
    }

    // ── MEMBER BADGES ──────────────────────────────────────────────
    if (!user.member) {
      return NextResponse.json({ role: 'guest', total: 0 });
    }

    const memberId = user.member.id;

    const [actionOrders, latestCommission, latestPayout] = await Promise.all([
      // Orders needing member action: pending payment or shipped (needs delivery confirm)
      prisma.order.findMany({
        where: {
          buyerUserId: user.id,
          orderStatus: { in: ['PENDING_PAYMENT', 'SHIPPED'] },
        },
        select: {
          createdAt: true,
          shippedAt: true,
          orderStatus: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      // Latest commission item for this member
      prisma.commissionItem.findFirst({
        where: { beneficiaryMemberId: memberId },
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      // Latest payout status change for this member
      prisma.withdrawalRequest.findFirst({
        where: {
          memberId,
          status: { in: ['APPROVED', 'REJECTED', 'PAID', 'FAILED'] },
        },
        select: { reviewedAt: true, paidAt: true },
        orderBy: { requestedAt: 'desc' },
      }),
    ]);

    // Latest timestamp for orders badge
    let latestOrderAt: Date | null = null;
    for (const o of actionOrders) {
      const t = o.orderStatus === 'SHIPPED' ? (o.shippedAt ?? o.createdAt) : o.createdAt;
      if (!latestOrderAt || t > latestOrderAt) latestOrderAt = t;
    }

    // Latest wallet event (commission or payout status change)
    const walletTimes: Date[] = [];
    if (latestCommission?.createdAt) walletTimes.push(latestCommission.createdAt);
    if (latestPayout?.reviewedAt) walletTimes.push(latestPayout.reviewedAt);
    if (latestPayout?.paidAt) walletTimes.push(latestPayout.paidAt);
    const latestWalletAt = walletTimes.length
      ? new Date(Math.max(...walletTimes.map((d) => d.getTime())))
      : null;

    return NextResponse.json({
      role: 'member',
      orders: {
        count: actionOrders.length,
        latestAt: latestOrderAt,
      },
      wallet: {
        latestAt: latestWalletAt,
      },
      total: actionOrders.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
