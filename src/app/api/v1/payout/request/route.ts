import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requestPayout } from '@/lib/payout';
import { checkRateLimit } from '@/lib/security';
import { getMaintenanceConfig } from '@/lib/maintenance';
import { calculatePayoutFees, PAYOUT_CONFIG } from '@/config/payout';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const amount = parseInt(searchParams.get('amount') || '0', 10);

    let adminFeePercent = PAYOUT_CONFIG.manual.adminFeePercent;
    let bankFeeFlat = PAYOUT_CONFIG.manual.bankFeeFlat;
    let minAmount = PAYOUT_CONFIG.minimumAmount;

    try {
      const settings = await prisma.systemSetting.findMany({
        where: {
          key: { in: ['PAYOUT_ADMIN_FEE_PERCENT', 'PAYOUT_BANK_FEE_FLAT', 'MIN_PAYOUT_AMOUNT'] },
        },
      });
      for (const s of settings) {
        if (s.key === 'PAYOUT_ADMIN_FEE_PERCENT') {
          const val = parseFloat(s.value);
          if (!isNaN(val) && val >= 0) adminFeePercent = val;
        }
        if (s.key === 'PAYOUT_BANK_FEE_FLAT') {
          const val = parseInt(s.value, 10);
          if (!isNaN(val) && val >= 0) bankFeeFlat = val;
        }
        if (s.key === 'MIN_PAYOUT_AMOUNT') {
          const val = parseInt(s.value, 10);
          if (!isNaN(val) && val > 0) minAmount = val;
        }
      }
    } catch {
      // fallback
    }

    const fees = calculatePayoutFees(amount, { adminFeePercent, bankFeeFlat });
    return NextResponse.json({
      success: true,
      config: {
        activeScheme: PAYOUT_CONFIG.activeScheme,
        adminFeePercent,
        bankFeeFlat,
        manualFeeFlat: bankFeeFlat,
        gatewayAdminFeePercent: PAYOUT_CONFIG.gateway.adminFeePercent,
        gatewayTransferFeeFlat: PAYOUT_CONFIG.gateway.transferFeeFlat,
        minimumAmount: minAmount,
        xenditEnabled: PAYOUT_CONFIG.xendit.enabled,
      },
      calculation: fees,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const body = await req.json();
    const { memberCode, amount } = body;

    // 1. Rate limiting: max 5 requests per 10 minutes per IP/member
    const rateCheck = checkRateLimit(`payout:${memberCode || ip}`, 5, 10 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Terlalu banyak permintaan penarikan dana. Mohon tunggu ${rateCheck.retryAfterSec} detik.` },
        { status: 429 }
      );
    }

    if (!memberCode || !amount) {
      return NextResponse.json(
        { error: 'Kode member dan nominal penarikan wajib disertakan.' },
        { status: 400 }
      );
    }

    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount) || numAmount < 50000) {
      return NextResponse.json(
        { error: 'Nominal penarikan minimal Rp50.000 dan harus berupa angka valid.' },
        { status: 400 }
      );
    }

    const member = await prisma.member.findUnique({
      where: { memberCode },
    });

    if (!member) {
      return NextResponse.json({ error: 'Member tidak ditemukan.' }, { status: 404 });
    }

    // 2a. Global Maintenance / Freeze Check
    const maintenance = await getMaintenanceConfig();
    if (maintenance.isActive && maintenance.freezeWithdrawals) {
      return NextResponse.json(
        {
          error:
            maintenance.message ||
            'Layanan penarikan dana (WD) sedang dibekukan sementara untuk pemeliharaan sistem / audit keuangan berkala.',
        },
        { status: 503 }
      );
    }

    // 2b. Validasi Status Akun Mitra
    if (member.memberStatus !== 'ACTIVE') {
      if (
        member.memberStatus === 'SUSPENDED_WITHDRAWAL' ||
        member.memberStatus === 'SUSPENDED'
      ) {
        return NextResponse.json(
          {
            error:
              'Fasilitas penarikan dana (WD) untuk akun Anda ditangguhkan sementara oleh kantor pusat. Silakan hubungi admin VARENA.',
          },
          { status: 403 }
        );
      }
      if (member.memberStatus === 'PENDING') {
        return NextResponse.json(
          {
            error:
              'Akun Anda belum aktif. Selesaikan pembelian Paket Perdana terlebih dahulu untuk membuka fasilitas penarikan dana.',
          },
          { status: 403 }
        );
      }
      return NextResponse.json(
        {
          error: `Status akun Anda (${member.memberStatus}) tidak diizinkan melakukan penarikan dana.`,
        },
        { status: 403 }
      );
    }

    // Security Check: Enforce Bound Bank Account
    if (!member.bankAccountNumber || !member.bankName || !member.bankAccountHolder) {
      return NextResponse.json(
        {
          error:
            'Rekening bank belum diikat. Demi keamanan dana Anda dari pembajakan akun, daftarkan rekening bank atas nama sendiri terlebih dahulu.',
        },
        { status: 400 }
      );
    }

    const withdrawal = await requestPayout({
      memberId: member.id,
      amount: numAmount,
    });

    return NextResponse.json({
      success: true,
      message: 'Pengajuan penarikan dana berhasil dikirim untuk review finance.',
      withdrawal,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Gagal mengajukan penarikan dana.' },
      { status: 400 }
    );
  }
}

