import prisma from './prisma';

// In-memory throttle agar auto-prune audit log tidak dieksekusi berulang di setiap request
let lastPruneTime = 0;
const PRUNE_THROTTLE_MS = 24 * 60 * 60 * 1000; // Maksimal eksekusi 1x per 24 jam

export interface PruneResult {
  deletedNonFinancial: number;
  deletedOldFinancial: number;
  totalDeleted: number;
}

/**
 * Prune / bersihkan log audit lama sesuai kebijakan retensi 60 hari.
 * Menghemat kuota baris & kapasitas penyimpanan database free tier (Vercel / Supabase / Neon).
 *
 * - Log non-finansial & umum (AUTH, SECURITY, SYSTEM, NOTIFICATION, GENERAL) dihapus jika > retentionDays (default 60 hari).
 * - Log transaksi finansial & keagenan (WITHDRAWAL, DEPOSIT, ORDER, MEMBER) disimpan hingga 180 hari sebelum dibersihkan.
 */
export async function pruneOldAuditLogs(retentionDays = 60): Promise<PruneResult> {
  const now = Date.now();
  const nonFinancialCutoff = new Date(now - retentionDays * 24 * 60 * 60 * 1000);
  const financialCutoff = new Date(now - 180 * 24 * 60 * 60 * 1000); // 180 hari untuk log finansial

  // 1. Hapus log umum / non-finansial yang melewati batas retensi 60 hari
  const nonFinResult = await prisma.auditLog.deleteMany({
    where: {
      createdAt: { lt: nonFinancialCutoff },
      entityType: { in: ['AUTH', 'NOTIFICATION', 'SECURITY', 'SYSTEM', 'GENERAL'] },
    },
  });

  // 2. Hapus log finansial yang sudah sangat tua (> 180 hari)
  const finResult = await prisma.auditLog.deleteMany({
    where: {
      createdAt: { lt: financialCutoff },
    },
  });

  return {
    deletedNonFinancial: nonFinResult.count,
    deletedOldFinancial: finResult.count,
    totalDeleted: nonFinResult.count + finResult.count,
  };
}

/**
 * Auto-prune audit log yang aman dipanggil di background sweep / admin visit.
 * Dibatasi maksimal berjalan 1 kali dalam 24 jam per instance serverless.
 */
export async function autoPruneAuditLogs(): Promise<void> {
  const now = Date.now();
  if (now - lastPruneTime < PRUNE_THROTTLE_MS) return;
  lastPruneTime = now;

  try {
    const result = await pruneOldAuditLogs(60);
    if (result.totalDeleted > 0) {
      console.log(`[AuditPrune] Berhasil membersihkan ${result.totalDeleted} log usang (>60 hari)`);
    }
  } catch (err) {
    console.error('[AuditPrune] Error auto pruning audit logs:', err);
  }
}
