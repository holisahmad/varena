import { NextResponse } from 'next/server';
import { resolveCorporateAdmin } from '@/lib/api-auth';
import prisma from '@/lib/prisma';
import { verifyCorporateAdmin } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const authUser = await resolveCorporateAdmin(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '60', 10);
    const entityType = searchParams.get('entityType');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(200, parseInt(searchParams.get('limit') || '20', 10));
    const skip = (page - 1) * limit;

    // Calculate cutoff date (default 60 days retention window)
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const whereClause: any = {
      createdAt: { gte: cutoffDate },
    };

    if (entityType && entityType !== 'ALL') {
      whereClause.entityType = entityType;
    }

    const [logs, totalCount] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereClause,
        include: {
          actorUser: {
            select: {
              id: true,
              displayName: true,
              email: true,
              userRoles: {
                include: { role: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      success: true,
      days,
      totalCount,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
      logs: logs.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        actor: log.actorUser
          ? {
              displayName: log.actorUser.displayName,
              email: log.actorUser.email,
              role: log.actorUser.userRoles?.[0]?.role?.name || log.actorUser.userRoles?.[0]?.role?.code || 'ADMIN',
            }
          : {
              displayName: 'Sistem Otomatis / Engine',
              email: 'system@varena.id',
              role: 'SYSTEM',
            },
        beforeJson: log.beforeJson,
        afterJson: log.afterJson,
        reason: log.reason,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
