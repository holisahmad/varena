import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const totalOrders = await prisma.order.count();
    const paidOrders = await prisma.order.findMany({
      where: { orderStatus: 'PAID' },
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

    // Commission Runs
    const runs = await prisma.commissionRun.findMany();
    const totalCommissionDistributed = runs.reduce((acc, r) => acc + r.totalCommission, 0);
    const totalUnallocatedReserve = runs.reduce((acc, r) => acc + r.unallocatedAmount, 0);

    // Pending Withdrawals
    const pendingWithdrawals = await prisma.withdrawalRequest.findMany({
      where: { status: 'REQUESTED' },
    });
    const pendingPayoutAmount = pendingWithdrawals.reduce((acc, w) => acc + w.amount, 0);

    // Total Members
    const totalMembers = await prisma.member.count();

    return NextResponse.json({
      success: true,
      stats: {
        totalOrders,
        paidOrdersCount: paidOrders.length,
        grossSales,
        totalHpp,
        grossMargin,
        netResidual: grossMargin - totalCommissionDistributed - totalUnallocatedReserve,
        totalCommissionDistributed,
        totalUnallocatedReserve,
        pendingWithdrawalsCount: pendingWithdrawals.length,
        pendingPayoutAmount,
        totalMembers,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

