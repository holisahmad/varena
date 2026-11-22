import { PRIMARY_COMPANY_BANK } from '@/config/bank';

/**
 * VARENA WhatsApp Gateway & Notification Engine
 * High-conversion automated messaging for members, buyers, and corporate operations
 */

export interface WaMessagePayload {
  recipientPhone: string;
  recipientName: string;
  templateType: 'ORDER_INVOICE' | 'ORDER_SHIPPED' | 'COMMISSION_EARNED' | 'PAYOUT_DISBURSED' | 'PUSH_LEADER';
  message: string;
  referenceId?: string;
}

// In-memory outbox log for auditing sent messages
const waOutboxHistory: Array<WaMessagePayload & { sentAt: Date; status: string }> = [];

/**
 * Format local Indonesian phone number to international 62 format
 * e.g. "081234567890" -> "6281234567890"
 */
export function normalizePhoneToWa(phone: string): string {
  if (!phone) return '';
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  } else if (!clean.startsWith('62')) {
    clean = '62' + clean;
  }
  return clean;
}

/**
 * Generate 1-Click WhatsApp Direct Chat Link (Click-to-Chat)
 */
export function getWaChatLink(phone: string, message: string): string {
  const normalized = normalizePhoneToWa(phone);
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${normalized}?text=${encoded}`;
}

/**
 * Template: Order Created / Payment Instructions
 */
export function templateOrderInvoice(params: {
  orderNumber: string;
  buyerName: string;
  total: number;
  itemsSummary: string;
  bankAccount?: string;
}): string {
  return (
    `*PESANAN VARENA TELAH DITERIMA*\n\n` +
    `Halo *${params.buyerName}*,\n` +
    `Terima kasih telah memesan Kopi Matahari — Kopi Robusta Fermentasi Premium VARENA.\n\n` +
    `📦 *Nomor Pesanan*: \`${params.orderNumber}\`\n` +
    `🛍️ *Produk*: ${params.itemsSummary}\n` +
    `💰 *Total Pembayaran*: *Rp${params.total.toLocaleString('id-ID')}*\n\n` +
    `Silakan transfer ke Rekening Operasional Resmi:\n` +
    `🏛️ *Bank ${PRIMARY_COMPANY_BANK.bankName}*: ${PRIMARY_COMPANY_BANK.accountNumber}\n` +
    `👤 *Atas Nama*: ${PRIMARY_COMPANY_BANK.accountHolder}\n\n` +
    `Setelah transfer, pesanan Anda akan segera diproses dan dikirim. Terima kasih!`
  );
}

/**
 * Template: Order Shipped with Tracking Number
 */
export function templateOrderShipped(params: {
  orderNumber: string;
  buyerName: string;
  courierName: string;
  trackingNumber: string;
}): string {
  return (
    `*PESANAN VARENA SEDANG DIKIRIM!* 🚚\n\n` +
    `Halo *${params.buyerName}*,\n` +
    `Kabar gembira! Pesanan Anda telah diserahkan ke jasa kurir logistik:\n\n` +
    `📦 *No. Pesanan*: \`${params.orderNumber}\`\n` +
    `🚚 *Kurir Ekspedisi*: *${params.courierName}*\n` +
    `🔖 *Nomor Resi*: *${params.trackingNumber}*\n\n` +
    `Anda dapat melacak posisi paket melalui aplikasi resmi ${params.courierName}. Harap periksa paket saat diterima. Salam sehat bersama VARENA!`
  );
}

/**
 * Template: Real-time Commission Notification
 */
export function templateCommissionEarned(params: {
  memberName: string;
  rewardType: string;
  amount: number;
  orderNumber: string;
  walletBalance: number;
}): string {
  const typeText =
    params.rewardType === 'DIRECT_SPONSOR'
      ? 'Bonus Sponsor Langsung'
      : params.rewardType === 'DEVELOPMENT_PLACEMENT'
      ? 'Bonus Pengembangan Titik Jaringan'
      : 'Bonus Repeat Order Jaringan';

  return (
    `*SELAMAT! BONUS VARENA TELAH MASUK* 🎉\n\n` +
    `Halo *${params.memberName}*,\n` +
    `Ada pemasukan baru di dompet digital kemitraan Anda:\n\n` +
    `💵 *Tipe Reward*: ${typeText}\n` +
    `💰 *Nominal*: *+Rp${params.amount.toLocaleString('id-ID')}*\n` +
    `🔖 *Sumber Order*: \`${params.orderNumber}\`\n` +
    `💼 *Saldo Tersedia Saat Ini*: *Rp${params.walletBalance.toLocaleString('id-ID')}*\n\n` +
    `Terus kembangkan jaringan mitra dan bagikan link referral Anda untuk melipatgandakan penghasilan!`
  );
}

/**
 * Template: Payout Disbursed
 */
export function templatePayoutDisbursed(params: {
  memberName: string;
  netAmount: number;
  bankName: string;
  accountNumberMasked: string;
  refNumber: string;
}): string {
  return (
    `*PENARIKAN SALDO BERHASIL DITRANSFER* 💳\n\n` +
    `Halo *${params.memberName}*,\n` +
    `Permohonan penarikan saldo Anda telah selesai diproses oleh tim Finance VARENA:\n\n` +
    `💰 *Nominal Ditransfer*: *Rp${params.netAmount.toLocaleString('id-ID')}*\n` +
    `🏛️ *Rekening Tujuan*: ${params.bankName} (${params.accountNumberMasked})\n` +
    `🔖 *Referensi Bank*: \`${params.refNumber}\`\n\n` +
    `Dana telah masuk ke rekening pribadi Anda. Terima kasih atas dedikasi dan kerja keras Anda bersama VARENA!`
  );
}

/**
 * Template: Push Follow-up for Inactive Registered Members
 */
export function templatePushLeaderFollowup(params: {
  memberName: string;
  sponsorName: string;
  memberCode: string;
}): string {
  return (
    `Halo *${params.memberName}* (${params.memberCode}), apa kabar?\n\n` +
    `Saya *${params.sponsorName}*, sponsor kemitraan Anda di VARENA.\n` +
    `Saya melihat akun Anda sudah aktif terdaftar, namun belum mengaktifkan Paket Perdana Box untuk membuka komisi 10 level Anda.\n\n` +
    `Ada promo kemitraan menarik minggu ini dan bimbingan tim intensif. Apakah ada yang bisa saya bantu terkait pemesanan paket perdana Anda? 🚀`
  );
}

/**
 * Asynchronous WhatsApp message dispatcher
 * Simulates real gateway delivery and archives into outbox audit
 */
export async function dispatchWaMessage(payload: WaMessagePayload): Promise<{ success: boolean; id: string }> {
  // Jika WA dinonaktifkan, exit langsung tanpa proses memori maupun HTTP request
  if (process.env.WHATSAPP_ENABLED !== 'true') {
    return { success: false, id: 'WA_DISABLED' };
  }

  const id = `WA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // Store in Outbox
  waOutboxHistory.unshift({
    ...payload,
    sentAt: new Date(),
    status: 'DELIVERED_SIMULATED',
  });

  // Keep last 100 messages in memory
  if (waOutboxHistory.length > 100) {
    waOutboxHistory.pop();
  }

  // If environment provides actual WhatsApp Provider Webhook (Fonnte / WABA / Twilio):
  const providerUrl = process.env.WHATSAPP_GATEWAY_URL;
  const apiKey = process.env.WHATSAPP_API_KEY;

  if (providerUrl && apiKey) {
    try {
      fetch(providerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: apiKey,
        },
        body: JSON.stringify({
          target: normalizePhoneToWa(payload.recipientPhone),
          message: payload.message,
        }),
      }).catch((err) => console.error('WA Provider delivery error:', err));
    } catch (e) {
      // Non-blocking
    }
  }

  return { success: true, id };
}

/**
 * Retrieve WhatsApp outbox messages for admin viewing
 */
export function getWaOutboxHistory() {
  return waOutboxHistory;
}
