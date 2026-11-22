'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  Package,
  Truck,
  Wallet,
  TrendingUp,
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  ArrowRight,
  ShieldCheck,
  Send,
  CreditCard,
  Gift,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight,
  MapPin,
  FileText,
  Copy,
  Check,
} from 'lucide-react';
import Pagination from '@/components/ui/Pagination';

export default function AgentPortalPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [agentData, setAgentData] = useState<any>(null);
  const [config, setConfig] = useState<any>({
    minimumRestockBox: 10,
    defaultDiscountType: 'PERCENTAGE',
    defaultDiscountValue: 15,
  });
  const [loading, setLoading] = useState(true);

  // Tab state
  const [activeTab, setActiveTab] = useState<'RESTOCK' | 'DISTRIBUTION' | 'CENTRAL_DROPSHIP' | 'DEPOSIT' | 'REWARDS'>('RESTOCK');

  // Orders & Transactions state
  const [restockOrders, setRestockOrders] = useState<any[]>([]);
  const [assignedOrders, setAssignedOrders] = useState<any[]>([]);
  const [depositTransactions, setDepositTransactions] = useState<any[]>([]);
  const [depositTxPage, setDepositTxPage] = useState(1);
  const DEPOSIT_TX_PER_PAGE = 10;

  // Restock form modal — multi-item cart
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  // cart: { variantId, quantity }[]
  const [restockCart, setRestockCart] = useState<{ variantId: string; quantity: number }[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [availableVariants, setAvailableVariants] = useState<any[]>([]);
  const [restockPaymentMethod, setRestockPaymentMethod] = useState<'DEPOSIT' | 'MANUAL_TRANSFER'>('DEPOSIT');
  const [restockSubmitting, setRestockSubmitting] = useState(false);

  // Dropship to central form modal
  const [dropshipModalOpen, setDropshipModalOpen] = useState(false);
  const [dropshipForm, setDropshipForm] = useState({
    recipientName: '',
    recipientPhone: '',
    shippingAddress: '',
    shippingCity: '',
    quantity: 1,
    paymentMethod: 'DEPOSIT',
    notes: '',
  });
  const [dropshipSubmitting, setDropshipSubmitting] = useState(false);

  // Topup deposit modal
  const [topupModalOpen, setTopupModalOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState('1000000');
  const [topupNotes, setTopupNotes] = useState('');
  const [topupSubmitting, setTopupSubmitting] = useState(false);
  const [topupBankName, setTopupBankName] = useState('');
  const [topupAccountNumber, setTopupAccountNumber] = useState('');
  const [topupStep, setTopupStep] = useState<1 | 2>(1);
  const [topupResult, setTopupResult] = useState<any>(null);
  const [topupProofUrl, setTopupProofUrl] = useState('');
  const [topupUploadingProof, setTopupUploadingProof] = useState(false);
  const [topupConfirmed, setTopupConfirmed] = useState(false);
  const [topupConfirming, setTopupConfirming] = useState(false);
  const [topupCancelling, setTopupCancelling] = useState(false);
  const [showCancelTopupConfirmModal, setShowCancelTopupConfirmModal] = useState(false);
  const [topupTimeLeft, setTopupTimeLeft] = useState<{ hours: number; minutes: number; seconds: number; expired: boolean } | null>(null);
  const [copiedBank, setCopiedBank] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);

  const copyAccountNumber = (accountNum: string) => {
    navigator.clipboard?.writeText(accountNum.replace(/\s+/g, ''));
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2000);
  };

  const copyAmount = (amount: number | string) => {
    navigator.clipboard?.writeText(String(amount));
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2000);
  };

  // Dispatch assigned order modal
  const [dispatchModalOrder, setDispatchModalOrder] = useState<any>(null);
  const [courierName, setCourierName] = useState('Kurir Lokal / Ambil di Toko Agen');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [dispatchSubmitting, setDispatchSubmitting] = useState(false);

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Derived restock cart totals
  const cartGross = restockCart.reduce((sum, ci) => {
    const v = availableVariants.find((v) => v.id === ci.variantId);
    return sum + (v ? v.price * ci.quantity : 0);
  }, 0);
  const cartBoxQty = restockCart.reduce((sum, ci) => sum + ci.quantity, 0);
  const minRestockMoq = config?.minimumRestockBox || 10;
  const isRestockBelowMoq = cartBoxQty < minRestockMoq;

  const cartDiscount =
    agentData?.agentDiscountType === 'PERCENTAGE'
      ? Math.round((cartGross * (agentData?.agentDiscountValue ?? config.defaultDiscountValue ?? 15)) / 100)
      : restockCart.reduce((s, ci) => s + (agentData?.agentDiscountValue ?? 0) * ci.quantity, 0);
  const cartPayable = cartGross - cartDiscount;

  const addToRestockCart = (variantId: string) => {
    if (!variantId) return;
    setRestockCart((prev) => {
      const existing = prev.find((ci) => ci.variantId === variantId);
      if (existing) {
        return prev.map((ci) => ci.variantId === variantId ? { ...ci, quantity: ci.quantity + 1 } : ci);
      }
      return [...prev, { variantId, quantity: 1 }];
    });
  };

  const updateCartQty = (variantId: string, qty: number) => {
    if (qty <= 0) {
      setRestockCart((prev) => prev.filter((ci) => ci.variantId !== variantId));
    } else {
      setRestockCart((prev) => prev.map((ci) => ci.variantId === variantId ? { ...ci, quantity: qty } : ci));
    }
  };

  const removeFromCart = (variantId: string) => {
    setRestockCart((prev) => prev.filter((ci) => ci.variantId !== variantId));
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
      loadAgentData(parsed);
    } catch {
      router.push('/login');
    }
  }, [router]);

  const loadAgentData = async (currentUser?: any) => {
    const u = currentUser || user;
    if (!u) return;
    setLoading(true);

    // JWT-first auth
    const token = typeof window !== 'undefined' ? localStorage.getItem('varena_token') : null;
    const headers: Record<string, string> = token
      ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      : {
        'x-user-id': u.userId || u.id || '',
        'x-user-email': u.email || '',
      };

    try {
      // 1. Profile & Config
      const profileRes = await fetch(`/api/v1/agent/profile?memberCode=${u.memberCode || ''}`, { headers });
      const profileData = await profileRes.json();
      if (profileData.agent) {
        setAgentData(profileData.agent);
        if (profileData.config) {
          setConfig(profileData.config);
        }
      }

      // 2. Orders (Restock & Assigned)
      const ordersRes = await fetch(`/api/v1/agent/orders?memberCode=${u.memberCode || ''}`, { headers });
      const ordersData = await ordersRes.json();
      if (ordersData.restockOrders) setRestockOrders(ordersData.restockOrders);
      if (ordersData.assignedOrders) setAssignedOrders(ordersData.assignedOrders);

      // 3. Deposit ledger
      const depRes = await fetch(`/api/v1/agent/deposit?memberCode=${u.memberCode || ''}`, { headers });
      const depData = await depRes.json();
      if (depData.transactions) setDepositTransactions(depData.transactions);

      // 4. Products catalog for restock variants
      const catalogRes = await fetch('/api/v1/catalog/products');
      const catalogData = await catalogRes.json();
      if (catalogData.products) {
        const vars: any[] = [];
        catalogData.products.forEach((p: any) => {
          (p.variants || []).forEach((v: any) => {
            if (v.status === 'ACTIVE' && (v.allowAgentStock || v.variantType === 'PACK')) {
              vars.push({ ...v, productName: p.name });
            }
          });
        });
        setAvailableVariants(vars);
        if (vars.length > 0) {
          setSelectedVariantId((prev) => prev || vars[0].id);
        }
      }
    } catch (e: any) {
      console.error('Failed to load agent portal data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (isRestockBelowMoq) {
      setMessage({
        text: `Minimal pemesanan pasokan agen adalah ${minRestockMoq} Box sesuai aturan kantor pusat. Saat ini baru ${cartBoxQty} Box.`,
        type: 'error',
      });
      return;
    }

    setRestockSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/v1/agent/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_RESTOCK',
          memberCode: user.memberCode,
          items: restockCart,
          paymentMethod: restockPaymentMethod,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: data.message, type: 'success' });
        setRestockModalOpen(false);
        setRestockCart([]);
        loadAgentData();
      } else {
        setMessage({ text: data.error || 'Gagal memproses pasokan grosir.', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Terjadi kesalahan sistem.', type: 'error' });
    } finally {
      setRestockSubmitting(false);
    }
  };

  const handleDropshipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setDropshipSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/v1/agent/request-central-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentMemberCode: user.memberCode,
          ...dropshipForm,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: data.message, type: 'success' });
        setDropshipModalOpen(false);
        setDropshipForm({
          recipientName: '',
          recipientPhone: '',
          shippingAddress: '',
          shippingCity: '',
          quantity: 1,
          paymentMethod: 'DEPOSIT',
          notes: '',
        });
        loadAgentData();
      } else {
        setMessage({ text: data.error || 'Gagal mengirim permintaan kirim langsung.', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Terjadi kesalahan sistem.', type: 'error' });
    } finally {
      setDropshipSubmitting(false);
    }
  };

  const handleTopupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setTopupSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/v1/agent/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberCode: user.memberCode,
          amount: topupAmount,
          notes: topupNotes,
          bankName: topupBankName,
          accountNumber: topupAccountNumber,
          depositType: 'TOPUP_DEPOSIT',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTopupResult(data);
        setTopupStep(2);
        loadAgentData();
      } else {
        setMessage({ text: data.error || 'Gagal mengajukan top up deposit.', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Terjadi kesalahan sistem.', type: 'error' });
    } finally {
      setTopupSubmitting(false);
    }
  };

  const handleTopupProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !topupResult?.transactionId) return;
    setTopupUploadingProof(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('transactionId', topupResult.transactionId);
      formData.append('memberCode', user.memberCode);
      const res = await fetch('/api/v1/agent/deposit/proof', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setTopupProofUrl(data.proofUrl);
        setMessage({ text: 'Bukti transfer berhasil diunggah!', type: 'success' });
      } else {
        setMessage({ text: data.error || 'Gagal upload bukti.', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Gagal upload bukti transfer.', type: 'error' });
    } finally {
      setTopupUploadingProof(false);
    }
  };

  useEffect(() => {
    if (!topupResult || topupStep !== 2) {
      setTopupTimeLeft(null);
      return;
    }
    const createdTime = new Date(topupResult.createdAt || Date.now()).getTime();
    const expiryTime = createdTime + 1 * 60 * 60 * 1000;
    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiryTime - now) / 1000));
      if (diff <= 0) {
        setTopupTimeLeft({ hours: 0, minutes: 0, seconds: 0, expired: true });
      } else {
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;
        setTopupTimeLeft({ hours, minutes, seconds, expired: false });
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [topupResult, topupStep]);

  const handleConfirmTopup = async () => {
    if (!topupResult?.transactionId || !user) return;
    setTopupConfirming(true);
    setMessage(null);
    try {
      const res = await fetch('/api/v1/agent/deposit/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: topupResult.transactionId,
          memberCode: user.memberCode,
          proofUrl: topupProofUrl || null,
          notes: topupNotes || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTopupConfirmed(true);
        setMessage({ text: data.message || 'Konfirmasi transfer kas agen berhasil dikirim!', type: 'success' });
        loadAgentData();
      } else {
        setMessage({ text: data.error || 'Gagal mengirim konfirmasi transfer.', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Terjadi kesalahan sistem.', type: 'error' });
    } finally {
      setTopupConfirming(false);
    }
  };

  const handleCancelTopup = async () => {
    if (!topupResult?.transactionId || !user) return;
    setTopupCancelling(true);
    setMessage(null);
    try {
      const res = await fetch('/api/v1/agent/deposit/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: topupResult.transactionId,
          memberCode: user.memberCode,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCancelTopupConfirmModal(false);
        setTopupModalOpen(false);
        setTopupStep(1);
        setTopupResult(null);
        setTopupProofUrl('');
        setTopupNotes('');
        setTopupBankName('');
        setTopupAccountNumber('');
        setTopupConfirmed(false);
        setMessage({ text: 'Pengajuan top up berhasil dibatalkan.', type: 'success' });
        loadAgentData();
      } else {
        setMessage({ text: data.error || 'Gagal membatalkan pengajuan.', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Terjadi kesalahan sistem.', type: 'error' });
    } finally {
      setTopupCancelling(false);
    }
  };

  const handleDispatchAssigned = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !dispatchModalOrder) return;
    setDispatchSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/v1/agent/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DISPATCH_ASSIGNED_ORDER',
          memberCode: user.memberCode,
          orderId: dispatchModalOrder.id,
          courierName,
          trackingNumber,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: data.message, type: 'success' });
        setDispatchModalOrder(null);
        setTrackingNumber('');
        loadAgentData();
      } else {
        setMessage({ text: data.error || 'Gagal memproses pengiriman mitra.', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Terjadi kesalahan sistem.', type: 'error' });
    } finally {
      setDispatchSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-varena-gold border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-serif text-sm text-varena-espresso font-semibold">Memuat Portal Agen Resmi VARENA...</p>
        </div>
      </div>
    );
  }

  // Cek apakah user adalah agen resmi
  if (agentData && !agentData.isAgent) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-6 rounded-2xl border border-varena-taupe/20 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="font-serif font-bold text-lg text-varena-espresso">Pusat Keagenan Resmi VARENA</h2>
          <p className="text-xs text-stone-600 leading-relaxed">
            Akun Anda saat ini belum terdaftar sebagai Agen Resmi Wilayah. Dapatkan fasilitas diskon grosir, gratis ongkir pasokan 100% ditanggung kantor, serta bonus reward penjualan.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/member/agent-register"
              className="py-2.5 px-4 rounded-xl bg-varena-espresso text-varena-gold font-semibold text-xs hover:bg-varena-espresso-dark transition shadow"
            >
              Ajukan Permohonan Jadi Agen Resmi →
            </Link>
            <Link href="/member" className="text-xs text-stone-500 hover:text-stone-800 transition py-1">
              Kembali ke Dashboard Mitra
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const paginatedDepositTx = depositTransactions.slice(
    (depositTxPage - 1) * DEPOSIT_TX_PER_PAGE,
    depositTxPage * DEPOSIT_TX_PER_PAGE
  );
  const depositTxTotalPages = Math.ceil((depositTransactions.length || 0) / DEPOSIT_TX_PER_PAGE) || 1;

  return (
    <div className="min-h-screen bg-stone-50/60 pb-20">
      {/* Top Banner Header */}
      <header className="bg-varena-espresso text-varena-ivory-light border-b border-[#4A3B30] pt-6 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-varena-gold/20 border border-varena-gold/50 flex items-center justify-center text-varena-gold shadow-sm flex-shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-xl sm:text-2xl font-bold text-white tracking-wide">
                  Official Agent Hub
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold uppercase tracking-wider">
                  Agen Resmi Aktif
                </span>
              </div>
              <p className="text-xs text-varena-gold-light/80 mt-0.5 flex items-center gap-2">
                <span>{agentData?.displayName} ({agentData?.memberCode})</span>
                <span>•</span>
                <span className="flex items-center gap-1 font-semibold text-white">
                  <MapPin className="w-3.5 h-3.5 text-varena-gold" />
                  <span>Wilayah: {agentData?.agentCity}</span>
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setTopupModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-varena-gold-light font-semibold text-xs transition border border-white/10 flex items-center gap-1.5"
            >
              <Wallet className="w-4 h-4 text-varena-gold" />
              <span>Top Up Deposit</span>
            </button>
            <Link
              href="/agent/checkout"
              className="px-4 py-2 rounded-xl bg-varena-gold hover:bg-varena-gold-hover text-varena-espresso font-bold text-xs transition shadow-md flex items-center gap-1.5"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Order Pasokan Grosir</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 space-y-6">
        {/* Toast Alert Message */}
        {message && (
          <div
            className={`p-3.5 rounded-xl text-xs font-medium flex items-center justify-between shadow-sm ${message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                : 'bg-rose-50 text-rose-800 border border-rose-300'
              }`}
          >
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="font-bold ml-2">✕</button>
          </div>
        )}

        {/* 4 Summary KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Stok Fisik Agen */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Stok Fisik Tersedia</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-serif text-varena-espresso">{agentData?.agentInventory || 0}</span>
              <span className="text-xs text-stone-500 font-medium">Box</span>
            </div>
            <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
              <span>{agentData?.agentInventory >= 10 ? '✓ Stok Memadai' : '⚠ Disarankan Restock'}</span>
            </div>
          </div>

          {/* Card 2: Saldo Kas Deposit Agen */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Saldo Deposit Agen</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-serif text-varena-espresso truncate">
              Rp{(agentData?.agentDepositBalance || 0).toLocaleString('id-ID')}
            </div>
            <div className="text-[11px] text-stone-500">
              Dapat dipakai langsung untuk beli stok
            </div>
          </div>

          {/* Card 3: Pesanan Mitra Dialihkan */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Tugas Kirim Mitra</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-serif text-varena-espresso">
                {agentData?.stats?.assignedOrdersWaiting || 0}
              </span>
              <span className="text-xs text-stone-500 font-medium">Pesanan Menunggu</span>
            </div>
            <div className="text-[11px] text-blue-700 font-medium">
              Dialihkan kantor ke agen Anda
            </div>
          </div>

          {/* Card 4: Diskon Keagenan & Reward */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Diskon &amp; Reward</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-serif text-varena-espresso">
              {agentData?.agentDiscountType === 'PERCENTAGE'
                ? `${agentData?.agentDiscountValue}% Diskon`
                : `Rp${agentData?.agentDiscountValue?.toLocaleString('id-ID')}/box`}
            </div>
            <div className="text-[11px] text-purple-700 font-medium">
              {agentData?.stats?.rewardsCount || 0} Reward Diterima dari Kantor
            </div>
          </div>
        </div>

        {/* Free Shipping Callout Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-varena-gold/15 to-transparent border border-varena-gold/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-varena-gold/30 text-varena-espresso flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-varena-espresso">Fasilitas Keagenan Resmi VARENA</h4>
              <p className="text-[11px] text-stone-600 mt-0.5">
                Bebas Ongkos Kirim 100% untuk pemesanan pasokan dari kantor pusat ke agen (minimal {config.minimumRestockBox} box).
              </p>
            </div>
          </div>
          <button
            onClick={() => setDropshipModalOpen(true)}
            className="px-3.5 py-1.5 rounded-lg bg-white border border-varena-gold/60 text-varena-espresso text-xs font-semibold hover:bg-stone-50 transition shadow-sm flex items-center gap-1 flex-shrink-0"
          >
            <Send className="w-3.5 h-3.5 text-varena-gold" />
            <span>Request Kirim Luar Kota</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-varena-taupe/20 space-x-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('RESTOCK')}
            className={`py-3 px-4 font-serif text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${activeTab === 'RESTOCK'
                ? 'border-varena-espresso text-varena-espresso'
                : 'border-transparent text-stone-500 hover:text-varena-espresso'
              }`}
          >
            <Package className="w-4 h-4" />
            <span>Pasokan Grosir Kantor ({restockOrders.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('DISTRIBUTION')}
            className={`py-3 px-4 font-serif text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${activeTab === 'DISTRIBUTION'
                ? 'border-varena-espresso text-varena-espresso'
                : 'border-transparent text-stone-500 hover:text-varena-espresso'
              }`}
          >
            <Truck className="w-4 h-4" />
            <span>Tugas Kirim Mitra Lokal ({assignedOrders.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('DEPOSIT')}
            className={`py-3 px-4 font-serif text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${activeTab === 'DEPOSIT'
                ? 'border-varena-espresso text-varena-espresso'
                : 'border-transparent text-stone-500 hover:text-varena-espresso'
              }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Buku Kas &amp; Saldo Deposit</span>
          </button>
          <button
            onClick={() => setActiveTab('REWARDS')}
            className={`py-3 px-4 font-serif text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${activeTab === 'REWARDS'
                ? 'border-varena-espresso text-varena-espresso'
                : 'border-transparent text-stone-500 hover:text-varena-espresso'
              }`}
          >
            <Gift className="w-4 h-4" />
            <span>Penghargaan &amp; Bonus Kantor ({agentData?.rewards?.length || 0})</span>
          </button>
        </div>

        {/* ── TAB 1: RESTOCK PASOKAN GROSIR DARI KANTOR PUSAT ── */}
        {activeTab === 'RESTOCK' && (
          <div className="bg-white rounded-2xl border border-varena-taupe/20 p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-serif font-bold text-base text-varena-espresso">Riwayat Pasokan Grosir dari Kantor Pusat</h3>
                <p className="text-xs text-stone-500">Seluruh pasokan dikirim langsung dari pabrik/kantor pusat bebas biaya pengiriman.</p>
              </div>
              <Link
                href="/agent/checkout"
                className="py-2 px-3.5 rounded-xl bg-varena-espresso text-varena-gold font-semibold text-xs hover:bg-varena-espresso-dark transition flex items-center justify-center gap-1.5 shadow shrink-0 w-full sm:w-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Pesan Pasokan Grosir Baru</span>
              </Link>
            </div>

            {restockOrders.length === 0 ? (
              <div className="py-12 text-center text-stone-500 text-xs">
                Belum ada riwayat pesanan pasokan grosir. Klik tombol di atas untuk memesan pasokan pertama Anda.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-600 border-b">
                    <tr>
                      <th className="py-2.5 px-3">No. Invoice Pasokan</th>
                      <th className="py-2.5 px-3">Jumlah Pasokan</th>
                      <th className="py-2.5 px-3">Total Tagihan Bersih</th>
                      <th className="py-2.5 px-3">Ongkos Kirim</th>
                      <th className="py-2.5 px-3">Status Pasokan</th>
                      <th className="py-2.5 px-3">Ekspedisi / Resi</th>
                      <th className="py-2.5 px-3">Tanggal Pesan</th>
                      <th className="py-2.5 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-stone-700">
                    {restockOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-stone-50/50">
                        <td className="py-3 px-3 font-mono font-semibold text-varena-espresso">
                          <Link
                            href={`/agent/checkout?orderNumber=${o.orderNumber}`}
                            className="hover:text-varena-gold hover:underline"
                          >
                            {o.orderNumber}
                          </Link>
                        </td>
                        <td className="py-3 px-3 font-semibold">
                          {o.items?.reduce((sum: number, it: any) => sum + it.quantity, 0)} Box
                        </td>
                        <td className="py-3 px-3 font-semibold text-varena-espresso">
                          Rp{o.total?.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            GRATIS (Ditanggung Kantor)
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${o.orderStatus === 'PAID'
                                ? 'bg-blue-100 text-blue-800'
                                : o.orderStatus === 'SHIPPED'
                                  ? 'bg-purple-100 text-purple-800'
                                  : o.orderStatus === 'COMPLETED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                              }`}
                          >
                            {o.orderStatus === 'PENDING_PAYMENT' ? 'Menunggu Pembayaran' : o.orderStatus === 'PAID' ? 'Sedang Disiapkan Kantor' : o.orderStatus === 'SHIPPED' ? 'Sedang Dikirim Kurir' : 'Telah Tiba di Gudang'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px]">
                          {o.trackingNumber ? (
                            <span>{o.courierName}: <strong>{o.trackingNumber}</strong></span>
                          ) : (
                            <span className="text-stone-400 italic">Sedang dikemas</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-stone-500">
                          {new Date(o.createdAt).toLocaleDateString('id-ID')}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link
                            href={`/agent/checkout?orderNumber=${o.orderNumber}`}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-varena-espresso hover:text-varena-gold transition bg-stone-100 hover:bg-stone-200 px-2.5 py-1 rounded-lg"
                          >
                            <span>{o.orderStatus === 'SHIPPED' ? 'Terima Barang' : 'Lacak & Detail'}</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: TUGAS DISTRIBUSI PESANAN MITRA LOKAL (ORDER ROUTING) ── */}
        {activeTab === 'DISTRIBUTION' && (
          <div className="bg-white rounded-2xl border border-varena-taupe/20 p-5 space-y-4 shadow-sm">
            <div>
              <h3 className="font-serif font-bold text-base text-varena-espresso">Distribusi Pesanan Mitra Wilayah ({agentData?.agentCity})</h3>
              <p className="text-xs text-stone-500">
                Pesanan konsumen/mitra di kota Anda yang dialihkan kantor agar dapat segera Anda kirimkan atau diambil di toko agen.
              </p>
            </div>

            {assignedOrders.length === 0 ? (
              <div className="py-12 text-center text-stone-500 text-xs">
                Belum ada pesanan mitra baru yang dialihkan kantor ke agen Anda.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-600 border-b">
                    <tr>
                      <th className="py-2.5 px-3">No. Pesanan Mitra</th>
                      <th className="py-2.5 px-3">Penerima &amp; Alamat</th>
                      <th className="py-2.5 px-3">Produk</th>
                      <th className="py-2.5 px-3">Nilai Transaksi</th>
                      <th className="py-2.5 px-3">Status Pengiriman</th>
                      <th className="py-2.5 px-3">Aksi Agen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-stone-700">
                    {assignedOrders.map((ao) => (
                      <tr key={ao.id} className="hover:bg-stone-50/50">
                        <td className="py-3 px-3 font-mono font-semibold text-varena-espresso">
                          {ao.orderNumber}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-varena-espresso">{ao.buyerName}</div>
                          <div className="text-[11px] text-stone-500 line-clamp-1">{ao.shippingAddress}</div>
                        </td>
                        <td className="py-3 px-3">
                          {ao.items?.map((it: any) => `${it.quantity}x ${it.nameSnapshot}`).join(', ')}
                        </td>
                        <td className="py-3 px-3 font-semibold text-varena-espresso">
                          Rp{ao.total?.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ao.orderStatus === 'SHIPPED' || ao.agentDispatchStatus === 'DISPATCHED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                              }`}
                          >
                            {ao.orderStatus === 'SHIPPED' ? 'Sudah Diserahkan/Dikirim' : 'Menunggu Kirim'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {ao.orderStatus !== 'SHIPPED' && ao.orderStatus !== 'COMPLETED' ? (
                            <button
                              onClick={() => {
                                setDispatchModalOrder(ao);
                                setTrackingNumber(`PICKUP-${Date.now().toString().slice(-6)}`);
                              }}
                              className="py-1.5 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition shadow-sm"
                            >
                              Kirimkan / Serahkan Barang
                            </button>
                          ) : (
                            <span className="text-[11px] text-stone-400 italic">Selesai</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: BUKU KAS & SALDO DEPOSIT ── */}
        {activeTab === 'DEPOSIT' && (
          <div className="bg-white rounded-2xl border border-varena-taupe/20 p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-serif font-bold text-base text-varena-espresso">Mutasi Saldo Deposit Kas Agen</h3>
                <p className="text-xs text-stone-500">
                  Saldo deposit mempercepat pembelian stok pasokan grosir tanpa perlu transfer manual setiap kali order.
                </p>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-stone-100">
                <div className="text-left sm:text-right">
                  <div className="text-[10px] text-stone-400 font-semibold uppercase">Saldo Aktif Saat Ini</div>
                  <div className="text-xl font-bold font-serif text-varena-espresso">
                    Rp{(agentData?.agentDepositBalance || 0).toLocaleString('id-ID')}
                  </div>
                </div>
                <button
                  onClick={() => setTopupModalOpen(true)}
                  className="py-2 px-3.5 rounded-xl bg-varena-gold text-varena-espresso font-bold text-xs hover:bg-varena-gold-hover transition shadow shrink-0"
                >
                  + Top Up Deposit
                </button>
              </div>
            </div>

            {depositTransactions.filter((t) => t.status === 'PENDING' && t.type === 'TOPUP_DEPOSIT').length > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5 animate-pulse" />
                <div className="flex-1">
                  <div className="font-bold flex items-center justify-between">
                    <span>Menunggu Approval Admin:</span>
                    <span className="font-mono text-amber-800">
                      +Rp{depositTransactions
                        .filter((t) => t.status === 'PENDING' && t.type === 'TOPUP_DEPOSIT')
                        .reduce((sum, t) => sum + (t.amount || 0), 0)
                        .toLocaleString('id-ID')}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800/90 mt-0.5 leading-relaxed">
                    Pengajuan top-up deposit kas agen belum masuk ke Saldo Aktif karena masih dalam verifikasi mutasi transfer oleh tim finance. Saldo akan otomatis bertambah setelah disetujui admin.
                  </p>
                </div>
              </div>
            )}

            {depositTransactions.length === 0 ? (
              <div className="py-12 text-center text-stone-500 text-xs">
                Belum ada riwayat mutasi deposit kas agen.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-600 border-b">
                    <tr>
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">No. Referensi</th>
                      <th className="py-2.5 px-3">Jenis Transaksi</th>
                      <th className="py-2.5 px-3">Keterangan</th>
                      <th className="py-2.5 px-3">Nominal</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-stone-700">
                    {paginatedDepositTx.map((tx) => (
                      <tr key={tx.id} className="hover:bg-stone-50/50">
                        <td className="py-3 px-3 text-stone-500">
                          {new Date(tx.createdAt).toLocaleDateString('id-ID')}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] font-semibold text-varena-espresso">
                          {tx.referenceId || '-'}
                        </td>
                        <td className="py-3 px-3 font-semibold">
                          {tx.type === 'TOPUP_DEPOSIT' ? 'Top Up Saldo Deposit'
                            : tx.type === 'RESTOCK_PAYMENT' ? 'Pembayaran Pasokan Grosir'
                              : tx.type === 'RESTOCK_HYBRID_DEPOSIT' ? 'Pembayaran Pasokan (Bagian Deposit)'
                                : tx.type === 'ADJUSTMENT_CREDIT' ? 'Penyesuaian Kredit'
                                  : tx.type === 'ADJUSTMENT_DEBIT' ? 'Penyesuaian Debit'
                                    : tx.type}
                        </td>
                        <td className="py-3 px-3 text-stone-600">
                          {tx.notes}
                        </td>
                        <td className="py-3 px-3 font-semibold">
                          <span className={['TOPUP_DEPOSIT', 'ADJUSTMENT_CREDIT'].includes(tx.type) ? 'text-emerald-700' : 'text-rose-700'}>
                            {['TOPUP_DEPOSIT', 'ADJUSTMENT_CREDIT'].includes(tx.type) ? '+' : '-'}Rp{tx.amount?.toLocaleString('id-ID')}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {(() => {
                            const statusConfig: Record<string, { label: string; cls: string }> = {
                              COMPLETED: { label: '✅ Berhasil', cls: 'bg-emerald-100 text-emerald-800' },
                              PENDING: { label: '⏳ Menunggu Admin', cls: 'bg-amber-100 text-amber-800' },
                              PENDING_PAYMENT: { label: '🕐 Menunggu Transfer', cls: 'bg-sky-100 text-sky-800' },
                              WAITING_VERIFICATION: { label: '🔍 Sedang Diverifikasi', cls: 'bg-blue-100 text-blue-800' },
                              REJECTED: { label: '❌ Ditolak', cls: 'bg-rose-100 text-rose-800' },
                              EXPIRED: { label: '⏰ Kedaluwarsa', cls: 'bg-stone-100 text-stone-500' },
                              CANCELLED: { label: '🚫 Dibatalkan', cls: 'bg-stone-100 text-stone-500' },
                            };
                            const st = statusConfig[tx.status] || { label: tx.status, cls: 'bg-stone-100 text-stone-600' };
                            const canResubmit = (tx.status === 'EXPIRED' || tx.status === 'CANCELLED') && tx.type === 'TOPUP_DEPOSIT';
                            return (
                              <div className="flex flex-col items-start gap-1">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${st.cls}`}>
                                  {st.label}
                                </span>
                                {canResubmit && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTopupAmount(String(tx.amount || 1000000));
                                      setTopupStep(1);
                                      setTopupResult(null);
                                      setTopupProofUrl('');
                                      setTopupNotes('');
                                      setTopupConfirmed(false);
                                      setTopupModalOpen(true);
                                    }}
                                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-varena-espresso text-varena-gold hover:bg-varena-espresso-dark transition"
                                  >
                                    🔄 Ajukan Ulang
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {depositTxTotalPages > 1 && (
                <div className="pt-2">
                  <Pagination
                    currentPage={depositTxPage}
                    totalPages={depositTxTotalPages}
                    totalItems={depositTransactions.length}
                    onPageChange={(p) => setDepositTxPage(p)}
                  />
                </div>
              )}
            </>
            )}
          </div>
        )}

        {/* ── TAB 4: REWARD & PENGHARGAAN KANTOR PUSAT ── */}
        {activeTab === 'REWARDS' && (
          <div className="bg-white rounded-2xl border border-varena-taupe/20 p-5 space-y-4 shadow-sm">
            <div>
              <h3 className="font-serif font-bold text-base text-varena-espresso">Penghargaan &amp; Bonus Performa Keagenan</h3>
              <p className="text-xs text-stone-500">
                Reward resmi yang diberikan langsung oleh kantor pusat berdasarkan evaluasi kinerja penjualan wilayah Anda (berupa dana tunai atau barang/aset fisik).
              </p>
            </div>

            {!agentData?.rewards || agentData.rewards.length === 0 ? (
              <div className="py-12 text-center text-stone-500 text-xs">
                Belum ada catatan penghargaan performa. Terus tingkatkan volume distribusi keagenan untuk mendapatkan apresiasi resmi dari manajemen kantor pusat.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agentData.rewards.map((r: any) => (
                  <div key={r.id} className="p-4 rounded-xl border border-varena-gold/40 bg-gradient-to-br from-amber-50/40 to-white space-y-3 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-varena-gold/20 text-varena-gold flex items-center justify-center flex-shrink-0">
                          {r.rewardType === 'CASH_BONUS' ? <Wallet className="w-5 h-5 text-emerald-700" /> : <Gift className="w-5 h-5 text-purple-700" />}
                        </div>
                        <div>
                          <h4 className="font-serif font-bold text-sm text-varena-espresso">{r.title}</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-stone-200 text-stone-600 uppercase">
                            {r.rewardType === 'CASH_BONUS' ? 'Bonus Dana Tunai' : 'Penghargaan Barang/Aset Fisik'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] text-stone-400 font-mono">
                        {new Date(r.awardedAt).toLocaleDateString('id-ID')}
                      </span>
                    </div>

                    <div className="p-3 bg-white/80 rounded-lg border border-stone-200 text-xs space-y-1">
                      {r.rewardType === 'CASH_BONUS' ? (
                        <div className="flex items-center justify-between">
                          <span className="text-stone-500">Nominal Bonus:</span>
                          <span className="font-bold text-emerald-800 text-sm">Rp{r.cashAmount?.toLocaleString('id-ID')}</span>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center justify-between font-medium">
                            <span className="text-stone-500">Rincian Barang:</span>
                            <span className="font-bold text-varena-espresso">{r.goodsDescription}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-stone-400 mt-1">
                            <span>Valuasi Perolehan Aset:</span>
                            <span>Rp{r.goodsValuation?.toLocaleString('id-ID')}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="text-[11px] text-stone-600 italic">
                      &ldquo;{r.reasonNotes}&rdquo;
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── MODAL 1: ORDER PASOKAN GROSIR (Multi-Item Cart) ── */}
      {restockModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl border border-varena-gold/40 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-serif text-lg font-bold text-varena-espresso flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-varena-gold" />
                <span>Pemesanan Pasokan Grosir ke Kantor</span>
              </h3>
              <button onClick={() => setRestockModalOpen(false)} className="text-stone-400 hover:text-stone-700">✕</button>
            </div>

            {/* Aturan Kantor Pusat: Batas Minimal Order */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="text-amber-900">
                  Aturan Keagenan: Minimal pemesanan adalah <strong>{minRestockMoq} Box</strong> (bisa kombinasi produk).
                </span>
              </div>
              <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-amber-200/80 text-amber-900 shrink-0">
                MOQ: {minRestockMoq} Box
              </span>
            </div>

            {/* Panel Tambah Produk */}
            {availableVariants.length > 0 && (
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide">Tambah Produk ke Keranjang</p>
                <div className="flex gap-2">
                  <select
                    value={selectedVariantId}
                    onChange={(e) => setSelectedVariantId(e.target.value)}
                    className="flex-1 p-2 rounded-lg border border-stone-300 text-xs outline-none focus:border-varena-gold bg-white"
                  >
                    {availableVariants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.productName} — {v.name} (Rp{v.price.toLocaleString('id-ID')}/{v.unit || 'unit'})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => addToRestockCart(selectedVariantId)}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg bg-varena-espresso text-varena-gold text-xs font-bold hover:bg-varena-espresso-dark transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah
                  </button>
                </div>
              </div>
            )}

            {/* Keranjang Item */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide flex items-center gap-1.5">
                <ShoppingCart className="w-3.5 h-3.5" />
                Keranjang ({restockCart.length} jenis produk)
              </p>
              {restockCart.length === 0 ? (
                <div className="text-center py-6 text-xs text-stone-400 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                  Belum ada produk. Pilih produk dan klik <strong>Tambah</strong> di atas.
                </div>
              ) : (
                <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden">
                  {restockCart.map((ci) => {
                    const v = availableVariants.find((av) => av.id === ci.variantId);
                    if (!v) return null;
                    const lineGross = v.price * ci.quantity;
                    return (
                      <div key={ci.variantId} className="flex items-center gap-3 px-3 py-2.5 bg-white hover:bg-stone-50 transition">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-xs text-varena-espresso truncate">{v.productName}</div>
                          <div className="text-[10px] text-stone-400 truncate">{v.name} · Rp{v.price.toLocaleString('id-ID')}/{v.unit || 'unit'}</div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateCartQty(ci.variantId, ci.quantity - 1)}
                            className="w-6 h-6 rounded-md border border-stone-300 text-stone-600 flex items-center justify-center hover:bg-stone-100 text-xs font-bold"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={ci.quantity}
                            onChange={(e) => updateCartQty(ci.variantId, parseInt(e.target.value, 10) || 1)}
                            className="w-14 text-center text-xs font-bold border border-stone-300 rounded-md px-1 py-0.5 outline-none focus:border-varena-gold"
                          />
                          <button
                            type="button"
                            onClick={() => updateCartQty(ci.variantId, ci.quantity + 1)}
                            className="w-6 h-6 rounded-md border border-stone-300 text-stone-600 flex items-center justify-center hover:bg-stone-100 text-xs font-bold"
                          >
                            +
                          </button>
                        </div>
                        <div className="text-xs font-mono font-semibold text-varena-espresso w-24 text-right shrink-0">
                          Rp{lineGross.toLocaleString('id-ID')}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(ci.variantId)}
                          className="text-red-400 hover:text-red-600 ml-1 shrink-0"
                          title="Hapus item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Rincian Harga */}
            {restockCart.length > 0 && (
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal Harga Normal:</span>
                  <span className="font-mono">Rp{cartGross.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-purple-700 font-medium">
                  <span>Diskon Agen Resmi ({agentData?.agentDiscountType === 'PERCENTAGE' ? `${agentData?.agentDiscountValue}%` : `Rp${agentData?.agentDiscountValue?.toLocaleString('id-ID')}/unit`}):</span>
                  <span className="font-mono">-Rp{cartDiscount.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Ongkir Kantor ke Agen:</span>
                  <span>GRATIS (Ditanggung Kantor)</span>
                </div>
                <div className="pt-2 border-t border-stone-200 flex justify-between font-bold text-sm text-varena-espresso">
                  <span>Total yang Harus Dibayar:</span>
                  <span className="font-mono">Rp{cartPayable.toLocaleString('id-ID')}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleRestockSubmit} className="space-y-4 text-xs">
              {/* Metode Pembayaran Pasokan */}
              <div>
                <label className="block text-stone-600 font-semibold mb-1">Metode Pembayaran:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRestockPaymentMethod('DEPOSIT')}
                    className={`p-3 rounded-xl border text-left transition ${restockPaymentMethod === 'DEPOSIT'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-semibold ring-1 ring-emerald-600'
                        : 'border-stone-200 text-stone-700 hover:bg-stone-50'
                      }`}
                  >
                    <div className="text-xs font-bold">Saldo Deposit Agen</div>
                    <div className="text-[10px] text-stone-500 mt-0.5">
                      Tersedia: Rp{(agentData?.agentDepositBalance || 0).toLocaleString('id-ID')}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRestockPaymentMethod('MANUAL_TRANSFER')}
                    className={`p-3 rounded-xl border text-left transition ${restockPaymentMethod === 'MANUAL_TRANSFER'
                        ? 'border-varena-espresso bg-stone-100 text-varena-espresso font-semibold ring-1 ring-varena-espresso'
                        : 'border-stone-200 text-stone-700 hover:bg-stone-50'
                      }`}
                  >
                    <div className="text-xs font-bold">Transfer Bank Manual</div>
                    <div className="text-[10px] text-stone-500 mt-0.5">Transfer rekening kantor pusat</div>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRestockModalOpen(false)}
                  className="py-2 px-4 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={restockSubmitting || restockCart.length === 0 || isRestockBelowMoq}
                  className="py-2 px-5 rounded-lg bg-varena-espresso text-varena-gold font-bold hover:bg-varena-espresso-dark transition disabled:opacity-50"
                >
                  {restockSubmitting
                    ? 'Memproses...'
                    : isRestockBelowMoq
                      ? `Min. Order ${minRestockMoq} Box (Saat ini: ${cartBoxQty} Box)`
                      : `Konfirmasi Pemesanan (${cartBoxQty} Box)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: REQUEST DROPSHIP KANTOR KE MITRA LUAR KOTA ── */}
      {dropshipModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-varena-gold/40 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-serif text-lg font-bold text-varena-espresso flex items-center gap-2">
                <Send className="w-5 h-5 text-varena-gold" />
                <span>Request Kirim Langsung dari Kantor Pusat</span>
              </h3>
              <button onClick={() => setDropshipModalOpen(false)} className="text-stone-400 hover:text-stone-700">✕</button>
            </div>

            <p className="text-[11px] text-stone-500">
              Gunakan fitur ini jika mitra Anda berada di daerah kantor pusat atau luar kota agen Anda, agar pengiriman lebih cepat &amp; hemat biaya ongkir.
            </p>

            <form onSubmit={handleDropshipSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-600 font-semibold mb-1">Nama Penerima Mitra:</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso"
                  value={dropshipForm.recipientName}
                  onChange={(e) => setDropshipForm({ ...dropshipForm, recipientName: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-stone-300 outline-none focus:border-varena-gold"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-semibold mb-1">No. Handphone / WhatsApp:</label>
                <input
                  type="tel"
                  required
                  placeholder="Contoh: 081234567890"
                  value={dropshipForm.recipientPhone}
                  onChange={(e) => setDropshipForm({ ...dropshipForm, recipientPhone: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-stone-300 outline-none focus:border-varena-gold"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-semibold mb-1">Kota Tujuan Penerima:</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Surabaya / Medan"
                  value={dropshipForm.shippingCity}
                  onChange={(e) => setDropshipForm({ ...dropshipForm, shippingCity: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-stone-300 outline-none focus:border-varena-gold"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-semibold mb-1">Alamat Lengkap Pengiriman:</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Jalan, No. Rumah, RT/RW, Kelurahan, Kecamatan"
                  value={dropshipForm.shippingAddress}
                  onChange={(e) => setDropshipForm({ ...dropshipForm, shippingAddress: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-stone-300 outline-none focus:border-varena-gold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 font-semibold mb-1">Jumlah Box:</label>
                  <input
                    type="number"
                    min={1}
                    value={dropshipForm.quantity}
                    onChange={(e) => setDropshipForm({ ...dropshipForm, quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                    className="w-full p-2 rounded-lg border border-stone-300 text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 font-semibold mb-1">Metode Bayar:</label>
                  <select
                    value={dropshipForm.paymentMethod}
                    onChange={(e) => setDropshipForm({ ...dropshipForm, paymentMethod: e.target.value })}
                    className="w-full p-2 rounded-lg border border-stone-300 font-semibold bg-white"
                  >
                    <option value="DEPOSIT">Saldo Deposit Agen</option>
                    <option value="MANUAL_TRANSFER">Transfer Bank</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDropshipModalOpen(false)}
                  className="py-2 px-4 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={dropshipSubmitting}
                  className="py-2 px-5 rounded-lg bg-varena-espresso text-varena-gold font-bold hover:bg-varena-espresso-dark transition disabled:opacity-50"
                >
                  {dropshipSubmitting ? 'Mengirim...' : 'Kirim Request ke Kantor Pusat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: TOPUP SALDO DEPOSIT ── */}
      {topupModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl border border-varena-gold/40 overflow-hidden max-h-[90vh] flex flex-col my-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
              <h3 className="font-serif text-lg font-bold text-varena-espresso flex items-center gap-2">
                <Wallet className="w-5 h-5 text-varena-gold" />
                <span>Top Up Saldo Deposit Kas Agen</span>
              </h3>
              <button
                onClick={() => {
                  setTopupModalOpen(false);
                  setTopupStep(1);
                  setTopupResult(null);
                  setTopupProofUrl('');
                  setTopupNotes('');
                  setTopupBankName('');
                  setTopupAccountNumber('');
                }}
                className="text-stone-400 hover:text-stone-700"
              >✕</button>
            </div>

            {/* Step indicator */}
            <div className="flex items-center px-6 pt-4 gap-3 text-xs font-semibold shrink-0">
              <div className={`flex items-center gap-1.5 ${topupStep === 1 ? 'text-varena-espresso' : 'text-emerald-700'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${topupStep === 1 ? 'bg-varena-gold text-varena-espresso' : 'bg-emerald-600 text-white'}`}>
                  {topupStep === 1 ? '1' : '✓'}
                </span>
                Isi Formulir
              </div>
              <div className="flex-1 h-px bg-stone-200" />
              <div className={`flex items-center gap-1.5 ${topupStep === 2 ? 'text-varena-espresso' : 'text-stone-400'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${topupStep === 2 ? 'bg-varena-gold text-varena-espresso' : 'bg-stone-200 text-stone-500'}`}>
                  2
                </span>
                Transfer &amp; Bukti
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {topupStep === 1 ? (
                /* ── STEP 1: FORM ── */
                <form onSubmit={handleTopupSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-stone-600 font-semibold mb-1">Nominal Top Up (Rp):</label>
                    <input
                      type="number"
                      min={100000}
                      step={50000}
                      required
                      value={topupAmount}
                      onChange={(e) => setTopupAmount(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-stone-300 font-bold text-base text-varena-espresso outline-none focus:border-varena-gold"
                    />
                    <p className="text-stone-400 mt-1">Minimal Rp100.000</p>
                  </div>

                  <div>
                    <label className="block text-stone-600 font-semibold mb-1">Nama Bank Pengirim:</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: BRI / BCA / Mandiri / BNI"
                      value={topupBankName}
                      onChange={(e) => setTopupBankName(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-stone-300 outline-none focus:border-varena-gold"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-600 font-semibold mb-1">Nomor Rekening Pengirim:</label>
                    <input
                      type="text"
                      required
                      placeholder="Nomor rekening Anda"
                      value={topupAccountNumber}
                      onChange={(e) => setTopupAccountNumber(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-stone-300 outline-none focus:border-varena-gold"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-600 font-semibold mb-1">Catatan (Opsional):</label>
                    <input
                      type="text"
                      placeholder="Contoh: Transfer via BRImo"
                      value={topupNotes}
                      onChange={(e) => setTopupNotes(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-stone-300 outline-none focus:border-varena-gold"
                    />
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 leading-relaxed">
                    <strong>Rekening Tujuan Transfer:</strong><br />
                    BRI <span className="font-mono font-bold">3065 0102 4471 539</span> a.n. <strong>Sunariyo</strong>.<br />
                    Kode unik 3-digit akan digenerate setelah Anda klik lanjut — gunakan nominal tepat sesuai instruksi.
                  </div>

                  <div className="pt-1 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => { setTopupModalOpen(false); setTopupBankName(''); setTopupAccountNumber(''); setTopupNotes(''); }}
                      className="py-2 px-4 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={topupSubmitting}
                      className="py-2 px-5 rounded-lg bg-varena-espresso text-varena-gold font-bold hover:bg-varena-espresso-dark transition disabled:opacity-50"
                    >
                      {topupSubmitting ? 'Memproses...' : 'Lanjut →'}
                    </button>
                  </div>
                </form>
              ) : (
                /* ── STEP 2: TRANSFER INSTRUCTIONS + PROOF ── */
                <div className="space-y-4 text-xs">
                  {/* 1-Hour Countdown Timer */}
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-amber-900">
                      <Clock className="w-4 h-4 text-amber-600 animate-pulse flex-shrink-0" />
                      <div className="text-left">
                        <div className="font-bold text-[11px] uppercase tracking-wide">Batas Waktu Transfer (1 Jam)</div>
                        <div className="text-[10px] text-amber-700">Harap transfer & konfirmasi sebelum waktu habis.</div>
                      </div>
                    </div>
                    <div className="font-mono font-bold text-amber-900 text-sm bg-white px-2.5 py-1 rounded-lg border border-amber-300 shadow-2xs">
                      {topupTimeLeft ? (
                        `${String(topupTimeLeft.hours).padStart(2, '0')}:${String(topupTimeLeft.minutes).padStart(2, '0')}:${String(topupTimeLeft.seconds).padStart(2, '0')}`
                      ) : (
                        '01:00:00'
                      )}
                    </div>
                  </div>

                  {/* Transfer instruction card */}
                  <div className="rounded-2xl bg-varena-espresso text-white p-5 space-y-3 shadow-md">
                    <div className="text-varena-gold font-semibold text-[11px] uppercase tracking-widest">Instruksi Transfer</div>
                    <div className="text-center">
                      <div className="text-varena-gold/70 text-[11px] mb-1">Transfer TEPAT sejumlah</div>
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-3xl font-bold font-mono tracking-tight text-varena-gold-light">
                          Rp{(topupResult?.transferTotal || 0).toLocaleString('id-ID')}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyAmount(topupResult?.transferTotal || 0)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-varena-espresso bg-varena-gold hover:bg-varena-gold-hover px-2.5 py-1 rounded-lg transition shadow-xs cursor-pointer"
                          title="Salin Angka Nominal Transfer"
                        >
                          {copiedAmount ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-800" />
                              <span className="text-emerald-950 font-bold">Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-varena-espresso" />
                              <span>Salin</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="text-varena-gold/60 text-[10px] mt-1">
                        (Rp{Number(topupAmount).toLocaleString('id-ID')} + kode unik Rp{topupResult?.uniqueCode})
                      </div>
                    </div>
                    <div className="border-t border-white/10 pt-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-white/60">Bank Tujuan:</span>
                        <span className="font-bold">BRI (Bank Rakyat Indonesia)</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/60">No. Rekening:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold tracking-wide">3065 0102 4471 539</span>
                          <button
                            type="button"
                            onClick={() => copyAccountNumber('306501024471539')}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-varena-espresso bg-varena-gold/70 hover:bg-varena-gold px-2 py-0.5 rounded transition cursor-pointer"
                            title="Salin Nomor Rekening"
                          >
                            {copiedBank ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-800" />
                                <span className="text-emerald-950 font-bold">Tersalin</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-varena-espresso" />
                                <span>Salin</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/60">Atas Nama:</span>
                        <span className="font-bold">Sunariyo</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/60">Kode Unik:</span>
                        <span className="font-mono font-bold text-varena-gold">+Rp{topupResult?.uniqueCode}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/60">Ref. Transaksi:</span>
                        <span className="font-mono text-[10px] text-varena-gold/80">{topupResult?.referenceId}</span>
                      </div>
                    </div>
                  </div>

                  {/* Warning */}
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-[11px] leading-relaxed">
                    ⚠️ Transfer <strong>harus tepat</strong> sesuai nominal di atas (termasuk kode unik). Transfer berbeda nominal tidak dapat diverifikasi otomatis.
                  </div>

                  {/* Proof upload */}
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1.5">Upload Bukti Transfer:</label>
                    {topupProofUrl ? (
                      <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700 font-semibold">Bukti berhasil diunggah!</span>
                      </div>
                    ) : (
                      <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-5 cursor-pointer transition ${topupUploadingProof ? 'border-stone-200 bg-stone-50' : 'border-varena-gold/40 hover:border-varena-gold bg-amber-50/40'}`}>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          disabled={topupUploadingProof}
                          onChange={handleTopupProofUpload}
                        />
                        {topupUploadingProof ? (
                          <span className="text-stone-500">Mengunggah...</span>
                        ) : (
                          <>
                            <FileText className="w-6 h-6 text-varena-gold mb-1" />
                            <span className="text-stone-600 font-semibold">Klik untuk pilih file bukti transfer</span>
                            <span className="text-stone-400 text-[10px] mt-0.5">JPG / PNG / PDF — maks 5MB</span>
                          </>
                        )}
                      </label>
                    )}
                    <p className="text-stone-400 mt-1 text-[10px]">Upload bukti transfer agar admin dapat memverifikasi lebih cepat.</p>
                  </div>

                  {/* Tombol Konfirmasi Sudah Bayar oleh Agen */}
                  <div className="pt-2">
                    {topupConfirmed ? (
                      <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-1.5">
                        <div className="font-bold flex items-center gap-1.5 text-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Konfirmasi Pembayaran Kas Agen Berhasil Dikirim!</span>
                        </div>
                        {topupProofUrl ? (
                          <p className="text-[11px] text-emerald-700 leading-relaxed">
                            ✓ <strong>Bukti Transfer Terlampir:</strong> Bukti transfer kas agen Anda telah tercatat. Tim Keuangan akan segera memverifikasi dan menyetujui penambahan deposit kas agen Anda.
                          </p>
                        ) : (
                          <p className="text-[11px] text-amber-800 leading-relaxed bg-amber-50 p-2 rounded border border-amber-200">
                            ⚠ <strong>Konfirmasi Tanpa Bukti Foto:</strong> Tim Keuangan akan mencocokkan mutasi bank rekening BRI berdasarkan nominal transfer + kode unik (+Rp{topupResult?.uniqueCode}). Saldo kas agen akan otomatis bertambah setelah dana terverifikasi.
                          </p>
                        )}
                        <div className="text-[10px] text-stone-500 pt-1">
                          Status: <span className="font-bold text-blue-700">MENUNGGU VERIFIKASI ADMIN</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {topupTimeLeft?.expired ? (
                          /* Expired — tawari topup baru */
                          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-2">
                            <div className="font-bold flex items-center gap-1.5 text-xs">
                              <AlertCircle className="w-4 h-4 text-rose-500" />
                              <span>Batas Waktu Transfer Kedaluwarsa</span>
                            </div>
                            <p className="text-[11px] text-rose-700">
                              Waktu 1 jam untuk melakukan transfer telah habis. Ajukan pengajuan kas deposit baru.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setTopupStep(1);
                                setTopupResult(null);
                                setTopupProofUrl('');
                                setTopupNotes('');
                                setTopupConfirmed(false);
                              }}
                              className="w-full py-2.5 px-4 rounded-xl bg-varena-espresso text-varena-gold font-bold text-xs transition hover:bg-varena-espresso-dark flex items-center justify-center gap-2"
                            >
                              🔄 Ajukan Top Up Baru (Nominal Sama)
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={topupConfirming}
                            onClick={handleConfirmTopup}
                            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-md active:scale-[0.99] disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>
                              {topupConfirming
                                ? 'Mengirim Konfirmasi...'
                                : '✓ Saya Sudah Transfer (Konfirmasi Pembayaran)'}
                            </span>
                          </button>
                        )}
                        {/* Tombol Batalkan */}
                        {!topupTimeLeft?.expired && (
                          <button
                            type="button"
                            disabled={topupCancelling || topupConfirming}
                            onClick={() => setShowCancelTopupConfirmModal(true)}
                            className="w-full py-2 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs transition disabled:opacity-50"
                          >
                            {topupCancelling ? 'Membatalkan...' : '✕ Batalkan Pengajuan Ini'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-1 flex justify-between items-center gap-2">
                    <span className="text-stone-500 text-[11px]">ID Ref: {topupResult?.referenceId}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setTopupModalOpen(false);
                        setTopupStep(1);
                        setTopupResult(null);
                        setTopupProofUrl('');
                        setTopupNotes('');
                        setTopupBankName('');
                        setTopupAccountNumber('');
                        setTopupConfirmed(false);
                      }}
                      className="py-2 px-5 rounded-lg bg-varena-espresso text-varena-gold font-bold hover:bg-varena-espresso-dark transition"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Pembatalan Top Up Kas Agen */}
      {showCancelTopupConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-stone-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-stone-900 text-sm">Batalkan Pengajuan Top Up?</h4>
                <p className="text-xs text-stone-500">Nomor tiket ini akan ditutup secara permanen.</p>
              </div>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-100">
              Apakah Anda yakin ingin membatalkan pengajuan top up kas agen ini? Kode unik transfer tidak akan berlaku lagi.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={topupCancelling}
                onClick={() => setShowCancelTopupConfirmModal(false)}
                className="flex-1 py-2 px-3 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={topupCancelling}
                onClick={handleCancelTopup}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
              >
                {topupCancelling ? 'Membatalkan...' : 'Ya, Batalkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: SERAHKAN / KIRIMKAN BARANG KE MITRA ── */}
      {dispatchModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-varena-gold/40">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-serif text-lg font-bold text-varena-espresso flex items-center gap-2">
                <Truck className="w-5 h-5 text-varena-gold" />
                <span>Konfirmasi Pengiriman ke Mitra</span>
              </h3>
              <button onClick={() => setDispatchModalOrder(null)} className="text-stone-400 hover:text-stone-700">✕</button>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl text-xs space-y-1">
              <div className="font-semibold text-varena-espresso">{dispatchModalOrder.buyerName}</div>
              <div className="text-stone-600">{dispatchModalOrder.shippingAddress}</div>
              <div className="text-[11px] text-stone-400 font-mono">Invoice: {dispatchModalOrder.orderNumber}</div>
            </div>

            <form onSubmit={handleDispatchAssigned} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-600 font-semibold mb-1">Kurir / Cara Penyerahan:</label>
                <input
                  type="text"
                  required
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-stone-300 outline-none"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-semibold mb-1">No. Resi / Bukti Serah Terima:</label>
                <input
                  type="text"
                  required
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-stone-300 font-mono outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDispatchModalOrder(null)}
                  className="py-2 px-4 rounded-lg bg-stone-100 text-stone-700 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={dispatchSubmitting}
                  className="py-2 px-5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold transition disabled:opacity-50"
                >
                  {dispatchSubmitting ? 'Memproses...' : 'Konfirmasi Selesai Kirim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
