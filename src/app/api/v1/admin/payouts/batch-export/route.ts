import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyCorporateAdmin } from '@/lib/auth';

/**
 * GET /api/v1/admin/payouts/batch-export
 * Generates ready-to-upload Bank Disbursement CSV (KlikBCA Bisnis / Mandiri MCM / BRI CMS)
 */
export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    const userEmail = req.headers.get('x-user-email');
    const isAuthorized = await verifyCorporateAdmin(userId, userEmail);
    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Akses ditolak: Hanya pengelola korporasi yang berhak mengunduh file batch transfer bank.' },
        { status: 403 }
      );
    }
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'REQUESTED';

    const withdrawals = await prisma.withdrawalRequest.findMany({
      where: {
        status: status === 'ALL' ? undefined : status,
      },
      include: {
        member: {
          select: {
            memberCode: true,
            displayName: true,
            legalName: true,
            bankAccountNumber: true,
          },
        },
      },
      orderBy: { requestedAt: 'asc' },
    });

    // Generate CSV Header
    const headers = [
      'NO',
      'ID_PENGAJUAN',
      'KODE_MITRA',
      'NAMA_PENERIMA_BANK',
      'BANK_TUJUAN',
      'NOMOR_REKENING',
      'NOMINAL_BERSIH_TRANSFER',
      'BIAYA_ADMIN',
      'NOMINAL_PENARIKAN_BRUTO',
      'STATUS',
      'TANGGAL_REQUEST',
    ];

    const rows = withdrawals.map((w, index) => {
      // Use raw bankAccountNumber if bound to member, else use masked
      const rawAcc = w.member.bankAccountNumber || w.accountNumberMasked;
      return [
        index + 1,
        w.id,
        w.member.memberCode,
        `"${(w.accountHolder || w.member.displayName).replace(/"/g, '""')}"`,
        w.bankName,
        `'${rawAcc}'`, // quote to prevent Excel scientific notation
        w.netAmount,
        w.fee,
        w.amount,
        w.status,
        new Date(w.requestedAt).toISOString().split('T')[0],
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="VARENA_Payout_Disbursement_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err: any) {
    console.error('Batch export error:', err);
    return NextResponse.json({ error: err.message || 'Gagal export data payout.' }, { status: 500 });
  }
}
