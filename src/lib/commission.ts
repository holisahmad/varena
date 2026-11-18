import prisma from './prisma';
import { getPlacementUplines, getDirectSponsor } from './network';
import { postLedgerTransaction } from './ledger';

export interface CommissionResult {
  runId: string;
  totalDistributed: number;
  unallocatedAmount: number;
  itemCount: number;
  items: Array<{
    rewardType: string;
    level: number;
    beneficiaryCode?: string;
    amount: number;
    reason: string;
  }>;
}

/**
 * Deterministic, idempotent commission calculation engine
 */
export async function calculateOrderCommissions(orderId: string): Promise<CommissionResult> {
  const idempotencyKey = `COMM-RUN-${orderId}`;

  // 1. Fetch Order with items and referral
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { variant: true } },
      referralMember: true,
      commissionRuns: { where: { idempotencyKey } },
    },
  });

  if (!order) {
    throw new Error(`Order ${orderId} not found.`);
  }

  // Idempotency: If already calculated, return summary of existing run
  if (order.commissionRuns && order.commissionRuns.length > 0) {
    const existingRun = order.commissionRuns[0];
    const items = await prisma.commissionItem.findMany({
      where: { commissionRunId: existingRun.id },
      include: { beneficiary: true },
    });

    return {
      runId: existingRun.id,
      totalDistributed: existingRun.totalCommission,
      unallocatedAmount: existingRun.unallocatedAmount,
      itemCount: items.length,
      items: items.map((i) => ({
        rewardType: i.rewardType,
        level: i.levelNumber,
        beneficiaryCode: i.beneficiary?.memberCode,
        amount: i.amount,
        reason: i.reasonCode || '',
      })),
    };
  }

  // 2. Fetch active Marketing Plan
  const plan = await prisma.marketingPlan.findFirst({
    where: { status: 'ACTIVE' },
    orderBy: { version: 'desc' },
  });

  if (!plan) {
    throw new Error('No active Marketing Plan found.');
  }

  // 3. Determine Beneficiaries
  const referralMember = order.referralMember;
  if (!referralMember) {
    // If order has no referral attribution, 100% margin stays in company ops
    return {
      runId: 'NO_REFERRAL',
      totalDistributed: 0,
      unallocatedAmount: 0,
      itemCount: 0,
      items: [],
    };
  }

  // Calculate items to reward
  const itemsToCreate: Array<{
    beneficiaryId: string | null;
    beneficiaryCode?: string;
    rewardType: string;
    levelNumber: number;
    amount: number;
    reasonCode: string;
  }> = [];

  let totalDistributed = 0;
  let unallocatedTotal = 0;

  // A. Check Order Type & Calculate
  // Is this First Pack or Repeat Purchase?
  const hasFirstPack = order.items.some((it) => it.variant.packSize >= 10);
  const totalSachets = order.items.reduce((acc, it) => acc + (it.variant.packSize === 1 ? it.quantity : 0), 0);

  // --- REWARD 1: DIRECT SPONSOR REWARD ---
  if (hasFirstPack) {
    // Sponsor of the buyer member or the referring member gets the direct reward
    const directSponsor = await getDirectSponsor(referralMember.id);
    const sponsorBeneficiary = directSponsor || referralMember;

    itemsToCreate.push({
      beneficiaryId: sponsorBeneficiary.id,
      beneficiaryCode: sponsorBeneficiary.memberCode,
      rewardType: 'DIRECT_SPONSOR',
      levelNumber: 0,
      amount: plan.firstPackDirectReward, // Rp50.000
      reasonCode: `DIRECT_SPONSOR_BONUS_FROM_${order.orderNumber}`,
    });
    totalDistributed += plan.firstPackDirectReward;
  }

  // --- REWARD 2: DEVELOPMENT PLACEMENT REWARD (Up to 10 Levels Upline) ---
  const maxLevels = plan.firstPackDevMaxLevels; // 10
  const uplines = await getPlacementUplines(referralMember.id, maxLevels);

  if (hasFirstPack) {
    const devAmountPerLevel = plan.firstPackDevReward; // Rp10.000
    for (let lvl = 1; lvl <= maxLevels; lvl++) {
      const uplineAtLevel = uplines.find((u) => u.level === lvl);
      if (uplineAtLevel && uplineAtLevel.memberStatus === 'ACTIVE') {
        itemsToCreate.push({
          beneficiaryId: uplineAtLevel.memberId,
          beneficiaryCode: uplineAtLevel.memberCode,
          rewardType: 'DEVELOPMENT_PLACEMENT',
          levelNumber: lvl,
          amount: devAmountPerLevel,
          reasonCode: `DEV_UPLINE_L${lvl}_REWARD_FROM_${order.orderNumber}`,
        });
        totalDistributed += devAmountPerLevel;
      } else {
        // Unallocated slot -> reserve account
        itemsToCreate.push({
          beneficiaryId: null,
          rewardType: 'UNALLOCATED_DEV_RESERVE',
          levelNumber: lvl,
          amount: devAmountPerLevel,
          reasonCode: `DEV_UPLINE_L${lvl}_UNALLOCATED_EMPTY_OR_INACTIVE`,
        });
        unallocatedTotal += devAmountPerLevel;
      }
    }
  }

  // --- REWARD 3: REPEAT PURCHASE DEV REWARD ---
  if (totalSachets > 0) {
    const devSachetPerLevel = plan.repeatDevReward * totalSachets; // Rp2.000 * qty
    for (let lvl = 1; lvl <= maxLevels; lvl++) {
      const uplineAtLevel = uplines.find((u) => u.level === lvl);
      if (uplineAtLevel && uplineAtLevel.memberStatus === 'ACTIVE') {
        itemsToCreate.push({
          beneficiaryId: uplineAtLevel.memberId,
          beneficiaryCode: uplineAtLevel.memberCode,
          rewardType: 'DEVELOPMENT_PLACEMENT',
          levelNumber: lvl,
          amount: devSachetPerLevel,
          reasonCode: `REPEAT_DEV_L${lvl}_REWARD_${totalSachets}SCH_${order.orderNumber}`,
        });
        totalDistributed += devSachetPerLevel;
      } else {
        itemsToCreate.push({
          beneficiaryId: null,
          rewardType: 'UNALLOCATED_DEV_RESERVE',
          levelNumber: lvl,
          amount: devSachetPerLevel,
          reasonCode: `REPEAT_DEV_L${lvl}_UNALLOCATED_EMPTY`,
        });
        unallocatedTotal += devSachetPerLevel;
      }
    }
  }

  // 4. Persist Commission Run & Items in an ACID transaction
  return prisma.$transaction(async (tx) => {
    const commissionRun = await tx.commissionRun.create({
      data: {
        sourceOrderId: order.id,
        planVersionId: plan.id,
        calculationStatus: 'COMPLETED',
        idempotencyKey,
        totalCommission: totalDistributed,
        unallocatedAmount: unallocatedTotal,
        inputSnapshot: JSON.stringify({
          orderNumber: order.orderNumber,
          referralMemberId: referralMember.id,
          hasFirstPack,
          totalSachets,
        }),
      },
    });

    for (const item of itemsToCreate) {
      await tx.commissionItem.create({
        data: {
          commissionRunId: commissionRun.id,
          beneficiaryMemberId: item.beneficiaryId,
          rewardType: item.rewardType,
          levelNumber: item.levelNumber,
          amount: item.amount,
          status: item.beneficiaryId ? 'ELIGIBLE' : 'HELD',
          reasonCode: item.reasonCode,
          formulaSnapshot: `Plan ${plan.planCode} v${plan.version}`,
        },
      });
    }

    // 5. Post to Double-Entry Ledger (pass existing tx client to prevent nested transaction deadlock)
    const grandCommissionTotal = totalDistributed + unallocatedTotal;
    if (grandCommissionTotal > 0) {
      const ledgerEntries: Array<{
        accountCode: string;
        direction: 'DEBIT' | 'CREDIT';
        amount: number;
        memo: string;
      }> = [];

      // DEBIT Company Operations Account for commission expense
      ledgerEntries.push({
        accountCode: 'ACC-COMP-OPS',
        direction: 'DEBIT',
        amount: grandCommissionTotal,
        memo: `Commission Expense for Order ${order.orderNumber}`,
      });

      // CREDIT Each Member's Wallet Account
      for (const item of itemsToCreate) {
        if (item.beneficiaryCode && item.amount > 0) {
          ledgerEntries.push({
            accountCode: `ACC-MBR-${item.beneficiaryCode}`,
            direction: 'CREDIT',
            amount: item.amount,
            memo: item.reasonCode,
          });
        }
      }

      // CREDIT Unallocated Reserve Account for unfilled slots
      if (unallocatedTotal > 0) {
        ledgerEntries.push({
          accountCode: 'ACC-COMP-UNALLOC',
          direction: 'CREDIT',
          amount: unallocatedTotal,
          memo: `Unallocated Placement Development Reserve from ${order.orderNumber}`,
        });
      }

      // Post balanced transaction using current tx client
      await postLedgerTransaction({
        referenceType: 'COMMISSION_CREDIT',
        referenceId: commissionRun.id,
        idempotencyKey: `LEDGER-COMM-${commissionRun.id}`,
        memo: `Auto Commission Disbursement for Order ${order.orderNumber}`,
        entries: ledgerEntries,
      }, tx);
    }

    return {
      runId: commissionRun.id,
      totalDistributed,
      unallocatedAmount: unallocatedTotal,
      itemCount: itemsToCreate.length,
      items: itemsToCreate.map((i) => ({
        rewardType: i.rewardType,
        level: i.levelNumber,
        beneficiaryCode: i.beneficiaryCode,
        amount: i.amount,
        reason: i.reasonCode,
      })),
    };
  }, { maxWait: 15000, timeout: 30000 });
}
