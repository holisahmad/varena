import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyXenditCallbackToken } from '@/lib/xendit-payout';
import { postLedgerTransaction } from '@/lib/ledger';
import { dispatchWaMessage, templatePayoutDisbursed } from '@/lib/whatsapp';
import { withTransactionRetry } from '@/lib/security';

/**
 * POST /api/v1/payout/webhook
 * Webhook listener for Xendit Disbursement status callbacks
 */
export async function POST(req: Request) {
  try {
    const callbackToken = req.headers.get('x-callback-token');
    if (!verifyXenditCallbackToken(callbackToken)) {
      return NextResponse.json({ error: 'Token callback tidak valid.' }, { status: 401 });
    }

    const payload = await req.json();
    const { external_id, status, id: xenditId, failure_code } = payload;

    if (!external_id) {
      return NextResponse.json({ error: 'Parameter external_id wajib ada.' }, { status: 400 });
    }

    // external_id format: DISB-{withdrawalIdShort}-{timestamp} or WD-{withdrawalId}
    const withdrawal = await prisma.withdrawalRequest.findFirst({
      where: {
        OR: [
          { providerReference: xenditId },
          { id: { startsWith: external_id.replace(/^DISB-|^WD-/, '').split('-')[0] } },
        ],
      },
      include: {
        member: {
          include: {
            user: { select: { phone: true } },
          },
        },
      },
    });

    if (!withdrawal) {
      return NextResponse.json({ success: true, message: 'Withdrawal record not found or already processed.' });
    }

    if (status === 'COMPLETED' && withdrawal.status !== 'PAID') {
      const memberCode = withdrawal.member.memberCode;
      const refNumber = xenditId || external_id;

      await withTransactionRetry(async (tx) => {
        await tx.withdrawalRequest.update({
          where: { id: withdrawal.id },
          data: {
            status: 'PAID',
            paidAt: new Date(),
            providerReference: refNumber,
          },
        });

        // Double-entry ledger
        await postLedgerTransaction(
          {
            referenceType: 'WITHDRAWAL_PAID',
            referenceId: withdrawal.id,
            idempotencyKey: `LEDGER-WD-XENDIT-${withdrawal.id}`,
            memo: `Xendit disbursement completed for ${memberCode} ref: ${refNumber}`,
            entries: [
              {
                accountCode: `ACC-MBR-${memberCode}`,
                direction: 'DEBIT',
                amount: withdrawal.amount,
                memo: `Withdrawal payout via Xendit - ref ${refNumber}`,
              },
              {
                accountCode: 'ACC-COMP-PAYOUT',
                direction: 'CREDIT',
                amount: withdrawal.netAmount,
                memo: `Net bank transfer disbursement via Xendit for WD ${withdrawal.id.slice(0, 8)}`,
              },
              ...(withdrawal.fee > 0
                ? [
                    {
                      accountCode: 'ACC-COMP-OPS',
                      direction: 'CREDIT' as const,
                      amount: withdrawal.fee,
                      memo: `Disbursement platform admin fee (10% + transfer fee Rp5.000)`,
                    },
                  ]
                : []),
            ],
          },
          tx
        );
      });

      // Dispatch WhatsApp notification
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
            refNumber,
          }),
          referenceId: withdrawal.id,
        }).catch((e) => console.error('WA Payout webhook notification error:', e));
      }
    } else if (status === 'FAILED') {
      await prisma.withdrawalRequest.update({
        where: { id: withdrawal.id },
        data: {
          status: 'FAILED',
          rejectionReason: `Gagal transfer via Xendit: ${failure_code || 'Unknown reason'}`,
        },
      });
    }

    return NextResponse.json({ success: true, status: 'PROCESSED' });
  } catch (err: any) {
    console.error('Xendit webhook error:', err);
    return NextResponse.json({ error: err.message || 'Webhook processing failed.' }, { status: 500 });
  }
}
