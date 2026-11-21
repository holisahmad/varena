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

  // Skema Manual Aktif (Biaya admin flat Rp6.500)
  manual: {
    feeFlat: 6500, // Rp 6.500 flat per transaksi penarikan
  },

  // Skema Xendit / Pihak Ketiga (Siap diaktifkan nanti setelah kerjasama selesai)
  gateway: {
    adminFeePercent: 10, // 10%
    transferFeeFlat: 5000, // Rp 5.000
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
  totalFee: number;
  netAmount: number;
  description: string;
}

/**
 * Hitung rincian potongan penarikan dana
 * Menggunakan skema manual Rp6.500 (default) atau skema gateway (10% + 5000 jika diaktifkan)
 */
export function calculatePayoutFees(amount: number): PayoutFeeCalculation {
  const cleanAmount = Math.max(0, Math.floor(amount || 0));
  const isGateway = PAYOUT_CONFIG.activeScheme === 'GATEWAY';

  if (isGateway) {
    const adminFee = Math.round((cleanAmount * PAYOUT_CONFIG.gateway.adminFeePercent) / 100);
    const transferFee = cleanAmount > 0 ? PAYOUT_CONFIG.gateway.transferFeeFlat : 0;
    const totalFee = adminFee + transferFee;
    const netAmount = Math.max(0, cleanAmount - totalFee);

    return {
      requestedAmount: cleanAmount,
      scheme: 'GATEWAY',
      adminFeePercent: PAYOUT_CONFIG.gateway.adminFeePercent,
      adminFee,
      transferFee,
      totalFee,
      netAmount,
      description: `Biaya Admin 10% (Rp${adminFee.toLocaleString('id-ID')}) + Biaya Transfer Rp5.000`,
    };
  }

  // Skema Manual Aktif (Rp6.500)
  const totalFee = cleanAmount > 0 ? PAYOUT_CONFIG.manual.feeFlat : 0;
  const netAmount = Math.max(0, cleanAmount - totalFee);

  return {
    requestedAmount: cleanAmount,
    scheme: 'MANUAL',
    adminFeePercent: 0,
    adminFee: totalFee,
    transferFee: 0,
    totalFee,
    netAmount,
    description: `Biaya Admin Rp${totalFee.toLocaleString('id-ID')}`,
  };
}
