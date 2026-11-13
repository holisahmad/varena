import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, displayName, legalName, phone, sponsorCode, placementParentCode } = body;

    if (!email || !password || !displayName || !sponsorCode) {
      return NextResponse.json(
        { error: 'Email, password, nama, dan kode sponsor wajib diisi.' },
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

    const result = await prisma.$transaction(async (tx) => {
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
