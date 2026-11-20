import { NextResponse } from 'next/server';
import { resolveCorporateAdmin } from '@/lib/api-auth';
import prisma from '@/lib/prisma';
import { getCorporateUser } from '@/lib/auth';
import { postLedgerTransaction } from '@/lib/ledger';
import { withTransactionRetry } from '@/lib/security';
import { dispatchWaMessage, templatePayoutDisbursed } from '@/lib/whatsapp';

/**
 * POST /api/v1/admin/payouts/batch-approve
 * Bulk approval of multiple withdrawals with batch bank reference
 */
export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    const userEmail = req.headers.get('x-user-email');
    const body = await req.json();
    const { withdrawalIds, batchReference, actorUserId } = body;

    const authUser = await getCorporateUser(userId || actorUserId, userEmail);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Akses ditolak: Hanya pengelola korporasi yang berhak menyetujui penarikan massal.' },
        { status: 403 }
      );
    }

    if (!withdrawalIds || !Array.isArray(withdrawalIds) || withdrawalIds.length === 0) {
      return NextResponse.json(
        { error: 'Pilih minimal satu permohonan penarikan untuk disetujui.' },
        { status: 400 }
      );
    }

    const ref = batchReference?.trim() || `BATCH-TRF-${Date.now().toString().slice(-6)}`;

    const withdrawals = await prisma.withdrawalRequest.findMany({
      where: {
        id: { in: withdrawalIds },
        status: { in: ['REQUESTED', 'UNDER_REVIEW'] },
      },
      include: {
        member: {
          include: {
            user: { select: { phone: true } },
          },
        },
      },
    });

    if (withdrawals.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada permohonan penarikan valid (REQUESTED/UNDER_REVIEW) yang ditemukan.' },
        { status: 400 }
      );
    }

    const processedList: any[] = [];

    // Execute atomic batch execution
    await withTransactionRetry(async (tx) => {
      for (const w of withdrawals) {
        // 1. Update status to PAID
        const updated = await tx.withdrawalRequest.update({
          where: { id: w.id },
          data: {
            status: 'PAID',
            reviewedBy: actorUserId || 'ADMIN_FINANCE_BATCH',
            reviewedAt: new Date(),
            paidAt: new Date(),
            providerReference: `${ref}-${w.id.slice(0, 4)}`,
          },
        });

        // 2. Post balanced ledger transaction
        await postLedgerTransaction(
          {
            referenceType: 'WITHDRAWAL_PAID',
            referenceId: w.id,
            idempotencyKey: `LEDGER-WD-${w.id}`,
            memo: `Batch disbursement to ${w.bankName} (${w.accountNumberMasked}) ref: ${ref}`,
            entries: [
              {
                accountCode: `ACC-MBR-${w.member.memberCode}`,
                direction: 'DEBIT',
                amount: w.amount,
                memo: `Batch withdrawal payout approved - ref ${ref}`,
              },
              {
                accountCode: 'ACC-COMP-PAYOUT',
                direction: 'CREDIT',
                amount: w.netAmount,
                memo: `Net bank transfer disbursement for WD ${w.id.slice(0, 8)}`,
              },
              ...(w.fee > 0
                ? [
                    {
                      accountCode: 'ACC-COMP-OPS',
                      direction: 'CREDIT' as const,
                      amount: w.fee,
                      memo: 'Disbursement administrative transfer fee',
                    },
                  ]
                : []),
            ],
          },
          tx
        );

        // 3. Audit trail
        await tx.auditLog.create({
          data: {
            actorUserId: authUser.id,
            action: 'PAYOUT_BATCH_APPROVED',
            entityType: 'WITHDRAWAL',
            entityId: w.id,
            afterJson: JSON.stringify({ batchReference: ref, netAmount: w.netAmount }),
            reason: `Batch verified bank transfer disbursement executed (${withdrawals.length} items)`,
          },
        });

        processedList.push({
          id: w.id,
          memberCode: w.member.memberCode,
          phone: w.member.user?.phone,
          name: w.member.displayName,
          netAmount: w.netAmount,
          bankName: w.bankName,
          accountNumberMasked: w.accountNumberMasked,
          refNumber: `${ref}-${w.id.slice(0, 4)}`,
        });
      }
    });

    // 4. Asynchronous WhatsApp Notifications dispatch (non-blocking)
    for (const item of processedList) {
      if (item.phone) {
        dispatchWaMessage({
          recipientPhone: item.phone,
          recipientName: item.name,
          templateType: 'PAYOUT_DISBURSED',
          message: templatePayoutDisbursed({
            memberName: item.name,
            netAmount: item.netAmount,
            bankName: item.bankName,
            accountNumberMasked: item.accountNumberMasked,
            refNumber: item.refNumber,
          }),
          referenceId: item.id,
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil memproses pencairan massal untuk ${processedList.length} permohonan.`,
      processedCount: processedList.length,
      batchReference: ref,
    });
  } catch (err: any) {
    console.error('Batch approve error:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal memproses persetujuan pencairan massal.' },
      { status: 500 }
    );
  }
}
