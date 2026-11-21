import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkRateLimit, detectSuspiciousPatterns } from '@/lib/security';
import { getMemberFromJWT } from '@/lib/auth';
import { resolveCorporateAdmin } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/member/bank-account?memberCode=VRN-0001
 * Retrieve bound bank account information
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const memberCode = searchParams.get('memberCode');

    if (!memberCode) {
      return NextResponse.json({ error: 'Kode member diperlukan.' }, { status: 400 });
    }

    // Auth guard: Admin korporasi boleh akses semua, member hanya miliknya sendiri
    const adminSession = await resolveCorporateAdmin(req);
    if (!adminSession) {
      const memberSession = await getMemberFromJWT(req);
      if (!memberSession) {
        return NextResponse.json({ error: 'Sesi tidak valid. Silakan login kembali.' }, { status: 401 });
      }
      if (memberSession.memberCode !== memberCode) {
        return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
      }
    }

    const member = await prisma.member.findUnique({
      where: { memberCode },
      select: {
        id: true,
        memberCode: true,
        displayName: true,
        legalName: true,
        bankName: true,
        bankAccountNumber: true,
        bankAccountHolder: true,
        bankLockedAt: true,
      },
    });

    if (!member) {
      return NextResponse.json({ error: 'Member tidak ditemukan.' }, { status: 404 });
    }

    const isLocked = Boolean(member.bankAccountNumber && member.bankAccountHolder);

    return NextResponse.json({
      success: true,
      bankInfo: {
        bankName: member.bankName || null,
        bankAccountNumber: member.bankAccountNumber || null,
        bankAccountHolder: member.bankAccountHolder || null,
        isLocked,
        bankLockedAt: member.bankLockedAt,
        registeredName: member.legalName || member.displayName,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memuat data rekening.' }, { status: 500 });
  }
}

/**
 * POST /api/v1/member/bank-account
 * Bind and permanently lock member's bank account for withdrawals
 */
export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

    // 1. Rate limiting
    const rateCheck = checkRateLimit(`bank_bind:${ip}`, 5, 10 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Terlalu banyak permintaan pengikatan rekening. Mohon tunggu ${rateCheck.retryAfterSec} detik.` },
        { status: 429 }
      );
    }

    // Auth guard: Ambil member dari JWT session
    const memberSession = await getMemberFromJWT(req);
    if (!memberSession || !memberSession.memberCode) {
      return NextResponse.json({ error: 'Sesi tidak valid. Silakan login kembali.' }, { status: 401 });
    }
    const memberCode = memberSession.memberCode;

    const body = await req.json();
    const { bankName, accountNumber, accountHolder } = body;

    // 2. Suspicious injection check
    const rawInputs = [memberCode, bankName, accountNumber, accountHolder].filter(Boolean).join(' ');
    if (detectSuspiciousPatterns(rawInputs)) {
      return NextResponse.json(
        { error: 'Input terdeteksi mengandung format yang dilarang.' },
        { status: 400 }
      );
    }

    if (!bankName || !accountNumber || !accountHolder) {
      return NextResponse.json(
        { error: 'Semua kolom (Nama Bank, Nomor Rekening, dan Nama Pemilik Rekening) wajib diisi.' },
        { status: 400 }
      );
    }

    const member = await prisma.member.findUnique({
      where: { memberCode },
      include: { user: true },
    });

    if (!member) {
      return NextResponse.json({ error: 'Member tidak ditemukan.' }, { status: 404 });
    }

    // 3. Security: Check if already locked
    if (member.bankAccountNumber && member.bankLockedAt) {
      return NextResponse.json(
        {
          error:
            'Rekening bank Anda sudah terikat dan terkunci secara permanen. Untuk perubahan data demi alasan keamanan, hubungi manajemen/admin korporasi.',
        },
        { status: 403 }
      );
    }

    // 4. Critical Security Validation:
    // Name on bank account MUST match member's registered name (legalName or displayName)
    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanHolder = normalize(accountHolder);
    const cleanLegal = normalize(member.legalName);
    const cleanDisplay = normalize(member.displayName);

    const isMatch =
      cleanHolder.length >= 3 &&
      (cleanLegal.includes(cleanHolder) ||
        cleanHolder.includes(cleanLegal) ||
        cleanDisplay.includes(cleanHolder) ||
        cleanHolder.includes(cleanDisplay));

    if (!isMatch) {
      return NextResponse.json(
        {
          error: `Nama pemilik rekening ('${accountHolder}') tidak sesuai dengan nama akun member terdaftar ('${member.legalName || member.displayName}'). Rekening bank wajib atas nama sendiri demi mencegah penyalahgunaan akun.`,
        },
        { status: 400 }
      );
    }

    const cleanAccNumber = accountNumber.trim().replace(/[^0-9]/g, '');
    if (cleanAccNumber.length < 5) {
      return NextResponse.json({ error: 'Nomor rekening bank tidak valid.' }, { status: 400 });
    }

    // 5. Update and Lock Member's Bank Account
    const updated = await prisma.member.update({
      where: { id: member.id },
      data: {
        bankName: bankName.trim().toUpperCase(),
        bankAccountNumber: cleanAccNumber,
        bankAccountHolder: accountHolder.trim(),
        bankLockedAt: new Date(),
      },
    });

    // 6. Audit Trail
    await prisma.auditLog.create({
      data: {
        actorUserId: member.userId,
        action: 'MEMBER_BANK_BOUND',
        entityType: 'MEMBER',
        entityId: member.id,
        afterJson: JSON.stringify({
          bankName: updated.bankName,
          accountNumberMasked: `${cleanAccNumber.slice(0, 3)}****${cleanAccNumber.slice(-3)}`,
          accountHolder: updated.bankAccountHolder,
        }),
        reason: 'Member successfully bound and locked their verified bank account.',
        ipAddress: ip,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Rekening bank berhasil disimpan dan dikunci untuk penarikan dana.',
      bankInfo: {
        bankName: updated.bankName,
        accountNumber: `${cleanAccNumber.slice(0, 3)}****${cleanAccNumber.slice(-3)}`,
        accountHolder: updated.bankAccountHolder,
        isLocked: true,
        bankLockedAt: updated.bankLockedAt,
      },
    });
  } catch (err: any) {
    console.error('Error binding bank account:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal menyimpan dan mengikat rekening bank.' },
      { status: 500 }
    );
  }
}
