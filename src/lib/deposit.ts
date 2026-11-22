import prisma from './prisma';
import { enqueueWaMessage } from './wa-queue';

export const DEPOSIT_EXPIRATION_HOURS = 1;
export const DEPOSIT_EXPIRATION_MS = DEPOSIT_EXPIRATION_HOURS * 60 * 60 * 1000;

// In-memory throttle agar tidak spam write query ke DB di setiap request
let lastSweepDepositTime = 0;
const SWEEP_THROTTLE_MS = 2 * 60 * 1000; // Maksimal sweep 1x per 2 menit per instance

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
 * Dilengkapi in-memory throttle 2 menit agar hemat kuota query database free tier.
 */
export async function sweepExpiredDeposits(): Promise<number> {
  const now = Date.now();
  if (now - lastSweepDepositTime < SWEEP_THROTTLE_MS) {
    return 0; // Skip: baru saja di-sweep beberapa saat lalu
  }
  lastSweepDepositTime = now;

  const cutoffTime = new Date(now - DEPOSIT_EXPIRATION_MS);
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

  // Kirim notifikasi WA ke admin secara async & non-blocking jika WA diaktifkan
  (async () => {
    try {
      if (process.env.WHATSAPP_ENABLED !== 'true') return; // Zero-query exit saat WA non-aktif
      const adminPhone = process.env.ADMIN_WA_NUMBER || 
        (await prisma.systemSetting.findUnique({ where: { key: 'ADMIN_WA_NUMBER' } }))?.value;
      if (adminPhone) {
        const depositType = tx.type === 'SHOPPING_TOPUP' ? 'Deposit Belanja Mitra' : 'Kas Deposit Agen';
        const proofLabel = proofUrl ? '📎 *Bukti Transfer Terlampir*' : '⚠️ *Tanpa Bukti Foto* (cocokkan mutasi bank)';
        await enqueueWaMessage({
          to: adminPhone,
          message:
            `🔔 *KONFIRMASI TOPUP BARU* — ${depositType}\n\n` +
            `👤 *Mitra:* ${tx.member.displayName} (${tx.member.memberCode})\n` +
            `💰 *Nominal:* Rp${tx.amount.toLocaleString('id-ID')}\n` +
            `🏦 *Bank Pengirim:* ${bankName || tx.bankName || '-'}\n` +
            `📋 *Ref:* \`${tx.referenceId || tx.id}\`\n` +
            `${proofLabel}\n\n` +
            `Silakan verifikasi dan setujui / tolak di dashboard admin VARENA.`,
        });
      }
    } catch {
      // Non-critical — silently ignore
    }
  })().catch(() => {});

  return updated;
}

/**
 * Cancel a pending deposit by member/agent.
 * Only allowed when status is PENDING_PAYMENT.
 */
export async function cancelDepositPayment(payload: { transactionId: string; memberCode?: string }) {
  const { transactionId, memberCode } = payload;

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

  if (tx.status !== 'PENDING_PAYMENT') {
    throw new Error(
      tx.status === 'WAITING_VERIFICATION'
        ? 'Konfirmasi sudah dikirim dan sedang diproses admin. Hubungi admin untuk pembatalan.'
        : `Transaksi tidak dapat dibatalkan karena status saat ini: ${tx.status}.`
    );
  }

  const cancelled = await prisma.agentDepositTransaction.update({
    where: { id: transactionId },
    data: { status: 'CANCELLED', notes: '[DIBATALKAN MITRA] Dibatalkan sebelum transfer.' },
  });

  return cancelled;
}
