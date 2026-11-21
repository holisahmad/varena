'use client';

import React, { useRef, useState } from 'react';
import {
  Printer,
  X,
  Copy,
  Check,
  Package,
  Truck,
  ShieldCheck,
  AlertTriangle,
  MapPin,
  Phone,
  Calendar,
  Layers,
} from 'lucide-react';

interface OrderItem {
  id?: string;
  nameSnapshot?: string;
  skuSnapshot?: string;
  unitPrice?: number;
  quantity: number;
  lineTotal?: number;
  variant?: {
    name?: string;
    sku?: string;
    unit?: string;
    packSize?: number;
  };
}

export interface ShippingOrderData {
  id: string;
  orderNumber: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail?: string | null;
  shippingAddress: string;
  shippingProvince?: string | null;
  shippingCity?: string | null;
  shippingDistrict?: string | null;
  shippingPostalCode?: string | null;
  shippingNotes?: string | null;
  courierName?: string | null;
  trackingNumber?: string | null;
  fulfillmentSource?: string | null;
  warehouseOriginName?: string | null;
  warehouseOriginCity?: string | null;
  orderStatus: string;
  total: number;
  shippingCost?: number;
  createdAt: string | Date;
  paidAt?: string | Date | null;
  items?: OrderItem[];
}

interface ShippingLabelModalProps {
  order: ShippingOrderData | null;
  onClose: () => void;
}

/**
 * Komponen Barcode SVG sederhana dan presisi
 * Menggunakan pola baris biner pseudo Code128 untuk tampilan visual label pengiriman profesional
 */
function SvgBarcode({ value, height = 48 }: { value: string; height?: number }) {
  // Hash sederhana untuk menghasilkan ketebalan bar yang konsisten dari string
  const bars: number[] = [];
  const cleanStr = (value || 'VRN-00000000').toUpperCase().replace(/[^A-Z0-9-]/g, '');

  // Start pattern
  bars.push(2, 1, 1, 2, 1, 1);
  for (let i = 0; i < cleanStr.length; i++) {
    const code = cleanStr.charCodeAt(i);
    const b1 = ((code * 3) % 3) + 1;
    const b2 = ((code * 5) % 2) + 1;
    const b3 = ((code * 7) % 3) + 1;
    const b4 = ((code * 11) % 2) + 1;
    bars.push(b1, b2, b3, b4);
  }
  // Stop pattern
  bars.push(2, 1, 2, 2, 2, 1, 3);

  let currentX = 10;
  const rects: React.ReactNode[] = [];
  let isBar = true;

  bars.forEach((width, idx) => {
    if (isBar) {
      rects.push(
        <rect
          key={idx}
          x={currentX}
          y={0}
          width={width * 1.5}
          height={height}
          fill="#111827"
        />
      );
    }
    currentX += width * 1.5;
    isBar = !isBar;
  });

  const totalWidth = currentX + 10;

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        className="w-full max-w-[280px] h-11"
        preserveAspectRatio="none"
      >
        {rects}
      </svg>
      <span className="font-mono text-[11px] font-bold tracking-widest text-black mt-0.5 select-all">
        {value}
      </span>
    </div>
  );
}

export default function ShippingLabelModal({ order, onClose }: ShippingLabelModalProps) {
  const [copied, setCopied] = useState(false);
  const [paperFormat, setPaperFormat] = useState<'THERMAL' | 'A4_A6'>('THERMAL');
  const printableRef = useRef<HTMLDivElement>(null);

  if (!order) return null;

  const orderDate = new Date(order.createdAt).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const printDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const resolvedCourier = order.courierName || 'JNE Express';
  const resolvedTrackingNumber = order.trackingNumber || `JNE-${order.orderNumber.replace(/[^0-9]/g, '').slice(-8)}-ID`;
  const originName = order.warehouseOriginName || (order.fulfillmentSource === 'REGIONAL_AGENT' ? 'Gudang Agen Resmi VARENA' : 'Gudang Pusat VARENA');
  const originCity = order.warehouseOriginCity || 'Jakarta / Hub Logistik';

  // Total box / item
  const totalQty = (order.items || []).reduce((sum, it) => sum + (it.quantity || 0), 0) || 1;
  const estimatedWeightKg = Math.max(0.5, totalQty * 0.35).toFixed(2);

  // Format teks lengkap untuk disalin ke aplikasi ekspedisi
  const copyableAddress = `Kepada: ${order.buyerName} (${order.buyerPhone})
Alamat: ${order.shippingAddress}
${order.shippingNotes ? `Catatan: ${order.shippingNotes}` : ''}
Dari: ${originName} (${originCity})
No. Pesanan: ${order.orderNumber}`;

  const handleCopyAddress = () => {
    navigator.clipboard?.writeText(copyableAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Print CSS Injection */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #shipping-label-printable-area,
          #shipping-label-printable-area * {
            visibility: visible !important;
          }
          #shipping-label-printable-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100mm !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 2mm !important;
            border: 2px solid #000 !important;
            box-shadow: none !important;
            background: #fff !important;
            color: #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: auto;
            margin: 4mm;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal Toolbar */}
        <div className="p-4 bg-stone-900 text-white flex items-center justify-between gap-3 border-b border-stone-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-base font-bold text-amber-100 flex items-center gap-2">
                <span>Cetak Label Resi Pengiriman (Airway Bill)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                  LUNAS
                </span>
              </h2>
              <p className="text-xs text-stone-400">
                Format label standar printer thermal / kertas sticker untuk ditempel pada box paket.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="w-8 h-8 rounded-lg bg-stone-800 text-stone-400 hover:text-white hover:bg-stone-700 transition flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Setting Bar / Controls */}
        <div className="px-5 py-3 bg-stone-100 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-stone-700 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-stone-500" />
              <span>Format Cetak:</span>
            </span>
            <div className="inline-flex rounded-lg border border-stone-300 p-0.5 bg-white">
              <button
                type="button"
                onClick={() => setPaperFormat('THERMAL')}
                className={`px-3 py-1 rounded-md text-[11px] font-bold transition ${
                  paperFormat === 'THERMAL'
                    ? 'bg-stone-900 text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Thermal (100×150 mm)
              </button>
              <button
                type="button"
                onClick={() => setPaperFormat('A4_A6')}
                className={`px-3 py-1 rounded-md text-[11px] font-bold transition ${
                  paperFormat === 'A4_A6'
                    ? 'bg-stone-900 text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Kertas A4 / A6
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyAddress}
              className="px-3 py-1.5 rounded-lg border border-stone-300 hover:bg-white text-stone-700 font-semibold text-xs flex items-center gap-1.5 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin!' : 'Salin Teks Alamat'}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Sekarang (Ctrl+P)</span>
            </button>
          </div>
        </div>

        {/* Printable Area Container (Preview on Screen) */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-stone-200/60 flex justify-center">
          <div
            id="shipping-label-printable-area"
            ref={printableRef}
            className={`bg-white text-black p-4 sm:p-5 rounded-xl border-2 border-stone-900 shadow-md ${
              paperFormat === 'THERMAL' ? 'w-full max-w-[420px]' : 'w-full max-w-[500px]'
            }`}
            style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
          >
            {/* 1. Header Ekspedisi & Brand */}
            <div className="border-b-2 border-black pb-2.5 flex items-start justify-between gap-2">
              <div>
                <div className="text-xl font-black tracking-tight flex items-center gap-1.5 text-black">
                  <span className="font-serif">VARENA</span>
                  <span className="text-[10px] uppercase font-sans font-extrabold tracking-widest bg-black text-white px-1.5 py-0.5 rounded">
                    OFFICIAL
                  </span>
                </div>
                <div className="text-[10px] text-stone-700 font-medium">
                  Direct Selling Platform · Official Hub
                </div>
              </div>

              <div className="text-right">
                <div className="text-base font-black uppercase tracking-wider text-black flex items-center justify-end gap-1">
                  <Truck className="w-4 h-4 inline" />
                  <span>{resolvedCourier}</span>
                </div>
                <div className="text-[10px] font-bold text-stone-800">
                  LAYANAN REGULER (STD)
                </div>
              </div>
            </div>

            {/* 2. Badge Status LUNAS / NON-COD & Barcode Resi */}
            <div className="my-2.5 p-2 bg-stone-100 border-2 border-black rounded-lg flex items-center justify-between gap-2">
              <div className="border-r border-stone-400 pr-3">
                <div className="text-[9px] uppercase font-bold text-stone-600">Metode Bayar:</div>
                <div className="text-base font-black text-black tracking-tight leading-none">
                  NON-COD
                </div>
                <div className="text-[9px] font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-400 px-1 py-0.2 rounded mt-0.5 text-center">
                  SUDAH LUNAS
                </div>
              </div>

              <div className="flex-1 text-center pl-1">
                <div className="text-[9px] uppercase font-bold text-stone-600">No. Resi Pengiriman:</div>
                <div className="font-mono text-sm font-black tracking-wider text-black">
                  {resolvedTrackingNumber}
                </div>
                <div className="text-[9px] text-stone-500 font-mono">
                  No. Order: {order.orderNumber}
                </div>
              </div>
            </div>

            {/* 3. Barcode SVG Visual */}
            <div className="py-1.5 text-center border-b-2 border-black">
              <SvgBarcode value={resolvedTrackingNumber} height={42} />
            </div>

            {/* 4. Grid Penerima & Pengirim */}
            <div className="border-b-2 border-black py-2.5 space-y-2">
              {/* PENERIMA (TO) - Dibuat Paling Menonjol */}
              <div className="bg-stone-50 p-2.5 rounded-lg border border-black">
                <div className="text-[10px] font-black uppercase tracking-wider text-stone-700 flex items-center gap-1 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-black" />
                  <span>PENERIMA (TUJUAN PENGIRIMAN):</span>
                </div>
                <div className="text-sm font-black text-black">
                  {order.buyerName}
                </div>
                <div className="font-mono text-xs font-black text-black flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3 text-stone-700" />
                  <span>{order.buyerPhone}</span>
                </div>
                <div className="text-xs text-black font-semibold leading-relaxed mt-1">
                  {order.shippingAddress}
                </div>
                {order.shippingNotes && (
                  <div className="mt-1.5 p-1 rounded bg-amber-50 border border-amber-300 text-[10px] font-bold text-amber-950">
                    Instruksi Kurir: {order.shippingNotes}
                  </div>
                )}
              </div>

              {/* PENGIRIM (FROM) */}
              <div className="px-2.5 py-1.5 text-[11px] text-stone-800 border-t border-dashed border-stone-300">
                <span className="font-bold text-stone-600 uppercase text-[9px] block">PENGIRIM:</span>
                <div className="font-bold text-black">{originName}</div>
                <div className="text-stone-700 text-[10px]">
                  Asal Pengiriman: {originCity} · Telp CS: +62 812-3456-7890
                </div>
              </div>
            </div>

            {/* 5. Daftar Isi Paket (Packing Manifest) */}
            <div className="py-2 border-b-2 border-black text-xs">
              <div className="text-[10px] font-black uppercase tracking-wider text-stone-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Package className="w-3 h-3 text-black" />
                  <span>RINCIAN ISI PAKET (PACKING LIST):</span>
                </span>
                <span className="text-[9px] font-mono text-stone-600">
                  Est. Berat: {estimatedWeightKg} kg
                </span>
              </div>

              <table className="w-full text-left text-[11px] border border-stone-300">
                <thead className="bg-stone-100 border-b border-stone-300 text-[10px] font-black text-stone-700">
                  <tr>
                    <th className="py-1 px-2">Nama Produk / Varian</th>
                    <th className="py-1 px-2 text-center w-12">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 font-medium">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-1 px-2 text-black">
                          {it.nameSnapshot || it.variant?.name || 'Produk VARENA'}
                          {it.variant?.packSize ? ` (Isi ${it.variant.packSize})` : ''}
                        </td>
                        <td className="py-1 px-2 text-center font-bold text-black font-mono">
                          {it.quantity}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-1 px-2 text-black">Produk VARENA Official</td>
                      <td className="py-1 px-2 text-center font-bold text-black font-mono">1</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="mt-1 flex items-center justify-between text-[10px] font-bold text-stone-800">
                <span>Total Barang: {totalQty} box/item</span>
                <span>Tgl Pesan: {orderDate}</span>
              </div>
            </div>

            {/* 6. Footer Peringatan & Handle with Care */}
            <div className="pt-2 flex items-center justify-between text-[9px] text-stone-600">
              <div className="flex items-center gap-1 font-bold text-black border border-black px-1.5 py-0.5 rounded uppercase">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                <span>FRAGILE · JANGAN DIBANTING</span>
              </div>
              <div className="text-right text-[8px] font-mono">
                Cetak: {printDate} · VARENA
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="text-xs text-stone-500 hidden sm:block">
            Tips: Pada dialog print browser, pilih printer thermal 4x6 / 100x150mm dan matikan opsi header/footer URL.
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 font-semibold text-xs transition"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-black text-white font-bold text-xs flex items-center gap-2 transition shadow-sm"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Cetak Label Resi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
