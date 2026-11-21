import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveCorporateAdmin } from '@/lib/api-auth';
import { isMaintenanceAdmin } from '@/lib/auth';
import { signSessionToken, buildSessionCookie, type AuthSession } from '@/lib/jwt';

/**
 * POST /api/v1/admin/impersonate
 * Authorized roles: OWNER, OPERATIONS, ADMIN_1, ADMIN_2
 * Allows maintenance admin to inspect member account without knowing password.
 * Zero disruption to member's actual device or active session.
 */
export async function POST(req: Request) {
  try {
    const adminSession = await resolveCorporateAdmin(req);
    if (!adminSession) {
      return NextResponse.json({ error: 'Akses ditolak. Sesi admin diperlukan.' }, { status: 401 });
    }

    if (!isMaintenanceAdmin(adminSession.roles)) {
      return NextResponse.json(
        { error: 'Akses tidak diizinkan. Hanya Owner, Operasional, Admin 1, dan Admin 2 yang berwenang melakukan inspeksi akun mitra.' },
        { status: 403 }
      );
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const body = await req.json();
    const { memberId, reason } = body;

    if (!memberId) {
      return NextResponse.json({ error: 'ID atau Kode Mitra wajib disertakan.' }, { status: 400 });
    }

    const cleanReason = (reason || '').trim() || 'Inspeksi kendala akun mitra oleh tim maintenance admin';

    // Cari data member
    const member = await prisma.member.findFirst({
      where: {
        OR: [{ id: memberId }, { memberCode: memberId }],
      },
      include: {
        user: {
          include: {
            userRoles: { include: { role: true } },
          },
        },
        sponsorRel: {
          include: {
            sponsor: true,
          },
        },
      },
    });

    if (!member || !member.user) {
      return NextResponse.json({ error: 'Data mitra tidak ditemukan.' }, { status: 404 });
    }

    const isAgent = Boolean(
      member.isAgent ||
      ['MASTER_AGENT', 'REGIONAL_AGENT'].includes(member.agentType || '') ||
      ['MASTER', 'MOBILE'].includes(member.stockistType || '')
    );

    // Siapkan impersonation session
    const impersonatedSession: AuthSession = {
      userId: member.user.id,
      email: member.user.email,
      displayName: member.displayName || member.user.displayName,
      roles: member.user.userRoles.map((ur) => ur.role.code),
      memberId: member.id,
      memberCode: member.memberCode,
      isAgent,
      agentStatus: member.agentStatus || (isAgent ? 'ACTIVE' : undefined),
      agentCity: member.agentCity || member.stockistCity || undefined,
      sponsorCode: member.sponsorRel?.sponsor?.memberCode || undefined,
      sponsorName: member.sponsorRel?.sponsor?.displayName || member.sponsorRel?.sponsor?.legalName || undefined,
      isImpersonated: true,
      impersonatedBy: adminSession.userId,
      impersonatorName: adminSession.displayName || adminSession.email,
      impersonatorEmail: adminSession.email,
    };

    // Buat token impersonasi
    const impersonationToken = await signSessionToken(impersonatedSession);

    // Catat ke AuditLog
    await prisma.auditLog.create({
      data: {
        actorUserId: adminSession.userId,
        action: 'ADMIN_IMPERSONATE_START',
        entityType: 'MEMBER',
        entityId: member.id,
        reason: `${cleanReason} (Diinspeksi oleh ${adminSession.displayName || adminSession.email} [${adminSession.roles.join(', ')}])`,
        ipAddress: ip,
        afterJson: JSON.stringify({
          memberCode: member.memberCode,
          memberName: member.displayName,
          email: member.user.email,
          adminUserId: adminSession.userId,
          adminEmail: adminSession.email,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    const response = NextResponse.json({
      success: true,
      message: `Berhasil masuk ke akun mitra ${member.displayName} (${member.memberCode}).`,
      token: impersonationToken,
      user: {
        id: member.user.id,
        userId: member.user.id,
        email: member.user.email,
        displayName: member.displayName || member.user.displayName,
        legalName: member.legalName,
        phone: member.user.phone || null,
        roles: impersonatedSession.roles,
        memberId: member.id,
        memberCode: member.memberCode,
        isAgent,
        agentStatus: impersonatedSession.agentStatus,
        agentCity: impersonatedSession.agentCity,
        sponsorCode: impersonatedSession.sponsorCode,
        sponsorName: impersonatedSession.sponsorName,
        isImpersonated: true,
        impersonatedBy: adminSession.userId,
        impersonatorName: adminSession.displayName || adminSession.email,
        impersonatorEmail: adminSession.email,
      },
      redirectTo: '/member/wallet',
    });

    // Pasang session cookie
    response.headers.set('Set-Cookie', buildSessionCookie(impersonationToken));

    return response;
  } catch (err: any) {
    console.error('Impersonate error:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal memulai inspeksi akun mitra.' },
      { status: 500 }
    );
  }
}
