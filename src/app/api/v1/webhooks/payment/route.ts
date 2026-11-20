/**
 * PAYMENT GATEWAY WEBHOOK STUB — VARENA Platform
 *
 * Option A: Xendit / Midtrans
 * Status: DISABLED (PAYMENT_GATEWAY_ENABLED=false)
 *
 * To activate: set PAYMENT_GATEWAY_ENABLED=true + configure XENDIT_SECRET_KEY or MIDTRANS_SERVER_KEY
 * Both Xendit AND Midtrans stubs are prepared; select provider via PAYMENT_GATEWAY_PROVIDER env var.
 */
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function verifyXenditSignature(rawBody: string, callbackToken: string): boolean {
  const secret = process.env.XENDIT_WEBHOOK_SECRET || '';
  if (!secret) return false;
  const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(callbackToken, 'hex'));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (process.env.PAYMENT_GATEWAY_ENABLED !== 'true') {
    return NextResponse.json(
      { message: 'Integrasi payment gateway belum diaktifkan. Hubungi admin untuk mengaktifkan.' },
      { status: 503 }
    );
  }

  try {
    const provider = process.env.PAYMENT_GATEWAY_PROVIDER || 'xendit';
    const rawBody = await req.text();
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    // ── Xendit ────────────────────────────────────────────────────────────────
    if (provider === 'xendit') {
      const callbackToken = req.headers.get('x-callback-token') || '';
      if (!verifyXenditSignature(rawBody, callbackToken)) {
        return NextResponse.json({ error: 'Signature tidak valid.' }, { status: 401 });
      }

      const { external_id, status, amount } = body;
      if (status === 'PAID' || status === 'SETTLED') {
        const order = await prisma.order.findFirst({
          where: {
            OR: [
              { orderNumber: external_id },
              { payments: { some: { providerReference: external_id } } },
            ],
          },
        });

        if (order && order.orderStatus === 'PENDING') {
          await prisma.$transaction([
            prisma.order.update({
              where: { id: order.id },
              data: { orderStatus: 'PAID', paidAt: new Date() },
            }),
            prisma.payment.updateMany({
              where: { orderId: order.id, status: 'PENDING' },
              data: { status: 'SUCCESS', paidAt: new Date(), providerReference: external_id },
            }),
            prisma.auditLog.create({
              data: {
                action: 'PAYMENT_AUTO_SETTLED',
                entityType: 'ORDER',
                entityId: order.id,
                reason: `Auto-settled via Xendit webhook. ExternalId: ${external_id}, Amount: ${amount}`,
              },
            }),
          ]);
        }
      }
    }

    // ── Midtrans ───────────────────────────────────────────────────────────────
    if (provider === 'midtrans') {
      const { order_id, transaction_status, gross_amount, signature_key } = body;
      const serverKey = process.env.MIDTRANS_SERVER_KEY || '';

      // Verify Midtrans signature
      const statusCode = body.status_code || '200';
      const computedSig = crypto
        .createHash('sha512')
        .update(`${order_id}${statusCode}${gross_amount}${serverKey}`)
        .digest('hex');

      if (serverKey && computedSig !== signature_key) {
        return NextResponse.json({ error: 'Signature tidak valid.' }, { status: 401 });
      }

      const settledStatuses = ['capture', 'settlement'];
      if (settledStatuses.includes(transaction_status)) {
        const order = await prisma.order.findFirst({ where: { orderNumber: order_id } });
        if (order && order.orderStatus === 'PENDING') {
          await prisma.$transaction([
            prisma.order.update({
              where: { id: order.id },
              data: { orderStatus: 'PAID', paidAt: new Date() },
            }),
            prisma.payment.updateMany({
              where: { orderId: order.id, status: 'PENDING' },
              data: { status: 'SUCCESS', paidAt: new Date() },
            }),
          ]);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[Webhook/Payment] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
