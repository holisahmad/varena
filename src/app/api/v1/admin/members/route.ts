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
      where.memberStatus = { not: 'ACTIVE' };
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
