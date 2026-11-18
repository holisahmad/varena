import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCorporateUser } from '@/lib/auth';

/**
 * GET /api/v1/stockists
 * List all regional stockist hubs (Master & Mobile Stokis)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get('city');

    const stockists = await prisma.member.findMany({
      where: {
        stockistType: { in: ['MASTER', 'MOBILE'] },
        memberStatus: 'ACTIVE',
        stockistCity: city ? { contains: city } : undefined,
      },
      include: {
        user: { select: { phone: true, email: true } },
      },
      orderBy: [{ stockistType: 'asc' }, { stockistInventory: 'desc' }],
    });

    return NextResponse.json({
      success: true,
      stockists: stockists.map((s) => ({
        id: s.id,
        memberCode: s.memberCode,
        name: s.displayName,
        legalName: s.legalName,
        type: s.stockistType, // MASTER or MOBILE
        city: s.stockistCity,
        inventory: s.stockistInventory,
        phone: s.user?.phone,
        email: s.user?.email,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memuat daftar stokis.' }, { status: 500 });
  }
}

/**
 * POST /api/v1/stockists
 * Corporate Admin appoints or updates a regional stockist hub
 */
export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    const userEmail = req.headers.get('x-user-email');
    const body = await req.json();
    const { memberCode, stockistType, stockistCity, quotaDelta, actorUserId } = body;

    const authUser = await getCorporateUser(userId || actorUserId, userEmail);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Akses ditolak: Hanya pengelola korporasi yang berhak mengatur status stokis.' },
        { status: 403 }
      );
    }

    if (!memberCode || !stockistType || !stockistCity) {
      return NextResponse.json(
        { error: 'Kode member, tipe stokis (MASTER/MOBILE), dan kota wilayah wajib diisi.' },
        { status: 400 }
      );
    }

    if (!['MASTER', 'MOBILE', 'NONE'].includes(stockistType)) {
      return NextResponse.json({ error: 'Tipe stokis tidak valid.' }, { status: 400 });
    }

    const member = await prisma.member.findUnique({
      where: { memberCode },
    });

    if (!member) {
      return NextResponse.json({ error: 'Member tidak ditemukan.' }, { status: 404 });
    }

    const currentInventory = member.stockistInventory || 0;
    const newInventory = Math.max(0, currentInventory + (parseInt(quotaDelta, 10) || 0));

    const updated = await prisma.member.update({
      where: { id: member.id },
      data: {
        stockistType,
        stockistCity: stockistCity.trim(),
        stockistInventory: newInventory,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: authUser.id,
        action: 'STOCKIST_APPOINTED',
        entityType: 'MEMBER',
        entityId: member.id,
        beforeJson: JSON.stringify({
          type: member.stockistType,
          city: member.stockistCity,
          inventory: member.stockistInventory,
        }),
        afterJson: JSON.stringify({
          type: updated.stockistType,
          city: updated.stockistCity,
          inventory: updated.stockistInventory,
        }),
        reason: `Regional stockist status updated to ${stockistType} in ${stockistCity}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Berhasil mengupdate status stokis ${member.memberCode} sebagai ${stockistType} (${stockistCity}).`,
      stockist: {
        memberCode: updated.memberCode,
        type: updated.stockistType,
        city: updated.stockistCity,
        inventory: updated.stockistInventory,
      },
    });
  } catch (err: any) {
    console.error('Stockist update error:', err);
    return NextResponse.json({ error: err.message || 'Gagal mengatur stokis.' }, { status: 500 });
  }
}
