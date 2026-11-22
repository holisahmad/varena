import { NextResponse } from 'next/server';
import { resolveCorporateAdmin } from '@/lib/api-auth';
import { getMaintenanceConfig, setMaintenanceConfig } from '@/lib/maintenance';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const authUser = await resolveCorporateAdmin(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized. Hanya admin corporate.' }, { status: 401 });
    }

    const config = await getMaintenanceConfig(true);
    return NextResponse.json({ success: true, config });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memuat status pemeliharaan' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authUser = await resolveCorporateAdmin(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized. Hanya admin corporate.' }, { status: 401 });
    }

    const body = await req.json();
    const { freezeWithdrawals, freezePurchases, freezeDeposits, message, isActive } = body;

    const previousConfig = await getMaintenanceConfig(true);

    const updated = await setMaintenanceConfig(
      {
        freezeWithdrawals: Boolean(freezeWithdrawals),
        freezePurchases: Boolean(freezePurchases),
        freezeDeposits: Boolean(freezeDeposits),
        isActive: isActive !== undefined ? Boolean(isActive) : Boolean(freezeWithdrawals || freezePurchases || freezeDeposits),
        message: typeof message === 'string' && message.trim() ? message.trim() : undefined,
      },
      authUser.userId
    );

    // Record Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          actorUserId: authUser.userId || null,
          action: 'GLOBAL_FREEZE_UPDATED',
          entityType: 'SETTING',
          entityId: 'GLOBAL_MAINTENANCE_FREEZE',
          beforeJson: JSON.stringify(previousConfig),
          afterJson: JSON.stringify(updated),
          reason: body.reason || 'Pembaruan sakelar Kunci Darurat & Pemeliharaan Sistem oleh admin',
        },
      });
    } catch (auditErr) {
      console.warn('Non-critical: Failed to write audit log for maintenance update:', auditErr);
    }

    return NextResponse.json({
      success: true,
      message: updated.isActive
        ? 'Kunci Darurat & Pemeliharaan Sistem BERHASIL DIAKTIFKAN. Akses transaksi mitra langsung dibatasi.'
        : 'Kunci Darurat telah DINONAKTIFKAN. Seluruh sistem kembali beroperasi normal.',
      config: updated,
    });
  } catch (err: any) {
    console.error('Error updating maintenance freeze:', err);
    return NextResponse.json({ error: err.message || 'Gagal memperbarui kunci pemeliharaan' }, { status: 500 });
  }
}
