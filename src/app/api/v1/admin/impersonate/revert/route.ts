import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifySessionToken, buildSessionCookie } from '@/lib/jwt';

/**
 * POST /api/v1/admin/impersonate/revert
 * Reverts session from impersonated member back to original corporate admin.
 */
export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const body = await req.json().catch(() => ({}));
    const adminToken = body.adminToken || '';

    if (!adminToken) {
      return NextResponse.json({
        success: false,
        error: 'Token cadangan admin tidak ditemukan. Silakan login kembali ke panel admin.',
        redirectTo: '/login',
      });
    }

    const adminSession = await verifySessionToken(adminToken);
    if (!adminSession) {
      return NextResponse.json({
        success: false,
        error: 'Sesi admin telah kedaluwarsa. Silakan login ulang.',
        redirectTo: '/login',
      });
    }

    // Catat ke AuditLog
    await prisma.auditLog.create({
      data: {
        actorUserId: adminSession.userId,
        action: 'ADMIN_IMPERSONATE_END',
        entityType: 'USER',
        entityId: adminSession.userId,
        reason: `Selesai inspeksi akun mitra. Admin ${adminSession.displayName || adminSession.email} kembali ke panel admin.`,
        ipAddress: ip,
      },
    });

    const response = NextResponse.json({
      success: true,
      message: 'Berhasil keluar dari mode inspeksi dan kembali ke panel admin.',
      redirectTo: '/admin',
    });

    // Pulihkan cookie admin
    response.headers.set('Set-Cookie', buildSessionCookie(adminToken));

    return response;
  } catch (err: any) {
    console.error('Revert impersonate error:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal memulihkan sesi admin.' },
      { status: 500 }
    );
  }
}
