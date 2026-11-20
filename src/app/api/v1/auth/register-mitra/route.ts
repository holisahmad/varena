import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { checkRateLimit, detectSuspiciousPatterns, withTransactionRetry } from '@/lib/security';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

    // 1. Rate limiting: max 10 registrations per hour per IP
    const rateCheck = checkRateLimit(`reg:${ip}`, 10, 60 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Terlalu banyak permintaan pendaftaran. Coba lagi dalam ${rateCheck.retryAfterSec} detik.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email, password, displayName, legalName, phone, sponsorCode, placementParentCode } = body;

    // 2. Suspicious injection check
    const rawInputs = [email, displayName, legalName, phone, sponsorCode, placementParentCode].filter(Boolean).join(' ');
    if (detectSuspiciousPatterns(rawInputs)) {
      return NextResponse.json(
        { error: 'Input terdeteksi mengandung format tidak valid / mencurigakan.' },
        { status: 400 }
      );
    }

    if (!email || !password || !displayName || !sponsorCode) {
      return NextResponse.json(
        { error: 'Email, password, nama, dan kode sponsor wajib diisi.' },
        { status: 400 }
      );
    }

    // 2b. Strict Gmail constraint for manual registration
    const cleanEmail = email.trim().toLowerCase();
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!gmailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: 'Pendaftaran manual hanya menerima alamat Gmail aktif (@gmail.com) agar faktur dan notifikasi resmi dapat terkirim.' },
        { status: 400 }
      );
    }

    // 2c. WhatsApp Phone Validation
    const cleanPhone = (phone || '').trim().replace(/[\s-]/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      return NextResponse.json(
        { error: 'Nomor WhatsApp aktif wajib diisi untuk konfirmasi pengiriman pesanan dan notifikasi komisi.' },
        { status: 400 }
      );
    }

    // 1. Verify sponsor
    const sponsor = await prisma.member.findUnique({
      where: { memberCode: sponsorCode.trim() },
    });

    if (!sponsor || sponsor.memberStatus !== 'ACTIVE') {
      return NextResponse.json(
        { error: `Kode sponsor '${sponsorCode}' tidak valid atau tidak aktif.` },
        { status: 400 }
      );
    }

    // 2. Verify placement parent (default to sponsor if not specified)
    let parentMember = sponsor;
    if (placementParentCode && placementParentCode.trim() !== '') {
      const specifiedParent = await prisma.member.findUnique({
        where: { memberCode: placementParentCode.trim() },
      });
      if (specifiedParent && specifiedParent.memberStatus === 'ACTIVE') {
        parentMember = specifiedParent;
      }
    }

    // 3. Generate unique Member Code (e.g. VRN-1004)
    const count = await prisma.member.count();
    const newCode = `VRN-${(count + 1000).toString().padStart(4, '0')}`;

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await withTransactionRetry(async (tx) => {
      // Create User
      const user = await tx.user.create({
        data: {
          email,
          phone: phone || null,
          displayName,
          passwordHash,
          status: 'ACTIVE',
        },
      });

      // Role MITRA
      const role = await tx.role.findUnique({ where: { code: 'MITRA' } });
      if (role) {
        await tx.userRole.create({
          data: { userId: user.id, roleId: role.id },
        });
      }

      // Create Member
      const member = await tx.member.create({
        data: {
          userId: user.id,
          memberCode: newCode,
          displayName,
          legalName: legalName || displayName,
          memberStatus: 'ACTIVE',
          kycStatus: 'VERIFIED',
          activatedAt: new Date(),
        },
      });

      // Immutable Sponsor Relationship
      await tx.sponsorRelationship.create({
        data: {
          memberId: member.id,
          sponsorMemberId: sponsor.id,
          reason: 'PUBLIC_ONBOARDING_REFERRAL',
          createdBy: user.id,
        },
      });

      // Active Placement Relationship
      await tx.placementRelationship.create({
        data: {
          memberId: member.id,
          parentMemberId: parentMember.id,
          status: 'ACTIVE',
          createdBy: user.id,
        },
      });

      // Create Wallet Account
      await tx.ledgerAccount.create({
        data: {
          ownerType: 'MEMBER',
          ownerId: member.id,
          accountCode: `ACC-MBR-${member.memberCode}`,
          accountType: 'LIABILITY',
          currency: 'IDR',
          balance: 0,
          status: 'ACTIVE',
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: 'MEMBER_REGISTERED',
          entityType: 'MEMBER',
          entityId: member.id,
          afterJson: JSON.stringify({ memberCode: newCode, sponsorCode: sponsor.memberCode }),
        },
      });

      return { user, member };
    });

    return NextResponse.json({
      success: true,
      message: 'Pendaftaran mitra berhasil!',
      member: {
        code: result.member.memberCode,
        displayName: result.member.displayName,
      },
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal melakukan pendaftaran.' },
      { status: 500 }
    );
  }
}

