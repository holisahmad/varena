/**
 * WHATSAPP BROADCAST QUEUE — VARENA Platform
 *
 * Status: DISABLED (WHATSAPP_ENABLED=false)
 * To activate: set WHATSAPP_ENABLED=true + WA_GATEWAY_URL + WA_GATEWAY_TOKEN
 *
 * Compatible with: Fonnte, WA-Gate, WAWEBjs, or any REST-based WA gateway
 * Fallback: Logs to audit log for manual follow-up when disabled or gateway fails
 */
import prisma from './prisma';

export interface WaMessage {
  to: string;        // Phone with country code, e.g. "628123456789"
  message: string;   // Plain text or WA-formatted (*bold*, _italic_, etc.)
  templateId?: string;
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').replace(/^0/, '62');
}

/**
 * Enqueue a WhatsApp message.
 * - If WHATSAPP_ENABLED=true: sends via gateway immediately
 * - If disabled or gateway fails: logs to audit for manual review
 */
export async function enqueueWaMessage(msg: WaMessage): Promise<void> {
  const enabled = process.env.WHATSAPP_ENABLED === 'true';
  const gatewayUrl = process.env.WA_GATEWAY_URL;
  const gatewayToken = process.env.WA_GATEWAY_TOKEN;
  const senderNumber = process.env.WA_SENDER_NUMBER;

  if (!enabled) {
    // Mode hemat kuota DB: Jika WA gateway dinonaktifkan, hindari write auditLog ke database
    // Cukup log ringkas di server stdout
    console.log(`[WA Notification - Off] To: ${msg.to} | ${msg.message.substring(0, 80)}...`);
    return;
  }

  if (enabled && gatewayUrl && gatewayToken) {
    try {
      const res = await fetch(gatewayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${gatewayToken}`,
        },
        body: JSON.stringify({
          target: normalizePhone(msg.to),
          message: msg.message,
          sender: senderNumber,
        }),
      });

      if (!res.ok) {
        throw new Error(`WA Gateway HTTP ${res.status}: ${await res.text()}`);
      }
      return; // Success
    } catch (err) {
      console.error('[WA Queue] Gateway error, falling back to audit log:', err);
    }
  }

  // Fallback: catat ke audit log hanya jika gateway gagal terkirim (untuk follow up manual)
  try {
    await prisma.auditLog.create({
      data: {
        action: 'WA_MESSAGE_QUEUED',
        entityType: 'NOTIFICATION',
        entityId: msg.to,
        reason: `[WA OUTBOX - GATEWAY_FAILED] To: ${msg.to} | ${msg.message.substring(0, 300)}`,
      },
    });
  } catch {
    // Non-critical — silently ignore
  }
}

/** Kirim notifikasi konfirmasi pesanan */
export async function sendOrderConfirmation(params: {
  phone: string;
  customerName: string;
  orderNumber: string;
  total: number;
  items: string;
}): Promise<void> {
  const { phone, customerName, orderNumber, total, items } = params;
  const message =
    `Halo *${customerName}*! 🌿\n\n` +
    `Pesanan Anda di *VARENA* berhasil dibuat.\n\n` +
    `📦 *No. Pesanan:* ${orderNumber}\n` +
    `🛍️ *Produk:* ${items}\n` +
    `💰 *Total:* Rp${total.toLocaleString('id-ID')}\n\n` +
    `Kami akan segera memproses pesanan Anda. Terima kasih telah berbelanja di VARENA! ✨`;
  await enqueueWaMessage({ to: phone, message });
}

/** Kirim notifikasi persetujuan topup deposit */
export async function sendDepositApprovalNotification(params: {
  phone: string;
  memberName: string;
  amount: number;
  newBalance: number;
  depositType: 'AGENT' | 'SHOPPING';
}): Promise<void> {
  const { phone, memberName, amount, newBalance, depositType } = params;
  const typeLabel = depositType === 'SHOPPING' ? 'Belanja' : 'Agen';
  const message =
    `Halo *${memberName}*! 🎉\n\n` +
    `Topup Saldo ${typeLabel} Anda sebesar *Rp${amount.toLocaleString('id-ID')}* telah disetujui!\n\n` +
    `💼 *Saldo ${typeLabel} Terkini:* Rp${newBalance.toLocaleString('id-ID')}\n\n` +
    `Gunakan saldo Anda untuk berbelanja produk VARENA. Terima kasih! 🌿`;
  await enqueueWaMessage({ to: phone, message });
}

/** Kirim notifikasi pembayaran komisi */
export async function sendPayoutNotification(params: {
  phone: string;
  memberName: string;
  amount: number;
  referenceId: string;
}): Promise<void> {
  const { phone, memberName, amount, referenceId } = params;
  const message =
    `Halo *${memberName}*! 💰\n\n` +
    `Pembayaran komisi VARENA Anda telah diproses!\n\n` +
    `🏦 *Jumlah:* Rp${amount.toLocaleString('id-ID')}\n` +
    `📋 *Ref:* ${referenceId}\n\n` +
    `Dana akan masuk ke rekening Anda dalam 1-3 hari kerja. Terima kasih! 🌿`;
  await enqueueWaMessage({ to: phone, message });
}

/** Kirim notifikasi pengiriman pesanan */
export async function sendShippingNotification(params: {
  phone: string;
  customerName: string;
  orderNumber: string;
  trackingNumber: string;
  courier: string;
}): Promise<void> {
  const { phone, customerName, orderNumber, trackingNumber, courier } = params;
  const message =
    `Halo *${customerName}*! 📦\n\n` +
    `Pesanan Anda *#${orderNumber}* telah dikirim!\n\n` +
    `🚚 *Kurir:* ${courier}\n` +
    `📋 *No. Resi:* ${trackingNumber}\n\n` +
    `Pantau status pengiriman Anda melalui aplikasi ${courier}. Terima kasih! 🌿`;
  await enqueueWaMessage({ to: phone, message });
}
