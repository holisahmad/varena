/**
 * Konfigurasi Penarikan Dana & Integrasi Gateway (Xendit / Pihak Ketiga)
 * 
 * Kebijakan Potongan:
 * - Biaya Admin Platform: 10% dari nominal penarikan
 * - Biaya Transfer Antar-Bank / Gateway: Rp5.000 flat per transaksi
 * - Minimal Penarikan Saldo: Rp50.000
 * 
 * Mode Integrasi:
 * - MANUAL: Transfer bank manual oleh finance via internet banking / CSV batch (Default)
 * - XENDIT: Otomatisasi pencairan instan via Xendit Disbursement API (Dapat diaktifkan via ENV)
 */

export const PAYOUT_CONFIG = {
  // Kebijakan Tarif & Biaya
  adminFeePercent: 10, // 10% dari nominal yang ditarik
  transferFeeFlat: 5000, // Rp 5.000 per transaksi penarikan
  minimumAmount: 50000, // Rp 50.000 minimal penarikan

  // Pengaturan Gateway Xendit / Pihak Ketiga
  xendit: {
    // Flag aktifasi: cukup set ENV ENABLE_XENDIT_PAYOUT=true saat kerjasama resmi aktif
    enabled: process.env.ENABLE_XENDIT_PAYOUT === 'true' || process.env.XENDIT_DISBURSEMENT_ENABLED === 'true',
    apiKey: process.env.XENDIT_SECRET_KEY || '',
    baseUrl: process.env.XENDIT_BASE_URL || 'https://api.xendit.co',
    callbackToken: process.env.XENDIT_CALLBACK_TOKEN || '',
    sandbox: process.env.XENDIT_SANDBOX === 'true' || process.env.NODE_ENV !== 'production',
  },
};

export interface PayoutFeeCalculation {
  requestedAmount: number;
  adminFeePercent: number;
  adminFee: number;
  transferFee: number;
  totalFee: number;
  netAmount: number;
}

/**
 * Hitung rincian potongan penarikan dana secara transparan
 */
export function calculatePayoutFees(amount: number): PayoutFeeCalculation {
  const cleanAmount = Math.max(0, Math.floor(amount || 0));
  const adminFee = Math.round((cleanAmount * PAYOUT_CONFIG.adminFeePercent) / 100);
  const transferFee = cleanAmount > 0 ? PAYOUT_CONFIG.transferFeeFlat : 0;
  const totalFee = adminFee + transferFee;
  const netAmount = Math.max(0, cleanAmount - totalFee);

  return {
    requestedAmount: cleanAmount,
    adminFeePercent: PAYOUT_CONFIG.adminFeePercent,
    adminFee,
    transferFee,
    totalFee,
    netAmount,
  };
}
