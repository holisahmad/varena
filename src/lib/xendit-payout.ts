import { PAYOUT_CONFIG } from '@/config/payout';

/**
 * Pemetaan Kode Bank Indonesia ke Standar Xendit Disbursement
 */
export const XENDIT_BANK_CODES: Record<string, string> = {
  BCA: 'BCA',
  BRI: 'BRI',
  MANDIRI: 'MANDIRI',
  BNI: 'BNI',
  BSI: 'BSI',
  CIMB: 'CIMB',
  PERMATA: 'PERMATA',
  DANAMON: 'DANAMON',
  BTN: 'BTN',
  PANIN: 'PANIN',
  BTPN: 'BTPN',
  JAGO: 'BTPN', // Bank Jago / Artos
  SEABANK: 'SEABANK',
  NEO: 'BNC',
  OCBC: 'OCBC',
};

export function resolveXenditBankCode(rawBankName: string): string {
  const normalized = (rawBankName || '').toUpperCase().trim();
  for (const [key, code] of Object.entries(XENDIT_BANK_CODES)) {
    if (normalized.includes(key)) {
      return code;
    }
  }
  return normalized || 'BRI';
}

export interface XenditDisbursementPayload {
  withdrawalId: string;
  memberCode: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  netAmount: number;
}

export interface XenditDisbursementResult {
  success: boolean;
  mode: 'XENDIT_LIVE' | 'XENDIT_SANDBOX' | 'MANUAL_READY';
  disbursementId?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'READY_FOR_ACTIVATION';
  message: string;
  rawResponse?: any;
}

/**
 * Eksekusi Disbursement via Xendit API (atau Staging Ready)
 * 
 * Jika ENV `ENABLE_XENDIT_PAYOUT=true` dan API Key diisi:
 * Mengirim request resmi ke endpoint POST https://api.xendit.co/disbursements
 * 
 * Jika belum aktif:
 * Menyediakan stiker persiapan integrasi agar alur sistem siap switch kapan pun
 */
export async function executeXenditDisbursement(
  payload: XenditDisbursementPayload
): Promise<XenditDisbursementResult> {
  const { withdrawalId, memberCode, bankName, accountNumber, accountHolder, netAmount } = payload;
  const config = PAYOUT_CONFIG.xendit;

  const bankCode = resolveXenditBankCode(bankName);
  const externalId = `DISB-${withdrawalId.slice(0, 8)}-${Date.now()}`;

  // KONDISI 1: Belum diaktifkan (Mode Persiapan Kerjasama / Manual)
  if (!config.enabled || !config.apiKey) {
    return {
      success: true,
      mode: 'MANUAL_READY',
      status: 'READY_FOR_ACTIVATION',
      message: `Integrasi Xendit Payout telah disiapkan (Bank: ${bankCode}, Rek: ${accountNumber}, Net: Rp${netAmount.toLocaleString('id-ID')}). Saat ini sistem beroperasi dalam mode verifikasi transfer manual finance sampai API Key Xendit diaktifkan di .env.`,
    };
  }

  // KONDISI 2: Xendit API Aktif (Sandbox / Live)
  try {
    const authHeader = 'Basic ' + Buffer.from(`${config.apiKey}:`).toString('base64');
    const endpoint = `${config.baseUrl}/disbursements`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        'X-IDEMPOTENCY-KEY': `IDEMP-${withdrawalId}`,
      },
      body: JSON.stringify({
        external_id: externalId,
        bank_code: bankCode,
        account_holder_name: accountHolder,
        account_number: accountNumber.replace(/[^0-9]/g, ''),
        description: `VARENA Payout ${memberCode} #${withdrawalId.slice(0, 6)}`,
        amount: netAmount,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || `Xendit Error: ${res.statusText}`);
    }

    return {
      success: true,
      mode: config.sandbox ? 'XENDIT_SANDBOX' : 'XENDIT_LIVE',
      disbursementId: data.id || externalId,
      status: data.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
      message: `Disbursement berhasil dikirim ke Xendit (Status: ${data.status || 'PENDING'}).`,
      rawResponse: data,
    };
  } catch (err: any) {
    console.error('Xendit disbursement dispatch failed:', err);
    return {
      success: false,
      mode: config.sandbox ? 'XENDIT_SANDBOX' : 'XENDIT_LIVE',
      status: 'FAILED',
      message: `Gagal mengirim pencairan ke Xendit: ${err.message}`,
    };
  }
}

/**
 * Validasi Webhook Callback Token Xendit
 */
export function verifyXenditCallbackToken(receivedToken: string | null): boolean {
  const expectedToken = PAYOUT_CONFIG.xendit.callbackToken;
  if (!expectedToken) return true; // Jika belum dikonfigurasi, loloskan untuk development
  return receivedToken === expectedToken;
}
