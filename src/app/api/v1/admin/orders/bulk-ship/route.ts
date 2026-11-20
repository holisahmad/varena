import { NextResponse } from 'next/server';
import { resolveCorporateAdmin } from '@/lib/api-auth';
import prisma from '@/lib/prisma';
import { withTransactionRetry } from '@/lib/security';
import { dispatchWaMessage, templateOrderShipped } from '@/lib/whatsapp';
import { sendShippingNotification } from '@/lib/wa-queue';

export const dynamic = 'force-dynamic';

export interface ShipmentInputItem {
  orderNumber: string;
  courierName?: string;
  trackingNumber: string;
  warehouseOriginName?: string;
  warehouseOriginCity?: string;
}

export interface ShipmentProcessResult {
  orderNumber: string;
  buyerName?: string;
  buyerPhone?: string;
  courierName: string;
  trackingNumber: string;
  previousStatus?: string;
  status: 'SHIPPED' | 'UPDATED' | 'SKIPPED';
  reason?: string;
}

/**
 * Parser manifest fleksibel: mendukung format CSV (koma), TSV (tab Excel/Google Sheets), titik-koma (;), atau pipa (|).
 * Format per baris:
 * 1. NOMOR_PESANAN, NAMA_KURIR, NOMOR_RESI
 * 2. NOMOR_PESANAN, NOMOR_RESI (nama kurir di-autodetect / menggunakan kurir pesanan)
 */
export function parseManifestText(text: string): ShipmentInputItem[] {
  if (!text || typeof text !== 'string') return [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const items: ShipmentInputItem[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    // Abaikan baris header tabel jika ada
    if (
      (lower.includes('order') || lower.includes('pesanan')) &&
      (lower.includes('resi') || lower.includes('tracking') || lower.includes('kurir') || lower.includes('courier'))
    ) {
      continue;
    }

    const delimiter = line.includes('\t')
      ? '\t'
      : line.includes(';')
      ? ';'
      : line.includes('|')
      ? '|'
      : ',';

    const parts = line.split(delimiter).map((p) => p.trim().replace(/^["']|["']$/g, ''));
    if (parts.length >= 2) {
      if (parts.length >= 3) {
        items.push({
          orderNumber: parts[0],
          courierName: parts[1] || undefined,
          trackingNumber: parts[2],
        });
      } else {
        items.push({
          orderNumber: parts[0],
          trackingNumber: parts[1],
        });
      }
    }
  }

  return items;
}

/**
 * Deteksi nama kurir secara otomatis berdasarkan format nomor resi standar Indonesia
 */
function autoDetectCourier(tracking: string, existingCourier?: string | null): string {
  if (existingCourier && existingCourier.trim()) {
    return existingCourier.trim();
  }
  const t = tracking.toUpperCase().trim();
  if (t.startsWith('JNE') || /^88\d{6,}/.test(t)) return 'JNE Express';
  if (t.startsWith('SCP') || t.startsWith('00') || t.startsWith('SICEPAT')) return 'SiCepat Ekspres';
  if (t.startsWith('JT') || t.startsWith('JP') || t.startsWith('JX')) return 'J&T Express';
  if (t.startsWith('TJ') || t.startsWith('TK') || t.startsWith('ANTERAJA')) return 'Anteraja';
  if (t.startsWith('POS') || t.startsWith('P2')) return 'Pos Indonesia';
  if (t.startsWith('WAH') || t.startsWith('WHA')) return 'Wahana Express';
  if (t.startsWith('NINJA') || t.startsWith('NL')) return 'Ninja Xpress';
  if (t.startsWith('LION') || t.startsWith('LP')) return 'Lion Parcel';
  return 'JNE Express';
}

/**
 * POST /api/v1/admin/orders/bulk-ship
 * Pemrosesan Resi Massal (Bulk Shipping Manifest) dengan validasi alur sistem logistik
 */
export async function POST(req: Request) {
  try {
    const authUser = await resolveCorporateAdmin(req);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Akses ditolak: Hanya pengelola korporasi yang berhak memproses pengiriman massal.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    let candidates: ShipmentInputItem[] = [];

    if (body.rawText && typeof body.rawText === 'string') {
      candidates = parseManifestText(body.rawText);
    } else if (Array.isArray(body.shipments) && body.shipments.length > 0) {
      candidates = body.shipments;
    }

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: 'Daftar pengiriman kosong atau format tidak valid. Gunakan format: NO_ORDER, KURIR, NO_RESI (atau salin langsung dari Excel).' },
        { status: 400 }
      );
    }

    const shippedList: ShipmentProcessResult[] = [];
    const updatedList: ShipmentProcessResult[] = [];
    const skippedList: ShipmentProcessResult[] = [];

    await withTransactionRetry(async (tx) => {
      for (const item of candidates) {
        const rawOrderNum = (item.orderNumber || '').trim().replace(/^["']|["']$/g, '');
        const trackingNum = (item.trackingNumber || '').trim().replace(/^["']|["']$/g, '');

        if (!rawOrderNum) {
          skippedList.push({
            orderNumber: '(KOSONG)',
            courierName: '-',
            trackingNumber: trackingNum || '-',
            status: 'SKIPPED',
            reason: 'Nomor pesanan kosong',
          });
          continue;
        }

        if (!trackingNum) {
          skippedList.push({
            orderNumber: rawOrderNum,
            courierName: item.courierName || '-',
            trackingNumber: '(KOSONG)',
            status: 'SKIPPED',
            reason: 'Nomor resi pengiriman belum diisi',
          });
          continue;
        }

        // Cari order (dukung case-insensitive dan pencarian fleksibel)
        const order = await tx.order.findFirst({
          where: {
            OR: [
              { orderNumber: rawOrderNum },
              { orderNumber: rawOrderNum.toUpperCase() },
              { orderNumber: { equals: rawOrderNum, mode: 'insensitive' } },
            ],
          },
        });

        if (!order) {
          skippedList.push({
            orderNumber: rawOrderNum,
            courierName: item.courierName || '-',
            trackingNumber: trackingNum,
            status: 'SKIPPED',
            reason: 'Nomor pesanan tidak terdaftar di sistem',
          });
          continue;
        }

        const resolvedCourier = item.courierName?.trim() || autoDetectCourier(trackingNum, order.courierName);
        const originName = item.warehouseOriginName || order.warehouseOriginName || 'Gudang Pusat VARENA';
        const originCity = item.warehouseOriginCity || order.warehouseOriginCity || 'Jakarta';

        // ── KONDISI 1: Belum Dibayar ─────────────────────────────────────────────
        if (order.orderStatus === 'PENDING_PAYMENT') {
          skippedList.push({
            orderNumber: order.orderNumber,
            buyerName: order.buyerName,
            buyerPhone: order.buyerPhone,
            courierName: resolvedCourier,
            trackingNumber: trackingNum,
            previousStatus: order.orderStatus,
            status: 'SKIPPED',
            reason: 'Pesanan belum dibayar (Status: Belum Lunas). Konfirmasi transfer terlebih dahulu.',
          });
          continue;
        }

        // ── KONDISI 2: Sudah Dibatalkan / Direfund ───────────────────────────────
        if (order.orderStatus === 'CANCELLED' || order.orderStatus === 'REFUNDED') {
          skippedList.push({
            orderNumber: order.orderNumber,
            buyerName: order.buyerName,
            buyerPhone: order.buyerPhone,
            courierName: resolvedCourier,
            trackingNumber: trackingNum,
            previousStatus: order.orderStatus,
            status: 'SKIPPED',
            reason: `Pesanan telah ${order.orderStatus === 'CANCELLED' ? 'dibatalkan' : 'direfund'}.`,
          });
          continue;
        }

        // ── KONDISI 3: Sudah Selesai ────────────────────────────────────────────
        if (order.orderStatus === 'COMPLETED') {
          skippedList.push({
            orderNumber: order.orderNumber,
            buyerName: order.buyerName,
            buyerPhone: order.buyerPhone,
            courierName: resolvedCourier,
            trackingNumber: trackingNum,
            previousStatus: order.orderStatus,
            status: 'SKIPPED',
            reason: 'Pesanan sudah berstatus SELESAI (barang telah diterima konsumen).',
          });
          continue;
        }

        // ── KONDISI 4: Sudah Berstatus Terkirim (Koreksi / Perbaruan Resi) ──────
        if (order.orderStatus === 'SHIPPED') {
          const isSameResi = order.trackingNumber === trackingNum && order.courierName === resolvedCourier;
          if (isSameResi) {
            skippedList.push({
              orderNumber: order.orderNumber,
              buyerName: order.buyerName,
              buyerPhone: order.buyerPhone,
              courierName: resolvedCourier,
              trackingNumber: trackingNum,
              previousStatus: order.orderStatus,
              status: 'SKIPPED',
              reason: 'Pesanan sudah terkirim dengan nomor resi dan kurir yang sama.',
            });
            continue;
          }

          // Perbarui resi koreksi
          await tx.order.update({
            where: { id: order.id },
            data: {
              courierName: resolvedCourier,
              trackingNumber: trackingNum,
              warehouseOriginName: originName,
              warehouseOriginCity: originCity,
            },
          });

          await tx.auditLog.create({
            data: {
              actorUserId: authUser.userId || null,
              action: 'ORDER_RESI_UPDATED',
              entityType: 'ORDER',
              entityId: order.id,
              beforeJson: JSON.stringify({
                courierName: order.courierName,
                trackingNumber: order.trackingNumber,
              }),
              afterJson: JSON.stringify({
                courierName: resolvedCourier,
                trackingNumber: trackingNum,
              }),
              reason: `Koreksi resi manifest: ${order.trackingNumber || '-'} (${order.courierName || '-'}) → ${trackingNum} (${resolvedCourier})`,
            },
          });

          updatedList.push({
            orderNumber: order.orderNumber,
            buyerName: order.buyerName,
            buyerPhone: order.buyerPhone,
            courierName: resolvedCourier,
            trackingNumber: trackingNum,
            previousStatus: order.orderStatus,
            status: 'UPDATED',
            reason: 'Resi berhasil diperbarui (koreksi manifest)',
          });
          continue;
        }

        // ── KONDISI 5: Siap Kirim (PAID atau PROCESSING) ────────────────────────
        if (order.orderStatus === 'PAID' || order.orderStatus === 'PROCESSING') {
          const updateData: any = {
            orderStatus: 'SHIPPED',
            courierName: resolvedCourier,
            trackingNumber: trackingNum,
            warehouseOriginName: originName,
            warehouseOriginCity: originCity,
            shippedAt: new Date(),
          };

          // Jika pesanan sebelumnya dialihkan ke agen daerah / permintaan dropship pusat
          if (
            order.assignedAgentMemberId ||
            order.fulfillmentMode === 'ASSIGNED_AGENT' ||
            order.fulfillmentMode === 'AGENT_DROPSHIP_REQUEST'
          ) {
            updateData.agentDispatchStatus = 'DISPATCHED';
            updateData.fulfillmentSource = 'CENTRAL_WAREHOUSE';
            updateData.agentNote =
              (order.agentNote ? `${order.agentNote} | ` : '') +
              `Pengiriman massal dipenuhi langsung oleh Gudang Pusat VARENA (Resi: ${trackingNum})`;
          }

          await tx.order.update({
            where: { id: order.id },
            data: updateData,
          });

          await tx.auditLog.create({
            data: {
              actorUserId: authUser.userId || null,
              action: 'ORDER_BULK_SHIPPED',
              entityType: 'ORDER',
              entityId: order.id,
              beforeJson: JSON.stringify({ orderStatus: order.orderStatus }),
              afterJson: JSON.stringify(updateData),
              reason: `Pengiriman massal manifest logistik via ${resolvedCourier} no. resi ${trackingNum} dari ${originName}`,
            },
          });

          shippedList.push({
            orderNumber: order.orderNumber,
            buyerName: order.buyerName,
            buyerPhone: order.buyerPhone,
            courierName: resolvedCourier,
            trackingNumber: trackingNum,
            previousStatus: order.orderStatus,
            status: 'SHIPPED',
            reason: 'Berhasil diperbarui menjadi TERKIRIM',
          });
        }
      }
    });

    // ── Notifikasi Otomatis (WhatsApp Gateway & Outbox) ────────────────────────
    const notifyTargets = [...shippedList, ...updatedList];
    for (const s of notifyTargets) {
      if (s.buyerPhone) {
        // 1. Simpan ke WhatsApp Outbox Memory (untuk tab WhatsApp Outbox Admin)
        dispatchWaMessage({
          recipientPhone: s.buyerPhone,
          recipientName: s.buyerName || 'Pelanggan',
          templateType: 'ORDER_SHIPPED',
          message: templateOrderShipped({
            orderNumber: s.orderNumber,
            buyerName: s.buyerName || 'Pelanggan',
            courierName: s.courierName,
            trackingNumber: s.trackingNumber,
          }),
          referenceId: s.orderNumber,
        }).catch(() => {});

        // 2. Kirim via WhatsApp Queue / Gateway live jika aktif
        sendShippingNotification({
          phone: s.buyerPhone,
          customerName: s.buyerName || 'Pelanggan',
          orderNumber: s.orderNumber,
          trackingNumber: s.trackingNumber,
          courier: s.courierName,
        }).catch(() => {});
      }
    }

    const totalProcessed = shippedList.length + updatedList.length;
    let summaryMsg = `Pengiriman massal selesai: ${shippedList.length} pesanan berhasil dikirim`;
    if (updatedList.length > 0) {
      summaryMsg += `, ${updatedList.length} resi diperbarui`;
    }
    if (skippedList.length > 0) {
      summaryMsg += `, ${skippedList.length} pesanan dilewati (lihat rincian)`;
    }

    return NextResponse.json({
      success: true,
      message: summaryMsg,
      totalSubmitted: candidates.length,
      shippedCount: shippedList.length,
      updatedCount: updatedList.length,
      skippedCount: skippedList.length,
      shippedOrders: shippedList,
      updatedOrders: updatedList,
      skippedOrders: skippedList,
    });
  } catch (err: any) {
    console.error('Bulk ship error:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal memproses pengiriman massal.' },
      { status: 500 }
    );
  }
}
