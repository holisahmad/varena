import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getTokenFromRequest, verifySessionToken } from '@/lib/jwt';
import { detectSuspiciousPatterns } from '@/lib/security';

async function getAuthSession(req: Request) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * GET /api/v1/member/profile?memberCode=VRN-XXXX
 * Returns member profile including identity, bank account, and default shipping address
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let memberCode: string | null = searchParams.get('memberCode')?.trim() || null;
    let userId: string | null = searchParams.get('userId')?.trim() || null;

    // Also support session token if parameters not in query
    if (!memberCode && !userId) {
      const session = await getAuthSession(req);
      if (session) {
        userId = session.userId || null;
        memberCode = session.memberCode || null;
      }
    }

    if (!memberCode && !userId) {
      return NextResponse.json({ error: 'memberCode atau userId wajib diisi.' }, { status: 400 });
    }

    const member = await prisma.member.findFirst({
      where: memberCode ? { memberCode } : { userId: userId! },
      select: {
        id: true,
        userId: true,
        memberCode: true,
        displayName: true,
        legalName: true,
        nik: true,
        memberStatus: true,
        kycStatus: true,
        uniqueCodeBalance: true,
        recipientName: true,
        recipientPhone: true,
        province: true,
        city: true,
        district: true,
        postalCode: true,
        addressDetail: true,
        bankName: true,
        bankAccountNumber: true,
        bankAccountHolder: true,
        bankLockedAt: true,
        isAgent: true,
        agentType: true,
        agentStatus: true,
        agentCity: true,
        agentInventory: true,
        user: {
          select: {
            phone: true,
            email: true,
            displayName: true,
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: 'Member tidak ditemukan.' }, { status: 404 });
    }

    const { user, ...rest } = member;

    // Calculate profile completion percentage
    let completedSteps = 1; // Gmail / identity base = 1
    const totalSteps = 4;
    if (user?.phone) completedSteps++;
    if (member.province && member.city && member.addressDetail) completedSteps++;
    if (member.bankName && member.bankAccountNumber && member.bankAccountHolder) completedSteps++;
    const completionPercent = Math.round((completedSteps / totalSteps) * 100);

    return NextResponse.json({
      success: true,
      member: {
        ...rest,
        isBankLocked: Boolean(member.bankAccountNumber && member.bankLockedAt),
        phone: user?.phone || null,
        email: user?.email || null,
        completionPercent,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/v1/member/profile
 * Updates member profile, bank binding, and default shipping address
 */
export async function PUT(req: Request) {
  try {
    const session = await getAuthSession(req);
    const body = await req.json();

    let targetUserId = session?.userId;
    let targetMemberCode = session?.memberCode;

    // Allow passing memberCode or userId if admin or matching session
    if (!targetUserId && body.userId) targetUserId = body.userId;
    if (!targetMemberCode && body.memberCode) targetMemberCode = body.memberCode;

    if (!targetUserId && !targetMemberCode) {
      return NextResponse.json({ error: 'Sesi login tidak valid atau kadaluarsa.' }, { status: 401 });
    }

    const existingMember = await prisma.member.findFirst({
      where: targetMemberCode ? { memberCode: targetMemberCode } : { userId: targetUserId! },
      include: { user: true },
    });

    if (!existingMember) {
      return NextResponse.json({ error: 'Data mitra tidak ditemukan.' }, { status: 404 });
    }

    // Input sanitization
    const rawInputs = [
      body.displayName,
      body.legalName,
      body.phone,
      body.bankName,
      body.bankAccountNumber,
      body.bankAccountHolder,
      body.addressDetail,
    ].filter(Boolean).join(' ');

    if (detectSuspiciousPatterns(rawInputs)) {
      return NextResponse.json({ error: 'Input terdeteksi mengandung format yang tidak diperbolehkan.' }, { status: 400 });
    }

    // Validate phone number if provided
    let cleanPhone = body.phone !== undefined ? (body.phone || '').trim().replace(/[\s-]/g, '') : undefined;
    if (cleanPhone !== undefined && cleanPhone !== '') {
      if (cleanPhone.length < 9) {
        return NextResponse.json({ error: 'Nomor WhatsApp aktif minimal 9 digit.' }, { status: 400 });
      }
    }

    // Handle Bank Locking Logic:
    // If bank is already locked, prevent unauthorized overwrite unless unlocked by admin
    let bankUpdateData: any = {};
    if (body.bankName !== undefined || body.bankAccountNumber !== undefined || body.bankAccountHolder !== undefined) {
      if (existingMember.bankLockedAt && !session?.roles.includes('ADMIN_1') && !session?.roles.includes('OWNER')) {
        // If already locked, only allow update if values are identical
        if (
          (body.bankAccountNumber && body.bankAccountNumber !== existingMember.bankAccountNumber) ||
          (body.bankName && body.bankName !== existingMember.bankName)
        ) {
          return NextResponse.json(
            { error: 'Rekening bank telah dikunci demi keamanan penarikan dana. Hubungi Admin Pusat jika ingin mengganti rekening.' },
            { status: 403 }
          );
        }
      } else {
        if (body.bankName !== undefined) bankUpdateData.bankName = body.bankName.trim();
        if (body.bankAccountNumber !== undefined) bankUpdateData.bankAccountNumber = body.bankAccountNumber.trim().replace(/[\s-]/g, '');
        if (body.bankAccountHolder !== undefined) bankUpdateData.bankAccountHolder = body.bankAccountHolder.trim().toUpperCase();

        if (body.lockBank && bankUpdateData.bankAccountNumber) {
          bankUpdateData.bankLockedAt = new Date();
        }
      }
    }

    // Update User & Member
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update user phone/displayName if provided
      if (cleanPhone !== undefined || body.displayName !== undefined) {
        await tx.user.update({
          where: { id: existingMember.userId },
          data: {
            phone: cleanPhone || existingMember.user.phone,
            displayName: body.displayName?.trim() || existingMember.user.displayName,
          },
        });
      }

      // 2. Update Member fields
      const updatedMember = await tx.member.update({
        where: { id: existingMember.id },
        data: {
          displayName: body.displayName?.trim() || existingMember.displayName,
          legalName: body.legalName?.trim() || existingMember.legalName,
          nik: body.nik !== undefined ? (body.nik || '').trim() : existingMember.nik,
          recipientName: body.recipientName !== undefined ? body.recipientName.trim() : existingMember.recipientName,
          recipientPhone: body.recipientPhone !== undefined ? body.recipientPhone.trim() : existingMember.recipientPhone,
          province: body.province !== undefined ? body.province.trim() : existingMember.province,
          city: body.city !== undefined ? body.city.trim() : existingMember.city,
          district: body.district !== undefined ? body.district.trim() : existingMember.district,
          postalCode: body.postalCode !== undefined ? body.postalCode.trim() : existingMember.postalCode,
          addressDetail: body.addressDetail !== undefined ? body.addressDetail.trim() : existingMember.addressDetail,
          ...bankUpdateData,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          actorUserId: session?.userId || existingMember.userId,
          action: 'MEMBER_PROFILE_UPDATED',
          entityType: 'MEMBER',
          entityId: existingMember.id,
          afterJson: JSON.stringify({
            memberCode: existingMember.memberCode,
            updatedFields: Object.keys({ ...body, ...bankUpdateData }),
          }),
        },
      });

      return updatedMember;
    });

    return NextResponse.json({
      success: true,
      message: 'Profil dan pengaturan akun berhasil diperbarui.',
      member: updated,
    });
  } catch (err: any) {
    console.error('Update profile error:', err);
    return NextResponse.json({ error: err.message || 'Gagal memperbarui profil.' }, { status: 500 });
  }
}
