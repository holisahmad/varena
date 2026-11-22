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

/**
 * In-memory cache agar hemat kuota query database free tier
 */
let cachedConfig: MaintenanceConfig | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60 * 1000;

export function invalidateMaintenanceCache() {
  cachedConfig = null;
  lastFetchTime = 0;
}

/**
 * Membaca status kunci pemeliharaan sistem global (dengan in-memory cache 60s)
 */
export async function getMaintenanceConfig(forceFresh = false): Promise<MaintenanceConfig> {
  const now = Date.now();
  if (!forceFresh && cachedConfig && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedConfig;
  }

  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'GLOBAL_MAINTENANCE_FREEZE' },
    });

    if (setting?.value) {
      const parsed = JSON.parse(setting.value);
      const isAnyLocked = Boolean(parsed.freezeWithdrawals || parsed.freezePurchases || parsed.freezeDeposits);
      cachedConfig = {
        isActive: parsed.isActive !== undefined ? Boolean(parsed.isActive) : isAnyLocked,
        freezeWithdrawals: Boolean(parsed.freezeWithdrawals),
        freezePurchases: Boolean(parsed.freezePurchases),
        freezeDeposits: Boolean(parsed.freezeDeposits),
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
  const current = await getMaintenanceConfig(true);
  const freezeWithdrawals = config.freezeWithdrawals !== undefined ? Boolean(config.freezeWithdrawals) : current.freezeWithdrawals;
  const freezePurchases = config.freezePurchases !== undefined ? Boolean(config.freezePurchases) : current.freezePurchases;
  const freezeDeposits = config.freezeDeposits !== undefined ? Boolean(config.freezeDeposits) : current.freezeDeposits;
  const isAnyLocked = freezeWithdrawals || freezePurchases || freezeDeposits;

  const updated: MaintenanceConfig = {
    ...current,
    ...config,
    freezeWithdrawals,
    freezePurchases,
    freezeDeposits,
    isActive: config.isActive !== undefined ? Boolean(config.isActive) : isAnyLocked,
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
