import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signSessionToken } from '@/lib/jwt';
import { checkRateLimit, withTransactionRetry } from '@/lib/security';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

    // Rate limiting: max 30 Google auth attempts per 15 minutes per IP
    const rateCheck = checkRateLimit(`google_auth:${ip}`, 30, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Terlalu banyak permintaan login Google. Coba lagi dalam ${rateCheck.retryAfterSec} detik.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    let email = '';
    let displayName = '';
    const sponsorCode = (body.sponsorCode || '').trim();

    // ── Verify Google ID Token via Google tokeninfo API (secure, server-side) ──
    if (body.credential) {
      let tokenInfoRes: Response;
      try {
        tokenInfoRes = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(body.credential)}`
        );
      } catch {
        return NextResponse.json(
          { error: 'Tidak dapat menghubungi server Google. Periksa koneksi server.' },
          { status: 502 }
        );
      }

      const tokenInfo = await tokenInfoRes.json();

      if (!tokenInfoRes.ok || tokenInfo.error || !tokenInfo.email) {
        return NextResponse.json(
          { error: 'Token Google tidak valid atau sudah kedaluwarsa. Silakan coba masuk lagi.' },
          { status: 401 }
        );
      }

      // Verify token was issued for THIS app's Client ID (aud claim)
      const expectedClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
      if (
        expectedClientId &&
        expectedClientId !== 'YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com' &&
        tokenInfo.aud !== expectedClientId
      ) {
        console.error(`Google token aud mismatch: got ${tokenInfo.aud}`);
        return NextResponse.json(
          { error: 'Token Google tidak valid untuk aplikasi ini.' },
          { status: 401 }
        );
      }

      // Email harus sudah diverifikasi oleh Google
      if (tokenInfo.email_verified !== 'true' && tokenInfo.email_verified !== true) {
        return NextResponse.json(
          { error: 'Email Google Anda belum diverifikasi oleh Google.' },
          { status: 400 }
        );
      }

      email = String(tokenInfo.email).trim().toLowerCase();
      displayName = String(tokenInfo.name || tokenInfo.given_name || '').trim();

    } else {
      // Legacy / fallback path (no credential JWT supplied)
      email = (body.email || '').trim().toLowerCase();
      displayName = (body.displayName || body.name || '').trim();
    }

    if (!email) {
      return NextResponse.json({ error: 'Email Google tidak ditemukan.' }, { status: 400 });
    }

    // Strict validation: must be a valid @gmail.com address
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!gmailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Hanya alamat Gmail (@gmail.com) yang didukung untuk autentikasi Google VARENA.' },
        { status: 400 }
      );
    }

    if (!displayName) {
      displayName = email.split('@')[0];
    }

    // 2. Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        userRoles: { include: { role: true } },
        member: true,
      },
    });

    if (user) {
      // Existing User: Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          emailVerifiedAt: user.emailVerifiedAt || new Date(),
        },
      });

      const roles = user.userRoles.map((ur) => ur.role.code);
      const member = user.member;

      const session = {
        userId: user.id,
        email: user.email,
        displayName: user.displayName,
        roles,
        memberId: member?.id,
        memberCode: member?.memberCode,
        isAgent: member?.isAgent || false,
        agentStatus: member?.agentStatus || 'NONE',
        agentCity: member?.agentCity || undefined,
      };

      const token = await signSessionToken(session);

      const response = NextResponse.json({
        success: true,
        message: 'Login Google berhasil.',
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          roles,
          memberId: member?.id,
          memberCode: member?.memberCode,
          legalName: member?.legalName,
          phone: user.phone,
          isAgent: member?.isAgent || false,
          agentStatus: member?.agentStatus || 'NONE',
          agentCity: member?.agentCity || null,
        },
        token,
      });

      response.cookies.set('varena_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
      });

      return response;
    }

    // 3. New User Registration via Google
    // Determine sponsor: check referral code or default to company master (VRN-0001)
    let sponsor = null;
    if (sponsorCode) {
      sponsor = await prisma.member.findUnique({
        where: { memberCode: sponsorCode.toUpperCase() },
      });
      if (!sponsor || sponsor.memberStatus !== 'ACTIVE') {
        sponsor = null;
      }
    }

    if (!sponsor) {
      // Default to Company House Account (VRN-0001)
      sponsor = await prisma.member.findUnique({
        where: { memberCode: 'VRN-0001' },
      });
    }

    if (!sponsor) {
      // Fallback to first active member if VRN-0001 not yet seeded
      sponsor = await prisma.member.findFirst({
        where: { memberStatus: 'ACTIVE' },
        orderBy: { createdAt: 'asc' },
      });
    }

    if (!sponsor) {
      return NextResponse.json(
        { error: 'Sistem belum memiliki akun sponsor utama perusahaan. Hubungi administrator.' },
        { status: 500 }
      );
    }

    // Generate unique Member Code (e.g. VRN-1005)
    const count = await prisma.member.count();
    const newMemberCode = `VRN-${(count + 1000).toString().padStart(4, '0')}`;

    // Secure random password hash for Google OAuth account
    const randomPassword = `GGL-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const passwordHash = await bcrypt.hash(randomPassword, 10);

    const result = await withTransactionRetry(async (tx) => {
      // Create User
      const newUser = await tx.user.create({
        data: {
          email,
          displayName,
          passwordHash,
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
          lastLoginAt: new Date(),
        },
      });

      // Role MITRA
      const role = await tx.role.findUnique({ where: { code: 'MITRA' } });
      if (role) {
        await tx.userRole.create({
          data: { userId: newUser.id, roleId: role.id },
        });
      }

      // Create Member Profile
      const newMember = await tx.member.create({
        data: {
          userId: newUser.id,
          memberCode: newMemberCode,
          displayName,
          legalName: displayName,
          memberStatus: 'ACTIVE',
          kycStatus: 'VERIFIED',
          activatedAt: new Date(),
        },
      });

      // Immutable Sponsor Relationship (Bound to referral sponsor or company)
      await tx.sponsorRelationship.create({
        data: {
          memberId: newMember.id,
          sponsorMemberId: sponsor.id,
          reason: sponsor.memberCode === 'VRN-0001' ? 'GOOGLE_ORGANIC_HOUSE_SPONSOR' : 'GOOGLE_REFERRAL_ONBOARDING',
          createdBy: newUser.id,
        },
      });

      // Placement Relationship (Default to sponsor)
      await tx.placementRelationship.create({
        data: {
          memberId: newMember.id,
          parentMemberId: sponsor.id,
          status: 'ACTIVE',
          createdBy: newUser.id,
        },
      });

      // Create Wallet Account in Double-Entry Ledger
      await tx.ledgerAccount.create({
        data: {
          ownerType: 'MEMBER',
          ownerId: newMember.id,
          accountCode: `ACC-MBR-${newMember.memberCode}`,
          accountType: 'LIABILITY',
          currency: 'IDR',
          balance: 0,
          status: 'ACTIVE',
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          actorUserId: newUser.id,
          action: 'MEMBER_REGISTERED_VIA_GOOGLE',
          entityType: 'MEMBER',
          entityId: newMember.id,
          afterJson: JSON.stringify({
            memberCode: newMemberCode,
            sponsorCode: sponsor.memberCode,
            authProvider: 'GOOGLE',
          }),
        },
      });

      return { user: newUser, member: newMember, sponsor };
    });

    const session = {
      userId: result.user.id,
      email: result.user.email,
      displayName: result.user.displayName,
      roles: ['MITRA'],
      memberId: result.member.id,
      memberCode: result.member.memberCode,
      isAgent: false,
      agentStatus: 'NONE',
    };

    const token = await signSessionToken(session);

    const response = NextResponse.json({
      success: true,
      message: 'Pendaftaran dan login Google berhasil!',
      isNewUser: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName,
        roles: ['MITRA'],
        memberId: result.member.id,
        memberCode: result.member.memberCode,
        legalName: result.member.legalName,
        phone: null,
        isAgent: false,
        agentStatus: 'NONE',
        sponsorCode: result.sponsor.memberCode,
        sponsorName: result.sponsor.displayName,
      },
      token,
    });

    response.cookies.set('varena_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch (err: any) {
    console.error('Google Auth error:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal memproses autentikasi Google.' },
      { status: 500 }
    );
  }
}
