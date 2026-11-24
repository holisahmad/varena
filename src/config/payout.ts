/**
 * Konfigurasi Penarikan Dana & Integrasi Gateway (Xendit / Pihak Ketiga)
 * 
 * Mode Aktif Saat Ini:
 * - MANUAL: Transfer bank manual oleh finance dengan biaya admin flat Rp6.500 (seperti sebelumnya).
 * 
 * Persiapan Skema Pihak Ketiga / Xendit (Siap Diaktifkan Nanti):
 * - Biaya Admin: 10%
 * - Biaya Transfer: Rp5.000
 * - Dapat diaktifkan kapan saja via ENV `PAYOUT_SCHEME=GATEWAY` atau `ENABLE_XENDIT_PAYOUT=true`
 */

export const PAYOUT_CONFIG = {
  // Skema aktif: 'MANUAL' (default saat ini) atau 'GATEWAY'
  activeScheme: (process.env.PAYOUT_SCHEME === 'GATEWAY' || process.env.ENABLE_XENDIT_PAYOUT === 'true') ? 'GATEWAY' : 'MANUAL',

  // Skema Manual Aktif (Biaya admin % dinamis + Biaya transfer bank flat)
  manual: {
    adminFeePercent: 10, // Default 10% (dapat diubah dinamis via Dashboard Pengaturan Sistem)
    bankFeeFlat: 6500, // Rp 6.500 flat per transaksi transfer bank
    feeFlat: 6500, // Legacy fallback compatibility
  },

  // Skema Xendit / Pihak Ketiga (Siap diaktifkan nanti setelah kerjasama selesai)
  gateway: {
    adminFeePercent: 10, // 10%
    transferFeeFlat: 5000, // Rp 5.000
    bankFeeFlat: 5000,
  },

  minimumAmount: 50000, // Minimal Rp50.000

  // Pengaturan Gateway Xendit / Pihak Ketiga
  xendit: {
    enabled: process.env.ENABLE_XENDIT_PAYOUT === 'true' || process.env.XENDIT_DISBURSEMENT_ENABLED === 'true',
    apiKey: process.env.XENDIT_SECRET_KEY || '',
    baseUrl: process.env.XENDIT_BASE_URL || 'https://api.xendit.co',
    callbackToken: process.env.XENDIT_CALLBACK_TOKEN || '',
    sandbox: process.env.XENDIT_SANDBOX === 'true' || process.env.NODE_ENV !== 'production',
  },
};

export interface PayoutFeeCalculation {
  requestedAmount: number;
  scheme: 'MANUAL' | 'GATEWAY';
  adminFeePercent: number;
  adminFee: number;
  transferFee: number;
  bankFee: number;
  totalFee: number;
  netAmount: number;
  description: string;
}

export interface PayoutFeeCustomConfig {
  adminFeePercent?: number;
  bankFeeFlat?: number;
  activeScheme?: 'MANUAL' | 'GATEWAY';
}

/**
 * Hitung rincian potongan penarikan dana secara terinci:
 * 1. Dana Tarik (requestedAmount)
 * 2. Biaya Bank (bankFee / transferFee)
 * 3. Biaya Admin (adminFee: adminFeePercent %)
 * 4. Total Masuk Rekening (netAmount)
 */
export function calculatePayoutFees(
  amount: number,
  customConfig?: PayoutFeeCustomConfig
): PayoutFeeCalculation {
  const cleanAmount = Math.max(0, Math.floor(amount || 0));
  const scheme = customConfig?.activeScheme || PAYOUT_CONFIG.activeScheme;
  const isGateway = scheme === 'GATEWAY';

  const adminFeePercent = customConfig?.adminFeePercent !== undefined
    ? customConfig.adminFeePercent
    : isGateway
    ? PAYOUT_CONFIG.gateway.adminFeePercent
    : PAYOUT_CONFIG.manual.adminFeePercent;

  const bankFee = cleanAmount > 0
    ? customConfig?.bankFeeFlat !== undefined
      ? customConfig.bankFeeFlat
      : isGateway
      ? PAYOUT_CONFIG.gateway.transferFeeFlat
      : PAYOUT_CONFIG.manual.bankFeeFlat
    : 0;

  const adminFee = Math.round((cleanAmount * adminFeePercent) / 100);
  const totalFee = adminFee + bankFee;
  const netAmount = Math.max(0, cleanAmount - totalFee);

  const descriptionParts: string[] = [];
  if (adminFeePercent > 0) {
    descriptionParts.push(`Biaya Admin ${adminFeePercent}% (Rp${adminFee.toLocaleString('id-ID')})`);
  }
  if (bankFee > 0) {
    descriptionParts.push(`Biaya Bank Rp${bankFee.toLocaleString('id-ID')}`);
  }

  const description = descriptionParts.length > 0
    ? descriptionParts.join(' + ')
    : 'Bebas Biaya Penarikan';

  return {
    requestedAmount: cleanAmount,
    scheme: isGateway ? 'GATEWAY' : 'MANUAL',
    adminFeePercent,
    adminFee,
    transferFee: bankFee,
    bankFee,
    totalFee,
    netAmount,
    description,
  };
}
