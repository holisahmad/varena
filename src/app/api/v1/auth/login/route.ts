import { NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { signSessionToken, buildSessionCookie } from '@/lib/jwt';
import prisma from '@/lib/prisma';
import {
  checkRateLimit,
  checkBruteForceLockout,
  recordFailedLogin,
  resetLoginAttempts,
  detectSuspiciousPatterns,
} from '@/lib/security';

export async function POST(req: Request) {
  try {
    // 1. IP extraction for security headers
    const forwardedFor = req.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';

    // 2. Rate Limit (DDoS / Flood Protection: max 10 attempts per minute per IP)
    const rateCheck = checkRateLimit(`login-ip-${ip}`, 10, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Terlalu banyak permintaan login dari IP Anda. Silakan coba lagi dalam ${rateCheck.retryAfterSec} detik.`,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateCheck.retryAfterSec) },
        }
      );
    }

    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email dan password wajib diisi.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // 3. Injection Scan
    if (detectSuspiciousPatterns(cleanEmail)) {
      await prisma.auditLog.create({
        data: {
          action: 'SECURITY_THREAT_BLOCKED',
          entityType: 'AUTH',
          entityId: ip,
          reason: 'Pola injeksi mencurigakan terdeteksi pada parameter email login.',
          ipAddress: ip,
        },
      });
      return NextResponse.json({ error: 'Permintaan tidak valid.' }, { status: 400 });
    }

    // 4. Brute-Force Lockout Check (Max 5 failed attempts per 15 min)
    const lockKey = `login-fail-${cleanEmail}-${ip}`;
    const lockout = checkBruteForceLockout(lockKey);
    if (lockout.isLocked) {
      await prisma.auditLog.create({
        data: {
          action: 'LOGIN_LOCKOUT_ENFORCED',
          entityType: 'USER',
          entityId: cleanEmail,
          reason: `Upaya login diblokir karena telah gagal 5x berturut-turut. Terkunci ${lockout.remainingSeconds} detik lagi.`,
          ipAddress: ip,
        },
      });

      return NextResponse.json(
        {
          error: `Akun/IP Anda terkunci sementara karena 5x percobaan login salah berturut-turut. Silakan tunggu ${Math.ceil(
            lockout.remainingSeconds / 60
          )} menit sebelum mencoba lagi.`,
        },
        { status: 429 }
      );
    }

    // 5. Authenticate
    let session: any = null;
    try {
      session = await authenticateUser(cleanEmail, password);
    } catch (authErr: any) {
      if (authErr.message === 'ACCOUNT_SUSPENDED') {
        return NextResponse.json(
          {
            error:
              'Akun Anda telah dinonaktifkan / ditangguhkan oleh Administrator. Silakan hubungi kantor VARENA untuk informasi lebih lanjut.',
          },
          { status: 403 }
        );
      }
      throw authErr;
    }

    if (!session) {
      recordFailedLogin(lockKey);

      return NextResponse.json(
        { error: 'Email atau password yang Anda masukkan salah.' },
        { status: 401 }
      );
    }

    // 6. Reset failed attempts on success
    resetLoginAttempts(lockKey);

    // Update lastLoginAt pada User (hemat baris DB dibandingkan menambah baris append-only di AuditLog)
    prisma.user.update({
      where: { id: session.userId },
      data: { lastLoginAt: new Date() },
    }).catch(() => {});

    // Audit log login khusus akun pengelola / admin / korporasi (kritis keamanan)
    const isAdminAccount = session.roles?.some((r: string) => ['OWNER', 'OPERATIONS', 'ADMIN_1', 'ADMIN_2', 'FINANCE', 'AUDITOR'].includes(r));
    if (isAdminAccount || process.env.AUDIT_LOG_ALL_LOGINS === 'true') {
      prisma.auditLog.create({
        data: {
          actorUserId: session.userId,
          action: 'LOGIN_SUCCESS',
          entityType: 'USER',
          entityId: session.userId,
          reason: `Login admin/staff berhasil dari IP ${ip}`,
          ipAddress: ip,
        },
      }).catch(() => {});
    }

    // Sign JWT token dan set cookie
    const token = await signSessionToken(session);
    const response = NextResponse.json({
      success: true,
      user: session,
      token,
    });
    response.headers.set('Set-Cookie', buildSessionCookie(token));
    return response;
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json(
      { error: err.message || 'Terjadi kesalahan internal pada server.' },
      { status: 500 }
    );
  }
}
