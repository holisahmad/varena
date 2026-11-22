import { NextResponse } from 'next/server';
import { getMaintenanceConfig } from '@/lib/maintenance';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/maintenance/status
 * Public endpoint ringkas untuk membaca status pemeliharaan sistem
 * Menggunakan in-memory cache 60s agar hemat kuota database free tier.
 */
export async function GET() {
  try {
    const config = await getMaintenanceConfig();
    return NextResponse.json({
      success: true,
      maintenance: config,
    });
  } catch (err: any) {
    return NextResponse.json({ success: true, maintenance: { isActive: false } });
  }
}
