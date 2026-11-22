import prisma from './prisma';

export const DEPOSIT_EXPIRATION_HOURS = 1;
export const DEPOSIT_EXPIRATION_MS = DEPOSIT_EXPIRATION_HOURS * 60 * 60 * 1000;

export interface ConfirmDepositPayload {
  transactionId: string;
  memberCode?: string;
  proofUrl?: string;
  bankName?: string;
  accountNumber?: string;
  notes?: string;
}

/**
 * Sweep and expire deposit requests that are still in PENDING_PAYMENT status and past the 1-hour window.
 */
export async function sweepExpiredDeposits(): Promise<number> {
  const cutoffTime = new Date(Date.now() - DEPOSIT_EXPIRATION_MS);
  const result = await prisma.agentDepositTransaction.updateMany({
    where: {
      status: 'PENDING_PAYMENT',
      createdAt: { lt: cutoffTime },
      type: { in: ['SHOPPING_TOPUP', 'TOPUP_DEPOSIT'] },
    },
    data: {
      status: 'EXPIRED',
    },
  });
  return result.count;
}

/**
 * Confirm payment by member/agent (with or without proof image).
 * Transitions status from PENDING_PAYMENT to WAITING_VERIFICATION.
 */
export async function confirmDepositPayment(payload: ConfirmDepositPayload) {
  const { transactionId, memberCode, proofUrl, bankName, accountNumber, notes } = payload;

  const tx = await prisma.agentDepositTransaction.findUnique({
    where: { id: transactionId },
    include: { member: true },
  });

  if (!tx) {
    throw new Error('Transaksi deposit tidak ditemukan.');
  }

  if (memberCode && tx.member.memberCode !== memberCode) {
    throw new Error('Akses ditolak: Transaksi bukan milik akun Anda.');
  }

  if (tx.status === 'COMPLETED') {
    throw new Error('Transaksi deposit sudah disetujui sebelumnya.');
  }

  if (tx.status === 'REJECTED') {
    throw new Error('Transaksi deposit telah ditolak oleh admin.');
  }

  if (tx.status === 'EXPIRED') {
    throw new Error('Batas waktu pembayaran deposit telah kedaluwarsa (1 jam). Silakan ajukan deposit baru.');
  }

  // Check if past 1 hour and not yet confirmed
  const isExpired = Date.now() - new Date(tx.createdAt).getTime() > DEPOSIT_EXPIRATION_MS;
  if (isExpired && tx.status === 'PENDING_PAYMENT') {
    await prisma.agentDepositTransaction.update({
      where: { id: transactionId },
      data: { status: 'EXPIRED' },
    });
    throw new Error('Batas waktu pembayaran deposit telah kedaluwarsa (1 jam). Silakan ajukan deposit baru.');
  }

  const updated = await prisma.agentDepositTransaction.update({
    where: { id: transactionId },
    data: {
      status: 'WAITING_VERIFICATION',
      proofUrl: proofUrl || tx.proofUrl || null,
      bankName: bankName || tx.bankName || null,
      accountNumber: accountNumber || tx.accountNumber || null,
      notes: notes
        ? (tx.notes ? `${tx.notes} | Konfirmasi: ${notes}` : notes)
        : tx.notes,
      updatedAt: new Date(),
    },
  });

  return updated;
}
