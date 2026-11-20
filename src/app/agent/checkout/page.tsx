'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Package,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Building2,
  MapPin,
  CreditCard,
  Wallet,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  Truck,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { PRIMARY_COMPANY_BANK } from '@/config/bank';
import { formatOrderStatus } from '@/lib/formatters';

interface CartItem {
  variantId: string;
  quantity: number;
}

function AgentCheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<any>(null);
  const [agentData, setAgentData] = useState<any>(null);
  const [config, setConfig] = useState<any>({ minimumRestockBox: 10, defaultDiscountValue: 15 });
  const [variants, setVariants] = useState<any[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);

  // Payment method: 'DEPOSIT' | 'MANUAL_TRANSFER' | 'HYBRID'
  const [paymentMethod, setPaymentMethod] = useState<'DEPOSIT' | 'MANUAL_TRANSFER' | 'HYBRID'>('DEPOSIT');

  // Shipping & Notes
  const [shippingNotes, setShippingNotes] = useState('');

  // Submission & Result state
  const [loading, setLoading] = useState(false);
  const [orderResult, setOrderResult] = useState<any>(null);
  const [confirmingReceipt, setConfirmingReceipt] = useState(false);
  const [simulatingPayment, setSimulatingPayment] = useState(false);

  // Copy state
  const [copiedBank, setCopiedBank] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [copiedResi, setCopiedResi] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const copyToClipboard = (text: string, type: 'bank' | 'amount' | 'resi') => {
    navigator.clipboard?.writeText(text.replace(/\s+/g, ''));
    if (type === 'bank') {
      setCopiedBank(true);
      setTimeout(() => setCopiedBank(false), 2000);
    } else if (type === 'amount') {
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    } else {
      setCopiedResi(true);
      setTimeout(() => setCopiedResi(false), 2000);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem('varena_user');
    if (!stored) {
      router.push('/login');
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      setUser(parsed);

      const headers: Record<string, string> = {
        'x-user-id': parsed.userId || parsed.id || '',
        'x-user-email': parsed.email || '',
      };

      // 1. Load agent profile & config
      fetch(`/api/v1/agent/profile?memberCode=${parsed.memberCode || ''}`, { headers })
        .then((r) => r.json())
        .then((data) => {
          if (data.agent) setAgentData(data.agent);
          if (data.config) {
            setConfig(data.config);
            const initialMoq = data.config.minimumRestockBox || 10;
            setCart((prev) => {
              if (prev.length === 1 && prev[0].quantity === 10 && initialMoq !== 10) {
                return [{ ...prev[0], quantity: initialMoq }];
              }
              return prev;
            });
          }
        })
        .catch((err) => console.error('Failed to load agent profile:', err));

      // 2. Load catalog products & variants
      fetch('/api/v1/catalog/products')
        .then((r) => r.json())
        .then((data) => {
          if (data.products) {
            const list: any[] = [];
            data.products.forEach((p: any) => {
              (p.variants || []).forEach((v: any) => {
                if (v.status === 'ACTIVE' && (v.allowAgentStock || v.variantType === 'PACK')) {
                  list.push({ ...v, productName: p.name });
                }
              });
            });
            setVariants(list);
            if (list.length > 0) {
              setSelectedVariantId(list[0].id);
              // Pre-fill initial cart with minimum MOQ from config
              const defaultMoq = config?.minimumRestockBox || 10;
              setCart([{ variantId: list[0].id, quantity: defaultMoq }]);
            }
          }
        })
        .catch((err) => console.error('Failed to load catalog:', err));

      // 3. If query param orderNumber is present, load existing order detail
      const paramOrderNumber = searchParams?.get('orderNumber');
      if (paramOrderNumber) {
        fetch(`/api/v1/orders/detail?orderNumber=${encodeURIComponent(paramOrderNumber)}`)
          .then((r) => r.json())
          .then((data) => {
            if (data.success && data.order) {
              setOrderResult(data.order);
            }
          })
          .catch((err) => console.error('Failed to load existing order:', err));
      }
    } catch {
      router.push('/login');
    }
  }, [router, searchParams]);

  // Cart operations (Direct Multi-Product Adjustment)
  const getVariantQty = (variantId: string) => {
    const item = cart.find((i) => i.variantId === variantId);
    return item ? item.quantity : 0;
  };

  const setVariantQty = (variantId: string, qty: number) => {
    const safeQty = Math.max(0, qty);
    setCart((prev) => {
      const existing = prev.find((i) => i.variantId === variantId);
      if (safeQty === 0) {
        return prev.filter((i) => i.variantId !== variantId);
      }
      if (existing) {
        return prev.map((i) => (i.variantId === variantId ? { ...i, quantity: safeQty } : i));
      }
      return [...prev, { variantId, quantity: safeQty }];
    });
  };

  const addToCart = (variantId: string) => {
    setVariantQty(variantId, getVariantQty(variantId) + 1);
  };

  const updateCartQty = (variantId: string, qty: number) => {
    setVariantQty(variantId, qty);
  };

  const removeFromCart = (variantId: string) => {
    setVariantQty(variantId, 0);
  };

  // Calculations
  const minMoq = config?.minimumRestockBox || 10;
  const totalCartQty = cart.reduce((s, i) => s + i.quantity, 0);
  const isBelowMoq = totalCartQty < minMoq;

  const grossSubtotal = cart.reduce((sum, item) => {
    const v = variants.find((vr) => vr.id === item.variantId);
    return sum + (v ? v.price * item.quantity : 0);
  }, 0);

  const discountType = agentData?.agentDiscountType || config?.defaultDiscountType || 'PERCENTAGE';
  const discountVal = agentData?.agentDiscountValue ?? config?.defaultDiscountValue ?? 15.0;

  let discountAmount = 0;
  if (discountType === 'PERCENTAGE') {
    discountAmount = Math.round((grossSubtotal * discountVal) / 100);
  } else {
    const totalQty = cart.reduce((s, i) => s + i.quantity, 0);
    discountAmount = Math.round(discountVal * totalQty);
  }

  const netSubtotal = grossSubtotal - discountAmount;
  const depositBalance = agentData?.agentDepositBalance || 0;

  // Deposit sufficiency calculation
  const depositDeficit = Math.max(0, netSubtotal - depositBalance);
  const isDepositSufficient = depositBalance >= netSubtotal && netSubtotal > 0;

  // Hybrid breakdown
  const hybridDepositUsed = Math.min(depositBalance, netSubtotal);
  const hybridRemainingToTransfer = Math.max(0, netSubtotal - hybridDepositUsed);

  // Derived breakdown for orderResult
  const breakdown = orderResult
    ? (() => {
        const subtotal = orderResult.subtotal || 0;
        const discount = orderResult.discount || 0;
        const netSub = subtotal - discount;
        const uniqueCode = orderResult.uniqueCode || 0;
        const total = orderResult.total || 0;

        const payments: any[] = orderResult.payments || [];
        const depPay = payments.find((p) => p.provider === 'HYBRID_DEPOSIT' || p.provider === 'AGENT_DEPOSIT');
        const manPay = payments.find((p) => p.provider === 'HYBRID_MANUAL' || p.provider === 'MANUAL_TRANSFER');

        const depositUsed =
          orderResult.depositAmountUsed !== undefined
            ? orderResult.depositAmountUsed
            : depPay
            ? depPay.amount
            : 0;

        const manualAmount =
          orderResult.manualTransferAmount !== undefined
            ? orderResult.manualTransferAmount
            : manPay
            ? manPay.amount
            : uniqueCode > 0
            ? total - depositUsed
            : 0;

        const isHybrid =
          (depPay && manPay) ||
          (depositUsed > 0 && manualAmount > 0) ||
          (depositUsed > 0 && depositUsed < netSub);
        const isDepositFull = depositUsed > 0 && manualAmount === 0;
        const isManualFull = depositUsed === 0 && (manualAmount > 0 || uniqueCode > 0);

        return {
          subtotal,
          discount,
          netSubtotal: netSub,
          uniqueCode,
          total,
          depositUsed,
          manualAmount,
          isHybrid,
          isDepositFull,
          isManualFull,
        };
      })()
    : null;

  // Submit Restock Order
  const handleCreateRestockOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || netSubtotal <= 0) return;

    if (totalCartQty < minMoq) {
      setToastMessage({
        text: `Minimal pemesanan pasokan agen adalah ${minMoq} Box sesuai aturan keagenan kantor pusat. Pesanan Anda saat ini baru ${totalCartQty} Box.`,
        type: 'error',
      });
      return;
    }

    if (paymentMethod === 'DEPOSIT' && !isDepositSufficient) {
      setToastMessage({
        text: `Saldo deposit tidak mencukupi (Kurang Rp${depositDeficit.toLocaleString('id-ID')}). Pilih metode Transfer Manual atau Hybrid.`,
        type: 'error',
      });
      return;
    }

    setLoading(true);
    setToastMessage(null);

    try {
      const res = await fetch('/api/v1/agent/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_RESTOCK',
          memberCode: user?.memberCode,
          items: cart,
          paymentMethod,
          notes: shippingNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal memproses pemesanan pasokan.');
      }

      setOrderResult(data.order);
      setToastMessage({ text: data.message, type: 'success' });

      // Refresh agent balance if deposit was deducted
      if (paymentMethod === 'DEPOSIT' || paymentMethod === 'HYBRID') {
        fetch(`/api/v1/agent/profile?memberCode=${user.memberCode || ''}`)
          .then((r) => r.json())
          .then((d) => {
            if (d.agent) setAgentData(d.agent);
          })
          .catch(() => {});
      }
    } catch (err: any) {
      setToastMessage({ text: err.message || 'Terjadi kesalahan sistem.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Agent confirms receipt of shipped restock
  const handleConfirmReceipt = async () => {
    if (!orderResult?.id) return;
    setConfirmingReceipt(true);
    try {
      const res = await fetch('/api/v1/agent/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CONFIRM_RECEIPT',
          memberCode: user?.memberCode,
          orderId: orderResult.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengonfirmasi penerimaan barang.');
      }

      setOrderResult(data.order);
      setToastMessage({ text: data.message, type: 'success' });
    } catch (err: any) {
      setToastMessage({ text: err.message, type: 'error' });
    } finally {
      setConfirmingReceipt(false);
    }
  };

  // Simulate payment (for testing Manual / Hybrid orders)
  const handleSimulatePayment = async () => {
    if (!orderResult?.id) return;
    setSimulatingPayment(true);
    try {
      const res = await fetch('/api/v1/agent/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SIMULATE_PAYMENT',
          memberCode: user?.memberCode,
          orderId: orderResult.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal memverifikasi pembayaran simulasi.');
      }

      setOrderResult(data.order);
      setToastMessage({ text: data.message, type: 'success' });
    } catch (err: any) {
      setToastMessage({ text: err.message, type: 'error' });
    } finally {
      setSimulatingPayment(false);
    }
  };

  const currentOrderStatus = orderResult ? (orderResult.orderStatus || orderResult.status || 'PENDING_PAYMENT') : '';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full font-sans">
      {/* Header & Breadcrumb */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-varena-taupe/20 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-varena-taupe mb-1">
            <Link href="/agent" className="hover:text-varena-gold transition flex items-center gap-1 font-semibold">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Portal Agen</span>
            </Link>
            <span>/</span>
            <span className="text-varena-espresso font-medium">Pemesanan Pasokan Grosir</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-varena-espresso flex items-center gap-2.5">
            <Package className="w-7 h-7 text-varena-gold" />
            <span>Restock Pasokan Resmi Agen</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
            <span>Agen Resmi VARENA</span>
          </span>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`mb-6 p-4 rounded-xl text-xs flex items-center justify-between gap-3 shadow-xs ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-stone-400 hover:text-stone-700 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {!orderResult ? (
        /* ── FORM PEMESANAN PASOKAN (LAYOUT KONSISTEN DENGAN CHECKOUT MITRA) ── */
        <form onSubmit={handleCreateRestockOrder} className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Kolom Kiri: Keranjang, Alamat Gudang, Metode Bayar */}
          <div className="md:col-span-7 space-y-6">
            {/* Card 1: Keranjang Multi-Item */}
            <div className="bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-varena-taupe/15">
                <h2 className="font-serif text-base font-bold text-varena-espresso flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-varena-gold" />
                  <span>Pilih & Tambah Produk Pasokan</span>
                </h2>
                <span className="text-[11px] font-mono text-varena-taupe">
                  {cart.length} Jenis Produk · Total {totalCartQty} Box
                </span>
              </div>

              {/* Aturan Kantor Pusat: Batas Minimal Order (MOQ) */}
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0" />
                  <div>
                    <span className="font-bold text-amber-950 block">Aturan Keagenan Kantor Pusat:</span>
                    <span className="text-amber-800 text-[11px]">
                      Batas minimal pemesanan pasokan agen adalah <strong>{minMoq} Box</strong>. Anda dapat mengombinasikan berbagai varian produk (total pesanan ≥ {minMoq} Box).
                    </span>
                  </div>
                </div>
                <div className="font-mono font-bold px-2.5 py-1 rounded-lg bg-amber-200/90 text-amber-900 text-xs whitespace-nowrap shrink-0 shadow-xs">
                  Batas Min: {minMoq} Box
                </div>
              </div>

              {/* Daftar Produk Pasokan & Pengatur Kuantitas Langsung (Tanpa Dropdown) */}
              <div className="space-y-3 pt-1">
                <div className="text-xs font-semibold text-stone-700 flex items-center justify-between">
                  <span>Daftar Produk & Varian Pasokan:</span>
                  <span className="text-[11px] font-mono">
                    Total Pesanan: <strong className={isBelowMoq ? "text-rose-600" : "text-emerald-700"}>{totalCartQty} Box</strong>
                  </span>
                </div>

                <div className="space-y-2.5">
                  {variants.map((v) => {
                    const currentQty = getVariantQty(v.id);
                    const isSelected = currentQty > 0;
                    const lineTotal = v.price * currentQty;

                    return (
                      <div
                        key={v.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isSelected
                            ? 'border-varena-gold bg-varena-ivory-light/50 shadow-xs'
                            : 'border-stone-200 bg-white hover:border-stone-300'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-varena-espresso">{v.productName || v.name}</span>
                              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                                {v.sku}
                              </span>
                              {v.packSize >= 10 && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                  Box ({v.packSize} Sachet)
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-stone-500 mt-1">
                              {v.name} · <span className="font-mono font-bold text-varena-espresso">Rp{v.price.toLocaleString('id-ID')}</span>/{v.unit || 'box'}
                            </div>
                          </div>

                          {/* Kuantitas Stepper Langsung */}
                          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                            <div className="flex items-center gap-1.5 bg-stone-50 p-1 rounded-xl border border-stone-200">
                              <button
                                type="button"
                                onClick={() => setVariantQty(v.id, currentQty - 1)}
                                disabled={currentQty === 0}
                                className="w-8 h-8 rounded-lg border border-stone-300 bg-white flex items-center justify-center text-sm font-bold text-stone-700 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min={0}
                                value={currentQty}
                                onChange={(e) => setVariantQty(v.id, parseInt(e.target.value, 10) || 0)}
                                className="w-14 text-center text-xs font-bold font-mono py-1 rounded-md border border-stone-200 bg-white focus:outline-none focus:border-varena-gold"
                              />
                              <button
                                type="button"
                                onClick={() => setVariantQty(v.id, currentQty + 1)}
                                className="w-8 h-8 rounded-lg bg-varena-espresso text-varena-gold-light flex items-center justify-center text-sm font-bold hover:bg-varena-espresso-dark transition shadow-xs"
                              >
                                +
                              </button>
                            </div>

                            {/* Subtotal Item */}
                            <div className="w-24 text-right">
                              <div className="font-mono font-bold text-xs text-varena-espresso">
                                Rp{lineTotal.toLocaleString('id-ID')}
                              </div>
                              {currentQty > 0 && (
                                <div className="text-[10px] text-stone-500 font-medium">
                                  {currentQty} {v.unit || 'box'}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Peringatan jika total pesanan di bawah MOQ */}
                {isBelowMoq && totalCartQty > 0 && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center justify-between gap-2 shadow-xs">
                    <span className="flex items-center gap-2 font-medium">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>
                        Total pesanan Anda saat ini baru <strong>{totalCartQty} Box</strong>. Sesuai aturan kantor pusat, batas minimal pemesanan pasokan agen adalah <strong>{minMoq} Box</strong>.
                      </span>
                    </span>
                    <span className="font-bold text-rose-700 font-mono shrink-0 px-2 py-0.5 rounded bg-rose-200/60">
                      Kurang {minMoq - totalCartQty} Box
                    </span>
                  </div>
                )}

                {totalCartQty === 0 && (
                  <div className="text-center py-6 text-xs text-stone-400 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                    Belum ada produk yang dipilih. Silakan klik tombol <strong>+</strong> pada produk yang ingin dipesan (Minimal {minMoq} Box).
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: Alamat Pengiriman Gudang Agen (Otomatis & Terkunci) */}
            <div className="bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-varena-taupe/15">
                <h2 className="font-serif text-base font-bold text-varena-espresso flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-varena-gold" />
                  <span>Alamat Pengiriman Gudang Agen</span>
                </h2>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Otomatis Terkunci</span>
                </span>
              </div>

              <div className="p-4 rounded-xl bg-varena-ivory-light/60 border border-varena-taupe/20 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-varena-espresso text-sm">
                    {agentData?.displayName || user?.displayName || 'Toko Agen Resmi'}
                  </span>
                  <span className="font-mono text-stone-500 font-medium">
                    {user?.phone || '081234567890'}
                  </span>
                </div>
                <div className="text-stone-700 leading-relaxed">
                  {agentData?.agentAddress || user?.addressDetail || 'Alamat Gudang Terdaftar Agen'}
                </div>
                <div className="text-stone-500 font-medium flex items-center gap-2 pt-1 border-t border-varena-taupe/10">
                  <Building2 className="w-3.5 h-3.5 text-stone-400" />
                  <span>
                    {agentData?.agentCity || user?.city || 'Jakarta Selatan'}, {agentData?.agentProvince || user?.province || 'DKI Jakarta'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Catatan Pengiriman Tambahan (Opsional):
                </label>
                <input
                  type="text"
                  value={shippingNotes}
                  onChange={(e) => setShippingNotes(e.target.value)}
                  placeholder="Contoh: Titipkan di pos satpam ruko agen jika toko tutup..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 outline-none focus:border-varena-gold"
                />
              </div>

              <div className="flex items-center gap-2 text-[11px] text-emerald-800 bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200">
                <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Bebas Biaya Pengiriman:</strong> Seluruh ongkos kirim pasokan dari kantor pusat ke gudang agen 100% ditanggung oleh kantor pusat VARENA.
                </span>
              </div>
            </div>

            {/* Card 3: Pilihan 3 Metode Pembayaran */}
            <div className="bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-varena-taupe/15">
                <h2 className="font-serif text-base font-bold text-varena-espresso flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-varena-gold" />
                  <span>Metode Pembayaran Pasokan</span>
                </h2>
                <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Saldo Kas: Rp{depositBalance.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="space-y-3">
                {/* Opsi 1: 100% Saldo Deposit Agen */}
                <label
                  className={`block p-4 rounded-xl border cursor-pointer transition ${
                    paymentMethod === 'DEPOSIT'
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-600'
                      : 'border-stone-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="DEPOSIT"
                        checked={paymentMethod === 'DEPOSIT'}
                        onChange={() => setPaymentMethod('DEPOSIT')}
                        className="mt-0.5 w-4 h-4 text-emerald-700 focus:ring-emerald-600"
                      />
                      <div>
                        <div className="font-bold text-xs text-varena-espresso flex items-center gap-2">
                          <span>100% Saldo Deposit Kas Agen</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-semibold">
                            Tanpa Kode Unik
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          Potong saldo kas deposit agen seketika. Pesanan langsung lunas (PAID) dan langsung masuk antrean pengiriman kantor pusat.
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-stone-500 uppercase font-semibold">Saldo Kas Agen</div>
                      <div className="font-mono font-bold text-xs text-emerald-800">
                        Rp{depositBalance.toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>

                  {/* Warning jika saldo deposit tidak cukup */}
                  {!isDepositSufficient && netSubtotal > 0 && (
                    <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Saldo Deposit Tidak Cukup! </span>
                        Dibutuhkan <strong>Rp{netSubtotal.toLocaleString('id-ID')}</strong>, saldo tersedia{' '}
                        <strong>Rp{depositBalance.toLocaleString('id-ID')}</strong> (Kurang{' '}
                        <strong className="text-rose-900">Rp{depositDeficit.toLocaleString('id-ID')}</strong>).
                        <div className="mt-0.5 text-stone-600">
                          *Silakan pilih metode <strong>Transfer Bank Manual</strong> atau <strong>Hybrid</strong> di bawah.
                        </div>
                      </div>
                    </div>
                  )}
                </label>

                {/* Opsi 2: Transfer Bank Manual 100% */}
                <label
                  className={`block p-4 rounded-xl border cursor-pointer transition ${
                    paymentMethod === 'MANUAL_TRANSFER'
                      ? 'border-varena-espresso bg-stone-50 shadow-sm ring-1 ring-varena-espresso'
                      : 'border-stone-200 hover:border-stone-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="MANUAL_TRANSFER"
                        checked={paymentMethod === 'MANUAL_TRANSFER'}
                        onChange={() => setPaymentMethod('MANUAL_TRANSFER')}
                        className="mt-0.5 w-4 h-4 text-varena-espresso focus:ring-varena-espresso"
                      />
                      <div>
                        <div className="font-bold text-xs text-varena-espresso flex items-center gap-2">
                          <span>Transfer Bank Manual (100%)</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-semibold">
                            + Kode Unik 3 Digit
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          Transfer penuh ke Rekening Operasional Kantor: <strong>BRI 3065 0102 4471 539</strong> a.n. Sunariyo.
                        </p>
                      </div>
                    </div>
                  </div>
                </label>

                {/* Opsi 3: Hybrid (Potong Deposit + Sisa Transfer Manual) */}
                <label
                  className={`block p-4 rounded-xl border cursor-pointer transition ${
                    paymentMethod === 'HYBRID'
                      ? 'border-purple-600 bg-purple-50/40 shadow-sm ring-1 ring-purple-600'
                      : 'border-stone-200 hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="HYBRID"
                        checked={paymentMethod === 'HYBRID'}
                        onChange={() => setPaymentMethod('HYBRID')}
                        className="mt-0.5 w-4 h-4 text-purple-700 focus:ring-purple-600"
                      />
                      <div>
                        <div className="font-bold text-xs text-varena-espresso flex items-center gap-2">
                          <span>Metode Hybrid (Potong Deposit + Sisa Transfer Bank)</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-semibold">
                            Hemat Saldo
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          Gunakan saldo deposit yang Anda miliki saat ini, lalu kekurangan tagihannya ditransfer manual melalui bank.
                        </p>

                        {/* Rincian Hybrid Dinamis */}
                        {netSubtotal > 0 && (
                          <div className="mt-2.5 p-2.5 rounded-lg bg-white border border-purple-200 text-[11px] space-y-1">
                            <div className="flex justify-between text-stone-600">
                              <span>1. Terpotong dari Saldo Kas Deposit:</span>
                              <span className="font-mono font-bold text-emerald-800">
                                -Rp{hybridDepositUsed.toLocaleString('id-ID')}
                              </span>
                            </div>
                            <div className="flex justify-between text-purple-900 font-semibold">
                              <span>2. Sisa yang Ditransfer via Bank:</span>
                              <span className="font-mono">
                                Rp{hybridRemainingToTransfer.toLocaleString('id-ID')} (+ kode unik 3 digit)
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Ringkasan Tagihan & Tombol Submit */}
          <div className="md:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-4 sticky top-6">
              <h2 className="font-serif text-base font-bold text-varena-espresso pb-3 border-b border-varena-taupe/15">
                Ringkasan Tagihan Pasokan
              </h2>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal Pasokan Normal ({cart.reduce((s, i) => s + i.quantity, 0)} item):</span>
                  <span className="font-mono">Rp{grossSubtotal.toLocaleString('id-ID')}</span>
                </div>

                <div className="flex justify-between text-purple-700 font-medium">
                  <span>
                    Potongan Diskon Agen ({discountType === 'PERCENTAGE' ? `${discountVal}%` : `Rp${discountVal.toLocaleString('id-ID')}/unit`}):
                  </span>
                  <span className="font-mono">-Rp{discountAmount.toLocaleString('id-ID')}</span>
                </div>

                <div className="flex justify-between items-center text-emerald-700 font-medium">
                  <span>Ongkos Kirim Pusat ke Agen:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="line-through text-stone-400 font-mono text-[11px]">Rp50.000</span>
                    <span className="font-bold text-emerald-700 uppercase text-[11px]">GRATIS (Rp0)</span>
                  </div>
                </div>

                {/* Subtotal Net */}
                <div className="pt-2 border-t border-stone-200 flex justify-between text-stone-800 font-semibold">
                  <span>Total Tagihan Bersih:</span>
                  <span className="font-mono">Rp{netSubtotal.toLocaleString('id-ID')}</span>
                </div>

                {/* Detail jika Hybrid */}
                {paymentMethod === 'HYBRID' && netSubtotal > 0 && (
                  <div className="p-3 rounded-xl bg-purple-50/80 border border-purple-200 text-xs space-y-1.5">
                    <div className="text-[11px] font-bold text-purple-950 uppercase tracking-wide">
                      Skema Pembayaran Hybrid:
                    </div>
                    <div className="flex justify-between text-emerald-800 font-medium">
                      <span>• Bayar via Saldo Kas Deposit:</span>
                      <span className="font-mono font-bold">-Rp{hybridDepositUsed.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-purple-900 font-semibold">
                      <span>• Sisa Tagihan Pokok:</span>
                      <span className="font-mono">Rp{hybridRemainingToTransfer.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-amber-800 text-[11px]">
                      <span>• Kode Unik Transfer Manual:</span>
                      <span className="font-mono">+3 Digit Acak</span>
                    </div>
                    <div className="pt-1.5 border-t border-purple-200 flex justify-between font-bold text-purple-950">
                      <span>Estimasi Transfer Bank:</span>
                      <span className="font-mono">Rp{hybridRemainingToTransfer.toLocaleString('id-ID')} + Kode Unik</span>
                    </div>
                  </div>
                )}

                {/* Detail jika Manual Transfer */}
                {paymentMethod === 'MANUAL_TRANSFER' && netSubtotal > 0 && (
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1.5">
                    <div className="text-[11px] font-bold text-stone-800 uppercase tracking-wide">
                      Skema Transfer Bank Manual (100%):
                    </div>
                    <div className="flex justify-between text-stone-700">
                      <span>• Tagihan Pokok:</span>
                      <span className="font-mono">Rp{netSubtotal.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-amber-800 text-[11px]">
                      <span>• Kode Unik Verifikasi:</span>
                      <span className="font-mono">+3 Digit Acak</span>
                    </div>
                    <div className="pt-1.5 border-t border-stone-200 flex justify-between font-bold text-stone-900">
                      <span>Estimasi Transfer Bank:</span>
                      <span className="font-mono">Rp{netSubtotal.toLocaleString('id-ID')} + Kode Unik</span>
                    </div>
                  </div>
                )}

                {/* Detail jika Deposit 100% */}
                {paymentMethod === 'DEPOSIT' && netSubtotal > 0 && (
                  <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs space-y-1.5">
                    <div className="text-[11px] font-bold text-emerald-950 uppercase tracking-wide">
                      Skema Saldo Deposit Kas Agen (100%):
                    </div>
                    <div className="flex justify-between text-emerald-800 font-medium">
                      <span>• Potong Saldo Deposit:</span>
                      <span className="font-mono font-bold">-Rp{netSubtotal.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-stone-600 text-[11px]">
                      <span>• Sisa Transfer Manual:</span>
                      <span className="font-mono font-bold text-emerald-700">Rp0 (Lunas Seketika)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Total Bayar Block */}
              <div className="pt-3 border-t-2 border-dashed border-varena-taupe/20">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-xs font-semibold text-varena-espresso">Total yang Harus Dibayar:</span>
                  <span className="font-serif text-xl font-bold text-varena-espresso font-mono">
                    Rp{netSubtotal.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="text-[10px] text-stone-500">
                  {paymentMethod === 'DEPOSIT'
                    ? '100% dipotong dari saldo kas deposit agen saat ini.'
                    : paymentMethod === 'HYBRID'
                    ? 'Kombinasi potong saldo kas agen + transfer bank manual.'
                    : '100% ditransfer melalui rekening operasional kantor.'}
                </div>
              </div>

              {/* Tombol Lanjut Order */}
              <button
                type="submit"
                disabled={
                  loading ||
                  cart.length === 0 ||
                  netSubtotal <= 0 ||
                  isBelowMoq ||
                  (paymentMethod === 'DEPOSIT' && !isDepositSufficient)
                }
                className={`w-full py-3.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm ${
                  isBelowMoq || (paymentMethod === 'DEPOSIT' && !isDepositSufficient)
                    ? 'bg-stone-200 text-stone-400 cursor-not-allowed border border-stone-300'
                    : 'bg-varena-espresso text-varena-gold hover:bg-varena-espresso-dark cursor-pointer'
                }`}
              >
                {loading ? (
                  <span>Memproses Pesanan...</span>
                ) : isBelowMoq ? (
                  <span>Batas Min. Order: {minMoq} Box (Saat ini: {totalCartQty} Box)</span>
                ) : paymentMethod === 'DEPOSIT' && !isDepositSufficient ? (
                  <span>Saldo Deposit Tidak Mencukupi</span>
                ) : (
                  <>
                    <span>Konfirmasi & Buat Pesanan Pasokan</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-[10px] text-stone-400 text-center flex items-center justify-center gap-1.5 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-stone-400" />
                <span>Pasokan resmi bergaransi mutu langsung dari PT VARENA</span>
              </div>
            </div>
          </div>
        </form>
      ) : (
        /* ── TAMPILAN SETELAH ORDER DIBUAT / DETAIL PELACAKAN SIKLUS PESANAN ── */
        <div className="space-y-6">
          {/* Card 1: Status Banner & Stepper Tracking */}
          <div className="bg-white border border-varena-taupe/20 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-varena-taupe/15">
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                  Detail Pesanan Pasokan Agen
                </span>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-varena-espresso font-mono">
                  {orderResult.orderNumber}
                </h2>
                <div className="text-xs text-stone-500 mt-0.5">
                  Dibuat pada:{' '}
                  {new Date(orderResult.createdAt || Date.now()).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    currentOrderStatus === 'COMPLETED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : currentOrderStatus === 'SHIPPED'
                      ? 'bg-purple-100 text-purple-800'
                      : currentOrderStatus === 'PAID' || currentOrderStatus === 'PROCESSING'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {formatOrderStatus(currentOrderStatus)}
                </span>
              </div>
            </div>

            {/* Stepper Tracking Lifecycle */}
            <div className="py-2">
              <div className="text-xs font-bold text-stone-600 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-varena-gold" />
                <span>Pelacakan Status Pesanan Pasokan (Order Lifecycle)</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {/* Step 1: Dibuat */}
                <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>1. Dibuat</span>
                  </div>
                  <div className="text-[10px] text-stone-500 mt-1">Order pasokan tercatat di sistem</div>
                </div>

                {/* Step 2: Pembayaran */}
                <div
                  className={`p-3 rounded-xl border ${
                    currentOrderStatus === 'PAID' ||
                    currentOrderStatus === 'PROCESSING' ||
                    currentOrderStatus === 'SHIPPED' ||
                    currentOrderStatus === 'COMPLETED'
                      ? 'border-emerald-200 bg-emerald-50/50 text-emerald-800'
                      : 'border-amber-200 bg-amber-50/50 text-amber-900'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    {currentOrderStatus === 'PAID' ||
                    currentOrderStatus === 'PROCESSING' ||
                    currentOrderStatus === 'SHIPPED' ||
                    currentOrderStatus === 'COMPLETED' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-600" />
                    )}
                    <span>2. Pembayaran</span>
                  </div>
                  <div className="text-[10px] text-stone-500 mt-1">
                    {currentOrderStatus === 'PAID' ||
                    currentOrderStatus === 'PROCESSING' ||
                    currentOrderStatus === 'SHIPPED' ||
                    currentOrderStatus === 'COMPLETED'
                      ? 'Lunas terverifikasi'
                      : 'Menunggu transfer bank'}
                  </div>
                </div>

                {/* Step 3: Pengiriman */}
                <div
                  className={`p-3 rounded-xl border ${
                    currentOrderStatus === 'SHIPPED' || currentOrderStatus === 'COMPLETED'
                      ? 'border-purple-200 bg-purple-50/50 text-purple-900'
                      : 'border-stone-200 bg-stone-50 text-stone-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    {currentOrderStatus === 'SHIPPED' || currentOrderStatus === 'COMPLETED' ? (
                      <Truck className="w-4 h-4 text-purple-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-stone-400" />
                    )}
                    <span>3. Pengiriman</span>
                  </div>
                  <div className="text-[10px] text-stone-500 mt-1">
                    {orderResult.trackingNumber
                      ? `${orderResult.courierName || 'Kurir'}`
                      : 'Dalam antrean packing pusat'}
                  </div>
                </div>

                {/* Step 4: Selesai */}
                <div
                  className={`p-3 rounded-xl border ${
                    currentOrderStatus === 'COMPLETED'
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-bold'
                      : 'border-stone-200 bg-stone-50 text-stone-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    {currentOrderStatus === 'COMPLETED' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Building2 className="w-4 h-4 text-stone-400" />
                    )}
                    <span>4. Tiba di Agen</span>
                  </div>
                  <div className="text-[10px] text-stone-500 mt-1">
                    {currentOrderStatus === 'COMPLETED' ? 'Stok agen bertambah' : 'Menunggu kedatangan'}
                  </div>
                </div>
              </div>

              {/* Kurir & Nomor Resi jika SHIPPED */}
              {orderResult.trackingNumber && (
                <div className="mt-4 p-3.5 rounded-xl bg-purple-50/80 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="text-[10px] font-bold text-purple-900 uppercase tracking-wider">
                      Informasi Pengiriman dari Kantor Pusat:
                    </div>
                    <div className="font-semibold text-purple-950 mt-0.5">
                      {orderResult.courierName || 'Ekspedisi Logistik'} — Resi:{' '}
                      <span className="font-mono font-bold text-sm">{orderResult.trackingNumber}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(orderResult.trackingNumber, 'resi')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-purple-300 text-purple-900 font-semibold hover:bg-purple-100 transition self-start sm:self-center"
                  >
                    {copiedResi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedResi ? 'Resi Tersalin' : 'Salin Nomor Resi'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Tombol Konfirmasi Penerimaan Barang (Jika SHIPPED) */}
            {currentOrderStatus === 'SHIPPED' && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-700" />
                    <span>Barang Pasokan Sudah Tiba di Gudang Toko Agen Anda?</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleConfirmReceipt}
                    disabled={confirmingReceipt}
                    className="px-4 py-2 rounded-lg bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition disabled:opacity-50 shadow-sm"
                  >
                    {confirmingReceipt ? 'Menyimpan...' : 'Konfirmasi Barang Diterima'}
                  </button>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Dengan mengklik konfirmasi ini, status pesanan menjadi Selesai (COMPLETED) dan stok fisik di inventori agen Anda otomatis ditambahkan.
                </p>
              </div>
            )}
          </div>

          {/* Card 2: Instruksi Pembayaran (Jika masih PENDING_PAYMENT / butuh transfer manual) */}
          {currentOrderStatus === 'PENDING_PAYMENT' && (
            <div className="bg-white border-2 border-dashed border-varena-gold/60 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5 bg-amber-50/20">
              <div className="text-center max-w-md mx-auto">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 mx-auto flex items-center justify-center mb-2">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-lg font-bold text-varena-espresso">
                  Instruksi Transfer Bank Pasokan
                </h3>
                <p className="text-xs text-stone-600 mt-0.5">
                  Silakan selesaikan pembayaran pasokan grosir ke rekening operasional resmi di bawah ini:
                </p>
                {breakdown?.isHybrid && (
                  <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 border border-purple-200 text-purple-900 text-[11px] font-semibold">
                    <span>Metode Hybrid: Sebagian telah dipotong dari saldo deposit</span>
                  </div>
                )}
              </div>

              {/* Bank Card */}
              <div className="p-4 rounded-xl bg-white border border-varena-gold/30 shadow-xs space-y-2 max-w-lg mx-auto">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-stone-500 uppercase font-bold tracking-wider">
                    Rekening Tujuan Kantor Pusat:
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(PRIMARY_COMPANY_BANK.accountNumberClean, 'bank')}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-varena-espresso bg-varena-gold/15 hover:bg-varena-gold/30 px-2 py-0.5 rounded transition"
                  >
                    {copiedBank ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedBank ? 'Tersalin' : 'Salin Rekening'}</span>
                  </button>
                </div>
                <div className="font-mono text-lg font-bold text-varena-espresso tracking-wide">
                  {PRIMARY_COMPANY_BANK.accountNumber}
                </div>
                <div className="text-xs font-semibold text-stone-700 flex items-center justify-between pt-1 border-t border-stone-100">
                  <span>Bank {PRIMARY_COMPANY_BANK.bankName}</span>
                  <span>a.n. {PRIMARY_COMPANY_BANK.accountHolder}</span>
                </div>
              </div>

              {/* Exact Amount Card */}
              <div className="p-4 rounded-xl bg-varena-espresso text-center max-w-lg mx-auto space-y-1">
                <div className="flex items-center justify-between text-[10px] text-varena-gold-light/80 uppercase font-bold tracking-wider">
                  <span>Nominal Transfer Tepat (+ 3 Digit Kode Unik):</span>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        String(breakdown?.manualAmount || orderResult.manualTransferAmount || orderResult.total),
                        'amount'
                      )
                    }
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-varena-espresso bg-varena-gold-light hover:bg-white px-2 py-0.5 rounded transition shadow-xs"
                  >
                    {copiedAmount ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedAmount ? 'Tersalin' : 'Salin Nominal'}</span>
                  </button>
                </div>
                <div className="font-serif text-2xl font-bold text-varena-gold-light tracking-tight font-mono">
                  Rp{(breakdown?.manualAmount || orderResult.manualTransferAmount || orderResult.total).toLocaleString('id-ID')}
                </div>
                {(breakdown?.uniqueCode || orderResult.uniqueCode) > 0 && (
                  <div className="text-[11px] text-varena-gold-light/85">
                    (Termasuk 3 digit kode unik verifikasi: +Rp{breakdown?.uniqueCode || orderResult.uniqueCode})
                  </div>
                )}
                {breakdown?.isHybrid && breakdown.depositUsed > 0 && (
                  <div className="text-[11px] text-emerald-300 font-medium pt-1 border-t border-white/10">
                    ✓ Saldo Deposit Terpotong: -Rp{breakdown.depositUsed.toLocaleString('id-ID')}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 text-xs">
                <Link
                  href={`/confirm-payment?orderNumber=${orderResult.orderNumber}`}
                  className="px-4 py-2 rounded-lg bg-varena-gold text-varena-espresso font-bold hover:bg-varena-gold-hover transition shadow-sm text-center w-full sm:w-auto"
                >
                  Upload Bukti Transfer Manual
                </Link>
                <button
                  type="button"
                  onClick={handleSimulatePayment}
                  disabled={simulatingPayment}
                  className="px-4 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium transition text-center w-full sm:w-auto"
                >
                  {simulatingPayment ? 'Memverifikasi...' : 'Simulasi Pembayaran Lunas (Test Mode)'}
                </button>
              </div>
            </div>
          )}

          {/* Card 3: Rincian Produk & Total Belanja */}
          <div className="bg-white border border-varena-taupe/20 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-serif text-base font-bold text-varena-espresso pb-2 border-b border-varena-taupe/15">
              Rincian Item Pasokan yang Dipesan
            </h3>

            {orderResult.items && orderResult.items.length > 0 && (
              <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden text-xs">
                {orderResult.items.map((it: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-white">
                    <div>
                      <div className="font-semibold text-varena-espresso">{it.nameSnapshot || it.name}</div>
                      <div className="text-[11px] text-stone-500 font-mono">
                        {it.quantity} x Rp{(it.unitPrice || it.price || 0).toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div className="font-mono font-bold text-varena-espresso">
                      Rp{(it.lineTotal || (it.unitPrice || 0) * it.quantity).toLocaleString('id-ID')}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="p-4 rounded-xl bg-stone-50 space-y-2 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal Pasokan:</span>
                <span className="font-mono font-semibold">
                  Rp{(breakdown?.subtotal || orderResult.subtotal || 0).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between text-purple-700 font-medium">
                <span>Potongan Diskon Agen:</span>
                <span className="font-mono">
                  -Rp{(breakdown?.discount || orderResult.discount || 0).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between items-center text-emerald-700 font-medium">
                <span>Ongkos Kirim Pusat ke Agen:</span>
                <div className="flex items-center gap-1.5">
                  <span className="line-through text-stone-400 font-mono text-[11px]">Rp50.000</span>
                  <span className="font-bold text-emerald-700 uppercase">GRATIS</span>
                </div>
              </div>

              {/* Rincian Skema Pembayaran Hybrid */}
              {breakdown?.isHybrid && (
                <div className="mt-2 pt-2 border-t border-stone-200 space-y-1.5 bg-purple-50/60 p-3 rounded-lg border border-purple-100">
                  <div className="text-[10px] uppercase font-bold text-purple-900 tracking-wider">
                    Rincian Pembayaran Metode Hybrid:
                  </div>
                  <div className="flex justify-between text-emerald-800 font-medium">
                    <span>• Bayar dari Saldo Kas Deposit:</span>
                    <span className="font-mono font-bold">-Rp{breakdown.depositUsed.toLocaleString('id-ID')} (Lunas / Terpotong)</span>
                  </div>
                  <div className="flex justify-between text-purple-900">
                    <span>• Sisa Tagihan Pokok:</span>
                    <span className="font-mono font-semibold">Rp{(breakdown.netSubtotal - breakdown.depositUsed).toLocaleString('id-ID')}</span>
                  </div>
                  {breakdown.uniqueCode > 0 && (
                    <div className="flex justify-between text-amber-800">
                      <span>• Kode Unik Transfer Manual (3 Digit):</span>
                      <span className="font-mono font-bold">+Rp{breakdown.uniqueCode}</span>
                    </div>
                  )}
                  <div className="pt-1 border-t border-purple-200/80 flex justify-between font-bold text-purple-950">
                    <span>Total Transfer Bank Manual (Exact):</span>
                    <span className="font-mono">Rp{breakdown.manualAmount.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              )}

              {/* Rincian jika 100% Transfer Manual */}
              {breakdown?.isManualFull && (
                <div className="mt-2 pt-2 border-t border-stone-200 space-y-1.5">
                  {breakdown.uniqueCode > 0 && (
                    <div className="flex justify-between text-amber-800 font-medium">
                      <span>Kode Unik Transfer (3 Digit):</span>
                      <span className="font-mono font-bold">+Rp{breakdown.uniqueCode}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-stone-800 font-semibold">
                    <span>Total Transfer Bank Manual (Exact):</span>
                    <span className="font-mono">Rp{breakdown.manualAmount.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              )}

              {/* Rincian jika 100% Saldo Deposit */}
              {breakdown?.isDepositFull && (
                <div className="mt-2 pt-2 border-t border-stone-200 space-y-1.5 bg-emerald-50/60 p-3 rounded-lg border border-emerald-100">
                  <div className="flex justify-between text-emerald-800 font-medium">
                    <span>• Potong Saldo Kas Deposit Agen:</span>
                    <span className="font-mono font-bold">-Rp{breakdown.depositUsed.toLocaleString('id-ID')} (Lunas 100%)</span>
                  </div>
                  <div className="flex justify-between text-stone-600 text-[11px]">
                    <span>• Transfer Bank Manual:</span>
                    <span className="font-mono font-semibold text-emerald-700">Rp0 (Tidak Perlu Transfer)</span>
                  </div>
                </div>
              )}

              {/* Fallback jika breakdown belum ada tapi orderResult ada uniqueCode */}
              {!breakdown && orderResult.uniqueCode > 0 && (
                <div className="flex justify-between text-amber-800">
                  <span>Kode Unik Transfer:</span>
                  <span className="font-mono font-bold">+Rp{orderResult.uniqueCode}</span>
                </div>
              )}

              <div className="pt-2 border-t border-stone-200 flex justify-between font-bold text-sm text-varena-espresso">
                <span>Total Akhir Tagihan:</span>
                <span className="font-mono text-base">
                  Rp{(breakdown?.total || orderResult.total || 0).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Link
                href="/agent"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-varena-espresso hover:text-varena-gold transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali ke Portal Agen</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setOrderResult(null);
                  router.push('/agent/checkout');
                }}
                className="text-xs font-bold text-varena-gold hover:underline"
              >
                + Buat Pemesanan Pasokan Baru
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AgentCheckoutPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-xs text-stone-500">Memuat Checkout Agen...</div>}>
      <AgentCheckoutContent />
    </Suspense>
  );
}
