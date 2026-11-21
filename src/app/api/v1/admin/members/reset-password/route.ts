import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { resolveCorporateAdmin } from '@/lib/api-auth';
import { isMaintenanceAdmin } from '@/lib/auth';

/**
 * POST /api/v1/admin/members/reset-password
 * Authorized roles: OWNER, OPERATIONS, ADMIN_1, ADMIN_2
 * Resets member password and logs audit trail.
 */
export async function POST(req: Request) {
  try {
    const adminSession = await resolveCorporateAdmin(req);
    if (!adminSession) {
      return NextResponse.json({ error: 'Akses ditolak. Sesi admin diperlukan.' }, { status: 401 });
    }

    if (!isMaintenanceAdmin(adminSession.roles)) {
      return NextResponse.json(
        { error: 'Akses tidak diizinkan. Hanya Owner, Operasional, Admin 1, dan Admin 2 yang berwenang mereset password mitra.' },
        { status: 403 }
      );
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const body = await req.json();
    const { memberId, newPassword, reason } = body;

    if (!memberId) {
      return NextResponse.json({ error: 'ID Mitra wajib disertakan.' }, { status: 400 });
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password baru minimal harus terdiri dari 6 karakter.' },
        { status: 400 }
      );
    }

    const cleanReason = (reason || '').trim() || 'Permintaan reset password oleh admin / customer service';

    // Cari member beserta user
    const member = await prisma.member.findFirst({
      where: {
        OR: [{ id: memberId }, { memberCode: memberId }],
      },
      include: {
        user: true,
      },
    });

    if (!member || !member.user) {
      return NextResponse.json({ error: 'Data mitra / user tidak ditemukan.' }, { status: 404 });
    }

    // Hash password baru
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password di database
    await prisma.user.update({
      where: { id: member.user.id },
      data: {
        passwordHash,
        updatedAt: new Date(),
      },
    });

    // Catat ke AuditLog
    await prisma.auditLog.create({
      data: {
        actorUserId: adminSession.userId,
        action: 'ADMIN_RESET_MEMBER_PASSWORD',
        entityType: 'USER',
        entityId: member.user.id,
        reason: `${cleanReason} (Reset oleh ${adminSession.displayName || adminSession.email} [${adminSession.roles.join(', ')}])`,
        ipAddress: ip,
        afterJson: JSON.stringify({
          memberCode: member.memberCode,
          memberName: member.displayName,
          email: member.user.email,
          resetBy: adminSession.userId,
          resetAt: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Password mitra ${member.displayName} (${member.memberCode}) berhasil direset.`,
      memberCode: member.memberCode,
      memberName: member.displayName || member.legalName,
      email: member.user.email,
      phone: member.user.phone || '',
      newPassword,
    });
  } catch (err: any) {
    console.error('Reset password error:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal memproses reset password mitra.' },
      { status: 500 }
    );
  }
}
