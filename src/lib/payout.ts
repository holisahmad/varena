import prisma from './prisma';
import { getMemberWallet, postLedgerTransaction } from './ledger';
import { withTransactionRetry } from './security';

export interface RequestPayoutParams {
  memberId: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

/**
 * Request Payout from Member Wallet
 */
export async function requestPayout(params: RequestPayoutParams) {
  const { memberId, amount, bankName, accountNumber, accountHolder } = params;

  if (amount < 50000) {
    throw new Error('Batas minimum penarikan saldo adalah Rp50.000.');
  }

  const member = await prisma.member.findUnique({
    where: { id: memberId },
  });

  if (!member) {
    throw new Error('Member tidak ditemukan.');
  }

  // Check current ledger balance
  const wallet = await getMemberWallet(member.memberCode);
  if (wallet.availableBalance < amount) {
    throw new Error(`Saldo tidak mencukupi. Saldo tersedia: Rp${wallet.availableBalance.toLocaleString('id-ID')}, diminta: Rp${amount.toLocaleString('id-ID')}`);
  }

  const fee = 5000; // Standar biaya transfer antar-bank
  const netAmount = amount - fee;

  // Mask account number: e.g. "1234567890" -> "123****890"
  const cleanAcc = accountNumber.trim();
  const masked = cleanAcc.length > 6 
    ? `${cleanAcc.slice(0, 3)}****${cleanAcc.slice(-3)}`
    : '****' + cleanAcc.slice(-2);

  return withTransactionRetry(async (tx) => {
    const withdrawal = await tx.withdrawalRequest.create({
      data: {
        memberId,
        amount,
        fee,
        netAmount,
        bankName,
        accountNumberMasked: masked,
        accountHolder,
        status: 'REQUESTED',
      },
    });

    return withdrawal;
  });
}

/**
 * Admin Maker-Checker: Approve and Disburse Payout
 */
export async function approvePayout({
  withdrawalId,
  actorUserId,
  providerReference,
}: {
  withdrawalId: string;
  actorUserId: string;
  providerReference: string;
}) {
  const withdrawal = await prisma.withdrawalRequest.findUnique({
    where: { id: withdrawalId },
    include: { member: true },
  });

  if (!withdrawal) {
    throw new Error('Permohonan pencairan tidak ditemukan.');
  }

  if (withdrawal.status !== 'REQUESTED' && withdrawal.status !== 'UNDER_REVIEW') {
    throw new Error(`Permohonan dalam status ${withdrawal.status} tidak dapat disetujui.`);
  }

  const memberCode = withdrawal.member.memberCode;

  return withTransactionRetry(async (tx) => {
    // 1. Update withdrawal status to PAID
    const updated = await tx.withdrawalRequest.update({
      where: { id: withdrawalId },
      data: {
        status: 'PAID',
        reviewedBy: actorUserId,
        reviewedAt: new Date(),
        paidAt: new Date(),
        providerReference,
      },
    });

    // 2. Post to Double-Entry Ledger using current transaction client
    await postLedgerTransaction({
      referenceType: 'WITHDRAWAL_PAID',
      referenceId: withdrawal.id,
      idempotencyKey: `LEDGER-WD-${withdrawal.id}`,
      memo: `Disbursement to ${withdrawal.bankName} (${withdrawal.accountNumberMasked}) ref: ${providerReference}`,
      entries: [
        {
          accountCode: `ACC-MBR-${memberCode}`,
          direction: 'DEBIT',
          amount: withdrawal.amount,
          memo: `Withdrawal payout approved - ref ${providerReference}`,
        },
        {
          accountCode: 'ACC-COMP-PAYOUT',
          direction: 'CREDIT',
          amount: withdrawal.netAmount,
          memo: `Net bank transfer disbursement for WD ${withdrawal.id.slice(0, 8)}`,
        },
        ...(withdrawal.fee > 0 ? [{
          accountCode: 'ACC-COMP-OPS',
          direction: 'CREDIT' as const,
          amount: withdrawal.fee,
          memo: `Disbursement administrative transfer fee`,
        }] : []),
      ],
    }, tx);

    // 3. Audit trail
    await tx.auditLog.create({
      data: {
        actorUserId,
        action: 'PAYOUT_APPROVED',
        entityType: 'WITHDRAWAL',
        entityId: withdrawal.id,
        afterJson: JSON.stringify({ providerReference, netAmount: withdrawal.netAmount }),
        reason: 'Verified bank transfer executed by finance',
      },
    });

    return updated;
  });
}
