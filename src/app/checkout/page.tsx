'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ShoppingBag, CheckCircle, ShieldCheck, CreditCard, ArrowRight, Sparkles } from 'lucide-react';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const [variants, setVariants] = useState<any[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referralInfo, setReferralInfo] = useState<any>(null);
  const [isStockist, setIsStockist] = useState(false);

  const [loading, setLoading] = useState(false);
  const [orderResult, setOrderResult] = useState<any>(null);
  const [settleResult, setSettleResult] = useState<any>(null);
  const [settling, setSettling] = useState(false);

  useEffect(() => {
    // 1. Fetch available product variants
    fetch('/api/v1/catalog/products')
      .then((res) => res.json())
      .then((data) => {
        if (data.products && data.products.length > 0) {
          const allVariants: any[] = [];
          data.products.forEach((p: any) => {
            p.variants.forEach((v: any) => allVariants.push(v));
          });
          setVariants(allVariants);

          const preselect = searchParams?.get('variantId');
          if (preselect && allVariants.some((v) => v.id === preselect)) {
            setSelectedVariantId(preselect);
          } else if (allVariants.length > 0) {
            setSelectedVariantId(allVariants[0].id);
          }
        }
      });

    // 2. Prepopulate referral code if stored or param
    const paramRef = searchParams?.get('ref');
    const storedRef = localStorage.getItem('varena_referral_code');
    const initialRef = (paramRef || storedRef || 'VRN-0001').toUpperCase();
    setReferralCode(initialRef);
    validateReferral(initialRef);

    // 3. Prepopulate buyer info if logged in
    const storedUser = localStorage.getItem('varena_user');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        if (u.displayName) setBuyerName((prev) => prev || u.displayName);
        if (u.email) setBuyerEmail((prev) => prev || u.email);
        if (u.phone) setBuyerPhone((prev) => prev || u.phone);
        if (u.stockistType === 'MASTER' || u.stockistType === 'MOBILE') {
          setIsStockist(true);
        }
      } catch (e) {}
    }
  }, [searchParams]);

  const validateReferral = async (code: string) => {
    if (!code) {
      setReferralInfo(null);
      return;
    }
    try {
      const res = await fetch(`/api/v1/catalog/referral-check?code=${code.trim()}`);
      const data = await res.json();
      if (data.valid) {
        setReferralInfo(data.sponsor);
      } else {
        setReferralInfo(null);
      }
    } catch (e) {
      setReferralInfo(null);
    }
  };

  const selectedVariant = variants.find((v) => v.id === selectedVariantId);
  const subtotal = selectedVariant ? selectedVariant.price * quantity : 0;
  const shippingCost = isStockist ? 0 : (subtotal > 0 ? 20000 : 0);
  const total = subtotal + shippingCost;

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariantId || quantity < 1) return;

    setLoading(true);
    setOrderResult(null);
    setSettleResult(null);

    try {
      const storedUser = localStorage.getItem('varena_user');
      let buyerUserId: string | undefined = undefined;
      if (storedUser) {
        try {
          const u = JSON.parse(storedUser);
          buyerUserId = u.userId || u.id;
        } catch (e) {}
      }

      const res = await fetch('/api/v1/orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerUserId,
          buyerName,
          buyerPhone,
          buyerEmail,
          shippingAddress,
          referralCode: referralCode ? referralCode.trim() : undefined,
          items: [{ variantId: selectedVariantId, quantity }],
          shippingCost,
          isStockistOrder: isStockist,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memproses pesanan.');
      }
      setOrderResult(data.order);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatePayment = async () => {
    if (!orderResult?.id) return;
    setSettling(true);

    try {
      const res = await fetch('/api/v1/orders/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderResult.id,
          providerRef: `SIM-BANK-REF-${Date.now()}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyelesaikan pembayaran.');
      }
      setSettleResult(data.result);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSettling(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      <div className="text-center max-w-xl mx-auto mb-8">
        <span className="text-xs font-semibold uppercase tracking-wider text-varena-gold">VARENA Market</span>
        <h1 className="font-serif text-3xl font-bold text-varena-espresso mt-1">Checkout & Pemesanan</h1>
        <p className="text-xs sm:text-sm text-varena-taupe-dark mt-1">
          Pemesanan langsung konsumen dengan perlindungan konsumen dan jaminan mutu 100%.
        </p>
      </div>

      {!orderResult ? (
        <form onSubmit={handleCreateOrder} className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Order Details Column */}
          <div className="md:col-span-7 space-y-6">
            {/* Variant Selector */}
            <div className="bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-4">
              <h2 className="font-serif text-lg font-bold text-varena-espresso flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-varena-gold" />
                <span>Pilih Produk & Varian</span>
              </h2>

              <div className="space-y-3">
                {variants.map((v) => (
                  <label
                    key={v.id}
                    className={`block p-4 rounded-xl border cursor-pointer transition ${
                      selectedVariantId === v.id
                        ? 'border-varena-gold bg-varena-ivory-light shadow-sm'
                        : 'border-varena-taupe/20 bg-white hover:border-varena-gold/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="variant"
                          value={v.id}
                          checked={selectedVariantId === v.id}
                          onChange={() => setSelectedVariantId(v.id)}
                          className="w-4 h-4 text-varena-espresso focus:ring-varena-gold"
                        />
                        <div>
                          <div className="font-semibold text-sm text-varena-espresso">{v.name}</div>
                          <div className="text-xs text-varena-taupe">Isi {v.packSize} sachet per {v.unit}</div>
                        </div>
                      </div>
                      <div className="font-serif font-bold text-sm text-varena-espresso">
                        Rp{v.price.toLocaleString('id-ID')}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {/* Quantity */}
              <div className="pt-3 border-t border-varena-taupe/20 flex items-center justify-between">
                <span className="text-xs font-semibold text-varena-espresso">Jumlah Pembelian:</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-lg border border-varena-taupe/30 flex items-center justify-center font-bold text-varena-espresso hover:bg-varena-ivory"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-semibold text-sm">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 rounded-lg border border-varena-taupe/30 flex items-center justify-center font-bold text-varena-espresso hover:bg-varena-ivory"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Buyer Form */}
            <div className="bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-4">
              <h2 className="font-serif text-lg font-bold text-varena-espresso">Data Penerima & Pengiriman</h2>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-varena-espresso mb-1">Nama Lengkap Pembeli *</label>
                  <input
                    type="text"
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Contoh: Budi Gunawan"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-varena-espresso mb-1">Nomor WhatsApp / HP *</label>
                    <input
                      type="tel"
                      required
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value)}
                      placeholder="081234567890"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-varena-espresso mb-1">Email (Opsional)</label>
                    <input
                      type="email"
                      value={buyerEmail}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                      placeholder="budi@example.com"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-varena-espresso mb-1">Alamat Lengkap Pengiriman *</label>
                  <textarea
                    required
                    rows={2}
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="Jl. Mawar No. 12, RT 01/02, Kebayoran Baru, Jakarta Selatan"
                    className="w-full px-3.5 py-2 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>

          {/* Right Summary Column */}
          <div className="md:col-span-5 space-y-6">
            {/* Referral Attribution Box */}
            <div className="bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-varena-espresso">Kode Referral Mitra:</span>
                {referralInfo && (
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
                    Terverifikasi
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setReferralCode(val);
                    validateReferral(val);
                  }}
                  placeholder="Kode Sponsor (misal: VRN-0001)"
                  className="flex-1 px-3 py-2 text-xs font-mono rounded-lg border border-varena-taupe/30 uppercase focus:outline-none focus:border-varena-gold"
                />
              </div>

              {referralInfo ? (
                <div className="p-2.5 rounded-lg bg-varena-ivory-light border border-varena-gold/30 text-xs">
                  <div className="text-varena-taupe text-[11px]">Sponsor Rujukan:</div>
                  <div className="font-semibold text-varena-espresso">{referralInfo.name} ({referralInfo.code})</div>
                </div>
              ) : (
                <div className="text-[11px] text-varena-taupe">
                  * Transaksi tanpa kode sponsor akan langsung ditangani oleh operasional resmi pusat.
                </div>
              )}
            </div>

            {/* Total Summary */}
            <div className="bg-varena-espresso text-varena-ivory p-6 rounded-2xl shadow-md space-y-4">
              <h2 className="font-serif text-lg font-bold text-varena-gold-light">Ringkasan Pesanan</h2>

              <div className="space-y-2 text-xs text-varena-ivory/80 pb-4 border-b border-[#4A3B30]">
                <div className="flex justify-between">
                  <span>Subtotal Produk ({quantity}x)</span>
                  <span>Rp{subtotal.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Ongkos Kirim</span>
                  {isStockist ? (
                    <span className="text-emerald-400 font-semibold">Gratis (Ditanggung Kantor Pusat)</span>
                  ) : (
                    <span className="text-varena-gold-light font-semibold">Rp{shippingCost.toLocaleString('id-ID')}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-base font-bold">
                <span>Total Tagihan:</span>
                <span className="font-serif text-2xl text-varena-gold-light">Rp{total.toLocaleString('id-ID')}</span>
              </div>

              <button
                type="submit"
                disabled={loading || subtotal <= 0}
                className="w-full py-3.5 rounded-xl bg-varena-gold text-varena-espresso font-semibold text-sm hover:bg-varena-gold-hover transition disabled:opacity-50 flex items-center justify-center gap-2 shadow"
              >
                {loading ? 'Membuat Pesanan...' : 'Buat Pesanan Sekarang'}
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2 text-[10px] text-varena-taupe-light text-center flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-varena-gold-light" />
                <span>Transaksi dijamin aman & sesuai hukum dagang</span>
              </div>
            </div>
          </div>
        </form>
      ) : (
        /* Order Created & Payment Settlement Simulator */
        <div className="bg-white border border-varena-taupe/20 rounded-2xl p-6 sm:p-10 shadow-sm max-w-2xl mx-auto space-y-6">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center mb-3">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-varena-espresso">Pesanan Berhasil Dibuat</h2>
            <p className="text-xs text-varena-taupe mt-1 font-mono">Nomor Pesanan: {orderResult.orderNumber}</p>
          </div>

          <div className="p-4 rounded-xl bg-varena-ivory-light border border-varena-taupe/20 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-varena-taupe">Total Tagihan:</span>
              <span className="font-bold text-varena-espresso text-sm">Rp{orderResult.total.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-varena-taupe">Status Pesanan:</span>
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold font-mono">
                {orderResult.status}
              </span>
            </div>
          </div>

          {!settleResult ? (
            <div className="p-5 rounded-xl border-2 border-dashed border-varena-gold/60 bg-amber-50/40 text-center space-y-3">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-varena-espresso">
                <CreditCard className="w-4 h-4 text-varena-gold" />
                <span>Simulasi Pembayaran Terverifikasi (Sandbox)</span>
              </div>
              <p className="text-[11px] text-varena-taupe-dark">
                Tekan tombol di bawah untuk menyimulasikan webhook pembayaran sukses. Sistem secara otomatis akan memproses mesin komisi (Direct Reward + 10-level Development Placement) dan mencatat mutasi ke Buku Besar (Double-Entry Ledger).
              </p>
              <button
                type="button"
                onClick={handleSimulatePayment}
                disabled={settling}
                className="w-full py-3 rounded-lg bg-varena-espresso text-varena-gold-light font-semibold text-xs hover:bg-varena-espresso-dark transition flex items-center justify-center gap-2 shadow"
              >
                {settling ? 'Menghitung Komisi & Buku Besar...' : 'Simulasikan Pembayaran Berhasil'}
              </button>
            </div>
          ) : (
            <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-4">
              <div className="flex items-center gap-2 text-emerald-800 font-semibold text-xs">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Pembayaran Lunas & Komisi Berhasil Dihitung!</span>
              </div>

              <div className="text-xs space-y-1.5 text-emerald-950 font-mono">
                <div>Total Komisi Terdistribusi: Rp{settleResult.commissionResult.totalDistributed.toLocaleString('id-ID')}</div>
                <div>Alokasi Cadangan (Unallocated): Rp{settleResult.commissionResult.unallocatedAmount.toLocaleString('id-ID')}</div>
                <div>Jumlah Titik Penerima: {settleResult.commissionResult.itemCount} titik</div>
              </div>

              <div className="pt-3 border-t border-emerald-200 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/member/wallet"
                  className="flex-1 text-center py-2.5 rounded-lg bg-emerald-700 text-white font-semibold text-xs hover:bg-emerald-800 transition"
                >
                  Cek Dompet & Mutasi Buku Besar
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setOrderResult(null);
                    setSettleResult(null);
                  }}
                  className="py-2.5 px-4 rounded-lg border border-emerald-700 text-emerald-900 font-semibold text-xs hover:bg-emerald-100 transition"
                >
                  Buat Pesanan Lain
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-sm text-varena-taupe">Memuat checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
