import prisma from './prisma';
import { getPlacementUplines, getDirectSponsor } from './network';
import { postLedgerTransaction } from './ledger';
import { withTransactionRetry } from './security';

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

  // A. Determine First Pack Activation vs Repeat Purchase Portion
  // Aturan Bisnis VARENA:
  // - Mitra baru wajib order minimal 1 produk paket perdana (Kopi Premium Rp500.000).
  // - Dari 1 pack perdana tersebut: Bonus Sponsor Rp50.000 ke upline langsung, dan Bonus Pengembangan Rp10.000 x 10 level (Rp100.000).
  // - Kelebihan qty atau produk lain yang dibeli bersamaan dinilai sebagai Repeat Order:
  //   Hanya menghasilkan bonus jaringan sesuai setting produk (misal Rp2.000 per level x 10 level), tanpa bonus sponsor ganda.
  const firstPackItemIndex = order.items.findIndex(
    (it) => it.variant.allowFirstPack || it.variant.price >= 500000 || it.variant.packSize >= 10
  );
  const hasFirstPack = firstPackItemIndex >= 0 && order.orderType === 'FIRST_PACK';

  // --- REWARD 1: DIRECT SPONSOR REWARD (Hanya dari 1 Pack Perdana Pertama) ---
  if (hasFirstPack) {
    let sponsorBeneficiary: any = null;

    if (order.buyerUserId) {
      const buyerMember = await prisma.member.findUnique({
        where: { userId: order.buyerUserId },
      });
      if (buyerMember) {
        const uplineSponsor = await getDirectSponsor(buyerMember.id);
        if (uplineSponsor && uplineSponsor.memberStatus === 'ACTIVE') {
          sponsorBeneficiary = uplineSponsor;
        }
      }
    }

    if (!sponsorBeneficiary) {
      sponsorBeneficiary = referralMember;
    }

    const primaryFirstPack = order.items[firstPackItemIndex];
    const sponsorRewardAmount =
      primaryFirstPack?.variant?.sponsorReward !== undefined && primaryFirstPack?.variant?.sponsorReward > 0
        ? primaryFirstPack.variant.sponsorReward
        : plan.firstPackDirectReward; // Rp50.000

    itemsToCreate.push({
      beneficiaryId: sponsorBeneficiary.id,
      beneficiaryCode: sponsorBeneficiary.memberCode,
      rewardType: 'DIRECT_SPONSOR',
      levelNumber: 0,
      amount: sponsorRewardAmount,
      reasonCode: `DIRECT_SPONSOR_BONUS_FROM_${order.orderNumber}`,
    });
    totalDistributed += sponsorRewardAmount;
  }

  // Upline Network Structure (Up to 10 Levels)
  const maxLevels = plan.firstPackDevMaxLevels || 10;
  const uplines = await getPlacementUplines(referralMember.id, maxLevels);

  // --- REWARD 2: FIRST PACK DEVELOPMENT REWARD (10 Level dari 1 Pack Perdana) ---
  if (hasFirstPack) {
    const primaryFirstPack = order.items[firstPackItemIndex];
    const devAmountPerLevel =
      primaryFirstPack?.variant?.uplineRewardPerLevel !== undefined && primaryFirstPack?.variant?.uplineRewardPerLevel > 0
        ? primaryFirstPack.variant.uplineRewardPerLevel
        : plan.firstPackDevReward; // Rp10.000

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

  // --- REWARD 3: REPEAT ORDER & MULTI-PRODUCT ADDITIONAL REWARD (Barang Selanjutnya / Kelebihannya) ---
  // Menghitung akumulasi bonus jaringan untuk semua item di luar 1 pack perdana pertama:
  let totalRepeatRewardPerLevel = 0;

  if (hasFirstPack) {
    const primaryFirstPack = order.items[firstPackItemIndex];
    const excessQty = Math.max(0, primaryFirstPack.quantity - 1);
    if (excessQty > 0) {
      // Kelebihan qty dari pack perdana dinilai repeat order (default Rp2.000 / box)
      const excessRate = plan.repeatDevReward || 2000;
      totalRepeatRewardPerLevel += excessQty * excessRate;
    }

    // Seluruh item lain selain 1 pack perdana pertama
    for (let i = 0; i < order.items.length; i++) {
      if (i === firstPackItemIndex) continue;
      const otherItem = order.items[i];
      const rate =
        otherItem.variant?.uplineRewardPerLevel !== undefined && otherItem.variant?.uplineRewardPerLevel > 0
          ? otherItem.variant.uplineRewardPerLevel
          : plan.repeatDevReward || 2000;
      totalRepeatRewardPerLevel += otherItem.quantity * rate;
    }
  } else {
    // Pesanan Repeat Purchase murni: seluruh item dihitung komisi repeat order
    for (const item of order.items) {
      const rate =
        item.variant?.uplineRewardPerLevel !== undefined && item.variant?.uplineRewardPerLevel > 0
          ? item.variant.uplineRewardPerLevel
          : plan.repeatDevReward || 2000;
      totalRepeatRewardPerLevel += item.quantity * rate;
    }
  }

  if (totalRepeatRewardPerLevel > 0) {
    for (let lvl = 1; lvl <= maxLevels; lvl++) {
      const uplineAtLevel = uplines.find((u) => u.level === lvl);
      if (uplineAtLevel && uplineAtLevel.memberStatus === 'ACTIVE') {
        itemsToCreate.push({
          beneficiaryId: uplineAtLevel.memberId,
          beneficiaryCode: uplineAtLevel.memberCode,
          rewardType: 'DEVELOPMENT_PLACEMENT',
          levelNumber: lvl,
          amount: totalRepeatRewardPerLevel,
          reasonCode: `REPEAT_DEV_L${lvl}_REWARD_FROM_${order.orderNumber}`,
        });
        totalDistributed += totalRepeatRewardPerLevel;
      } else {
        itemsToCreate.push({
          beneficiaryId: null,
          rewardType: 'UNALLOCATED_DEV_RESERVE',
          levelNumber: lvl,
          amount: totalRepeatRewardPerLevel,
          reasonCode: `REPEAT_DEV_L${lvl}_UNALLOCATED_EMPTY`,
        });
        unallocatedTotal += totalRepeatRewardPerLevel;
      }
    }
  }

  // 4. Persist Commission Run & Items in an ACID transaction
  return withTransactionRetry(async (tx) => {
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
          itemsCount: order.items.length,
          orderType: order.orderType,
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
          let readableMemo = item.reasonCode;
          if (item.rewardType === 'SPONSOR') {
            readableMemo = `Bonus Sponsor Langsung - Pesanan ${order.orderNumber}`;
          } else if (item.rewardType === 'DEVELOPMENT') {
            readableMemo = `Bonus Pembinaan Tim (Level ${item.levelNumber}) - Pesanan ${order.orderNumber}`;
          } else if (item.rewardType === 'REPEAT_ORDER') {
            readableMemo = `Bonus Generasi RO (Level ${item.levelNumber}) - Pesanan ${order.orderNumber}`;
          }

          ledgerEntries.push({
            accountCode: `ACC-MBR-${item.beneficiaryCode}`,
            direction: 'CREDIT',
            amount: item.amount,
            memo: readableMemo,
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
  });
}
