import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyCorporateAdmin } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    const isAuthorized = await verifyCorporateAdmin(userId);
    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Akses ditolak: Hanya pengelola korporasi yang berhak mengakses data statistik keuangan dan jaringan.' },
        { status: 403 }
      );
    }

    // 1. Paid Orders (PAID, PROCESSING, SHIPPED, COMPLETED)
    const paidOrders = await prisma.order.findMany({
      where: {
        orderStatus: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'COMPLETED'] },
      },
      include: { items: true },
    });

    let grossSales = 0;
    let totalHpp = 0;

    for (const o of paidOrders) {
      grossSales += o.total;
      for (const item of o.items) {
        totalHpp += item.hppSnapshot * item.quantity;
      }
    }

    const grossMargin = grossSales - totalHpp;

    // 2. Pending Payment Orders (Receivables / Belum Bayar)
    const pendingOrders = await prisma.order.findMany({
      where: { orderStatus: 'PENDING_PAYMENT' },
      include: {
        referralMember: {
          select: { memberCode: true, displayName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const pendingOrdersCount = pendingOrders.length;
    const pendingOrdersAmount = pendingOrders.reduce((sum, o) => sum + o.total, 0);

    // 3. Commission Runs & Unallocated Reserve
    const runs = await prisma.commissionRun.findMany();
    const totalCommissionDistributed = runs.reduce((acc, r) => acc + r.totalCommission, 0);
    const totalUnallocatedReserve = runs.reduce((acc, r) => acc + r.unallocatedAmount, 0);

    // 4. Payout Disbursed vs Pending
    const [disbursedPayouts, pendingPayouts] = await Promise.all([
      prisma.withdrawalRequest.aggregate({
        where: { status: { in: ['APPROVED', 'PAID'] } },
        _sum: { amount: true, netAmount: true, fee: true },
      }),
      prisma.withdrawalRequest.findMany({
        where: { status: { in: ['REQUESTED', 'UNDER_REVIEW'] } },
      }),
    ]);

    const totalPayoutDisbursed = disbursedPayouts._sum.amount ?? 0;
    const pendingPayoutAmount = pendingPayouts.reduce((acc, w) => acc + w.amount, 0);

    // 5. User & Member Metrics
    const [totalUsers, allMembers, roles] = await Promise.all([
      prisma.user.count(),
      prisma.member.findMany({
        include: {
          user: { select: { email: true, phone: true } },
          sponsorRel: {
            include: {
              sponsor: {
                select: {
                  id: true,
                  memberCode: true,
                  displayName: true,
                  user: { select: { phone: true } },
                },
              },
            },
          },
          placementRel: {
            include: {
              parent: { select: { id: true, memberCode: true, displayName: true } },
            },
          },
        },
        orderBy: { joinedAt: 'asc' },
      }),
      prisma.userRole.findMany({
        include: { role: true },
      }),
    ]);

    // 6. Identify Inactive Members (Members who haven't completed a PAID First Pack order)
    const paidBuyerUserIds = new Set(paidOrders.map((o) => o.buyerUserId).filter(Boolean));
    const paidReferralMemberIds = new Set(paidOrders.map((o) => o.referralMemberId).filter(Boolean));

    // Exclude Corporate L1-L5 accounts from inactive list
    const corporateCodes = ['VRN-CORP-L1', 'VRN-CORP-L2', 'VRN-CORP-L3', 'VRN-CORP-L4', 'VRN-CORP-L5'];
    
    const inactiveMembers: any[] = [];
    const activeMembers: any[] = [];

    for (const m of allMembers) {
      if (corporateCodes.includes(m.memberCode)) {
        activeMembers.push(m);
        continue;
      }

      // Considered active if their user ID placed an order or they generated at least 1 paid order
      const hasPurchased = paidBuyerUserIds.has(m.userId) || paidReferralMemberIds.has(m.id);
      if (hasPurchased) {
        activeMembers.push(m);
      } else {
        inactiveMembers.push({
          id: m.id,
          memberCode: m.memberCode,
          displayName: m.displayName,
          email: m.user.email,
          phone: m.user.phone || '081234567890',
          joinedAt: m.joinedAt,
          sponsor: m.sponsorRel?.sponsor
            ? {
                memberCode: m.sponsorRel.sponsor.memberCode,
                displayName: m.sponsorRel.sponsor.displayName,
                phone: m.sponsorRel.sponsor.user?.phone || '081234567890',
              }
            : null,
          placementParent: m.placementRel?.parent?.memberCode || '-',
        });
      }
    }

    // 7. Calculate Depth Level Distribution (L1 to L10+)
    const levelCounts: Record<string, number> = {
      'Level 1 (Owner/Root)': 0,
      'Level 2': 0,
      'Level 3': 0,
      'Level 4': 0,
      'Level 5': 0,
      'Level 6 (Leader 1)': 0,
      'Level 7 (Leader 2)': 0,
      'Level 8 (Leader 3)': 0,
      'Level 9 (Mitra Utama)': 0,
      'Level 10 (Generasi 2)': 0,
      'Level 11+ (Downline)': 0,
    };

    // Calculate level by counting parents up to root
    const parentMap = new Map<string, string>();
    for (const m of allMembers) {
      if (m.placementRel?.parentMemberId) {
        parentMap.set(m.id, m.placementRel.parentMemberId);
      }
    }

    for (const m of allMembers) {
      let depth = 1;
      let curr = m.id;
      while (parentMap.has(curr) && depth < 20) {
        curr = parentMap.get(curr)!;
        depth++;
      }

      if (depth === 1) levelCounts['Level 1 (Owner/Root)']++;
      else if (depth === 2) levelCounts['Level 2']++;
      else if (depth === 3) levelCounts['Level 3']++;
      else if (depth === 4) levelCounts['Level 4']++;
      else if (depth === 5) levelCounts['Level 5']++;
      else if (depth === 6) levelCounts['Level 6 (Leader 1)']++;
      else if (depth === 7) levelCounts['Level 7 (Leader 2)']++;
      else if (depth === 8) levelCounts['Level 8 (Leader 3)']++;
      else if (depth === 9) levelCounts['Level 9 (Mitra Utama)']++;
      else if (depth === 10) levelCounts['Level 10 (Generasi 2)']++;
      else levelCounts['Level 11+ (Downline)']++;
    }

    // 8. "Push Leader" Intelligence:
    // Aggregate by Sponsor: who has the most inactive downlines and unpaid orders?
    const leaderMap = new Map<string, {
      memberCode: string;
      displayName: string;
      phone: string;
      inactiveDownlineCount: number;
      pendingOrdersCount: number;
      pendingOrdersTotal: number;
    }>();

    for (const inact of inactiveMembers) {
      if (inact.sponsor) {
        const scode = inact.sponsor.memberCode;
        const current = leaderMap.get(scode) || {
          memberCode: scode,
          displayName: inact.sponsor.displayName,
          phone: inact.sponsor.phone,
          inactiveDownlineCount: 0,
          pendingOrdersCount: 0,
          pendingOrdersTotal: 0,
        };
        current.inactiveDownlineCount++;
        leaderMap.set(scode, current);
      }
    }

    // Map pending orders by referral sponsor
    for (const po of pendingOrders) {
      if (po.referralMember) {
        const rcode = po.referralMember.memberCode;
        const current = leaderMap.get(rcode) || {
          memberCode: rcode,
          displayName: po.referralMember.displayName,
          phone: '081234567890',
          inactiveDownlineCount: 0,
          pendingOrdersCount: 0,
          pendingOrdersTotal: 0,
        };
        current.pendingOrdersCount++;
        current.pendingOrdersTotal += po.total;
        leaderMap.set(rcode, current);
      }
    }

    const pushLeaderList = Array.from(leaderMap.values()).sort(
      (a, b) => (b.inactiveDownlineCount + b.pendingOrdersCount) - (a.inactiveDownlineCount + a.pendingOrdersCount)
    );

    return NextResponse.json({
      success: true,
      stats: {
        // Sales & Cashflow
        totalOrders: paidOrders.length + pendingOrdersCount,
        paidOrdersCount: paidOrders.length,
        grossSales,
        totalHpp,
        grossMargin,
        netResidual: grossMargin - totalCommissionDistributed - totalUnallocatedReserve,
        totalCommissionDistributed,
        totalUnallocatedReserve,
        totalPayoutDisbursed,
        
        // Receivables & Pending
        pendingOrdersCount,
        pendingOrdersAmount,
        pendingOrdersList: pendingOrders.slice(0, 5).map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          buyerName: o.buyerName,
          buyerPhone: o.buyerPhone,
          total: o.total,
          referral: o.referralMember?.memberCode || 'ORGANIC',
          createdAt: o.createdAt,
        })),

        // Payouts
        pendingWithdrawalsCount: pendingPayouts.length,
        pendingPayoutAmount,

        // User & Network Metrics
        totalUsers,
        totalMembers: allMembers.length,
        activeMembersCount: activeMembers.length,
        inactiveMembersCount: inactiveMembers.length,
        inactiveMembersList: inactiveMembers.slice(0, 10),

        // Level distribution
        levelDistribution: levelCounts,

        // Push Leader Target
        pushLeaders: pushLeaderList,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
