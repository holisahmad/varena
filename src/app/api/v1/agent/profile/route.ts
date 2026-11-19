import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const memberCodeParam = searchParams.get('memberCode');
    const userId = req.headers.get('x-user-id');
    const userEmail = req.headers.get('x-user-email');

    // Resolve member
    let member: any = null;
    if (memberCodeParam) {
      member = await prisma.member.findUnique({
        where: { memberCode: memberCodeParam },
        include: { user: { select: { email: true, phone: true } } },
      });
    } else if (userId || userEmail) {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            ...(userId ? [{ id: userId }] : []),
            ...(userEmail ? [{ email: userEmail }] : []),
          ],
        },
        include: {
          member: {
            include: { user: { select: { email: true, phone: true } } },
          },
        },
      });
      member = user?.member;
    }

    if (!member) {
      return NextResponse.json({ error: 'Data keagenan mitra tidak ditemukan.' }, { status: 404 });
    }

    // Get system config for agents
    let config = await prisma.agentConfig.findUnique({ where: { id: 'default' } });
    if (!config) {
      config = await prisma.agentConfig.create({
        data: {
          id: 'default',
          minimumRestockBox: 10,
          defaultDiscountType: 'PERCENTAGE',
          defaultDiscountValue: 15.0,
        },
      });
    }

    // Statistics for agent
    const [assignedOrdersCount, completedDistributionCount, totalRewards] = await Promise.all([
      // Routed orders waiting dispatch by this agent
      prisma.order.count({
        where: {
          assignedAgentMemberId: member.id,
          agentDispatchStatus: { in: ['ASSIGNED', 'PACKING'] },
        },
      }),
      // Successfully distributed orders by this agent
      prisma.order.count({
        where: {
          assignedAgentMemberId: member.id,
          agentDispatchStatus: 'COMPLETED',
        },
      }),
      // Rewards earned
      prisma.agentReward.findMany({
        where: { agentMemberId: member.id },
        orderBy: { awardedAt: 'desc' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      agent: {
        id: member.id,
        memberCode: member.memberCode,
        displayName: member.displayName,
        phone: member.user?.phone,
        email: member.user?.email,
        isAgent: member.isAgent || ['REGIONAL_AGENT', 'MASTER_AGENT'].includes(member.agentType),
        agentType: member.agentType,
        agentStatus: member.agentStatus,
        agentCity: member.agentCity || member.city || 'Belum diatur',
        agentProvince: member.agentProvince || member.province || 'Belum diatur',
        agentAddress: member.agentAddress || member.addressDetail || 'Belum diatur',
        agentInventory: member.agentInventory || 0,
        agentDepositBalance: member.agentDepositBalance || 0,
        agentDiscountType: member.agentDiscountType || config.defaultDiscountType,
        agentDiscountValue: member.agentDiscountValue || config.defaultDiscountValue,
        stats: {
          assignedOrdersWaiting: assignedOrdersCount,
          completedDistributions: completedDistributionCount,
          rewardsCount: totalRewards.length,
        },
        rewards: totalRewards,
      },
      config: {
        minimumRestockBox: config.minimumRestockBox,
        defaultDiscountType: config.defaultDiscountType,
        defaultDiscountValue: config.defaultDiscountValue,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memuat profil agen.' }, { status: 500 });
  }
}
