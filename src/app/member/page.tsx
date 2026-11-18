'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Pagination from '@/components/ui/Pagination';
import {
  Wallet,
  GitFork,
  Share2,
  Copy,
  Check,
  ArrowUpRight,
  TrendingUp,
  Users,
  ShoppingBag,
  Package,
  Truck,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Gift,
  CreditCard,
  X,
  Building2,
  Eye,
  MapPin,
  FileText,
  BadgeCheck,
} from 'lucide-react';
import { PRIMARY_COMPANY_BANK } from '@/config/bank';
import { useNotifications } from '@/contexts/NotificationContext';

export default function MemberDashboardPage() {
  const router = useRouter();
  const { ackOrders } = useNotifications();
  const [user, setUser] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [commissionSummary, setCommissionSummary] = useState<any>(null);
  const [personalOrders, setPersonalOrders] = useState<any[]>([]);
  const [referralOrders, setReferralOrders] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [memberProfile, setMemberProfile] = useState<any>(null);

  // Pagination states for order tables
  const [personalOrdersPage, setPersonalOrdersPage] = useState(1);
  const [referralOrdersPage, setReferralOrdersPage] = useState(1);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const ORDERS_PER_PAGE = 5;

  // Selected order for Marketplace Detail Modal
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [copiedBankModal, setCopiedBankModal] = useState(false);
  const [copiedAmountModal, setCopiedAmountModal] = useState(false);
  const [copiedResiModal, setCopiedResiModal] = useState(false);
  const [copiedOrderNumberModal, setCopiedOrderNumberModal] = useState(false);
  const [modalSettling, setModalSettling] = useState(false);

  const copyNominal = (amount: number, orderId: string) => {
    navigator.clipboard?.writeText(String(amount));
    setCopiedOrderId(orderId);
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  const getOrderStatusStep = (status: string) => {
    switch (status) {
      case 'PENDING_PAYMENT':
        return 1;
      case 'PAID':
      case 'PROCESSING':
        return 3;
      case 'SHIPPED':
        return 4;
      case 'COMPLETED':
        return 5;
      default:
        return 1;
    }
  };

  const handleModalSimulatePayment = async () => {
    if (!selectedOrder) return;
    setModalSettling(true);
    try {
      const res = await fetch('/api/v1/orders/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          providerRef: `SIM-MBR-${Date.now().toString().slice(-6)}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedOrder((prev: any) =>
          prev ? { ...prev, orderStatus: 'PAID', paidAt: new Date().toISOString() } : null
        );
        if (user) {
          loadDashboard(user.memberCode || 'VRN-0001', user.userId || user.id);
        }
      } else {
        alert(data.error || 'Gagal memproses pembayaran.');
      }
    } catch (e: any) {
      alert(e.message || 'Terjadi kesalahan sistem.');
    } finally {
      setModalSettling(false);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem('varena_user');
    if (!stored) {
      router.push('/login');
      return;
    }
    const parsed = JSON.parse(stored);
    setUser(parsed);

    const memberCode = parsed.memberCode || 'VRN-0001';
    const userId = parsed.userId || parsed.id;
    loadDashboard(memberCode, userId);
    ackOrders();
  }, [router, ackOrders]);

  const loadDashboard = (memberCode: string, userId: string) => {
    setLoading(true);
    Promise.all([
      fetch(`/api/v1/wallet?memberCode=${memberCode}`).then((r) => r.json()),
      fetch(`/api/v1/commission/summary?memberCode=${memberCode}`).then((r) => r.json()),
      fetch(`/api/v1/orders/my-orders?memberCode=${memberCode}&userId=${userId}`).then((r) => r.json()),
      fetch(`/api/v1/member/profile?memberCode=${memberCode}&userId=${userId}`).then((r) => r.json()),
    ])
      .then(([wData, cData, oData, pData]) => {
        if (wData.wallet) setWallet(wData.wallet);
        if (cData.summary) setCommissionSummary(cData.summary);
        if (oData.personalOrders) setPersonalOrders(oData.personalOrders);
        if (oData.referralOrders) setReferralOrders(oData.referralOrders);
        if (pData.member) setMemberProfile(pData.member);
      })
      .catch((e) => console.error('Dashboard load error:', e))
      .finally(() => setLoading(false));
  };

  const referralLink = user ? `${typeof window !== 'undefined' ? window.location.origin : ''}/r/${user.memberCode || 'VRN-0001'}` : '';

  const copyToClipboard = async (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {}
    }

    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      textArea.setAttribute('readonly', '');
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.warn('Fallback copy failed:', err);
      return false;
    }
  };

  const handleCopy = async () => {
    const ok = await copyToClipboard(referralLink);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: 'Kemitraan VARENA — Grow Together. Build Value.',
          text: `Mari bergabung bersama VARENA melalui link referral saya (${user?.displayName}):`,
          url: referralLink,
        });
        return;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          await handleCopy();
        }
        return;
      }
    }
    await handleCopy();
  };

  // Buyer confirms order received
  const handleConfirmReceived = async (orderId: string) => {
    if (!confirm('Konfirmasi bahwa barang pesanan Anda telah sampai dengan baik?')) {
      return;
    }
    setActionLoadingId(orderId);
    try {
      const res = await fetch('/api/v1/orders/confirm-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          userId: user?.userId || user?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengonfirmasi penerimaan.');

      alert('Terima kasih! Pesanan Anda telah ditandai selesai.');
      setSelectedOrder((prev: any) =>
        prev && prev.id === orderId ? { ...prev, orderStatus: 'COMPLETED', completedAt: new Date().toISOString() } : prev
      );
      loadDashboard(user?.memberCode || 'VRN-0001', user?.userId || user?.id);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!user) return null;

  const paginatedPersonalOrders = personalOrders.slice(
    (personalOrdersPage - 1) * ORDERS_PER_PAGE,
    personalOrdersPage * ORDERS_PER_PAGE
  );
  const personalTotalPages = Math.ceil(personalOrders.length / ORDERS_PER_PAGE) || 1;

  const paginatedReferralOrders = referralOrders.slice(
    (referralOrdersPage - 1) * ORDERS_PER_PAGE,
    referralOrdersPage * ORDERS_PER_PAGE
  );
  const referralTotalPages = Math.ceil(referralOrders.length / ORDERS_PER_PAGE) || 1;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      {/* Top Welcome Card */}
      <div className="bg-gradient-to-r from-varena-espresso-dark via-[#3A2C23] to-varena-espresso text-varena-ivory p-5 sm:p-8 rounded-2xl border border-varena-gold/30 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-varena-gold/60 p-0.5 bg-varena-espresso-dark flex-shrink-0 shadow-md">
            <Image
              src="/brand/logo-circle.png"
              alt="VARENA Luxury Emblem"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div>
            <div className="inline-block px-2.5 py-0.5 rounded text-[10px] uppercase font-mono font-semibold bg-varena-gold/20 text-varena-gold-light border border-varena-gold/30 mb-1">
              Portal Kemitraan Resmi
            </div>
            <h1 className="font-serif text-xl sm:text-3xl font-bold text-varena-ivory-light">
              Halo, {user.displayName}
            </h1>
            <p className="text-xs text-varena-taupe-light mt-0.5 font-mono">
              ID Mitra: <span className="text-varena-gold-light font-bold">{user.memberCode || 'VRN-0001'}</span>
            </p>
          </div>
        </div>

        {/* Referral Share Box */}
        <div className="bg-varena-espresso/80 border border-varena-gold/40 p-3.5 rounded-xl flex flex-col gap-2 w-full sm:max-w-sm">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-varena-gold-light flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5" />
              <span>Tautan Referral:</span>
            </span>
            {copied && <span className="text-[10px] text-emerald-400 font-semibold animate-pulse">Tersalin!</span>}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={referralLink}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="bg-black/30 border border-[#5A4535] text-[11px] font-mono text-varena-ivory px-2.5 py-1.5 rounded flex-1 min-w-0 select-all outline-none cursor-pointer"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="px-2.5 py-1.5 rounded bg-varena-gold text-varena-espresso hover:bg-varena-gold-hover transition shadow flex items-center gap-1 text-[11px] font-semibold"
              title="Salin Tautan"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin' : 'Salin'}</span>
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="px-2.5 py-1.5 rounded bg-varena-espresso-light border border-varena-gold/50 text-varena-gold-light hover:bg-varena-gold hover:text-varena-espresso transition shadow flex items-center gap-1 text-[11px] font-semibold"
              title="Bagikan ke WhatsApp/Aplikasi lain"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bagikan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Financial Snapshot Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Available Wallet Balance */}
        <div className="bg-white p-5 rounded-2xl border border-varena-taupe/20 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-varena-taupe">
              <span>Saldo Dompet Tersedia</span>
              <Wallet className="w-4 h-4 text-varena-gold" />
            </div>
            <div className="font-serif text-2xl sm:text-3xl font-bold text-varena-espresso mt-2">
              Rp{(wallet?.availableBalance || 0).toLocaleString('id-ID')}
            </div>
            {wallet?.pendingHold > 0 && (
              <div className="text-[11px] text-amber-700 mt-1 font-mono">
                Rp{wallet.pendingHold.toLocaleString('id-ID')} sedang direview finance
              </div>
            )}
            <div className="text-[10px] text-varena-taupe mt-1">
              Sumber: Buku besar append-only
            </div>
          </div>
          <Link
            href="/member/wallet"
            className="mt-4 pt-3 border-t border-varena-taupe/20 text-xs font-semibold text-varena-gold hover:text-varena-gold-hover flex items-center justify-between"
          >
            <span>Tarik Saldo / Mutasi</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Direct Sponsor Reward */}
        <div className="bg-white p-5 rounded-2xl border border-varena-taupe/20 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-varena-taupe">
              <span>Komisi Sponsor Langsung</span>
              <Users className="w-4 h-4 text-varena-gold" />
            </div>
            <div className="font-serif text-2xl sm:text-3xl font-bold text-varena-espresso mt-2">
              Rp{(commissionSummary?.directSponsorEarned || 0).toLocaleString('id-ID')}
            </div>
            <div className="text-[10px] text-varena-taupe mt-1">
              Rp50.000 / qualifying first pack
            </div>
          </div>
          <Link
            href="/member/network"
            className="mt-4 pt-3 border-t border-varena-taupe/20 text-xs font-semibold text-varena-gold hover:text-varena-gold-hover flex items-center justify-between"
          >
            <span>Lihat Mitra Sponsor</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Development Placement Reward */}
        <div className="bg-white p-5 rounded-2xl border border-varena-taupe/20 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-varena-taupe">
              <span>Komisi Generasi Placement</span>
              <GitFork className="w-4 h-4 text-varena-gold" />
            </div>
            <div className="font-serif text-2xl sm:text-3xl font-bold text-varena-espresso mt-2">
              Rp{(commissionSummary?.developmentPlacementEarned || 0).toLocaleString('id-ID')}
            </div>
            <div className="text-[10px] text-varena-taupe mt-1">
              Hingga 10 tingkat upline aktif
            </div>
          </div>
          <Link
            href="/member/network"
            className="mt-4 pt-3 border-t border-varena-taupe/20 text-xs font-semibold text-varena-gold hover:text-varena-gold-hover flex items-center justify-between"
          >
            <span>Jelajahi Pohon Jaringan</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Unique Code Balance Card - only show if member has uniqueCodeBalance */}
      {memberProfile && (
        <div className="bg-white p-5 rounded-2xl border border-varena-taupe/20 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-varena-taupe mb-1">
                <Gift className="w-4 h-4 text-varena-gold" />
                <span>Kode Unik Terkumpul</span>
              </div>
              <div className="font-serif text-2xl font-bold text-varena-espresso mt-1">
                Rp{(memberProfile.uniqueCodeBalance || 0).toLocaleString('id-ID')}
              </div>
              <div className="text-[11px] text-varena-taupe mt-1 leading-relaxed">
                {memberProfile.uniqueCodeBalance >= 10000 ? (
                  <>
                    ✓ <strong className="text-emerald-700">Rp{(Math.floor(memberProfile.uniqueCodeBalance / 1000) * 1000).toLocaleString('id-ID')}</strong> eligible ditarik
                    {memberProfile.uniqueCodeBalance % 1000 > 0 && (
                      <span className="block text-stone-500 text-[10px]">
                        Sisa Rp{(memberProfile.uniqueCodeBalance % 1000).toLocaleString('id-ID')} tersimpan
                      </span>
                    )}
                  </>
                ) : (
                  `Terkumpul Rp${(memberProfile.uniqueCodeBalance || 0).toLocaleString('id-ID')} dari Rp10.000 minimum`
                )}
              </div>
            </div>
            <div className={`px-2 py-1 rounded-full text-[10px] font-bold ${
              memberProfile.uniqueCodeBalance >= 10000
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-stone-100 text-stone-600 border border-stone-200'
            }`}>
              {memberProfile.uniqueCodeBalance >= 10000 ? 'Eligible Tarik' : 'Belum Eligible'}
            </div>
          </div>
          {memberProfile.uniqueCodeBalance > 0 && memberProfile.uniqueCodeBalance < 10000 && (
            <div className="mt-3">
              <div className="w-full bg-stone-100 rounded-full h-1.5">
                <div
                  className="bg-varena-gold h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (memberProfile.uniqueCodeBalance / 10000) * 100)}%` }}
                />
              </div>
              <div className="text-[10px] text-varena-taupe mt-1 text-right">
                {Math.round((memberProfile.uniqueCodeBalance / 10000) * 100)}% menuju threshold
              </div>
            </div>
          )}
          <Link
            href="/member/wallet"
            className="mt-3 pt-3 border-t border-varena-taupe/20 text-xs font-semibold text-varena-gold hover:text-varena-gold-hover flex items-center justify-between"
          >
            <span>Tarik Dana / Lihat Detail</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Section: Pesanan & Pengiriman Saya (Sinkronisasi Logistik) */}
      <div id="pesanan" className="bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-4 scroll-mt-20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg font-bold text-varena-espresso flex items-center gap-2">
              <Package className="w-5 h-5 text-varena-gold" />
              <span>Pesanan & Pengiriman Saya</span>
            </h2>
            <p className="text-xs text-varena-taupe mt-0.5">
              Lacak status pemrosesan pesanan, nomor resi kurir pengiriman, dan konfirmasi penerimaan barang.
            </p>
          </div>
          <Link
            href="/checkout"
            className="px-3 py-1.5 rounded-lg bg-varena-espresso text-varena-gold-light font-semibold text-xs hover:bg-varena-espresso-dark transition flex items-center gap-1.5 shadow"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Belanja Lagi</span>
          </Link>
        </div>

        {personalOrders.length > 0 ? (
          <>
            <div className="overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[600px]">
              <thead className="bg-varena-ivory-light text-varena-taupe uppercase font-semibold border-b border-varena-taupe/20">
                <tr>
                  <th className="py-2.5 px-3">No. Pesanan</th>
                  <th className="py-2.5 px-3">Produk</th>
                  <th className="py-2.5 px-3">Total Belanja</th>
                  <th className="py-2.5 px-3">Status Pesanan</th>
                  <th className="py-2.5 px-3">Kurir & No. Resi</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-varena-taupe/10">
                {paginatedPersonalOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-varena-ivory-light/40 transition">
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(po)}
                        className="text-left group cursor-pointer"
                        title="Klik untuk lihat detail pesanan lengkap"
                      >
                        <div className="font-mono font-bold text-varena-espresso group-hover:text-amber-800 flex items-center gap-1 transition">
                          <span>{po.orderNumber}</span>
                          <Eye className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-800 transition" />
                        </div>
                        <div className="text-[10px] text-varena-taupe">
                          {new Date(po.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </button>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="space-y-0.5">
                        {po.items?.map((it: any, idx: number) => (
                          <div key={idx} className="font-medium text-varena-espresso">
                            {it.quantity}x {it.name}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-varena-espresso whitespace-nowrap">
                      <div>Rp{po.total.toLocaleString('id-ID')}</div>
                      {po.orderStatus === 'PENDING_PAYMENT' && (
                        <button
                          type="button"
                          onClick={() => copyNominal(po.total, po.id)}
                          className="mt-1 inline-flex items-center gap-1 text-[10px] text-varena-espresso bg-stone-100 hover:bg-stone-200 px-1.5 py-0.5 rounded transition font-sans font-normal"
                          title="Salin nominal transfer"
                        >
                          {copiedOrderId === po.id ? (
                            <>
                              <Check className="w-2.5 h-2.5 text-emerald-600" />
                              <span className="text-emerald-700 font-semibold">Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-2.5 h-2.5 text-stone-600" />
                              <span>Salin Nominal</span>
                            </>
                          )}
                        </button>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold inline-block ${
                          po.orderStatus === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : po.orderStatus === 'SHIPPED'
                            ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                            : po.orderStatus === 'PAID'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {po.orderStatus === 'PENDING_PAYMENT'
                          ? 'Menunggu Pembayaran'
                          : po.orderStatus === 'PAID'
                          ? 'Diproses (Sedang Dikemas)'
                          : po.orderStatus === 'SHIPPED'
                          ? 'Sedang Dikirim Kurir'
                          : po.orderStatus === 'COMPLETED'
                          ? 'Pesanan Selesai'
                          : po.orderStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {po.trackingNumber ? (
                        <div>
                          <div className="font-semibold text-varena-espresso flex items-center gap-1">
                            <Truck className="w-3.5 h-3.5 text-varena-gold" />
                            <span>{po.courierName}</span>
                          </div>
                          <div className="text-[10px] font-mono text-varena-taupe mt-0.5">
                            Resi: <strong>{po.trackingNumber}</strong>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-varena-taupe italic">
                          {po.orderStatus === 'PENDING_PAYMENT' ? 'Menunggu Pembayaran' : 'Sedang Disiapkan Gudang'}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {po.orderStatus === 'PENDING_PAYMENT' && (
                        <div className="flex flex-col items-end gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(po)}
                            className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] shadow-xs transition inline-flex items-center gap-1 whitespace-nowrap"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>Bayar Sekarang</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(po)}
                            className="text-[10px] text-stone-500 hover:text-varena-espresso underline"
                          >
                            Detail Pesanan
                          </button>
                        </div>
                      )}

                      {po.orderStatus === 'PAID' && (
                        <div className="flex flex-col items-end gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(po)}
                            className="px-2.5 py-1 rounded border border-blue-300 bg-blue-50/70 hover:bg-blue-100 text-blue-900 font-semibold text-[11px] shadow-xs transition inline-flex items-center gap-1 whitespace-nowrap"
                          >
                            <Eye className="w-3 h-3 text-blue-700" />
                            <span>Detail Pesanan</span>
                          </button>
                          <span className="text-[10px] text-blue-700">Sedang dikemas</span>
                        </div>
                      )}

                      {po.orderStatus === 'SHIPPED' && (
                        <div className="flex flex-col items-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleConfirmReceived(po.id)}
                            disabled={actionLoadingId === po.id}
                            className="px-2.5 py-1 rounded bg-emerald-700 text-white font-semibold text-[11px] hover:bg-emerald-800 transition shadow whitespace-nowrap inline-flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            <span>{actionLoadingId === po.id ? 'Memproses...' : 'Konfirmasi Diterima'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(po)}
                            className="text-[10px] text-indigo-700 hover:text-indigo-900 font-medium underline"
                          >
                            Lacak & Detail →
                          </button>
                        </div>
                      )}

                      {po.orderStatus === 'COMPLETED' && (
                        <div className="flex flex-col items-end gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(po)}
                            className="px-2.5 py-1 rounded border border-emerald-300 bg-emerald-50/60 hover:bg-emerald-100 text-emerald-900 font-semibold text-[11px] transition inline-flex items-center gap-1 whitespace-nowrap"
                          >
                            <Eye className="w-3 h-3 text-emerald-700" />
                            <span>Detail Pesanan</span>
                          </button>
                          <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5" /> Selesai
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

            <div className="pt-2">
              <Pagination
                currentPage={personalOrdersPage}
                totalPages={personalTotalPages}
                totalItems={personalOrders.length}
                onPageChange={(p) => setPersonalOrdersPage(p)}
              />
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-xs text-varena-taupe bg-varena-ivory-light rounded-xl border border-dashed border-varena-taupe/30">
            Anda belum memiliki riwayat pesanan pribadi. Klik <strong>Belanja Lagi</strong> untuk memesan produk VARENA Kopi Sehat.
          </div>
        )}
      </div>

      {/* Section: Penjualan dari Referral Saya */}
      {referralOrders.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-lg font-bold text-varena-espresso flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-varena-gold" />
                <span>Penjualan dari Link Referral Saya</span>
              </h2>
              <p className="text-xs text-varena-taupe mt-0.5">
                Pesanan yang dihasilkan melalui pembagian tautan referral Anda beserta bonus komisi yang diperoleh.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-varena-gold/20 text-varena-espresso">
              {referralOrders.length} Transaksi Referral
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[560px]">
              <thead className="bg-varena-ivory-light text-varena-taupe uppercase font-semibold border-b border-varena-taupe/20">
                <tr>
                  <th className="py-2.5 px-3">No. Pesanan</th>
                  <th className="py-2.5 px-3">Nama Pembeli</th>
                  <th className="py-2.5 px-3">Tipe Pembelian</th>
                  <th className="py-2.5 px-3">Total Belanja</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Komisi Diterima</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-varena-taupe/10">
                {paginatedReferralOrders.map((ro) => (
                  <tr key={ro.id} className="hover:bg-varena-ivory-light/40">
                    <td className="py-2.5 px-3 font-mono font-bold text-varena-espresso">{ro.orderNumber}</td>
                    <td className="py-2.5 px-3 font-medium text-varena-espresso">{ro.buyerName}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-varena-ivory border border-varena-taupe/20">
                        {ro.orderType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono">Rp{ro.total.toLocaleString('id-ID')}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          ro.orderStatus === 'PAID' || ro.orderStatus === 'SHIPPED' || ro.orderStatus === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {ro.orderStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800">
                      Rp{ro.commissionEarned.toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-2">
            <Pagination
              currentPage={referralOrdersPage}
              totalPages={referralTotalPages}
              totalItems={referralOrders.length}
              onPageChange={(p) => setReferralOrdersPage(p)}
            />
          </div>
        </div>
      )}

      {/* Quick Action Buttons */}
      <div className="bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-4">
        <h2 className="font-serif text-lg font-bold text-varena-espresso">Aksi Cepat Mitra</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <Link
            href="/member/network"
            className="p-3.5 rounded-xl border border-varena-taupe/20 hover:border-varena-gold hover:bg-varena-ivory-light transition flex flex-col items-center text-center gap-2"
          >
            <div className="p-2 rounded-full bg-varena-espresso text-varena-gold-light">
              <GitFork className="w-4 h-4" />
            </div>
            <span className="font-semibold text-varena-espresso">Pohon Jaringan</span>
          </Link>

          <Link
            href="/member/wallet"
            className="p-3.5 rounded-xl border border-varena-taupe/20 hover:border-varena-gold hover:bg-varena-ivory-light transition flex flex-col items-center text-center gap-2"
          >
            <div className="p-2 rounded-full bg-varena-espresso text-varena-gold-light">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="font-semibold text-varena-espresso">Tarik Dana</span>
          </Link>

          <Link
            href="/checkout"
            className="p-3.5 rounded-xl border border-varena-taupe/20 hover:border-varena-gold hover:bg-varena-ivory-light transition flex flex-col items-center text-center gap-2"
          >
            <div className="p-2 rounded-full bg-varena-espresso text-varena-gold-light">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <span className="font-semibold text-varena-espresso">Order Produk</span>
          </Link>

          <button
            onClick={handleCopy}
            className="p-3.5 rounded-xl border border-varena-taupe/20 hover:border-varena-gold hover:bg-varena-ivory-light transition flex flex-col items-center text-center gap-2"
          >
            <div className="p-2 rounded-full bg-varena-espresso text-varena-gold-light">
              <Share2 className="w-4 h-4" />
            </div>
            <span className="font-semibold text-varena-espresso">Bagikan Referral</span>
          </button>
        </div>
      </div>

      {/* Modal Detail & Pelacakan Pesanan Lengkap (Marketplace Experience) */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-varena-taupe/20 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-varena-espresso text-varena-gold-light flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-varena-gold/20 flex items-center justify-center text-varena-gold">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-white">Detail Pesanan & Pengiriman</h3>
                  <div className="text-[11px] text-varena-gold-light/80 font-mono flex items-center gap-1.5 mt-0.5">
                    <span>{selectedOrder.orderNumber}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(selectedOrder.orderNumber);
                        setCopiedOrderNumberModal(true);
                        setTimeout(() => setCopiedOrderNumberModal(false), 2000);
                      }}
                      className="text-[10px] bg-white/10 hover:bg-white/20 px-1.5 py-0.5 rounded transition text-varena-gold-light inline-flex items-center gap-0.5"
                      title="Salin Nomor Pesanan"
                    >
                      {copiedOrderNumberModal ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Salin</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto text-xs">
              {/* Marketplace Stepper Progress Bar */}
              <div className="p-4 rounded-xl bg-varena-ivory-light border border-varena-taupe/20">
                <div className="text-[10px] text-varena-taupe uppercase font-bold tracking-wider mb-3">
                  Status Transaksi Marketplace:
                </div>
                <div className="relative flex items-center justify-between">
                  {/* Background Track Line */}
                  <div className="absolute left-3 right-3 top-3.5 h-0.5 bg-stone-200 -z-0" />
                  {/* Active Colored Track Line */}
                  <div
                    className="absolute left-3 top-3.5 h-0.5 bg-emerald-600 transition-all duration-300 -z-0"
                    style={{
                      width: `${Math.min(100, Math.max(0, ((getOrderStatusStep(selectedOrder.orderStatus) - 1) / 4) * 100))}%`,
                    }}
                  />

                  {/* Step 1: Dipesan */}
                  <div className="flex flex-col items-center relative z-10">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition ${
                        getOrderStatusStep(selectedOrder.orderStatus) >= 1
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      ✓
                    </div>
                    <span className="text-[10px] font-semibold text-varena-espresso mt-1.5">Dipesan</span>
                  </div>

                  {/* Step 2: Dibayar */}
                  <div className="flex flex-col items-center relative z-10">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition ${
                        getOrderStatusStep(selectedOrder.orderStatus) >= 2
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      {getOrderStatusStep(selectedOrder.orderStatus) >= 2 ? '✓' : '2'}
                    </div>
                    <span className="text-[10px] font-semibold text-varena-espresso mt-1.5">Dibayar</span>
                  </div>

                  {/* Step 3: Dikemas */}
                  <div className="flex flex-col items-center relative z-10">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition ${
                        getOrderStatusStep(selectedOrder.orderStatus) >= 3
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      {getOrderStatusStep(selectedOrder.orderStatus) >= 3 ? '✓' : '3'}
                    </div>
                    <span className="text-[10px] font-semibold text-varena-espresso mt-1.5">Dikemas</span>
                  </div>

                  {/* Step 4: Dikirim */}
                  <div className="flex flex-col items-center relative z-10">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition ${
                        getOrderStatusStep(selectedOrder.orderStatus) >= 4
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      {getOrderStatusStep(selectedOrder.orderStatus) >= 4 ? '✓' : '4'}
                    </div>
                    <span className="text-[10px] font-semibold text-varena-espresso mt-1.5">Dikirim</span>
                  </div>

                  {/* Step 5: Selesai */}
                  <div className="flex flex-col items-center relative z-10">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition ${
                        getOrderStatusStep(selectedOrder.orderStatus) >= 5
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      {getOrderStatusStep(selectedOrder.orderStatus) >= 5 ? '✓' : '5'}
                    </div>
                    <span className="text-[10px] font-semibold text-varena-espresso mt-1.5">Selesai</span>
                  </div>
                </div>
              </div>

              {/* Status Banner Card */}
              {selectedOrder.orderStatus === 'PENDING_PAYMENT' && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-xs text-amber-950">Menunggu Pembayaran</div>
                    <div className="text-[11px] text-amber-800 mt-0.5">
                      Silakan selesaikan pembayaran sesuai nominal exact ke rekening resmi di bawah agar pesanan segera dikemas oleh gudang.
                    </div>
                  </div>
                </div>
              )}

              {selectedOrder.orderStatus === 'PAID' && (
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-300 text-blue-900 flex items-start gap-3">
                  <Package className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-xs text-blue-950">Pembayaran Terverifikasi — Sedang Dikemas</div>
                    <div className="text-[11px] text-blue-800 mt-0.5">
                      Dana pembayaran telah diterima di rekening operasional. Tim logistik gudang VARENA sedang menyiapkan dan mengemas paket herbal Anda.
                    </div>
                  </div>
                </div>
              )}

              {selectedOrder.orderStatus === 'SHIPPED' && (
                <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-300 text-indigo-900 flex items-start gap-3">
                  <Truck className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-xs text-indigo-950">Paket Sedang Dalam Pengiriman Kurir</div>
                    <div className="text-[11px] text-indigo-800 mt-0.5">
                      Pesanan Anda telah diserahkan ke pihak ekspedisi ({selectedOrder.courierName}). Segera periksa paket setelah tiba dan lakukan konfirmasi penerimaan.
                    </div>
                  </div>
                </div>
              )}

              {selectedOrder.orderStatus === 'COMPLETED' && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-xs text-emerald-950">Pesanan Selesai</div>
                    <div className="text-[11px] text-emerald-800 mt-0.5">
                      Paket telah diterima dengan baik. Seluruh komisi jaringan dan mutasi buku besar telah dibukukan secara permanen.
                    </div>
                  </div>
                </div>
              )}

              {/* Rincian Produk yang Dibeli */}
              <div className="p-4 rounded-xl bg-white border border-varena-taupe/20 space-y-3">
                <div className="font-bold text-varena-espresso text-xs flex items-center justify-between border-b border-varena-taupe/20 pb-2">
                  <div className="flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-varena-gold" />
                    <span>Daftar Produk ({selectedOrder.items?.length || 0} Item)</span>
                  </div>
                  <span className="text-[10px] font-mono text-varena-taupe uppercase">
                    Tipe: {selectedOrder.orderType === 'FIRST_PACK' ? 'Paket Kemitraan' : 'Repeat Purchase'}
                  </span>
                </div>
                <div className="divide-y divide-varena-taupe/10">
                  {selectedOrder.items?.map((it: any, idx: number) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-varena-ivory flex items-center justify-center text-varena-espresso font-bold text-xs flex-shrink-0">
                          {it.quantity}x
                        </div>
                        <div>
                          <div className="font-semibold text-varena-espresso text-xs">{it.name}</div>
                          <div className="text-[10px] text-varena-taupe">
                            @Rp{it.price.toLocaleString('id-ID')} per box
                          </div>
                        </div>
                      </div>
                      <div className="font-mono font-bold text-varena-espresso text-right whitespace-nowrap">
                        Rp{(it.lineTotal || it.price * it.quantity).toLocaleString('id-ID')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Logistik & Alamat Pengiriman */}
              <div className="p-4 rounded-xl bg-white border border-varena-taupe/20 space-y-3">
                <div className="font-bold text-varena-espresso text-xs flex items-center gap-1.5 border-b border-varena-taupe/20 pb-2">
                  <Truck className="w-4 h-4 text-varena-gold" />
                  <span>Informasi Logistik & Pengiriman</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-[10px] text-varena-taupe uppercase font-bold tracking-wider">Kurir & No. Resi:</div>
                    {selectedOrder.trackingNumber ? (
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-semibold text-varena-espresso">{selectedOrder.courierName}</span>
                        <span className="font-mono bg-stone-100 px-2 py-0.5 rounded font-bold text-varena-espresso">
                          {selectedOrder.trackingNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(selectedOrder.trackingNumber);
                            setCopiedResiModal(true);
                            setTimeout(() => setCopiedResiModal(false), 2000);
                          }}
                          className="text-[10px] bg-stone-100 hover:bg-stone-200 px-1.5 py-0.5 rounded transition text-varena-espresso inline-flex items-center gap-0.5"
                          title="Salin No Resi"
                        >
                          {copiedResiModal ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700">Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-stone-600" />
                              <span>Salin</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="mt-1 text-stone-500 italic text-[11px]">
                        Nomor resi akan diterbitkan otomatis setelah paket diserahkan ke kurir.
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-[10px] text-varena-taupe uppercase font-bold tracking-wider">Penerima & Alamat Kirim:</div>
                    <div className="mt-1 text-varena-espresso font-medium text-[11px] leading-relaxed">
                      <strong>{selectedOrder.buyerName}</strong>
                      <div className="text-stone-600">{selectedOrder.shippingAddress || 'Alamat sesuai data pendaftaran akun'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rincian Pembayaran (Payment Breakdown) */}
              <div className="p-4 rounded-xl bg-varena-ivory-light border border-varena-taupe/20 space-y-2">
                <div className="font-bold text-varena-espresso text-xs flex items-center gap-1.5 border-b border-varena-taupe/20 pb-2">
                  <CreditCard className="w-4 h-4 text-varena-gold" />
                  <span>Rincian Pembayaran</span>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-stone-600">
                    <span>Subtotal Harga Produk:</span>
                    <span className="font-mono font-medium text-varena-espresso">
                      Rp{(selectedOrder.subtotal || selectedOrder.total - (selectedOrder.uniqueCode || 0)).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Biaya Ongkos Kirim:</span>
                    <span className="font-mono text-emerald-700 font-semibold">
                      {selectedOrder.shippingCost && selectedOrder.shippingCost > 0
                        ? `Rp${selectedOrder.shippingCost.toLocaleString('id-ID')}`
                        : 'Gratis Ongkir (Promo Korporasi)'}
                    </span>
                  </div>
                  {selectedOrder.uniqueCode > 0 && (
                    <div className="flex justify-between text-stone-600">
                      <span>Kode Unik Pembayaran:</span>
                      <span className="font-mono text-amber-800 font-semibold">
                        +Rp{selectedOrder.uniqueCode}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-varena-taupe/20 flex justify-between items-center text-xs">
                    <span className="font-bold text-varena-espresso">Total Tagihan:</span>
                    <span className="font-serif font-bold text-base text-varena-espresso">
                      Rp{selectedOrder.total.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-varena-taupe/20 text-[10px] text-stone-500 space-y-1">
                  <div>Metode Pembayaran: <strong>Transfer Bank BRI (Operasional Resmi)</strong></div>
                  <div>Waktu Pemesanan: {new Date(selectedOrder.createdAt).toLocaleString('id-ID')}</div>
                  {selectedOrder.paidAt && (
                    <div>Waktu Lunas: {new Date(selectedOrder.paidAt).toLocaleString('id-ID')}</div>
                  )}
                </div>
              </div>

              {/* Instruksi Transfer Bank (Tampil HANYA jika PENDING_PAYMENT) */}
              {selectedOrder.orderStatus === 'PENDING_PAYMENT' && (
                <div className="space-y-3 pt-1">
                  {/* Bank Destination Card */}
                  <div className="p-3.5 rounded-xl bg-white border border-varena-gold/40 space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] text-varena-taupe uppercase font-bold tracking-wider">
                        Transfer ke Rekening Tujuan:
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(PRIMARY_COMPANY_BANK.accountNumberClean);
                          setCopiedBankModal(true);
                          setTimeout(() => setCopiedBankModal(false), 2000);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-varena-espresso bg-varena-gold/15 hover:bg-varena-gold/30 px-2.5 py-0.5 rounded transition"
                      >
                        {copiedBankModal ? (
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

                  {/* Exact Amount Card */}
                  <div className="p-3.5 rounded-xl bg-varena-espresso text-center text-white">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-varena-gold-light/75 uppercase font-bold tracking-wider">
                        Nominal Transfer (Harus Tepat):
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(String(selectedOrder.total));
                          setCopiedAmountModal(true);
                          setTimeout(() => setCopiedAmountModal(false), 2000);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-varena-espresso bg-varena-gold-light hover:bg-white px-2.5 py-0.5 rounded transition shadow-xs"
                      >
                        {copiedAmountModal ? (
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
                      Rp{selectedOrder.total.toLocaleString('id-ID')}
                    </div>
                    {selectedOrder.uniqueCode > 0 && (
                      <div className="text-[11px] text-varena-gold-light/85 mt-1 font-medium">
                        (termasuk kode unik: +Rp{selectedOrder.uniqueCode} untuk verifikasi otomatis)
                      </div>
                    )}
                  </div>

                  {/* Warning note */}
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                    <strong>Penting:</strong> Masukkan nominal transfer secara persis (termasuk kode unik) agar pembayaran Anda terverifikasi otomatis oleh sistem.
                  </div>

                  <div className="text-center pt-1">
                    <Link
                      href={`/confirm-payment?orderNumber=${selectedOrder.orderNumber}`}
                      className="text-[11px] text-varena-gold hover:underline font-semibold"
                    >
                      Salah transfer nominal? Klik di sini untuk konfirmasi manual →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-stone-50 border-t border-varena-taupe/20 flex flex-row flex-wrap gap-2 justify-between items-center flex-shrink-0">
              <Link
                href={`/checkout?orderNumber=${selectedOrder.orderNumber}`}
                className="text-center py-2 px-3 rounded-lg border border-varena-taupe/30 text-varena-espresso hover:bg-varena-ivory transition font-medium text-xs"
              >
                Halaman Invoice Lengkap →
              </Link>

              <div className="flex gap-2">
                {selectedOrder.orderStatus === 'PENDING_PAYMENT' && (
                  <button
                    type="button"
                    onClick={handleModalSimulatePayment}
                    disabled={modalSettling}
                    className="py-2 px-3.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition disabled:opacity-50"
                    title="Simulasikan pembayaran lunas di mode development"
                  >
                    {modalSettling ? 'Memproses...' : 'Simulasi Lunas'}
                  </button>
                )}

                {selectedOrder.orderStatus === 'SHIPPED' && (
                  <button
                    type="button"
                    onClick={() => handleConfirmReceived(selectedOrder.id)}
                    disabled={actionLoadingId === selectedOrder.id}
                    className="py-2 px-3.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition flex items-center justify-center gap-1 shadow"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{actionLoadingId === selectedOrder.id ? 'Memproses...' : 'Konfirmasi Barang Diterima'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
