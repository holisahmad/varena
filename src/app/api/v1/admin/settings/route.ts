import { NextResponse } from 'next/server';
import { resolveCorporateAdmin } from '@/lib/api-auth';
import prisma from '@/lib/prisma';
import { verifyCorporateAdmin } from '@/lib/auth';

/**
 * GET /api/v1/admin/settings
 * Memuat semua pengaturan sistem dinamis
 */
export async function GET(req: Request) {
  try {
    const authUser = await resolveCorporateAdmin(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 401 });
    }

    const settings = await prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });

    const agentConfig = await prisma.agentConfig.findUnique({
      where: { id: 'default' },
    });

    // Format dictionary
    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    return NextResponse.json({
      success: true,
      settings: settingsMap,
      rawSettings: settings,
      agentConfig: agentConfig || {
        minimumRestockBox: 10,
        defaultDiscountType: 'PERCENTAGE',
        defaultDiscountValue: 15.0,
      },
    });
  } catch (err: any) {
    console.error('Error fetching settings:', err);
    return NextResponse.json({ error: err.message || 'Gagal memuat pengaturan' }, { status: 500 });
  }
}

/**
 * PUT /api/v1/admin/settings
 * Memperbarui pengaturan sistem
 */
export async function PUT(req: Request) {
  try {
    const authUser = await resolveCorporateAdmin(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 401 });
    }

    const body = await req.json();
    const { settings = {}, agentConfig } = body;

    await prisma.$transaction(async (tx) => {
      // 1. Update/Upsert System Settings
      for (const [key, value] of Object.entries(settings)) {
        await tx.systemSetting.upsert({
          where: { key },
          create: {
            key,
            value: String(value),
            updatedBy: authUser.userId || 'ADMIN',
          },
          update: {
            value: String(value),
            updatedBy: authUser.userId || 'ADMIN',
          },
        });
      }

      // 2. Update Agent Config if provided
      if (agentConfig) {
        await tx.agentConfig.upsert({
          where: { id: 'default' },
          create: {
            id: 'default',
            minimumRestockBox: Number(agentConfig.minimumRestockBox) || 10,
            defaultDiscountType: agentConfig.defaultDiscountType || 'PERCENTAGE',
            defaultDiscountValue: Number(agentConfig.defaultDiscountValue) || 15.0,
            updatedBy: authUser.userId || 'ADMIN',
          },
          update: {
            minimumRestockBox: Number(agentConfig.minimumRestockBox) || 10,
            defaultDiscountType: agentConfig.defaultDiscountType || 'PERCENTAGE',
            defaultDiscountValue: Number(agentConfig.defaultDiscountValue) || 15.0,
            updatedBy: authUser.userId || 'ADMIN',
          },
        });
      }

      // 3. Audit Log
      await tx.auditLog.create({
        data: {
          actorUserId: authUser.userId || null,
          action: 'SETTINGS_UPDATED',
          entityType: 'SETTING',
          entityId: 'SYSTEM',
          afterJson: JSON.stringify({ settingsCount: Object.keys(settings).length, agentConfig }),
          reason: 'Pembaruan konfigurasi operasional & finansial sistem oleh admin',
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Pengaturan sistem berhasil disimpan.',
    });
  } catch (err: any) {
    console.error('Error saving settings:', err);
    return NextResponse.json({ error: err.message || 'Gagal menyimpan pengaturan' }, { status: 500 });
  }
}
