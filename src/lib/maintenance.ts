import prisma from './prisma';

export interface MaintenanceConfig {
  isActive: boolean;
  freezeWithdrawals: boolean;
  freezePurchases: boolean;
  freezeDeposits: boolean;
  message: string;
}

const DEFAULT_CONFIG: MaintenanceConfig = {
  isActive: false,
  freezeWithdrawals: true,
  freezePurchases: true,
  freezeDeposits: true,
  message:
    'Sistem sedang dalam pemeliharaan berkala / audit keuangan oleh tim kantor pusat VARENA. Transaksi belanja dan penarikan dana dinonaktifkan sementara demi keamanan akun Anda.',
};

// In-memory cache 60 detik agar hemat kuota query database free tier
let cachedConfig: MaintenanceConfig | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60 * 1000;

/**
 * Membaca status kunci pemeliharaan sistem global (dengan in-memory cache 60s)
 */
export async function getMaintenanceConfig(): Promise<MaintenanceConfig> {
  const now = Date.now();
  if (cachedConfig && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedConfig;
  }

  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'GLOBAL_MAINTENANCE_FREEZE' },
    });

    if (setting?.value) {
      const parsed = JSON.parse(setting.value);
      cachedConfig = {
        isActive: Boolean(parsed.isActive),
        freezeWithdrawals: parsed.freezeWithdrawals !== false,
        freezePurchases: parsed.freezePurchases !== false,
        freezeDeposits: parsed.freezeDeposits !== false,
        message: parsed.message || DEFAULT_CONFIG.message,
      };
    } else {
      cachedConfig = DEFAULT_CONFIG;
    }
    lastFetchTime = now;
    return cachedConfig;
  } catch {
    return DEFAULT_CONFIG;
  }
}

/**
 * Mengubah status kunci pemeliharaan sistem global (hanya admin)
 */
export async function setMaintenanceConfig(
  config: Partial<MaintenanceConfig>,
  actorUserId?: string
): Promise<MaintenanceConfig> {
  const current = await getMaintenanceConfig();
  const updated: MaintenanceConfig = {
    ...current,
    ...config,
  };

  await prisma.systemSetting.upsert({
    where: { key: 'GLOBAL_MAINTENANCE_FREEZE' },
    create: {
      key: 'GLOBAL_MAINTENANCE_FREEZE',
      value: JSON.stringify(updated),
      group: 'GENERAL',
      description: 'Kunci Darurat & Pemeliharaan Sistem (Global Freeze Mode)',
      updatedBy: actorUserId || 'ADMIN',
    },
    update: {
      value: JSON.stringify(updated),
      updatedBy: actorUserId || 'ADMIN',
    },
  });

  cachedConfig = updated;
  lastFetchTime = Date.now();

  return updated;
}
