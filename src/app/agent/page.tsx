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
} from 'lucide-react';

export default function AgentPortalPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [agentData, setAgentData] = useState<any>(null);
  const [config, setConfig] = useState<any>({ minimumRestockBox: 10, defaultDiscountValue: 15 });
  const [loading, setLoading] = useState(true);

  // Tab state
  const [activeTab, setActiveTab] = useState<'RESTOCK' | 'DISTRIBUTION' | 'CENTRAL_DROPSHIP' | 'DEPOSIT' | 'REWARDS'>('RESTOCK');

  // Orders & Transactions state
  const [restockOrders, setRestockOrders] = useState<any[]>([]);
  const [assignedOrders, setAssignedOrders] = useState<any[]>([]);
  const [depositTransactions, setDepositTransactions] = useState<any[]>([]);

  // Restock form modal
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [restockQty, setRestockQty] = useState(10);
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

  // Dispatch assigned order modal
  const [dispatchModalOrder, setDispatchModalOrder] = useState<any>(null);
  const [courierName, setCourierName] = useState('Kurir Lokal / Ambil di Toko Agen');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [dispatchSubmitting, setDispatchSubmitting] = useState(false);

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

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

    const headers: Record<string, string> = {
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
          setRestockQty(profileData.config.minimumRestockBox || 10);
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
    } catch (e: any) {
      console.error('Failed to load agent portal data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setRestockSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/v1/agent/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_RESTOCK',
          memberCode: user.memberCode,
          quantity: restockQty,
          paymentMethod: restockPaymentMethod,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: data.message, type: 'success' });
        setRestockModalOpen(false);
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
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: data.message, type: 'success' });
        setTopupModalOpen(false);
        setTopupNotes('');
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
            <button
              onClick={() => setRestockModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-varena-gold hover:bg-varena-gold-hover text-varena-espresso font-bold text-xs transition shadow-md flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Order Pasokan Grosir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 space-y-6">
        {/* Toast Alert Message */}
        {message && (
          <div
            className={`p-3.5 rounded-xl text-xs font-medium flex items-center justify-between shadow-sm ${
              message.type === 'success'
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
            className={`py-3 px-4 font-serif text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'RESTOCK'
                ? 'border-varena-espresso text-varena-espresso'
                : 'border-transparent text-stone-500 hover:text-varena-espresso'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Pasokan Grosir Kantor ({restockOrders.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('DISTRIBUTION')}
            className={`py-3 px-4 font-serif text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'DISTRIBUTION'
                ? 'border-varena-espresso text-varena-espresso'
                : 'border-transparent text-stone-500 hover:text-varena-espresso'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Tugas Kirim Mitra Lokal ({assignedOrders.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('DEPOSIT')}
            className={`py-3 px-4 font-serif text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'DEPOSIT'
                ? 'border-varena-espresso text-varena-espresso'
                : 'border-transparent text-stone-500 hover:text-varena-espresso'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Buku Kas &amp; Saldo Deposit</span>
          </button>
          <button
            onClick={() => setActiveTab('REWARDS')}
            className={`py-3 px-4 font-serif text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'REWARDS'
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
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-base text-varena-espresso">Riwayat Pasokan Grosir dari Kantor Pusat</h3>
                <p className="text-xs text-stone-500">Seluruh pasokan dikirim langsung dari pabrik/kantor pusat bebas biaya pengiriman.</p>
              </div>
              <button
                onClick={() => setRestockModalOpen(true)}
                className="py-2 px-3.5 rounded-xl bg-varena-espresso text-varena-gold font-semibold text-xs hover:bg-varena-espresso-dark transition flex items-center gap-1.5 shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Pesan Pasokan Tambahan</span>
              </button>
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
                    </tr>
                  </thead>
                  <tbody className="divide-y text-stone-700">
                    {restockOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-stone-50/50">
                        <td className="py-3 px-3 font-mono font-semibold text-varena-espresso">
                          {o.orderNumber}
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
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              o.orderStatus === 'PAID'
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
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              ao.orderStatus === 'SHIPPED' || ao.agentDispatchStatus === 'DISPATCHED'
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
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] text-stone-400 font-semibold uppercase">Saldo Aktif Saat Ini</div>
                  <div className="text-xl font-bold font-serif text-varena-espresso">
                    Rp{(agentData?.agentDepositBalance || 0).toLocaleString('id-ID')}
                  </div>
                </div>
                <button
                  onClick={() => setTopupModalOpen(true)}
                  className="py-2 px-3.5 rounded-xl bg-varena-gold text-varena-espresso font-bold text-xs hover:bg-varena-gold-hover transition shadow"
                >
                  + Top Up Deposit
                </button>
              </div>
            </div>

            {depositTransactions.length === 0 ? (
              <div className="py-12 text-center text-stone-500 text-xs">
                Belum ada riwayat mutasi deposit kas agen.
              </div>
            ) : (
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
                    {depositTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-stone-50/50">
                        <td className="py-3 px-3 text-stone-500">
                          {new Date(tx.createdAt).toLocaleDateString('id-ID')}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] font-semibold text-varena-espresso">
                          {tx.referenceId || '-'}
                        </td>
                        <td className="py-3 px-3 font-semibold">
                          {tx.type === 'TOPUP_DEPOSIT' ? 'Top Up Saldo Deposit' : tx.type === 'RESTOCK_PAYMENT' ? 'Pembayaran Pasokan Grosir' : tx.type}
                        </td>
                        <td className="py-3 px-3 text-stone-600">
                          {tx.notes}
                        </td>
                        <td className="py-3 px-3 font-semibold">
                          <span className={tx.type === 'TOPUP_DEPOSIT' || tx.type === 'ADJUSTMENT_CREDIT' ? 'text-emerald-700' : 'text-rose-700'}>
                            {tx.type === 'TOPUP_DEPOSIT' || tx.type === 'ADJUSTMENT_CREDIT' ? '+' : '-'}Rp{tx.amount?.toLocaleString('id-ID')}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              tx.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : tx.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {tx.status === 'COMPLETED' ? 'Berhasil' : tx.status === 'PENDING' ? 'Menunggu Approval' : tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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

      {/* ── MODAL 1: ORDER PASOKAN GROSIR ── */}
      {restockModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-varena-gold/40 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-serif text-lg font-bold text-varena-espresso flex items-center gap-2">
                <Package className="w-5 h-5 text-varena-gold" />
                <span>Pemesanan Pasokan Grosir ke Kantor</span>
              </h3>
              <button onClick={() => setRestockModalOpen(false)} className="text-stone-400 hover:text-stone-700">✕</button>
            </div>

            <form onSubmit={handleRestockSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-stone-600 font-semibold mb-1">
                  Jumlah Pasokan (Minimal {config.minimumRestockBox} Box):
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={config.minimumRestockBox}
                    value={restockQty}
                    onChange={(e) => setRestockQty(Math.max(config.minimumRestockBox, parseInt(e.target.value, 10) || config.minimumRestockBox))}
                    className="w-28 p-2 rounded-lg border border-stone-300 font-bold text-sm text-center outline-none focus:border-varena-gold"
                    required
                  />
                  <span className="text-xs text-stone-500">Box (VARENA Kopi Sehat Premium)</span>
                </div>
              </div>

              {/* Rincian Perhitungan Diskon & Bebas Ongkir */}
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                <div className="flex justify-between text-stone-600">
                  <span>Harga Normal (@Rp500.000):</span>
                  <span>Rp{(500000 * restockQty).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-purple-700 font-medium">
                  <span>
                    Diskon Agen Resmi ({agentData?.agentDiscountType === 'PERCENTAGE' ? `${agentData?.agentDiscountValue}%` : `Rp${agentData?.agentDiscountValue?.toLocaleString('id-ID')}/box`}):
                  </span>
                  <span>
                    -Rp{(agentData?.agentDiscountType === 'PERCENTAGE'
                      ? Math.round((500000 * restockQty * agentData?.agentDiscountValue) / 100)
                      : (agentData?.agentDiscountValue || 0) * restockQty
                    ).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Ongkir Kantor ke Agen:</span>
                  <span>GRATIS (Ditanggung Kantor)</span>
                </div>
                <div className="pt-2 border-t flex justify-between font-bold text-sm text-varena-espresso">
                  <span>Total yang Harus Dibayar:</span>
                  <span>
                    Rp{(
                      500000 * restockQty -
                      (agentData?.agentDiscountType === 'PERCENTAGE'
                        ? Math.round((500000 * restockQty * agentData?.agentDiscountValue) / 100)
                        : (agentData?.agentDiscountValue || 0) * restockQty)
                    ).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Metode Pembayaran Pasokan */}
              <div>
                <label className="block text-stone-600 font-semibold mb-1">Metode Pembayaran:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRestockPaymentMethod('DEPOSIT')}
                    className={`p-3 rounded-xl border text-left transition ${
                      restockPaymentMethod === 'DEPOSIT'
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
                    className={`p-3 rounded-xl border text-left transition ${
                      restockPaymentMethod === 'MANUAL_TRANSFER'
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
                  disabled={restockSubmitting}
                  className="py-2 px-5 rounded-lg bg-varena-espresso text-varena-gold font-bold hover:bg-varena-espresso-dark transition disabled:opacity-50"
                >
                  {restockSubmitting ? 'Memproses...' : 'Konfirmasi Pemesanan Pasokan'}
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
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-varena-gold/40">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-serif text-lg font-bold text-varena-espresso flex items-center gap-2">
                <Wallet className="w-5 h-5 text-varena-gold" />
                <span>Top Up Saldo Deposit Kas Agen</span>
              </h3>
              <button onClick={() => setTopupModalOpen(false)} className="text-stone-400 hover:text-stone-700">✕</button>
            </div>

            <form onSubmit={handleTopupSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-600 font-semibold mb-1">Nominal Top Up:</label>
                <input
                  type="number"
                  min={100000}
                  step={50000}
                  required
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-stone-300 font-bold text-base text-varena-espresso outline-none focus:border-varena-gold"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-semibold mb-1">Catatan Transfer (Opsional):</label>
                <input
                  type="text"
                  placeholder="Contoh: Transfer via BRImo / BCA a.n. Toko Agen"
                  value={topupNotes}
                  onChange={(e) => setTopupNotes(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-stone-300 outline-none"
                />
              </div>

              <div className="p-3 bg-stone-50 rounded-xl text-stone-600 text-[11px] leading-relaxed">
                Silakan transfer ke Rekening Operasional Kantor: <strong>BRI 3065 0102 4471 539</strong> a.n. Sunariyo. Tim keuangan akan mengonfirmasi penambahan saldo Anda.
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTopupModalOpen(false)}
                  className="py-2 px-4 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={topupSubmitting}
                  className="py-2 px-5 rounded-lg bg-varena-espresso text-varena-gold font-bold hover:bg-varena-espresso-dark transition disabled:opacity-50"
                >
                  {topupSubmitting ? 'Mengirim...' : 'Kirim Pengajuan Top Up'}
                </button>
              </div>
            </form>
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
