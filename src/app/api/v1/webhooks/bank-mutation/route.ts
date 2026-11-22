/**
 * BANK MUTATION WEBHOOK STUB — VARENA Platform
 *
 * Option B: Moota / CekMutasi
 * Status: DISABLED (BANK_MUTATION_ENABLED=false)
 *
 * To activate: set BANK_MUTATION_ENABLED=true + configure MOOTA_API_KEY or CEKMUTASI_API_KEY
 * Receives bank credit mutation notifications, matches by amount, auto-approves pending deposits.
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { recordDepositTopupLedger } from '@/lib/ledger';
import { enqueueWaMessage } from '@/lib/wa-queue';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (process.env.BANK_MUTATION_ENABLED !== 'true') {
    return NextResponse.json(
      { message: 'Integrasi mutasi bank belum diaktifkan. Hubungi admin untuk mengaktifkan.' },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();

    // Moota payload: { id, bank_account_id, amount, description, type, date }
    // CekMutasi payload: { account_number, type, amount, description, balance, date }
    const amount = Number(body.amount || 0);
    const description: string = body.description || body.ket || '';
    const mutationType: string = body.type || body.tipe || '';

    if (!amount || mutationType.toUpperCase() !== 'CR') {
      // Only process credit (incoming) mutations
      return NextResponse.json({ received: true, skipped: 'bukan mutasi kredit atau nominal tidak valid' });
    }

    // Find pending deposit transaction by amount
    // For more accurate matching, also check unique code (amount % 1000 == uniqueCode)
    const uniqueCode = amount % 1000;
    const baseAmount = amount - uniqueCode;

    // Cari transaksi dengan unique code cocok (prioritas) atau nominal exact match
    // Status yang valid: WAITING_VERIFICATION (sudah konfirmasi) atau PENDING (legacy)
    const pendingTx = await prisma.agentDepositTransaction.findFirst({
      where: {
        status: { in: ['WAITING_VERIFICATION', 'PENDING'] },
        OR: [
          // Prioritas: cocokkan uniqueCode agar akurat
          { uniqueCode: uniqueCode, amount: baseAmount },
          // Fallback: exact match nominal penuh
          { amount },
        ],
      },
      include: { member: { include: { user: { select: { phone: true } } } } },
      orderBy: { createdAt: 'asc' },
    });

    if (!pendingTx) {
      await prisma.auditLog.create({
        data: {
          action: 'BANK_MUTATION_UNMATCHED',
          entityType: 'PAYMENT',
          entityId: 'BANK_WEBHOOK',
          reason: `Mutasi bank masuk Rp${amount.toLocaleString('id-ID')} tidak cocok dengan deposit tertunda manapun. Deskripsi: ${description}`,
        },
      });
      return NextResponse.json({ received: true, matched: false });
    }

    const isShoppingDeposit = pendingTx.type === 'SHOPPING_TOPUP';
    const currentBalance = isShoppingDeposit
      ? (pendingTx.member.shoppingDepositBalance || 0)
      : (pendingTx.member.agentDepositBalance || 0);

    await prisma.$transaction(async (tx) => {
      // Atomic increment
      await tx.member.update({
        where: { id: pendingTx.memberId },
        data: isShoppingDeposit
          ? { shoppingDepositBalance: { increment: pendingTx.amount } }
          : { agentDepositBalance: { increment: pendingTx.amount } },
      });

      // Update deposit transaction status
      await tx.agentDepositTransaction.update({
        where: { id: pendingTx.id },
        data: {
          status: 'COMPLETED',
          balanceBefore: currentBalance,
          balanceAfter: currentBalance + pendingTx.amount,
          notes: `Auto-disetujui via mutasi bank. Deskripsi: ${description}`,
        },
      });

      // Post double-entry ledger
      await recordDepositTopupLedger({
        transactionId: pendingTx.id,
        memberCode: pendingTx.member.memberCode,
        amount: pendingTx.amount,
        isShoppingDeposit,
        referenceId: pendingTx.referenceId || pendingTx.id,
        txClient: tx,
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          action: 'BANK_MUTATION_AUTO_APPROVED',
          entityType: 'MEMBER',
          entityId: pendingTx.memberId,
          reason: `Deposit Rp${pendingTx.amount.toLocaleString('id-ID')} auto-disetujui via mutasi bank. TxID: ${pendingTx.id}`,
        },
      });
    });

    // Kirim notifikasi WA ke mitra secara async/non-blocking agar webhook bank lekas selesai (<50ms)
    const memberPhone = (pendingTx.member as any).user?.phone || '';
    if (memberPhone) {
      const isShoppingDeposit = pendingTx.type === 'SHOPPING_TOPUP';
      const typeLabel = isShoppingDeposit ? 'Belanja' : 'Agen';
      enqueueWaMessage({
        to: memberPhone,
        message:
          `🎉 *TOPUP SALDO ${typeLabel.toUpperCase()} DISETUJUI OTOMATIS* ✅\n\n` +
          `Halo *${pendingTx.member.displayName}*,\n` +
          `Pembayaran Anda telah terdeteksi dari mutasi bank dan saldo Anda telah otomatis ditambahkan:\n\n` +
          `💰 *Nominal:* Rp${pendingTx.amount.toLocaleString('id-ID')}\n` +
          `📋 *Ref:* \`${pendingTx.referenceId || pendingTx.id}\`\n\n` +
          `Gunakan saldo untuk bertransaksi di VARENA. Terima kasih! 🌿`,
      }).catch(() => {});
    }

    return NextResponse.json({ received: true, matched: true, transactionId: pendingTx.id });
  } catch (err: any) {
    console.error('[Webhook/BankMutation] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
