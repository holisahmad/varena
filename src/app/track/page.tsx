'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  AlertCircle,
  ExternalLink,
  ArrowRight,
  MessageCircle,
  X,
} from 'lucide-react';
import { formatOrderStatus, getOrderStatusBadge } from '@/lib/formatters';

function TrackContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [copiedResi, setCopiedResi] = useState<string | null>(null);
  const [cancellingOrderNumber, setCancellingOrderNumber] = useState<string | null>(null);

  useEffect(() => {
    const initialQuery = searchParams.get('orderNumber') || searchParams.get('q');
    if (initialQuery) {
      setQuery(initialQuery);
      performSearch(initialQuery);
    }
  }, [searchParams]);

  const performSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    setError('');
    setOrders([]);

    try {
      const res = await fetch(`/api/v1/orders/track?q=${encodeURIComponent(searchTerm.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Pesanan tidak ditemukan.');
      }
      setOrders(data.orders || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderNumber: string) => {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin membatalkan pesanan ${orderNumber}? Stok produk akan otomatis dikembalikan ke sistem inventaris.`
    );
    if (!confirmed) return;

    setCancellingOrderNumber(orderNumber);
    try {
      const res = await fetch('/api/v1/orders/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber,
          reason: 'Dibatalkan oleh pembeli via halaman lacak pesanan.',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert('Pesanan berhasil dibatalkan. Stok barang telah dikembalikan.');
      performSearch(query);
    } catch (err: any) {
      alert(err.message || 'Gagal membatalkan pesanan.');
    } finally {
      setCancellingOrderNumber(null);
    }
  };

  const copyText = (txt: string) => {
    navigator.clipboard?.writeText(txt);
    setCopiedResi(txt);
    setTimeout(() => setCopiedResi(null), 2000);
  };

  const getStepStatus = (orderStatus: string, step: number) => {
    // 1: Created, 2: Paid, 3: Shipped, 4: Completed
    const map: Record<string, number> = {
      PENDING_PAYMENT: 1,
      PAID: 2,
      PROCESSING: 2,
      SHIPPED: 3,
      COMPLETED: 4,
    };
    const current = map[orderStatus] || 1;
    if (current > step) return 'completed';
    if (current === step) return 'current';
    return 'upcoming';
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 w-full">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="relative w-16 h-16 mx-auto rounded-full overflow-hidden border border-varena-gold p-0.5 bg-varena-espresso-dark mb-3 shadow-md">
          <Image
            src="/brand/logo-circle.png"
            alt="VARENA Luxury Logo"
            fill
            sizes="64px"
            className="object-contain"
            priority
          />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-varena-gold">
          Layanan Pelacakan Logistik
        </span>
        <h1 className="font-serif text-3xl font-bold text-varena-espresso mt-1">
          Lacak Pengiriman Pesanan
        </h1>
        <p className="text-xs sm:text-sm text-varena-taupe mt-1 max-w-md mx-auto">
          Pantau status pengemasan dan resi pengiriman kurir pesanan Anda secara *real-time*.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="bg-white border border-varena-taupe/20 rounded-2xl p-4 sm:p-6 shadow-sm mb-8">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            performSearch(query);
          }}
          className="flex flex-col sm:flex-row gap-2.5"
        >
          <div className="relative flex-1">
            <input
              type="text"
              required
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Masukkan Nomor Pesanan (VRN-...) atau No. HP..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-varena-taupe/30 text-xs sm:text-sm focus:outline-none focus:border-varena-gold font-mono"
            />
            <Search className="w-4 h-4 text-varena-taupe absolute left-3.5 top-3.5" />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="py-3 px-6 rounded-xl bg-varena-espresso text-varena-gold font-semibold text-xs sm:text-sm hover:bg-stone-900 transition flex items-center justify-center gap-2 disabled:opacity-50 shadow"
          >
            {loading ? 'Mencari...' : 'Lacak Sekarang'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-[11px] text-varena-taupe mt-2.5 text-center sm:text-left">
          💡 Tips: Anda dapat memasukkan nomor pesanan (contoh: <code>VRN-07979933-281</code>) atau nomor WhatsApp yang digunakan saat pemesanan.
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-3 mb-6">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <div className="font-bold">Pesanan Tidak Ditemukan</div>
            <div className="text-[11px] text-red-700 mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {/* Results */}
      {orders.length > 0 && (
        <div className="space-y-6">
          {orders.map((o) => {
            return (
              <div
                key={o.id}
                className="bg-white border border-varena-taupe/20 rounded-2xl p-6 shadow-sm space-y-6"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-varena-taupe/15 pb-4">
                  <div>
                    <span className="text-[10px] text-varena-taupe uppercase font-bold tracking-wider">
                      Nomor Pesanan:
                    </span>
                    <div className="font-mono text-base font-bold text-varena-espresso">
                      {o.orderNumber}
                    </div>
                    <div className="text-xs text-varena-taupe mt-0.5">
                      Tujuan: {o.shippingCity}, {o.shippingProvince} · Pelanggan: {o.buyerNameMasked}
                    </div>
                  </div>

                  <div className="sm:text-right">
                    {(() => {
                      const badge = getOrderStatusBadge(o.orderStatus, o.paymentConfirmationStatus);
                      return (
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                          {formatOrderStatus(o.orderStatus, o.paymentConfirmationStatus)}
                        </span>
                      );
                    })()}
                    <div className="text-xs font-mono font-bold text-varena-espresso mt-1">
                      Rp{o.total.toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>

                {/* Status Pembayaran Pending & Tombol Batalkan / Konfirmasi */}
                {o.orderStatus === 'PENDING_PAYMENT' && (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-xs text-amber-950 uppercase tracking-wide">
                          {o.paymentConfirmationStatus === 'SUBMITTED'
                            ? 'Menunggu Verifikasi Pembayaran oleh Finance VARENA'
                            : 'Menunggu Pembayaran Transfer Bank (Batas 1 Jam)'}
                        </div>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          {o.paymentConfirmationStatus === 'SUBMITTED'
                            ? 'Bukti transfer Anda telah dikirim dan sedang dicocokkan dengan mutasi rekening pusat. Pesanan Anda aman.'
                            : 'Silakan lakukan transfer bank sesuai nominal tagihan dan kirimkan konfirmasi pembayaran sebelum batas waktu berakhir.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/80">
                      <Link
                        href={`/confirm-payment?orderNumber=${encodeURIComponent(o.orderNumber)}`}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition inline-flex items-center gap-1.5 shadow-2xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{o.paymentConfirmationStatus === 'SUBMITTED' ? 'Kirim Ulang Bukti Transfer' : 'Konfirmasi Pembayaran Sekarang'}</span>
                      </Link>

                      {o.paymentConfirmationStatus !== 'SUBMITTED' && (
                        <button
                          type="button"
                          disabled={cancellingOrderNumber === o.orderNumber}
                          onClick={() => handleCancelOrder(o.orderNumber)}
                          className="px-3 py-1.5 rounded-lg border border-rose-300 bg-white hover:bg-rose-50 text-rose-700 text-xs font-semibold transition inline-flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5 text-rose-600" />
                          <span>{cancellingOrderNumber === o.orderNumber ? 'Membatalkan...' : 'Batalkan Pesanan Ini'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Resi Kurir Highlight */}
                {o.trackingNumber ? (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] text-emerald-800 uppercase font-bold tracking-wider">
                          Kurir & Nomor Resi Pengiriman:
                        </div>
                        <div className="font-mono text-sm sm:text-base font-bold text-emerald-950 flex items-center gap-2">
                          <span>{o.courierName || 'Ekspedisi Resmi'}</span>
                          <span>-</span>
                          <span>{o.trackingNumber}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => copyText(o.trackingNumber)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 transition shadow-2xs self-start sm:self-auto"
                    >
                      {copiedResi === o.trackingNumber ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Resi Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Salin Resi</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>
                      Pesanan sedang dipersiapkan dan dikemas di gudang pusat. Nomor resi kurir akan muncul otomatis setelah paket di-scan oleh pihak ekspedisi.
                    </span>
                  </div>
                )}

                {/* Progress Timeline */}
                <div>
                  <div className="text-xs font-bold text-varena-espresso mb-3 uppercase tracking-wider">
                    Tahapan Pengiriman:
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {/* Step 1 */}
                    <div
                      className={`p-3 rounded-xl border text-center ${
                        getStepStatus(o.orderStatus, 1) === 'completed' || getStepStatus(o.orderStatus, 1) === 'current'
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-semibold'
                          : 'border-stone-200 bg-stone-50 text-stone-400'
                      }`}
                    >
                      <div className="text-[10px] text-stone-500 mb-0.5">Langkah 1</div>
                      <div>Pesanan Dibuat</div>
                      {o.createdAt && (
                        <div className="text-[9px] text-stone-400 font-mono mt-1">
                          {new Date(o.createdAt).toLocaleDateString('id-ID')}
                        </div>
                      )}
                    </div>

                    {/* Step 2 */}
                    <div
                      className={`p-3 rounded-xl border text-center ${
                        getStepStatus(o.orderStatus, 2) === 'completed' || getStepStatus(o.orderStatus, 2) === 'current'
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-semibold'
                          : 'border-stone-200 bg-stone-50 text-stone-400'
                      }`}
                    >
                      <div className="text-[10px] text-stone-500 mb-0.5">Langkah 2</div>
                      <div>Pembayaran Lunas</div>
                      {o.paidAt && (
                        <div className="text-[9px] text-stone-400 font-mono mt-1">
                          {new Date(o.paidAt).toLocaleDateString('id-ID')}
                        </div>
                      )}
                    </div>

                    {/* Step 3 */}
                    <div
                      className={`p-3 rounded-xl border text-center ${
                        getStepStatus(o.orderStatus, 3) === 'completed' || getStepStatus(o.orderStatus, 3) === 'current'
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-semibold'
                          : 'border-stone-200 bg-stone-50 text-stone-400'
                      }`}
                    >
                      <div className="text-[10px] text-stone-500 mb-0.5">Langkah 3</div>
                      <div>Paket Dikirim</div>
                      {o.shippedAt && (
                        <div className="text-[9px] text-stone-400 font-mono mt-1">
                          {new Date(o.shippedAt).toLocaleDateString('id-ID')}
                        </div>
                      )}
                    </div>

                    {/* Step 4 */}
                    <div
                      className={`p-3 rounded-xl border text-center ${
                        getStepStatus(o.orderStatus, 4) === 'completed'
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-semibold'
                          : 'border-stone-200 bg-stone-50 text-stone-400'
                      }`}
                    >
                      <div className="text-[10px] text-stone-500 mb-0.5">Langkah 4</div>
                      <div>Pesanan Selesai</div>
                      {o.completedAt && (
                        <div className="text-[9px] text-stone-400 font-mono mt-1">
                          {new Date(o.completedAt).toLocaleDateString('id-ID')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Items List */}
                <div className="border-t border-varena-taupe/15 pt-3">
                  <div className="text-xs font-bold text-varena-espresso mb-2">Rincian Produk:</div>
                  <div className="space-y-1.5 text-xs text-stone-700">
                    {o.items.map((it: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center bg-stone-50 p-2 rounded-lg">
                        <span>
                          {it.quantity}x {it.name}
                        </span>
                        <span className="font-mono font-semibold">
                          Rp{it.lineTotal.toLocaleString('id-ID')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Help button */}
                <div className="border-t border-varena-taupe/15 pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <span className="text-stone-500">Ada kendala pengiriman?</span>
                  <a
                    href={`https://wa.me/6281234567890?text=Halo%20CS%20VARENA%2C%20saya%20ingin%20menanyakan%20status%20pesanan%20nomor%20${encodeURIComponent(
                      o.orderNumber
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Konfirmasi CS via WhatsApp</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer link to login */}
      <div className="mt-12 text-center text-xs text-varena-taupe space-y-2">
        <p>
          Ingin memantau semua riwayat pesanan & hak bonus secara otomatis?
        </p>
        <div className="flex items-center justify-center gap-4 font-semibold text-varena-gold hover:text-varena-espresso">
          <Link href="/login">Masuk ke Portal Member →</Link>
          <span>·</span>
          <Link href="/register">Daftar Akun Baru →</Link>
        </div>
      </div>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-sm text-varena-taupe">Memuat pelacakan...</div>}>
      <TrackContent />
    </Suspense>
  );
}
