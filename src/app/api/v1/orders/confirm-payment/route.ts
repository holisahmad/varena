import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkRateLimit, detectSuspiciousPatterns } from '@/lib/security';

/**
 * POST /api/v1/orders/confirm-payment
 * Form konfirmasi pembayaran manual jika member salah transfer kode unik / lupa kode unik
 */
export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

    // Rate limiting: max 10 konfirmasi per 5 menit
    const rateCheck = checkRateLimit(`confirm-pay:${ip}`, 10, 5 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak permintaan konfirmasi. Silakan coba kembali beberapa saat lagi.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const {
      action,
      orderId,
      orderNumber,
      senderBankName,
      senderAccountName,
      transferAmountPaid,
      transferNotes,
      paymentProofUrl,
    } = body;

    // Handle Admin REJECT action
    if (action === 'REJECT') {
      const orderToReject = await prisma.order.findFirst({
        where: orderId ? { id: orderId } : { orderNumber: orderNumber?.trim() },
      });

      if (!orderToReject) {
        return NextResponse.json({ error: 'Pesanan tidak ditemukan.' }, { status: 404 });
      }

      await prisma.order.update({
        where: { id: orderToReject.id },
        data: { paymentConfirmationStatus: 'REJECTED' },
      });

      await prisma.auditLog.create({
        data: {
          action: 'PAYMENT_PROOF_REJECTED',
          entityType: 'ORDER',
          entityId: orderToReject.id,
          reason: 'Admin menolak bukti transfer manual (tidak valid / dana belum masuk)',
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Konfirmasi pembayaran ditolak. Member dapat mengajukan konfirmasi ulang.',
      });
    }

    if (!orderNumber || !senderBankName || !senderAccountName || !transferAmountPaid) {
      return NextResponse.json(
        { error: 'Nomor pesanan, nama bank pengirim, nama pemilik rekening, dan nominal transfer wajib diisi.' },
        { status: 400 }
      );
    }

    // Injection pattern detection
    const rawCheck = `${orderNumber} ${senderBankName} ${senderAccountName} ${transferNotes || ''}`;
    if (detectSuspiciousPatterns(rawCheck)) {
      return NextResponse.json(
        { error: 'Input terdeteksi mengandung format yang tidak diperbolehkan.' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber: orderNumber.trim() },
    });

    if (!order) {
      return NextResponse.json(
        { error: `Pesanan dengan nomor ${orderNumber} tidak ditemukan.` },
        { status: 404 }
      );
    }

    if (order.orderStatus === 'PAID' || order.orderStatus === 'COMPLETED' || order.orderStatus === 'SHIPPED') {
      return NextResponse.json(
        { error: `Pesanan ${orderNumber} sudah berstatus ${order.orderStatus} dan tidak perlu konfirmasi ulang.` },
        { status: 400 }
      );
    }

    const amountPaid = parseInt(transferAmountPaid, 10);
    if (isNaN(amountPaid) || amountPaid <= 0) {
      return NextResponse.json(
        { error: 'Nominal transfer tidak valid.' },
        { status: 400 }
      );
    }

    // Update order with payment proof & confirmation request
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentConfirmationStatus: 'SUBMITTED',
        senderBankName: senderBankName.trim(),
        senderAccountName: senderAccountName.trim(),
        transferAmountPaid: amountPaid,
        transferNotes: transferNotes ? transferNotes.trim() : null,
        paymentProofUrl: paymentProofUrl || null,
      },
    });

    // Record in Audit Trail
    await prisma.auditLog.create({
      data: {
        actorUserId: order.buyerUserId || null,
        action: 'PAYMENT_PROOF_SUBMITTED',
        entityType: 'ORDER',
        entityId: order.id,
        beforeJson: JSON.stringify({ paymentConfirmationStatus: order.paymentConfirmationStatus }),
        afterJson: JSON.stringify({
          paymentConfirmationStatus: 'SUBMITTED',
          senderBank: senderBankName,
          senderName: senderAccountName,
          amountPaid,
          hasProof: Boolean(paymentProofUrl),
        }),
        reason: `Member mengajukan konfirmasi pembayaran manual transfer bank untuk ${order.orderNumber}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Konfirmasi pembayaran untuk pesanan ${order.orderNumber} berhasil dikirimkan. Tim Finance VARENA akan segera memverifikasi mutasi rekening Anda.`,
      order: {
        orderNumber: updated.orderNumber,
        status: updated.orderStatus,
        confirmationStatus: updated.paymentConfirmationStatus,
      },
    });
  } catch (err: any) {
    console.error('Confirm payment error:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal mengirimkan konfirmasi pembayaran.' },
      { status: 500 }
    );
  }
}
