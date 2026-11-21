import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveCorporateAdmin } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/admin/agents/bulk-discount
 * Terapkan kebijakan diskon pasokan grosir ke SEMUA agen aktif sekaligus.
 * Body: { discountType: 'PERCENTAGE' | 'FLAT_PER_BOX', discountValue: number }
 */
export async function POST(req: Request) {
  try {
    const authUser = await resolveCorporateAdmin(req);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Akses ditolak: Hanya pengelola korporasi yang berhak.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { discountType, discountValue } = body;

    const normalizedType = discountType === 'FLAT_PER_BOX' ? 'NOMINAL' : discountType;
    if (!['PERCENTAGE', 'NOMINAL', 'FLAT_PER_BOX'].includes(discountType)) {
      return NextResponse.json(
        { error: 'discountType tidak valid. Gunakan PERCENTAGE atau NOMINAL.' },
        { status: 400 }
      );
    }

    const value = Number(discountValue);
    if (isNaN(value) || value < 0) {
      return NextResponse.json(
        { error: 'discountValue harus berupa angka positif.' },
        { status: 400 }
      );
    }

    if (discountType === 'PERCENTAGE' && value > 100) {
      return NextResponse.json(
        { error: 'Nilai persentase tidak boleh melebihi 100%.' },
        { status: 400 }
      );
    }

    // Update semua agen dengan status ACTIVE
    const result = await prisma.member.updateMany({
      where: {
        isAgent: true,
      },
      data: {
        agentDiscountType: normalizedType,
        agentDiscountValue: value,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: authUser.userId,
        action: 'BULK_UPDATE',
        entityType: 'AGENT_DISCOUNT',
        entityId: 'ALL_ACTIVE',
        afterJson: JSON.stringify({ discountType, discountValue: value, affectedCount: result.count }),
        reason: `Kebijakan diskon pasokan grosir diterapkan massal ke ${result.count} agen aktif oleh admin`,
      },
    });

    return NextResponse.json({
      success: true,
      affectedCount: result.count,
      message: `Diskon berhasil diterapkan ke ${result.count} agen aktif.`,
    });
  } catch (err: any) {
    console.error('[bulk-discount] error:', err);
    return NextResponse.json(
      { error: err.message || 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}
