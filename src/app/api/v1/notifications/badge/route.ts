import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface BadgeCacheRecord {
  data: any;
  cachedAt: number;
}

// In-memory microcache (TTL: 25 detik) untuk meredam beban query database free-tier saat banyak tab terbuka
const badgeMicroCache = new Map<string, BadgeCacheRecord>();
const BADGE_CACHE_TTL_MS = 25000;

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of badgeMicroCache.entries()) {
      if (now - v.cachedAt > 60000) {
        badgeMicroCache.delete(k);
      }
    }
  }, 300000);
}

export interface NotificationItem {
  id: string;
  type:
    | 'ORDER_PENDING'          // Member: pesanan belum dibayar
    | 'ORDER_SHIPPED'          // Member: pesanan sedang dikirim
    | 'ORDER_COMPLETED'        // Member: pesanan selesai/diterima (konfirmasi)
    | 'COMMISSION_NEW'         // Member: bonus komisi masuk
    | 'PAYOUT_STATUS'          // Member: status pencairan dana berubah
    | 'DOWNLINE_NEW'           // Member: downline langsung baru bergabung
    | 'DOWNLINE_ORDER'         // Member: downline melakukan order (komisi akan masuk)
    | 'DEPOSIT_APPROVED'       // Member: top-up deposit disetujui admin
    | 'DEPOSIT_REJECTED'       // Member: top-up deposit ditolak admin
    | 'AGENT_STATUS'           // Member: status pengajuan agen diupdate
    | 'ADMIN_ORDER'            // Admin: pesanan baru/perlu tindakan
    | 'ADMIN_PAYOUT'           // Admin: pengajuan penarikan menunggu
    | 'ADMIN_PAYMENT_PROOF'    // Admin: bukti transfer manual disubmit
    | 'ADMIN_AGENT_APPLY'      // Admin: pengajuan agen baru
    | 'ADMIN_DEPOSIT_REQUEST'  // Admin: top-up deposit menunggu verifikasi
    | 'ADMIN_NEW_MEMBER';      // Admin: member baru mendaftar
  title: string;
  message: string;
  url: string;
  createdAt: string;
}

export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    const userEmail = req.headers.get('x-user-email');

    // ── Guest ──────────────────────────────────────────────────────────────
    if (!userId && !userEmail) {
      return NextResponse.json(
        { role: 'guest', total: 0, items: [] },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    // ── Microcache check ──────────────────────────────────────────────────
    const cacheKey = `badge-${userId || ''}-${userEmail || ''}`;
    const cached = badgeMicroCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < BADGE_CACHE_TTL_MS) {
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Varena-Cache': 'HIT',
        },
      });
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
      const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000);

      const [
        pendingPayment,
        needShipping,
        pendingPayout,
        recentPendingOrders,
        recentPaidOrders,
        recentPayouts,
        manualConfirmOrders,
        agentApplications,
        pendingDeposits,
        newMembers,
      ] = await Promise.all([
        // counts
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
        // items
        prisma.order.findMany({
          where: { orderStatus: 'PENDING_PAYMENT', createdAt: { gte: cutoff48h } },
          select: { id: true, orderNumber: true, total: true, buyerName: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 3,
        }),
        prisma.order.findMany({
          where: { orderStatus: 'PAID', paidAt: { gte: cutoff48h } },
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
        // Bukti transfer manual yang disubmit (paymentConfirmationStatus = SUBMITTED)
        prisma.order.findMany({
          where: { paymentConfirmationStatus: 'SUBMITTED' },
          select: { id: true, orderNumber: true, buyerName: true, total: true, updatedAt: true },
          orderBy: { updatedAt: 'desc' },
          take: 3,
        }),
        // Pengajuan agen baru yang masih PENDING / UNDER_REVIEW
        prisma.agentApplication.findMany({
          where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } },
          include: { member: { select: { displayName: true, memberCode: true } } },
          orderBy: { createdAt: 'desc' },
          take: 3,
        }),
        // Top-up deposit/shopping menunggu verifikasi (PENDING)
        prisma.agentDepositTransaction.findMany({
          where: { status: 'PENDING' },
          include: { member: { select: { displayName: true, memberCode: true } } },
          orderBy: { createdAt: 'desc' },
          take: 3,
        }),
        // Member baru mendaftar dalam 48 jam terakhir
        prisma.member.findMany({
          where: { joinedAt: { gte: cutoff48h } },
          include: { sponsorRel: { include: { sponsor: { select: { memberCode: true, displayName: true } } } } },
          orderBy: { joinedAt: 'desc' },
          take: 3,
        }),
      ]);

      const pendingPaymentCount = pendingPayment._count.id;
      const needShippingCount = needShipping._count.id;
      const pendingPayoutCount = pendingPayout._count.id;
      const manualConfirmCount = manualConfirmOrders.length;
      const agentApplyCount = agentApplications.length;
      const pendingDepositCount = pendingDeposits.length;
      const newMemberCount = newMembers.length;

      const orderTimes = [pendingPayment._max.createdAt, needShipping._max.paidAt].filter(Boolean) as Date[];
      const latestOrderAt = orderTimes.length
        ? new Date(Math.max(...orderTimes.map((d) => d.getTime())))
        : null;

      const items: NotificationItem[] = [];

      // Pesanan baru menunggu pembayaran
      for (const o of recentPendingOrders) {
        items.push({
          id: `admin-ord-pnd-${o.id}`,
          type: 'ADMIN_ORDER',
          title: 'Pesanan Menunggu Pembayaran',
          message: `${o.orderNumber} dari ${o.buyerName} · Rp${Number(o.total).toLocaleString('id-ID')}`,
          url: '/admin',
          createdAt: o.createdAt.toISOString(),
        });
      }

      // Pesanan lunas siap kirim
      for (const o of recentPaidOrders) {
        items.push({
          id: `admin-ord-paid-${o.id}`,
          type: 'ADMIN_ORDER',
          title: 'Pesanan Lunas — Siap Dikemas',
          message: `${o.orderNumber} dari ${o.buyerName}, input resi pengiriman segera.`,
          url: '/admin',
          createdAt: (o.paidAt ?? o.createdAt).toISOString(),
        });
      }

      // Bukti transfer manual yang disubmit pembeli
      for (const o of manualConfirmOrders) {
        items.push({
          id: `admin-proof-${o.id}`,
          type: 'ADMIN_PAYMENT_PROOF',
          title: 'Bukti Transfer Disubmit — Verifikasi',
          message: `${o.orderNumber} oleh ${o.buyerName} · Rp${Number(o.total).toLocaleString('id-ID')} perlu dikonfirmasi.`,
          url: '/admin',
          createdAt: o.updatedAt.toISOString(),
        });
      }

      // Pengajuan payout menunggu
      for (const p of recentPayouts) {
        items.push({
          id: `admin-payout-${p.id}`,
          type: 'ADMIN_PAYOUT',
          title: 'Pengajuan Payout Menunggu Persetujuan',
          message: `Penarikan Rp${Number(p.amount).toLocaleString('id-ID')} ke ${p.bankName} a.n. ${p.accountHolder}`,
          url: '/admin',
          createdAt: p.requestedAt.toISOString(),
        });
      }

      // Pengajuan agen baru
      for (const a of agentApplications) {
        items.push({
          id: `admin-agent-apply-${a.id}`,
          type: 'ADMIN_AGENT_APPLY',
          title: 'Pengajuan Agen Baru',
          message: `${a.member.displayName} (${a.member.memberCode}) mengajukan keagenan di ${a.city}, ${a.province}.`,
          url: '/admin',
          createdAt: a.createdAt.toISOString(),
        });
      }

      // Top-up deposit menunggu verifikasi
      for (const d of pendingDeposits) {
        const isShoppingDeposit = d.type === 'SHOPPING_TOPUP';
        items.push({
          id: `admin-deposit-${d.id}`,
          type: 'ADMIN_DEPOSIT_REQUEST',
          title: isShoppingDeposit ? 'Top-up Deposit Belanja Menunggu' : 'Top-up Deposit Agen Menunggu',
          message: `${d.member.displayName} (${d.member.memberCode}) top-up Rp${Number(d.amount).toLocaleString('id-ID')}, verifikasi bukti transfer.`,
          url: '/admin',
          createdAt: d.createdAt.toISOString(),
        });
      }

      // Member baru mendaftar
      for (const m of newMembers) {
        const sponsorName = m.sponsorRel?.sponsor?.displayName || '-';
        items.push({
          id: `admin-newmember-${m.id}`,
          type: 'ADMIN_NEW_MEMBER',
          title: 'Member Baru Mendaftar',
          message: `${m.displayName} (${m.memberCode}) bergabung via sponsor ${sponsorName}.`,
          url: '/admin',
          createdAt: m.joinedAt.toISOString(),
        });
      }

      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const adminPayload = {
        role: 'admin',
        orders: {
          pendingPaymentCount,
          needShippingCount,
          manualConfirmCount,
          totalCount: pendingPaymentCount + needShippingCount + manualConfirmCount,
          latestAt: latestOrderAt,
        },
        payout: {
          pendingCount: pendingPayoutCount,
          latestAt: pendingPayout._max.requestedAt ?? null,
        },
        agentApplyCount,
        pendingDepositCount,
        newMemberCount,
        total: pendingPaymentCount + needShippingCount + manualConfirmCount + pendingPayoutCount + agentApplyCount + pendingDepositCount + newMemberCount,
        items: items.slice(0, 10),
      };

      badgeMicroCache.set(cacheKey, { data: adminPayload, cachedAt: Date.now() });

      return NextResponse.json(adminPayload, {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'X-Varena-Cache': 'MISS' }
      });
    }

    // ── MEMBER NOTIFICATIONS ──────────────────────────────────────────────
    if (!user.member) {
      return NextResponse.json(
        { role: 'guest', total: 0, items: [] },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    const memberId = user.member.id;
    const cutoff7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const cutoff30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      actionOrders,
      recentCommissions,
      recentPayouts,
      newDownlines,
      downlineOrders,
      depositUpdates,
      agentApplication,
    ] = await Promise.all([
      // Pesanan milik user ini yang perlu tindakan
      prisma.order.findMany({
        where: {
          buyerUserId: user.id,
          orderStatus: { in: ['PENDING_PAYMENT', 'SHIPPED'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      // Komisi yang diterima member ini
      prisma.commissionItem.findMany({
        where: {
          beneficiaryMemberId: memberId,
          createdAt: { gte: cutoff30d },
        },
        select: { id: true, rewardType: true, amount: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      // Status payout member ini
      prisma.withdrawalRequest.findMany({
        where: { memberId },
        select: { id: true, amount: true, status: true, bankName: true, reviewedAt: true, paidAt: true, requestedAt: true },
        orderBy: { requestedAt: 'desc' },
        take: 3,
      }),
      // Downline langsung baru (SponsorRelationship where sponsorMemberId = memberId)
      prisma.sponsorRelationship.findMany({
        where: {
          sponsorMemberId: memberId,
          createdAt: { gte: cutoff7d },
        },
        include: {
          member: { select: { displayName: true, memberCode: true, joinedAt: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      // Order dari downline langsung (komisi akan/sudah masuk)
      (async () => {
        try {
          const directDownlineIds = await prisma.sponsorRelationship.findMany({
            where: { sponsorMemberId: memberId },
            select: { memberId: true },
          });
          if (directDownlineIds.length === 0) return [];
          const downlineMemberIds = directDownlineIds.map((r) => r.memberId);
          const downlineUsers = await prisma.member.findMany({
            where: { id: { in: downlineMemberIds } },
            select: { userId: true, displayName: true, memberCode: true },
          });
          const userIdToInfo: Record<string, { displayName: string; memberCode: string }> = Object.fromEntries(
            downlineUsers.map((m) => [m.userId, m])
          );
          const orders = await prisma.order.findMany({
            where: {
              buyerUserId: { in: downlineUsers.map((m) => m.userId) },
              orderStatus: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'COMPLETED'] },
              createdAt: { gte: cutoff7d },
            },
            select: { id: true, orderNumber: true, total: true, buyerUserId: true, createdAt: true, orderStatus: true },
            orderBy: { createdAt: 'desc' },
            take: 5,
          });
          return orders.map((o) => ({ ...o, downlineInfo: o.buyerUserId ? (userIdToInfo[o.buyerUserId] ?? null) : null }));
        } catch {
          return [];
        }
      })(),
      // Top-up deposit yang statusnya berubah (COMPLETED atau REJECTED) dalam 7 hari
      prisma.agentDepositTransaction.findMany({
        where: {
          memberId,
          status: { in: ['COMPLETED', 'REJECTED'] },
          updatedAt: { gte: cutoff7d },
        },
        select: { id: true, type: true, amount: true, status: true, updatedAt: true, notes: true },
        orderBy: { updatedAt: 'desc' },
        take: 3,
      }),
      // Status pengajuan agen member ini
      prisma.agentApplication.findMany({
        where: {
          memberId,
          updatedAt: { gte: cutoff30d },
          status: { in: ['APPROVED', 'REJECTED', 'UNDER_REVIEW'] },
        },
        select: { id: true, status: true, city: true, rejectionReason: true, reviewedAt: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 1,
      }),
    ]);

    // Build items
    const items: NotificationItem[] = [];

    // Pesanan milik user (pending bayar & dikirim)
    for (const o of (actionOrders as any[])) {
      const orderDate = o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt);
      const shipDate = o.shippedAt ? new Date(o.shippedAt) : null;

      if (o.orderStatus === 'PENDING_PAYMENT') {
        items.push({
          id: `order-pnd-${o.id}`,
          type: 'ORDER_PENDING',
          title: 'Pesanan Menunggu Pembayaran',
          message: `Bayar ${o.orderNumber} sejumlah Rp${Number(o.total).toLocaleString('id-ID')} sebelum pesanan dibatalkan.`,
          url: `/checkout?orderNumber=${o.orderNumber}`,
          createdAt: orderDate.toISOString(),
        });
      } else if (o.orderStatus === 'SHIPPED') {
        const courier = o.courierName || 'Kurir';
        const resi = o.trackingNumber ? ` · Resi ${o.trackingNumber}` : '';
        items.push({
          id: `order-shp-${o.id}`,
          type: 'ORDER_SHIPPED',
          title: 'Paket Sedang Dikirim',
          message: `${o.orderNumber} via ${courier}${resi}. Konfirmasi jika paket telah tiba.`,
          url: '/member#pesanan',
          createdAt: (shipDate ?? orderDate).toISOString(),
        });
      }
    }

    // Komisi masuk
    for (const c of recentCommissions) {
      const label =
        c.rewardType === 'DIRECT_SPONSOR'
          ? 'Sponsor Langsung'
          : c.rewardType === 'NETWORK_BONUS'
          ? 'Pengembangan Jaringan'
          : c.rewardType === 'LEADERSHIP_BONUS'
          ? 'Bonus Leadership'
          : 'Komisi';
      items.push({
        id: `comm-${c.id}`,
        type: 'COMMISSION_NEW',
        title: 'Bonus Komisi Masuk',
        message: `Bonus ${label} sebesar Rp${Number(c.amount).toLocaleString('id-ID')} telah dikreditkan ke dompet Anda.`,
        url: '/member/wallet',
        createdAt: c.createdAt.toISOString(),
      });
    }

    // Status payout
    for (const p of recentPayouts) {
      if (['APPROVED', 'PAID'].includes(p.status)) {
        items.push({
          id: `payout-${p.id}`,
          type: 'PAYOUT_STATUS',
          title: `Penarikan Dana ${p.status === 'PAID' ? 'Berhasil Dikirim' : 'Disetujui'}`,
          message: `Pencairan Rp${Number(p.amount).toLocaleString('id-ID')} ke ${p.bankName} ${p.status === 'PAID' ? 'telah ditransfer.' : 'disetujui tim keuangan.'}`,
          url: '/member/wallet',
          createdAt: (p.paidAt ?? p.reviewedAt ?? p.requestedAt).toISOString(),
        });
      }
    }

    // Downline baru langsung bergabung
    for (const rel of newDownlines) {
      if (!rel.member) continue;
      items.push({
        id: `downline-new-${rel.member.memberCode}`,
        type: 'DOWNLINE_NEW',
        title: 'Mitra Baru di Jaringan Anda',
        message: `${rel.member.displayName} (${rel.member.memberCode}) baru bergabung sebagai downline langsung Anda.`,
        url: '/member/network',
        createdAt: rel.member.joinedAt.toISOString(),
      });
    }

    // Order dari downline (komisi akan masuk)
    for (const o of (downlineOrders as any[])) {
      const info = o.downlineInfo;
      if (!info) continue;
      items.push({
        id: `dl-order-${o.id}`,
        type: 'DOWNLINE_ORDER',
        title: 'Downline Anda Berbelanja',
        message: `${info.displayName} (${info.memberCode}) membeli produk · komisi akan masuk ke dompet Anda.`,
        url: '/member/wallet',
        createdAt: (o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt)).toISOString(),
      });
    }

    // Status deposit diproses
    for (const d of depositUpdates) {
      const isApproved = d.status === 'COMPLETED';
      const label = d.type === 'SHOPPING_TOPUP' ? 'Deposit Belanja' : 'Deposit Agen';
      items.push({
        id: `deposit-${d.id}`,
        type: isApproved ? 'DEPOSIT_APPROVED' : 'DEPOSIT_REJECTED',
        title: `${label} ${isApproved ? 'Berhasil Diverifikasi' : 'Ditolak'}`,
        message: isApproved
          ? `Top-up Rp${Number(d.amount).toLocaleString('id-ID')} telah dikreditkan ke saldo Anda.`
          : `Top-up Rp${Number(d.amount).toLocaleString('id-ID')} ditolak. ${d.notes || 'Hubungi admin untuk info.'}`,
        url: '/member/wallet',
        createdAt: d.updatedAt.toISOString(),
      });
    }

    // Status pengajuan agen
    for (const a of agentApplication) {
      const statusLabel =
        a.status === 'APPROVED' ? 'Disetujui' :
        a.status === 'REJECTED' ? 'Ditolak' :
        'Sedang Ditinjau';
      items.push({
        id: `agent-app-${a.id}`,
        type: 'AGENT_STATUS',
        title: `Pengajuan Agen ${statusLabel}`,
        message:
          a.status === 'APPROVED'
            ? `Selamat! Anda resmi menjadi Agen di ${a.city}. Kelola stok & pesanan di dashboard.`
            : a.status === 'REJECTED'
            ? `Pengajuan agen ditolak. Alasan: ${a.rejectionReason || 'Lihat detail di dashboard.'}`
            : `Pengajuan agen Anda sedang dalam proses peninjauan oleh tim.`,
        url: '/member',
        createdAt: (a.reviewedAt ?? a.updatedAt).toISOString(),
      });
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Hitung timestamp terbaru untuk badge
    let latestOrderAt: Date | null = null;
    for (const o of (actionOrders as any[])) {
      const t = o.orderStatus === 'SHIPPED' && o.shippedAt ? new Date(o.shippedAt) : new Date(o.createdAt);
      if (!latestOrderAt || t > latestOrderAt) latestOrderAt = t;
    }

    const walletTimes: Date[] = [];
    if (recentCommissions[0]?.createdAt) walletTimes.push(recentCommissions[0].createdAt);
    if (recentPayouts[0]?.paidAt) walletTimes.push(recentPayouts[0].paidAt);
    if (recentPayouts[0]?.reviewedAt) walletTimes.push(recentPayouts[0].reviewedAt);
    const latestWalletAt = walletTimes.length
      ? new Date(Math.max(...walletTimes.map((d) => d.getTime())))
      : null;

    const memberPayload = {
      role: 'member',
      orders: { count: actionOrders.length, latestAt: latestOrderAt },
      wallet: { latestAt: latestWalletAt },
      total: items.length,
      items: items.slice(0, 10),
    };

    badgeMicroCache.set(cacheKey, { data: memberPayload, cachedAt: Date.now() });

    return NextResponse.json(memberPayload, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'X-Varena-Cache': 'MISS' }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
