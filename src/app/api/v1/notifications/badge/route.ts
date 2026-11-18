import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export interface NotificationItem {
  id: string;
  type: 'ORDER_PENDING' | 'ORDER_SHIPPED' | 'COMMISSION_NEW' | 'PAYOUT_STATUS' | 'ADMIN_ORDER' | 'ADMIN_PAYOUT';
  title: string;
  message: string;
  url: string;
  createdAt: string;
}

export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    const userEmail = req.headers.get('x-user-email');

    // 1. Guest: if not logged in, return completely empty
    if (!userId && !userEmail) {
      return NextResponse.json(
        { role: 'guest', total: 0, items: [] },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    // Resolve user & roles
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(userId ? [{ id: userId }] : []),
          ...(userEmail ? [{ email: userEmail }] : []),
        ],
      },
      include: {
        userRoles: { include: { role: true } },
        member: { select: { id: true, memberCode: true } },
      },
    });

    if (!user) {
      return NextResponse.json(
        { role: 'guest', total: 0, items: [] },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    const roleCodes = user.userRoles.map((ur) => ur.role.code.toLowerCase());
    const isAdmin = roleCodes.some((r) =>
      ['owner', 'operations', 'admin_1', 'admin_2', 'koperasi', 'auditor', 'superadmin'].includes(r)
    );

    // ── ADMIN NOTIFICATIONS ───────────────────────────────────────────────
    if (isAdmin) {
      const [pendingPayment, needShipping, pendingPayout, recentPendingOrders, recentPaidOrders, recentPayouts] =
        await Promise.all([
          prisma.order.aggregate({
            where: { orderStatus: 'PENDING_PAYMENT' },
            _count: { id: true },
            _max: { createdAt: true },
          }),
          prisma.order.aggregate({
            where: { orderStatus: 'PAID' },
            _count: { id: true },
            _max: { paidAt: true },
          }),
          prisma.withdrawalRequest.aggregate({
            where: { status: { in: ['REQUESTED', 'UNDER_REVIEW'] } },
            _count: { id: true },
            _max: { requestedAt: true },
          }),
          prisma.order.findMany({
            where: { orderStatus: 'PENDING_PAYMENT' },
            select: { id: true, orderNumber: true, total: true, buyerName: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 3,
          }),
          prisma.order.findMany({
            where: { orderStatus: 'PAID' },
            select: { id: true, orderNumber: true, total: true, buyerName: true, paidAt: true, createdAt: true },
            orderBy: { paidAt: 'desc' },
            take: 3,
          }),
          prisma.withdrawalRequest.findMany({
            where: { status: { in: ['REQUESTED', 'UNDER_REVIEW'] } },
            select: { id: true, amount: true, bankName: true, accountHolder: true, requestedAt: true },
            orderBy: { requestedAt: 'desc' },
            take: 3,
          }),
        ]);

      const pendingPaymentCount = pendingPayment._count.id;
      const needShippingCount = needShipping._count.id;
      const pendingPayoutCount = pendingPayout._count.id;

      const orderTimes = [pendingPayment._max.createdAt, needShipping._max.paidAt].filter(Boolean) as Date[];
      const latestOrderAt = orderTimes.length
        ? new Date(Math.max(...orderTimes.map((d) => d.getTime())))
        : null;

      const items: NotificationItem[] = [];

      for (const o of recentPendingOrders) {
        items.push({
          id: `admin-ord-pnd-${o.id}`,
          type: 'ADMIN_ORDER',
          title: 'Pesanan Perlu Konfirmasi Pembayaran',
          message: `${o.orderNumber} oleh ${o.buyerName} sebesar Rp${o.total.toLocaleString('id-ID')}`,
          url: '/admin',
          createdAt: o.createdAt.toISOString(),
        });
      }

      for (const o of recentPaidOrders) {
        items.push({
          id: `admin-ord-paid-${o.id}`,
          type: 'ADMIN_ORDER',
          title: 'Pesanan Lunas Siap Dikirim',
          message: `${o.orderNumber} lunas, segera proses pengemasan dan input nomor resi.`,
          url: '/admin',
          createdAt: (o.paidAt ?? o.createdAt).toISOString(),
        });
      }

      for (const p of recentPayouts) {
        items.push({
          id: `admin-payout-${p.id}`,
          type: 'ADMIN_PAYOUT',
          title: 'Pengajuan Payout Menunggu Persetujuan',
          message: `Penarikan Rp${p.amount.toLocaleString('id-ID')} ke rekening ${p.bankName} a.n. ${p.accountHolder}`,
          url: '/admin',
          createdAt: p.requestedAt.toISOString(),
        });
      }

      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return NextResponse.json(
        {
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
          items: items.slice(0, 6),
        },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    // ── MEMBER NOTIFICATIONS (STRICTLY THIS USER ONLY) ───────────────────
    if (!user.member) {
      return NextResponse.json(
        { role: 'guest', total: 0, items: [] },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    const memberId = user.member.id;

    const [actionOrders, recentCommissions, recentPayouts] = await Promise.all([
      // Orders: strictly personal orders placed by this user
      prisma.order.findMany({
        where: {
          buyerUserId: user.id,
          orderStatus: { in: ['PENDING_PAYMENT', 'SHIPPED'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      // Commissions: strictly earned by this member
      prisma.commissionItem.findMany({
        where: { beneficiaryMemberId: memberId },
        select: {
          id: true,
          rewardType: true,
          amount: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),
      // Payout requests: strictly requested by this member
      prisma.withdrawalRequest.findMany({
        where: {
          memberId,
        },
        select: {
          id: true,
          amount: true,
          status: true,
          bankName: true,
          reviewedAt: true,
          paidAt: true,
          requestedAt: true,
        },
        orderBy: { requestedAt: 'desc' },
        take: 2,
      }),
    ]);

    // Latest timestamp for orders badge
    let latestOrderAt: Date | null = null;
    for (const o of (actionOrders as any[])) {
      const orderDate = o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt);
      const shipDate = o.shippedAt ? (o.shippedAt instanceof Date ? o.shippedAt : new Date(o.shippedAt)) : null;
      const t = o.orderStatus === 'SHIPPED' ? (shipDate ?? orderDate) : orderDate;
      if (!latestOrderAt || t > latestOrderAt) latestOrderAt = t;
    }

    // Latest wallet event
    const walletTimes: Date[] = [];
    if (recentCommissions[0]?.createdAt) walletTimes.push(recentCommissions[0].createdAt);
    if (recentPayouts[0]?.reviewedAt) walletTimes.push(recentPayouts[0].reviewedAt);
    if (recentPayouts[0]?.paidAt) walletTimes.push(recentPayouts[0].paidAt);
    const latestWalletAt = walletTimes.length
      ? new Date(Math.max(...walletTimes.map((d) => d.getTime())))
      : null;

    // Build notification items list
    const items: NotificationItem[] = [];

    for (const o of (actionOrders as any[])) {
      const orderDate = o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt);
      const shipDate = o.shippedAt ? (o.shippedAt instanceof Date ? o.shippedAt : new Date(o.shippedAt)) : null;

      if (o.orderStatus === 'PENDING_PAYMENT') {
        items.push({
          id: `order-pnd-${o.id}`,
          type: 'ORDER_PENDING',
          title: 'Pesanan Menunggu Pembayaran',
          message: `Segera bayar pesanan ${o.orderNumber} sejumlah Rp${Number(o.total || 0).toLocaleString('id-ID')}`,
          url: `/checkout?orderNumber=${o.orderNumber}`,
          createdAt: orderDate.toISOString(),
        });
      } else if (o.orderStatus === 'SHIPPED') {
        const courier = o.courierName || 'Kurir';
        const resi = o.trackingNumber ? ` (${o.trackingNumber})` : '';
        items.push({
          id: `order-shp-${o.id}`,
          type: 'ORDER_SHIPPED',
          title: 'Pesanan Sedang Dikirim',
          message: `Paket ${o.orderNumber} via ${courier}${resi}. Klik untuk konfirmasi jika paket telah tiba.`,
          url: '/member#pesanan',
          createdAt: (shipDate ?? orderDate).toISOString(),
        });
      }
    }

    for (const c of recentCommissions) {
      items.push({
        id: `comm-${c.id}`,
        type: 'COMMISSION_NEW',
        title: 'Bonus Komisi Baru Diterima',
        message: `Bonus ${c.rewardType === 'DIRECT_SPONSOR' ? 'Sponsor Langsung' : 'Pengembangan Jaringan'} sebesar Rp${c.amount.toLocaleString('id-ID')} telah masuk ke dompet Anda.`,
        url: '/member/wallet',
        createdAt: c.createdAt.toISOString(),
      });
    }

    for (const p of recentPayouts) {
      if (['APPROVED', 'PAID'].includes(p.status)) {
        items.push({
          id: `payout-${p.id}`,
          type: 'PAYOUT_STATUS',
          title: `Penarikan Dana ${p.status === 'PAID' ? 'Berhasil Ditransfer' : 'Disetujui'}`,
          message: `Pencairan Rp${p.amount.toLocaleString('id-ID')} ke rekening ${p.bankName} ${p.status === 'PAID' ? 'telah selesai dikirim' : 'telah disetujui tim keuangan'}.`,
          url: '/member/wallet',
          createdAt: (p.paidAt ?? p.reviewedAt ?? p.requestedAt).toISOString(),
        });
      }
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(
      {
        role: 'member',
        orders: {
          count: actionOrders.length,
          latestAt: latestOrderAt,
        },
        wallet: {
          latestAt: latestWalletAt,
        },
        total: actionOrders.length,
        items: items.slice(0, 6),
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
