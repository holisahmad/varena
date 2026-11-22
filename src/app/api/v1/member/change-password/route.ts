import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { getTokenFromRequest, verifySessionToken } from '@/lib/jwt';
import { checkRateLimit, detectSuspiciousPatterns } from '@/lib/security';

async function getAuthSession(req: Request) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  return verifySessionToken(token);
}

// Common weak passwords to block
const COMMON_WEAK_PASSWORDS = new Set([
  '12345678',
  'password',
  'password123',
  '123456789',
  '1234567890',
  'qwerty123',
  'admin123',
  'varena123',
  'varenaluxury',
  'indonesia123',
]);

/**
 * POST /api/v1/member/change-password
 * Allows a member to securely update or set their password.
 */
export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

    // 1. Authenticate member
    const session = await getAuthSession(req);
    const body = await req.json();

    const targetUserId = session?.userId || body.userId;
    const targetMemberCode = session?.memberCode || body.memberCode;

    if (!targetUserId && !targetMemberCode) {
      return NextResponse.json(
        { error: 'Sesi login tidak valid atau kadaluarsa. Silakan login kembali.' },
        { status: 401 }
      );
    }

    // 2. Rate limiting (max 5 password change attempts per 15 mins per user, max 15 per IP)
    const userRate = checkRateLimit(`pwd_change_user:${targetUserId || targetMemberCode}`, 5, 15 * 60 * 1000);
    if (!userRate.allowed) {
      return NextResponse.json(
        { error: `Terlalu banyak percobaan ganti kata sandi. Demi keamanan, silakan coba lagi dalam ${userRate.retryAfterSec} detik.` },
        { status: 429, headers: { 'Retry-After': String(userRate.retryAfterSec) } }
      );
    }

    const ipRate = checkRateLimit(`pwd_change_ip:${ip}`, 15, 15 * 60 * 1000);
    if (!ipRate.allowed) {
      return NextResponse.json(
        { error: `Terlalu banyak permintaan dari IP Anda. Silakan coba lagi dalam ${ipRate.retryAfterSec} detik.` },
        { status: 429, headers: { 'Retry-After': String(ipRate.retryAfterSec) } }
      );
    }

    const { currentPassword, newPassword, confirmPassword } = body;

    // 3. Injection and suspicious payload scan
    if (detectSuspiciousPatterns([newPassword, currentPassword].filter(Boolean).join(' '))) {
      return NextResponse.json({ error: 'Input terdeteksi mengandung format tidak valid / mencurigakan.' }, { status: 400 });
    }

    // 4. Validate inputs
    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json({ error: 'Kata sandi baru wajib diisi.' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Kata sandi baru minimal harus terdiri dari 8 karakter.' }, { status: 400 });
    }

    if (newPassword.length > 128) {
      return NextResponse.json({ error: 'Kata sandi baru maksimal 128 karakter.' }, { status: 400 });
    }

    // Must contain letter and number
    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    if (!hasLetter || !hasNumber) {
      return NextResponse.json(
        { error: 'Kata sandi harus mengombinasikan huruf dan angka untuk keamanan optimal.' },
        { status: 400 }
      );
    }

    if (COMMON_WEAK_PASSWORDS.has(newPassword.toLowerCase())) {
      return NextResponse.json(
        { error: 'Kata sandi terlalu umum dan mudah ditebak. Gunakan kombinasi yang lebih unik.' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'Konfirmasi kata sandi tidak cocok dengan kata sandi baru.' }, { status: 400 });
    }

    // 5. Fetch user and member
    const member = await prisma.member.findFirst({
      where: targetMemberCode ? { memberCode: targetMemberCode } : { userId: targetUserId },
      include: { user: true },
    });

    if (!member || !member.user) {
      return NextResponse.json({ error: 'Akun mitra tidak ditemukan.' }, { status: 404 });
    }

    const user = member.user;

    // 6. Check if this is initial password setup for Google-only user
    const googleReg = await prisma.auditLog.findFirst({
      where: {
        actorUserId: user.id,
        action: 'MEMBER_REGISTERED_VIA_GOOGLE',
      },
    });

    const customPwdLog = await prisma.auditLog.findFirst({
      where: {
        OR: [
          { actorUserId: user.id, action: 'PASSWORD_CHANGED' },
          { entityId: member.id, action: 'MEMBER_PASSWORD_RESET' },
          { actorUserId: user.id, action: 'MEMBER_REGISTERED' },
        ],
      },
    });

    const isInitialPasswordSetup = Boolean(googleReg && !customPwdLog);

    // If NOT initial setup (or if current password was provided), current password is required and must match
    if (!isInitialPasswordSetup || currentPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Kata sandi saat ini wajib diisi untuk verifikasi keamanan.' }, { status: 400 });
      }

      const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isCurrentValid) {
        // Record failed attempt in audit log
        try {
          await prisma.auditLog.create({
            data: {
              actorUserId: user.id,
              action: 'PASSWORD_CHANGE_FAILED',
              entityType: 'MEMBER',
              entityId: member.id,
              ipAddress: ip,
              reason: 'Kata sandi saat ini salah',
            },
          });
        } catch {}

        return NextResponse.json({ error: 'Kata sandi saat ini salah. Silakan periksa kembali.' }, { status: 400 });
      }

      // Check if new password is identical to current password
      if (currentPassword === newPassword) {
        return NextResponse.json({ error: 'Kata sandi baru tidak boleh sama dengan kata sandi saat ini.' }, { status: 400 });
      }
    }

    // 7. Hash new password with bcrypt (cost 12 for high security standard)
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // 8. Update user password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      },
    });

    // 9. Record security audit log
    try {
      await prisma.auditLog.create({
        data: {
          actorUserId: user.id,
          action: 'PASSWORD_CHANGED',
          entityType: 'MEMBER',
          entityId: member.id,
          ipAddress: ip,
          reason: isInitialPasswordSetup
            ? 'Pembuatan kata sandi awal mandiri oleh akun Google mitra'
            : 'Perubahan kata sandi mandiri oleh mitra',
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: isInitialPasswordSetup
        ? 'Kata sandi akun Anda berhasil dibuat! Sekarang Anda dapat login menggunakan email dan kata sandi.'
        : 'Kata sandi akun Anda berhasil diperbarui dengan aman.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Terjadi kesalahan sistem saat memperbarui kata sandi.' },
      { status: 500 }
    );
  }
}
