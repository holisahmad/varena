import prisma from './prisma';
import { getMemberWallet, postLedgerTransaction } from './ledger';
import { withTransactionRetry } from './security';
import { dispatchWaMessage, templatePayoutDisbursed } from './whatsapp';
import { calculatePayoutFees, PAYOUT_CONFIG } from '@/config/payout';
import { executeXenditDisbursement } from './xendit-payout';

export interface RequestPayoutParams {
  memberId: string;
  amount: number;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
}

/**
 * Request Payout from Member Wallet (Enforces Bound Bank Account)
 */
export async function requestPayout(params: RequestPayoutParams) {
  const { memberId, amount } = params;

  if (amount < 50000) {
    throw new Error('Batas minimum penarikan saldo adalah Rp50.000.');
  }

  const member = await prisma.member.findUnique({
    where: { id: memberId },
  });

  if (!member) {
    throw new Error('Member tidak ditemukan.');
  }

  // Enforce Bound Bank Account
  const effectiveBank = member.bankName || params.bankName;
  const effectiveAcc = member.bankAccountNumber || params.accountNumber;
  const effectiveHolder = member.bankAccountHolder || params.accountHolder;

  if (!effectiveBank || !effectiveAcc || !effectiveHolder) {
    throw new Error(
      'Anda belum mendaftarkan rekening bank terikat. Daftarkan rekening bank atas nama sendiri terlebih dahulu sebelum melakukan penarikan.'
    );
  }

  // Check current ledger balance and unique code accumulation
  const wallet = await getMemberWallet(member.memberCode);
  const bonusBalance = wallet.availableBalance;
  const uniqueCodeBalance = member.uniqueCodeBalance || 0;

  // Rule: Saldo kode unik hanya dapat diikutsertakan ditarik jika sudah terakumulasi minimal Rp10.000.
  // Tambahan penarikan kode unik di atas Rp10.000 harus dalam kelipatan Rp1.000 (sisa ratusan tetap di akun member).
  const eligibleUniqueCode = uniqueCodeBalance >= 10000
    ? Math.floor(uniqueCodeBalance / 1000) * 1000
    : 0;
  const remainingInAccount = uniqueCodeBalance - eligibleUniqueCode;
  const totalWithdrawable = bonusBalance + eligibleUniqueCode;

  if (amount > totalWithdrawable) {
    if (uniqueCodeBalance > 0 && uniqueCodeBalance < 10000 && amount <= (bonusBalance + uniqueCodeBalance)) {
      throw new Error(
        `Saldo kode unik Anda (Rp${uniqueCodeBalance.toLocaleString('id-ID')}) belum mencapai batas minimal akumulasi Rp10.000 untuk dapat ditarik. Saldo yang dapat ditarik saat ini hanya bonus komisi: Rp${bonusBalance.toLocaleString('id-ID')}.`
      );
    }
    throw new Error(
      `Saldo tidak mencukupi. Total saldo dapat ditarik: Rp${totalWithdrawable.toLocaleString('id-ID')} (Bonus Komisi: Rp${bonusBalance.toLocaleString('id-ID')}, Kode Unik Eligible: Rp${eligibleUniqueCode.toLocaleString('id-ID')}${remainingInAccount > 0 ? `, Sisa Rp${remainingInAccount.toLocaleString('id-ID')} tersimpan di akun` : ''}), diminta: Rp${amount.toLocaleString('id-ID')}`
    );
  }

  // Calculate deduction split between bonus wallet and unique code balance
  const fromBonus = Math.min(bonusBalance, amount);
  const fromUniqueCode = amount - fromBonus;

  if (fromUniqueCode > 0) {
    if (uniqueCodeBalance < 10000) {
      throw new Error(
        `Saldo kode unik (Rp${uniqueCodeBalance.toLocaleString('id-ID')}) belum mencapai batas minimal Rp10.000 untuk dapat ditarik.`
      );
    }
    if (fromUniqueCode % 1000 !== 0) {
      throw new Error(
        `Penarikan dari saldo kode unik harus dalam kelipatan Rp1.000 (saat ini terambil Rp${fromUniqueCode.toLocaleString('id-ID')}).`
      );
    }
  }

  // Hitung potongan biaya penarikan (Manual Rp6.500 atau Gateway 10% + 5000)
  const fees = calculatePayoutFees(amount);
  const fee = fees.totalFee;
  const netAmount = fees.netAmount;

  if (netAmount <= 0) {
    throw new Error(
      `Nominal penarikan (Rp${amount.toLocaleString('id-ID')}) tidak mencukupi setelah dipotong ${fees.description}.`
    );
  }

  // Mask account number: e.g. "1234567890" -> "123****890"
  const cleanAcc = effectiveAcc.trim();
  const masked = cleanAcc.length > 6 
    ? `${cleanAcc.slice(0, 3)}****${cleanAcc.slice(-3)}`
    : '****' + cleanAcc.slice(-2);

  return withTransactionRetry(async (tx) => {
    // If unique code balance is used in this withdrawal, decrement it
    if (fromUniqueCode > 0) {
      await tx.member.update({
        where: { id: memberId },
        data: { uniqueCodeBalance: { decrement: fromUniqueCode } },
      });
    }

    const withdrawal = await tx.withdrawalRequest.create({
      data: {
        memberId,
        amount,
        fee,
        netAmount,
        bankName: effectiveBank,
        accountNumberMasked: masked,
        accountHolder: effectiveHolder,
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
    include: {
      member: {
        include: {
          user: { select: { phone: true } },
        },
      },
    },
  });

  if (!withdrawal) {
    throw new Error('Permohonan pencairan tidak ditemukan.');
  }

  if (withdrawal.status !== 'REQUESTED' && withdrawal.status !== 'UNDER_REVIEW') {
    throw new Error(`Permohonan dalam status ${withdrawal.status} tidak dapat disetujui.`);
  }

  const memberCode = withdrawal.member.memberCode;

  const result = await withTransactionRetry(async (tx) => {
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
          memo: `Disbursement platform administrative fee (10% admin + transfer fee Rp5.000)`,
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

  // 3b. Trigger Xendit Instant Disbursement jika gateway diaktifkan via ENV
  if (PAYOUT_CONFIG.xendit.enabled) {
    try {
      const xenditRes = await executeXenditDisbursement({
        withdrawalId: withdrawal.id,
        memberCode,
        bankName: withdrawal.bankName,
        accountNumber: withdrawal.member.bankAccountNumber || withdrawal.accountNumberMasked,
        accountHolder: withdrawal.accountHolder,
        netAmount: withdrawal.netAmount,
      });
      console.log('Xendit disbursement execution:', xenditRes.message);
    } catch (xErr) {
      console.warn('Xendit auto-disbursement execution warning:', xErr);
    }
  }

  // 4. Dispatch WhatsApp notification (Async/Non-blocking)
  const phone = withdrawal.member?.user?.phone;
  if (phone) {
    dispatchWaMessage({
      recipientPhone: phone,
      recipientName: withdrawal.member.displayName,
      templateType: 'PAYOUT_DISBURSED',
      message: templatePayoutDisbursed({
        memberName: withdrawal.member.displayName,
        netAmount: withdrawal.netAmount,
        bankName: withdrawal.bankName,
        accountNumberMasked: withdrawal.accountNumberMasked,
        refNumber: providerReference,
      }),
      referenceId: withdrawal.id,
    }).catch((err) => console.error('WA Payout notification error:', err));
  }

  return result;
}
