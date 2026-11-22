import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveCorporateAdmin } from '@/lib/api-auth';

/**
 * GET /api/v1/admin/members?page=1&limit=20&q=...&status=ALL|ACTIVE|INACTIVE|AGENT
 * Dedicated member directory for corporate admin
 */
export async function GET(req: Request) {
  try {
    const adminSession = await resolveCorporateAdmin(req);
    if (!adminSession) {
      return NextResponse.json({ error: 'Akses ditolak. Sesi admin diperlukan.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(5, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;
    const q = (searchParams.get('q') || '').trim();
    const status = (searchParams.get('status') || 'ALL').toUpperCase();

    const where: any = {};

    if (q) {
      where.OR = [
        { memberCode: { contains: q, mode: 'insensitive' } },
        { displayName: { contains: q, mode: 'insensitive' } },
        { legalName: { contains: q, mode: 'insensitive' } },
        { nik: { contains: q, mode: 'insensitive' } },
        { bankAccountNumber: { contains: q, mode: 'insensitive' } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { user: { phone: { contains: q, mode: 'insensitive' } } },
      ];
    }

    if (status === 'ACTIVE') {
      where.memberStatus = 'ACTIVE';
    } else if (status === 'INACTIVE') {
      where.memberStatus = 'PENDING';
    } else if (status === 'SUSPENDED') {
      where.memberStatus = { in: ['SUSPENDED', 'SUSPENDED_WITHDRAWAL', 'SUSPENDED_LOGIN', 'TERMINATED'] };
    } else if (status === 'AGENT') {
      where.isAgent = true;
    }

    const [total, members] = await Promise.all([
      prisma.member.count({ where }),
      prisma.member.findMany({
        where,
        select: {
          id: true,
          userId: true,
          memberCode: true,
          displayName: true,
          legalName: true,
          nik: true,
          memberStatus: true,
          kycStatus: true,
          isAgent: true,
          agentType: true,
          agentStatus: true,
          agentCity: true,
          createdAt: true,
          bankName: true,
          bankAccountNumber: true,
          bankAccountHolder: true,
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              status: true,
              lastLoginAt: true,
            },
          },
          sponsorRel: {
            select: {
              sponsor: {
                select: {
                  id: true,
                  memberCode: true,
                  displayName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const formatted = members.map((m) => ({
      id: m.id,
      userId: m.userId,
      memberCode: m.memberCode,
      displayName: m.displayName,
      legalName: m.legalName,
      nik: m.nik,
      memberStatus: m.memberStatus,
      // isActive: flat field agar mudah dibaca UI
      isActive: m.memberStatus === 'ACTIVE',
      kycStatus: m.kycStatus,
      isAgent: m.isAgent,
      agentType: m.agentType,
      agentStatus: m.agentStatus,
      agentCity: m.agentCity,
      createdAt: m.createdAt,
      bankName: m.bankName,
      bankAccountNumber: m.bankAccountNumber,
      bankAccountHolder: m.bankAccountHolder,
      email: m.user?.email || null,
      phone: m.user?.phone || null,
      accountStatus: m.user?.status || 'ACTIVE',
      lastLoginAt: m.user?.lastLoginAt || null,
      // sponsorCode flat agar mudah dibaca UI
      sponsorCode: m.sponsorRel?.sponsor?.memberCode || null,
      sponsorName: m.sponsorRel?.sponsor?.displayName || null,
      sponsor: m.sponsorRel?.sponsor
        ? {
            code: m.sponsorRel.sponsor.memberCode,
            name: m.sponsorRel.sponsor.displayName,
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      members: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err: any) {
    console.error('Admin members list error:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal mengambil data daftar mitra.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/admin/members
 * Update status kemitraan (Aktivasi Manual, Suspend Tarik Dana, Suspend Login, Unsuspend)
 */
export async function POST(req: Request) {
  try {
    const adminSession = await resolveCorporateAdmin(req);
    if (!adminSession) {
      return NextResponse.json({ error: 'Akses ditolak. Sesi admin diperlukan.' }, { status: 401 });
    }

    const body = await req.json();
    const { action, memberId, reason } = body;

    if (!action || !memberId) {
      return NextResponse.json({ error: 'Parameter action dan memberId wajib diisi.' }, { status: 400 });
    }

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: { user: true },
    });

    if (!member) {
      return NextResponse.json({ error: 'Data mitra tidak ditemukan.' }, { status: 404 });
    }

    // 1. Aktivasi Akun Manual (misal bayar cash di kantor)
    if (action === 'ACTIVATE_MEMBER') {
      await prisma.member.update({
        where: { id: member.id },
        data: {
          memberStatus: 'ACTIVE',
          activatedAt: member.activatedAt || new Date(),
        },
      });

      await prisma.auditLog.create({
        data: {
          actorUserId: adminSession.userId,
          action: 'MEMBER_MANUALLY_ACTIVATED',
          entityType: 'MEMBER',
          entityId: member.id,
          beforeJson: JSON.stringify({ memberStatus: member.memberStatus }),
          afterJson: JSON.stringify({ memberStatus: 'ACTIVE' }),
          reason: reason || 'Aktivasi manual akun mitra oleh manajemen korporasi',
        },
      });

      return NextResponse.json({
        success: true,
        message: `Akun mitra ${member.displayName} (${member.memberCode}) berhasil diaktifkan.`,
      });
    }

    // 2. Suspend Tarik Dana (WD) — Mitra tetap bisa login dan belanja, tapi diblokir dari pencairan dana
    if (action === 'SUSPEND_WITHDRAWAL') {
      await prisma.member.update({
        where: { id: member.id },
        data: {
          memberStatus: 'SUSPENDED_WITHDRAWAL',
        },
      });

      await prisma.auditLog.create({
        data: {
          actorUserId: adminSession.userId,
          action: 'MEMBER_SUSPENDED_WITHDRAWAL',
          entityType: 'MEMBER',
          entityId: member.id,
          beforeJson: JSON.stringify({ memberStatus: member.memberStatus }),
          afterJson: JSON.stringify({ memberStatus: 'SUSPENDED_WITHDRAWAL' }),
          reason: reason || 'Penangguhan fasilitas penarikan dana oleh admin',
        },
      });

      return NextResponse.json({
        success: true,
        message: `Fasilitas tarik dana (WD) untuk mitra ${member.displayName} berhasil ditangguhkan. Mitra tetap dapat login dan belanja.`,
      });
    }

    // 3. Suspend Total (Blokir Login) — Mitra tidak bisa login sama sekali
    if (action === 'SUSPEND_LOGIN') {
      await prisma.$transaction(async (tx) => {
        await tx.member.update({
          where: { id: member.id },
          data: {
            memberStatus: 'SUSPENDED_LOGIN',
          },
        });

        await tx.user.update({
          where: { id: member.userId },
          data: {
            status: 'SUSPENDED',
          },
        });

        await tx.auditLog.create({
          data: {
            actorUserId: adminSession.userId,
            action: 'MEMBER_SUSPENDED_LOGIN',
            entityType: 'MEMBER',
            entityId: member.id,
            beforeJson: JSON.stringify({ memberStatus: member.memberStatus, userStatus: member.user?.status }),
            afterJson: JSON.stringify({ memberStatus: 'SUSPENDED_LOGIN', userStatus: 'SUSPENDED' }),
            reason: reason || 'Blokir total akun mitra (tidak bisa login) oleh admin',
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: `Akun mitra ${member.displayName} berhasil diblokir total (akses login ditutup).`,
      });
    }

    // 4. Pulihkan / Unsuspend Akun ke Normal (ACTIVE)
    if (action === 'UNSUSPEND') {
      await prisma.$transaction(async (tx) => {
        await tx.member.update({
          where: { id: member.id },
          data: {
            memberStatus: 'ACTIVE',
            activatedAt: member.activatedAt || new Date(),
          },
        });

        await tx.user.update({
          where: { id: member.userId },
          data: {
            status: 'ACTIVE',
          },
        });

        await tx.auditLog.create({
          data: {
            actorUserId: adminSession.userId,
            action: 'MEMBER_UNSUSPENDED',
            entityType: 'MEMBER',
            entityId: member.id,
            beforeJson: JSON.stringify({ memberStatus: member.memberStatus }),
            afterJson: JSON.stringify({ memberStatus: 'ACTIVE', userStatus: 'ACTIVE' }),
            reason: reason || 'Pemulihan akun mitra ke status aktif normal oleh admin',
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: `Akun mitra ${member.displayName} berhasil dipulihkan menjadi Aktif Normal.`,
      });
    }

    return NextResponse.json({ error: `Aksi '${action}' tidak dikenali.` }, { status: 400 });
  } catch (err: any) {
    console.error('Admin member action error:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal memproses aksi pada mitra.' },
      { status: 500 }
    );
  }
}
