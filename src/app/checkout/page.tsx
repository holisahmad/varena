'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ShoppingBag, CheckCircle, ShieldCheck, CreditCard, ArrowRight, Sparkles, Copy, Check } from 'lucide-react';
import { PRIMARY_COMPANY_BANK } from '@/config/bank';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const [variants, setVariants] = useState<any[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referralInfo, setReferralInfo] = useState<any>(null);
  const [isStockist, setIsStockist] = useState(false);

  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [shippingProvince, setShippingProvince] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [shippingDistrict, setShippingDistrict] = useState('');
  const [shippingPostalCode, setShippingPostalCode] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [shippingNotes, setShippingNotes] = useState('');
  const [uniqueCode, setUniqueCode] = useState(0);

  const [loading, setLoading] = useState(false);
  const [orderResult, setOrderResult] = useState<any>(null);
  const [settleResult, setSettleResult] = useState<any>(null);
  const [settling, setSettling] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);

  const copyAccountNumber = (accountNum: string) => {
    navigator.clipboard?.writeText(accountNum.replace(/\s+/g, ''));
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2000);
  };

  const copyAmount = (amount: number) => {
    navigator.clipboard?.writeText(String(amount));
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2000);
  };

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
        if (u.recipientName) setRecipientName(u.recipientName);
        if (u.recipientPhone) setRecipientPhone(u.recipientPhone);
        if (u.province) setShippingProvince(u.province);
        if (u.city) setShippingCity(u.city);
        if (u.district) setShippingDistrict(u.district);
        if (u.postalCode) setShippingPostalCode(u.postalCode);
        if (u.addressDetail) setAddressDetail(u.addressDetail);
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
  const total = subtotal + shippingCost; // uniqueCode added server-side, displayed after order created

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
          shippingAddress: `${addressDetail}, ${shippingDistrict}, ${shippingCity}, ${shippingProvince} ${shippingPostalCode}`,
          referralCode: referralCode ? referralCode.trim() : undefined,
          items: [{ variantId: selectedVariantId, quantity }],
          shippingCost,
          isStockistOrder: isStockist,
          recipientName: recipientName || buyerName,
          recipientPhone: recipientPhone || buyerPhone,
          shippingProvince,
          shippingCity,
          shippingDistrict,
          shippingPostalCode,
          shippingNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memproses pesanan.');
      }
      setOrderResult(data.order);
      if (data.order.uniqueCode) setUniqueCode(data.order.uniqueCode);
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
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="radio"
                          name="variant"
                          value={v.id}
                          checked={selectedVariantId === v.id}
                          onChange={() => setSelectedVariantId(v.id)}
                          className="w-4 h-4 text-varena-espresso focus:ring-varena-gold flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-varena-espresso truncate">{v.name}</div>
                          <div className="text-xs text-varena-taupe">Isi {v.packSize} sachet per {v.unit}</div>
                        </div>
                      </div>
                      <div className="font-serif font-bold text-sm text-varena-espresso whitespace-nowrap flex-shrink-0">
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
                  <label className="block font-semibold text-varena-espresso mb-1">Nama Penerima *</label>
                  <input
                    type="text"
                    required
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder={buyerName || 'Nama penerima paket'}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-varena-espresso mb-1">Nomor HP Penerima *</label>
                    <input
                      type="tel"
                      required
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      placeholder={buyerPhone || '081234567890'}
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

                <div className="pt-2 border-t border-varena-taupe/20">
                  <p className="font-bold text-varena-espresso mb-2 text-[11px] uppercase tracking-wide">Alamat Pengiriman Terstruktur</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-varena-espresso mb-1">Provinsi *</label>
                    <input
                      type="text"
                      required
                      value={shippingProvince}
                      onChange={(e) => setShippingProvince(e.target.value)}
                      placeholder="DKI Jakarta"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-varena-espresso mb-1">Kota / Kabupaten *</label>
                    <input
                      type="text"
                      required
                      value={shippingCity}
                      onChange={(e) => setShippingCity(e.target.value)}
                      placeholder="Jakarta Selatan"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-varena-espresso mb-1">Kecamatan *</label>
                    <input
                      type="text"
                      required
                      value={shippingDistrict}
                      onChange={(e) => setShippingDistrict(e.target.value)}
                      placeholder="Kebayoran Baru"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-varena-espresso mb-1">Kode Pos *</label>
                    <input
                      type="text"
                      required
                      value={shippingPostalCode}
                      onChange={(e) => setShippingPostalCode(e.target.value)}
                      placeholder="12160"
                      pattern="[0-9]{5}"
                      maxLength={5}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-varena-espresso mb-1">Detail Jalan / Alamat *</label>
                  <textarea
                    required
                    rows={2}
                    value={addressDetail}
                    onChange={(e) => setAddressDetail(e.target.value)}
                    placeholder="Jl. Mawar No. 12, RT 01/02, Komplek..."
                    className="w-full px-3.5 py-2 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
                  ></textarea>
                </div>

                <div>
                  <label className="block font-semibold text-varena-espresso mb-1">Catatan untuk Kurir (Opsional)</label>
                  <textarea
                    rows={1}
                    value={shippingNotes}
                    onChange={(e) => setShippingNotes(e.target.value)}
                    placeholder="Patokan / catatan pengantar"
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
              <p className="text-[10px] text-varena-gold-light/70">+ kode unik 3 digit akan ditambahkan otomatis</p>

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
            <div className="p-5 rounded-xl border-2 border-dashed border-varena-gold/60 bg-amber-50/40 space-y-4">
              <div className="text-center">
                <div className="text-xs font-bold text-varena-espresso flex items-center justify-center gap-1.5 mb-3">
                  <CreditCard className="w-4 h-4 text-varena-gold" />
                  <span>Instruksi Pembayaran</span>
                </div>

                {/* Bank destination */}
                <div className="p-3.5 rounded-lg bg-white border border-varena-gold/30 text-left space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] text-varena-taupe uppercase font-bold tracking-wider">Transfer ke Rekening:</div>
                    <button
                      type="button"
                      onClick={() => copyAccountNumber(PRIMARY_COMPANY_BANK.accountNumberClean)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-varena-espresso bg-varena-gold/15 hover:bg-varena-gold/30 px-2 py-0.5 rounded transition"
                      title="Salin Nomor Rekening"
                    >
                      {copiedBank ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-varena-espresso" />
                          <span>Salin No. Rek</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="font-mono text-base font-bold text-varena-espresso tracking-wide">
                    {PRIMARY_COMPANY_BANK.accountNumber}
                  </div>
                  <div className="text-xs font-semibold text-varena-espresso flex items-center justify-between">
                    <span>Bank {PRIMARY_COMPANY_BANK.bankName}</span>
                    <span className="text-stone-600 font-medium">a.n. {PRIMARY_COMPANY_BANK.accountHolder}</span>
                  </div>
                  {PRIMARY_COMPANY_BANK.statusNote && (
                    <div className="text-[10px] text-stone-500 italic">
                      *{PRIMARY_COMPANY_BANK.statusNote}
                    </div>
                  )}
                </div>

                {/* Exact amount */}
                <div className="mt-3 p-3.5 rounded-lg bg-varena-espresso text-center">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-varena-gold-light/75 uppercase font-bold tracking-wider text-left">
                      Nominal Yang Harus Ditransfer:
                    </span>
                    <button
                      type="button"
                      onClick={() => copyAmount(orderResult.total)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-varena-espresso bg-varena-gold-light hover:bg-white px-2.5 py-0.5 rounded transition shadow-xs"
                      title="Salin Angka Nominal Transfer"
                    >
                      {copiedAmount ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-700" />
                          <span className="text-emerald-800">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-varena-espresso" />
                          <span>Salin Nominal</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="font-serif text-2xl font-bold text-varena-gold-light tracking-tight">
                    Rp{(orderResult.total).toLocaleString('id-ID')}
                  </div>
                  {uniqueCode > 0 && (
                    <div className="text-[11px] text-varena-gold-light/85 mt-1 font-medium">
                      (termasuk kode unik: +Rp{uniqueCode} untuk rekonsiliasi otomatis)
                    </div>
                  )}
                </div>

                {/* Warning */}
                <div className="mt-3 p-2.5 rounded-lg bg-amber-100 border border-amber-300 text-left">
                  <div className="text-[11px] text-amber-900 font-semibold">⚠ Penting:</div>
                  <div className="text-[11px] text-amber-800">Transfer nominal EXACT termasuk {uniqueCode} digit terakhir. Jika salah nominal atau kode unik, klik link di bawah untuk konfirmasi manual.</div>
                </div>
              </div>

              {/* Wrong transfer link */}
              <div className="pt-2 border-t border-varena-gold/20 text-center">
                <Link
                  href={`/confirm-payment?orderNumber=${orderResult.orderNumber}`}
                  className="text-[11px] text-varena-gold hover:underline font-semibold"
                >
                  Salah transfer? Klik di sini untuk konfirmasi manual →
                </Link>
              </div>

              {/* Simulate payment button (sandbox only) */}
              <button
                type="button"
                onClick={handleSimulatePayment}
                disabled={settling}
                className="w-full py-2.5 rounded-lg bg-varena-espresso/60 text-varena-gold-light/80 font-semibold text-xs hover:bg-varena-espresso transition flex items-center justify-center gap-2 border border-dashed border-varena-gold/30"
              >
                {settling ? 'Memproses...' : '[DEV] Simulasikan Pembayaran Diterima'}
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
