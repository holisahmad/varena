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
              orders: {
                where: {
                  orderStatus: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'COMPLETED'] },
                },
                select: {
                  id: true,
                  orderNumber: true,
                  orderType: true,
                  total: true,
                  createdAt: true,
                },
                take: 1,
              },
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

    const formatted = members.map((m) => {
      const isLeaderOrCorp =
        m.memberCode.startsWith('VRN-LDR-') ||
        m.memberCode.startsWith('VRN-CORP-') ||
        m.memberCode === 'VRN-0001';
      const hasCompletedPurchase = Boolean(m.user?.orders && m.user.orders.length > 0);

      return {
        id: m.id,
        userId: m.userId,
        memberCode: m.memberCode,
        displayName: m.displayName,
        legalName: m.legalName,
        nik: m.nik,
        memberStatus: m.memberStatus,
        // isActive: flat field agar mudah dibaca UI
        isActive: m.memberStatus === 'ACTIVE',
        isLeaderOrCorp,
        hasCompletedPurchase,
        firstOrderNumber: m.user?.orders?.[0]?.orderNumber || null,
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
      };
    });

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

    if (!action) {
      return NextResponse.json({ error: 'Parameter action wajib diisi.' }, { status: 400 });
    }

    // Aksi Massal: Sinkronkan seluruh akun mitra non-leader yang belum belanja wajib ke PENDING
    if (action === 'SYNC_ALL_UNPAID') {
      const candidates = await prisma.member.findMany({
        where: {
          memberStatus: 'ACTIVE',
          NOT: {
            OR: [
              { memberCode: 'VRN-0001' },
              { memberCode: { startsWith: 'VRN-LDR-' } },
              { memberCode: { startsWith: 'VRN-CORP-' } },
            ],
          },
        },
        include: {
          user: {
            include: {
              orders: {
                where: {
                  orderStatus: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'COMPLETED'] },
                },
                select: { id: true },
              },
            },
          },
        },
      });

      const unpaidMembers = candidates.filter((c) => !c.user?.orders || c.user.orders.length === 0);
      const unpaidIds = unpaidMembers.map((m) => m.id);

      if (unpaidIds.length > 0) {
        await prisma.member.updateMany({
          where: { id: { in: unpaidIds } },
          data: {
            memberStatus: 'PENDING',
            activatedAt: null,
          },
        });

        await prisma.auditLog.create({
          data: {
            actorUserId: adminSession.userId,
            action: 'MEMBERS_SYNC_UNPAID_STATUS',
            entityType: 'MEMBER',
            entityId: 'BATCH_SYNC',
            beforeJson: JSON.stringify({ count: unpaidIds.length, targetIds: unpaidIds }),
            afterJson: JSON.stringify({ memberStatus: 'PENDING' }),
            reason: 'Sinkronisasi massal: menyetel status akun non-leader tanpa belanja wajib menjadi PENDING (Belum Aktif)',
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: `Sinkronisasi selesai. Sebanyak ${unpaidIds.length} mitra non-leader tanpa transaksi belanja wajib berhasil disetel ke Belum Aktif (PENDING).`,
        syncedCount: unpaidIds.length,
      });
    }

    if (!memberId) {
      return NextResponse.json({ error: 'Parameter memberId wajib diisi untuk aksi ini.' }, { status: 400 });
    }

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: { user: true },
    });

    if (!member) {
      return NextResponse.json({ error: 'Data mitra tidak ditemukan.' }, { status: 404 });
    }

    // 1. Aktivasi Akun Manual (Dispensasi / Kebijakan Khusus Manajemen)
    if (action === 'ACTIVATE_MEMBER') {
      const cleanReason = (reason || '').trim();
      if (!cleanReason || cleanReason.length < 5) {
        return NextResponse.json(
          {
            error:
              'Alasan kebijakan khusus wajib diisi minimal 5 karakter (misal: talenta marketing berprestasi, dispensasi khusus manajemen, atau pembayaran offline).',
          },
          { status: 400 }
        );
      }

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
          afterJson: JSON.stringify({ memberStatus: 'ACTIVE', specialPolicyExemption: true }),
          reason: cleanReason,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Akun mitra ${member.displayName} (${member.memberCode}) berhasil diaktifkan dengan kebijakan khusus: "${cleanReason}".`,
      });
    }

    // 2. Setel Status ke Belum Aktif (PENDING - Menunggu Belanja Wajib)
    if (action === 'SET_PENDING') {
      await prisma.member.update({
        where: { id: member.id },
        data: {
          memberStatus: 'PENDING',
          activatedAt: null,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorUserId: adminSession.userId,
          action: 'MEMBER_SET_PENDING',
          entityType: 'MEMBER',
          entityId: member.id,
          beforeJson: JSON.stringify({ memberStatus: member.memberStatus }),
          afterJson: JSON.stringify({ memberStatus: 'PENDING' }),
          reason: (reason || '').trim() || 'Disetel ke Belum Aktif karena belum menyelesaikan pembelanjaan paket perdana wajib.',
        },
      });

      return NextResponse.json({
        success: true,
        message: `Status akun mitra ${member.displayName} (${member.memberCode}) berhasil disetel ke Belum Aktif (PENDING).`,
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
