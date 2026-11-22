'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Pagination from '@/components/ui/Pagination';
import ConfirmDialog, { DialogVariant } from '@/components/ui/ConfirmDialog';
import Toast from '@/components/ui/Toast';
import {
  formatOrderStatus,
  formatOrderType,
  formatFulfillmentSource,
  getOrderStatusBadge,
  ORDER_STATUS_BADGES,
} from '@/lib/formatters';
import {
  Wallet,
  GitFork,
  Share2,
  Copy,
  Check,
  ArrowUpRight,
  TrendingUp,
  Users,
  User,
  ShoppingBag,
  Package,
  Truck,
  Clock,
  CheckCircle2,
  CheckCircle,
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
  Store,
  Lock,
  ShieldOff,
  ShieldAlert,
  ShieldCheck,
  Ban,
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

  // Enrich selectedOrder with full backend details (discount, payments, breakdown)
  useEffect(() => {
    if (!selectedOrder?.orderNumber) return;
    if (selectedOrder.payments && selectedOrder.payments.length > 0 && selectedOrder.discount !== undefined) {
      return;
    }
    fetch(`/api/v1/orders/detail?orderNumber=${encodeURIComponent(selectedOrder.orderNumber)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.order) {
          setSelectedOrder((prev: any) =>
            prev?.orderNumber === data.order.orderNumber ? { ...prev, ...data.order } : prev
          );
        }
      })
      .catch((err) => console.error('Failed to fetch enriched order detail:', err));
  }, [selectedOrder?.orderNumber]);

  // Derived breakdown for selectedOrder in Marketplace Detail Modal
  const modalBreakdown = selectedOrder
    ? (() => {
        const subtotal = selectedOrder.subtotal || selectedOrder.total - (selectedOrder.uniqueCode || 0);
        const discount = selectedOrder.discount || 0;
        const netSubtotal = subtotal - discount;
        const uniqueCode = selectedOrder.uniqueCode || 0;
        const total = selectedOrder.total || 0;
        const isAgentRestock =
          selectedOrder.orderType === 'AGENT_RESTOCK' ||
          (selectedOrder.orderNumber && selectedOrder.orderNumber.startsWith('AGN-RESTOCK'));

        const payments: any[] = selectedOrder.payments || [];
        const depPay = payments.find((p: any) => p.provider === 'HYBRID_DEPOSIT' || p.provider === 'AGENT_DEPOSIT');
        const manPay = payments.find((p: any) => p.provider === 'HYBRID_MANUAL' || p.provider === 'MANUAL_TRANSFER');

        const depositUsed = depPay ? depPay.amount : 0;
        const manualAmount = manPay
          ? manPay.amount
          : uniqueCode > 0
          ? total - depositUsed
          : total - depositUsed;

        const isHybrid =
          (depPay && manPay) ||
          (depositUsed > 0 && manualAmount > 0) ||
          (depositUsed > 0 && depositUsed < netSubtotal);
        const isDepositFull = depositUsed > 0 && manualAmount === 0;
        const isManualFull = depositUsed === 0;

        return {
          subtotal,
          discount,
          netSubtotal,
          uniqueCode,
          total,
          depositUsed,
          manualAmount,
          isHybrid,
          isDepositFull,
          isManualFull,
          isAgentRestock,
        };
      })()
    : null;

  // Elegant Confirmation Dialog & Toast State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    detail?: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: DialogVariant;
    icon?: 'check' | 'warning' | 'info' | 'shield' | 'question';
    isLoading?: boolean;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [toast, setToast] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'info';
    title?: string;
    message: string;
  }>({
    isOpen: false,
    type: 'success',
    message: '',
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success', title?: string) => {
    setToast({ isOpen: true, message, type, title });
  };

  const showConfirm = ({
    title,
    message,
    detail,
    confirmText = 'Konfirmasi',
    cancelText = 'Batal',
    variant = 'emerald',
    icon = 'check',
    onConfirm,
  }: {
    title: string;
    message: string;
    detail?: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: DialogVariant;
    icon?: 'check' | 'warning' | 'info' | 'shield' | 'question';
    onConfirm: () => void | Promise<void>;
  }) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      detail,
      confirmText,
      cancelText,
      variant,
      icon,
      isLoading: false,
      onConfirm: async () => {
        try {
          setConfirmModal((prev) => ({ ...prev, isLoading: true }));
          await onConfirm();
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        } catch (err: any) {
          setConfirmModal((prev) => ({ ...prev, isLoading: false }));
          showToast(err.message || 'Terjadi kesalahan sistem.', 'error');
        }
      },
    });
  };

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
        showToast(data.error || 'Gagal memproses pembayaran.', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Terjadi kesalahan sistem.', 'error');
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
    // ackOrders dipanggil sekali saat mount — tidak perlu masuk dependency array
    // (ackOrders sekarang stabil via itemsRef, tapi tetap exclude agar tidak ada risiko loop)
    ackOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const loadDashboard = (memberCode: string, userId: string, silent = false) => {
    if (!silent) setLoading(true);
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
  const handleConfirmReceived = (orderId: string, orderNumber?: string) => {
    showConfirm({
      title: 'Konfirmasi Paket Diterima',
      message: `Konfirmasi bahwa paket barang pesanan ${orderNumber || ''} telah Anda terima dengan baik?`,
      detail: (
        <div className="text-xs text-stone-600">
          Setelah konfirmasi, status pesanan akan diperbarui menjadi <strong>Selesai</strong> dan komisi jaringan dibukukan permanen.
        </div>
      ),
      variant: 'emerald',
      icon: 'check',
      confirmText: 'Ya, Paket Diterima',
      cancelText: 'Batal',
      onConfirm: async () => {
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

          showToast('Terima kasih! Pesanan Anda telah ditandai selesai.', 'success');
          setSelectedOrder((prev: any) =>
            prev && prev.id === orderId ? { ...prev, orderStatus: 'COMPLETED', completedAt: new Date().toISOString() } : prev
          );
          loadDashboard(user?.memberCode || 'VRN-0001', user?.userId || user?.id);
        } finally {
          setActionLoadingId(null);
        }
      },
    });
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
              sizes="64px"
              className="object-contain"
              priority
            />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="inline-block px-2.5 py-0.5 rounded text-[10px] uppercase font-mono font-semibold bg-varena-gold/20 text-varena-gold-light border border-varena-gold/30">
                Portal Kemitraan Resmi
              </span>
              {(memberProfile?.memberStatus === 'ACTIVE' || (!memberProfile?.memberStatus && user?.memberStatus === 'ACTIVE')) ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Akun Aktif</span>
                </span>
              ) : (memberProfile?.memberStatus === 'PENDING' || (!memberProfile?.memberStatus && user?.memberStatus === 'PENDING')) ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Clock className="w-2.5 h-2.5" />
                  <span>Menunggu Aktivasi</span>
                </span>
              ) : null}
            </div>
            <h1 className="font-serif text-xl sm:text-3xl font-bold text-varena-ivory-light">
              Halo, {user.displayName}
            </h1>
            <p className="text-xs text-varena-taupe-light mt-0.5 font-mono flex items-center gap-2 flex-wrap">
              <span>ID Mitra: <strong className="text-varena-gold-light">{user.memberCode || 'VRN-0001'}</strong></span>
              <span>·</span>
              <Link
                href="/member/profile"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-varena-gold-light hover:text-white bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-lg border border-white/20 transition"
              >
                <User className="w-3 h-3 text-varena-gold" />
                <span>Pengaturan Akun & Rekening →</span>
              </Link>
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

      {/* ── Member Account Status Banner ─────────────────────────── */}
      {(() => {
        const status = memberProfile?.memberStatus || user?.memberStatus;
        if (!status || status === 'ACTIVE') return null;

        if (status === 'PENDING') {
          return (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
                <Clock className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-900">Akun Anda Belum Aktif</p>
                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                  Kemitraan resmi Anda aktif otomatis setelah pembelian <strong>Paket Perdana</strong> lunas.
                  Jika sudah ada kebijakan khusus dari admin, Anda akan menerima notifikasi aktivasi manual.
                </p>
              </div>
              <Link
                href={`/checkout?ref=${user?.memberCode || ''}&type=FIRST_PACK`}
                className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs transition shadow-sm whitespace-nowrap"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Belanja Sekarang</span>
              </Link>
            </div>
          );
        }

        if (status === 'SUSPENDED_WITHDRAWAL') {
          return (
            <div className="bg-orange-50 border border-orange-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 border border-orange-200">
                <Lock className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-orange-900">Fasilitas Penarikan Dana Dinonaktifkan</p>
                <p className="text-xs text-orange-800 mt-0.5 leading-relaxed">
                  Akun Anda masih dapat berbelanja dan menerima komisi, namun <strong>penarikan saldo & deposit</strong> sementara dinonaktifkan oleh sistem.
                  Hubungi admin VARENA untuk informasi lebih lanjut.
                </p>
              </div>
              <Link
                href="/member/profile"
                className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs transition shadow-sm whitespace-nowrap"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Lihat Profil</span>
              </Link>
            </div>
          );
        }

        if (status === 'SUSPENDED_LOGIN' || status === 'SUSPENDED') {
          return (
            <div className="bg-rose-50 border border-rose-300 rounded-2xl p-4 sm:p-5 flex items-start gap-4 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200">
                <ShieldOff className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-rose-900">Akun Ditangguhkan</p>
                <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">
                  Akun kemitraan Anda sedang dalam status penangguhan. Hubungi admin VARENA segera untuk klarifikasi dan pemulihan akun.
                </p>
              </div>
            </div>
          );
        }

        if (status === 'TERMINATED') {
          return (
            <div className="bg-slate-50 border border-slate-300 rounded-2xl p-4 sm:p-5 flex items-start gap-4 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 border border-slate-300">
                <Ban className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">Kemitraan Dinonaktifkan</p>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  Status kemitraan Anda telah dinonaktifkan secara permanen. Hubungi admin VARENA jika Anda merasa ini adalah kesalahan.
                </p>
              </div>
            </div>
          );
        }

        return null;
      })()}

      {/* Official Regional Agent Banner */}
      {(memberProfile?.isAgent || user?.isAgent) ? (
        <div className="bg-gradient-to-r from-[#2A1E17] to-varena-espresso p-4 sm:p-5 rounded-2xl border border-amber-500/40 text-varena-ivory-light flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/40">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-sm sm:text-base font-bold text-amber-300">
                  Agen Resmi Wilayah: {memberProfile?.agentCity || user?.agentCity || 'Regional'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  STOK: {memberProfile?.agentInventory || 0} BOX
                </span>
              </div>
              <p className="text-xs text-varena-ivory/70 mt-0.5">
                Restock grosir 100% bebas ongkir kantor, kelola distribusi pesanan regional, saldo deposit, dan reward agen.
              </p>
            </div>
          </div>
          <Link
            href="/agent"
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-varena-espresso font-bold text-xs transition shadow shrink-0 flex items-center gap-1.5"
          >
            <span>Buka Portal Agen</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      ) : memberProfile?.agentStatus === 'APPLIED' ? (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-center justify-between gap-4 text-xs text-blue-900">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Pengajuan Keagenan Resmi Anda untuk wilayah <strong>{memberProfile?.agentCity || 'terpilih'}</strong> sedang ditinjau kantor pusat.</span>
          </div>
          <Link href="/member/agent-register" className="text-blue-700 underline font-semibold hover:text-blue-800 shrink-0">
            Lihat Status
          </Link>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 sm:p-5 rounded-2xl border border-amber-200/80 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-amber-900 block text-xs sm:text-sm">
                Peluang Distribusi: Buka Keagenan Resmi VARENA di Kota Anda
              </span>
              <span className="text-amber-800/80 text-[11px]">
                Fasilitas: Restock grosir 100% Bebas Biaya Ongkir, diskon agen, pengalihan pengiriman pesanan lokal, dan reward prestasi.
              </span>
            </div>
          </div>
          <Link
            href="/member/agent-register"
            className="px-4 py-2 rounded-xl bg-varena-espresso text-varena-gold font-bold text-xs hover:bg-varena-espresso-dark transition shadow shrink-0 flex items-center gap-1"
          >
            <span>Daftar Agen</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

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

      {/* Panduan Memulai Kemitraan untuk Mitra Baru (Tampil jika belum pernah belanja) */}
      {personalOrders.length === 0 && (
        <div className="bg-white p-6 rounded-2xl border-2 border-varena-gold/40 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-varena-taupe/15 pb-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-varena-gold/20 text-varena-espresso text-[11px] font-bold mb-1 uppercase tracking-wide">
                <span>Panduan Mitra Baru</span>
              </div>
              <h2 className="font-serif text-base font-bold text-varena-espresso">
                3 Langkah Cepat Memulai Bisnis VARENA Anda
              </h2>
            </div>
            <div className="text-xs text-stone-500 font-medium">
              Selesaikan langkah berikut untuk aktivasi penuh
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* Step 1 */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 ${
              memberProfile?.recipientName && memberProfile?.bankName
                ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950'
                : 'bg-stone-50 border-stone-200 text-stone-800'
            }`}>
              <div>
                <div className="flex items-center justify-between font-bold text-xs mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-varena-gold text-varena-espresso font-mono text-[11px] flex items-center justify-center font-bold">1</span>
                    <span>Alamat & Rekening</span>
                  </span>
                  {memberProfile?.recipientName && memberProfile?.bankName ? (
                    <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-semibold">✓ Lengkap</span>
                  ) : (
                    <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-semibold">Perlu Diisi</span>
                  )}
                </div>
                <p className="text-[11px] text-stone-600 mt-1 leading-relaxed">
                  Isi alamat pengiriman default dan rekening bank Anda untuk pencairan bonus komisi.
                </p>
              </div>
              <Link
                href="/member/profile"
                className="mt-2 py-1.5 px-3 rounded-lg bg-white border border-stone-300 hover:border-varena-gold text-stone-800 font-semibold text-[11px] text-center transition"
              >
                {memberProfile?.recipientName && memberProfile?.bankName ? 'Edit Profil' : 'Lengkapi Sekarang →'}
              </Link>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/70 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between font-bold text-xs mb-1">
                  <span className="flex items-center gap-1.5 text-amber-950">
                    <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-mono text-[11px] flex items-center justify-center font-bold">2</span>
                    <span>Belanja Paket Perdana</span>
                  </span>
                  <span className="text-[10px] text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full font-semibold">Belum Belanja</span>
                </div>
                <p className="text-[11px] text-amber-900 mt-1 leading-relaxed">
                  Beli produk pertama Anda (First Pack) untuk mengaktifkan status kemitraan aktif dan hak bonus jaringan.
                </p>
              </div>
              <Link
                href="/checkout"
                className="mt-2 py-1.5 px-3 rounded-lg bg-varena-espresso text-varena-gold-light hover:bg-stone-900 font-semibold text-[11px] text-center transition shadow-xs"
              >
                Beli Paket Perdana →
              </Link>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between font-bold text-xs mb-1">
                  <span className="flex items-center gap-1.5 text-stone-800">
                    <span className="w-5 h-5 rounded-full bg-stone-700 text-white font-mono text-[11px] flex items-center justify-center font-bold">3</span>
                    <span>Bagikan Link Referral</span>
                  </span>
                  <span className="text-[10px] text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full font-semibold">Siap Pakai</span>
                </div>
                <p className="text-[11px] text-stone-600 mt-1 leading-relaxed">
                  Ajak mitra baru atau tawarkan produk ke konsumen ritel dengan link referral pribadi Anda.
                </p>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(referralLink)}
                className="mt-2 py-1.5 px-3 rounded-lg bg-varena-gold text-varena-espresso font-semibold text-[11px] hover:bg-varena-gold-hover text-center transition flex items-center justify-center gap-1"
              >
                <Copy className="w-3 h-3" />
                <span>Salin Link Referral</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section: Pesanan & Pengiriman Saya (Sinkronisasi Logistik) */}
      <div id="pesanan" className="bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-4 scroll-mt-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg font-bold text-varena-espresso flex items-center gap-2">
              <Package className="w-5 h-5 text-varena-gold shrink-0" />
              <span>Pesanan & Pengiriman Saya</span>
            </h2>
            <p className="text-xs text-varena-taupe mt-0.5">
              Lacak status pemrosesan pesanan, nomor resi kurir pengiriman, dan konfirmasi penerimaan barang.
            </p>
          </div>
          <Link
            href="/checkout"
            className="px-3.5 py-2 rounded-lg bg-varena-espresso text-varena-gold-light font-semibold text-xs hover:bg-varena-espresso-dark transition flex items-center justify-center gap-1.5 shadow shrink-0 w-full sm:w-auto"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{personalOrders.length > 0 ? 'Belanja Lagi' : 'Mulai Belanja'}</span>
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
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold inline-block border ${(() => {
                          const badge = getOrderStatusBadge(po.orderStatus, po.paymentConfirmationStatus);
                          return `${badge.bg} ${badge.text} ${badge.border}`;
                        })()}`}
                      >
                        {formatOrderStatus(po.orderStatus, po.paymentConfirmationStatus)}
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
                      {po.orderStatus === 'PENDING_PAYMENT' && po.paymentConfirmationStatus === 'SUBMITTED' && (
                        <div className="flex flex-col items-end gap-1">
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-100 border border-blue-300 text-blue-800 font-semibold text-[11px] whitespace-nowrap">
                            <CheckCircle className="w-3 h-3 text-blue-600" />
                            <span>Menunggu Verifikasi</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(po)}
                            className="text-[10px] text-stone-500 hover:text-varena-espresso underline"
                          >
                            Detail Pesanan
                          </button>
                        </div>
                      )}

                      {po.orderStatus === 'PENDING_PAYMENT' && po.paymentConfirmationStatus !== 'SUBMITTED' && (
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
          <div className="text-center py-8 text-xs text-varena-taupe bg-varena-ivory-light rounded-xl border border-dashed border-varena-taupe/30 space-y-2">
            <div>Anda belum memiliki riwayat pesanan pribadi.</div>
            <Link
              href="/checkout"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-varena-gold text-varena-espresso font-semibold hover:bg-varena-gold-hover transition shadow-xs text-xs"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Beli Paket Perdana Kemitraan Sekarang</span>
            </Link>
          </div>
        )}
      </div>

      {/* Section: Penjualan dari Referral Saya */}
      <div id="referral-sales" className="bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg font-bold text-varena-espresso flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-varena-gold shrink-0" />
              <span>Penjualan dari Link Referral Saya</span>
            </h2>
            <p className="text-xs text-varena-taupe mt-0.5">
              Pesanan konsumen atau mitra baru yang berbelanja melalui tautan referral Anda beserta komisi yang diperoleh.
            </p>
          </div>
          <span className="self-start sm:self-auto text-xs font-mono font-semibold px-2 py-0.5 rounded bg-varena-gold/20 text-varena-espresso shrink-0">
            {referralOrders.length} Transaksi Referral
          </span>
        </div>

        {referralOrders.length > 0 ? (
          <>
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
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-varena-ivory text-varena-espresso border border-varena-taupe/20">
                          {formatOrderType(ro.orderType)}
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
                          {formatOrderStatus(ro.orderStatus)}
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
          </>
        ) : (
          <div className="text-center py-8 bg-varena-ivory-light/50 rounded-xl border border-dashed border-varena-taupe/30 space-y-2">
            <Share2 className="w-8 h-8 text-varena-taupe/40 mx-auto" />
            <p className="text-xs font-semibold text-varena-espresso">Belum ada penjualan dari link referral Anda</p>
            <p className="text-[11px] text-varena-taupe max-w-md mx-auto">
              Bagikan tautan referral Anda kepada rekan atau calon pelanggan. Setiap pesanan yang masuk melalui tautan Anda akan otomatis tercatat di sini dan menghasilkan komisi.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  copyToClipboard(referralLink);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-varena-gold text-varena-espresso font-semibold text-xs hover:bg-varena-gold-hover transition shadow-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-800" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tautan Berhasil Disalin!' : 'Salin Tautan Referral Saya'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

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
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif font-bold text-base text-white">Detail Pesanan & Pengiriman</h3>
                    {modalBreakdown?.isAgentRestock && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/30">
                        Pasokan Grosir Agen
                      </span>
                    )}
                  </div>
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
              {/* Marketplace-Style Vertical Shipping Timeline */}
              <div className="p-4 rounded-xl bg-varena-ivory-light border border-varena-taupe/20">
                <div className="text-[10px] text-varena-taupe uppercase font-bold tracking-wider mb-4">
                  Riwayat Status Pengiriman:
                </div>
                <div className="relative space-y-0">
                  {/* Vertical line */}
                  <div className="absolute left-3.5 top-3.5 bottom-3.5 w-0.5 bg-stone-200" />

                  {/* Event: Pesanan Selesai */}
                  {selectedOrder.orderStatus === 'COMPLETED' && (
                    <div className="relative flex gap-3 pb-4">
                      <div className="relative z-10 w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                      <div className="pt-0.5 pb-1 flex-1">
                        <div className="font-bold text-xs text-emerald-800">Paket Diterima — Transaksi Selesai</div>
                        <div className="text-[11px] text-stone-600 mt-0.5">
                          Paket telah sampai. Komisi jaringan telah dibukukan secara permanen.
                        </div>
                        {selectedOrder.completedAt && (
                          <div className="text-[10px] text-varena-taupe mt-1 font-mono">
                            {new Date(selectedOrder.completedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Event: Paket Dalam Pengiriman */}
                  {(selectedOrder.orderStatus === 'SHIPPED' || selectedOrder.orderStatus === 'COMPLETED') && (
                    <div className="relative flex gap-3 pb-4">
                      <div className="relative z-10 w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Truck className="w-4 h-4 text-white" />
                      </div>
                      <div className="pt-0.5 pb-1 flex-1">
                        <div className="font-bold text-xs text-indigo-800">Paket Dalam Pengiriman Kurir</div>
                        <div className="text-[11px] text-stone-600 mt-0.5">
                          Paket dikirim dari <span className="font-semibold">{selectedOrder.warehouseOriginCity || 'Jakarta'}</span> ke <span className="font-semibold">{selectedOrder.shippingCity || 'kota tujuan'}</span> via {selectedOrder.courierName}.
                          Gunakan No. Resi di bawah untuk melacak via aplikasi kurir.
                        </div>
                        {selectedOrder.shippedAt && (
                          <div className="text-[10px] text-varena-taupe mt-1 font-mono">
                            {new Date(selectedOrder.shippedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Event: Paket Keluar Gudang & Diserahkan ke Kurir */}
                  {(selectedOrder.orderStatus === 'SHIPPED' || selectedOrder.orderStatus === 'COMPLETED') && (
                    <div className="relative flex gap-3 pb-4">
                      <div className="relative z-10 w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Package className="w-4 h-4 text-white" />
                      </div>
                      <div className="pt-0.5 pb-1 flex-1">
                        <div className="font-bold text-xs text-blue-800">Paket Keluar Gudang & Diserahkan ke Kurir</div>
                        <div className="text-[11px] text-stone-600 mt-0.5">
                          Paket telah dikemas di <span className="font-semibold">{selectedOrder.warehouseOriginName || 'Gudang Pusat VARENA'}</span> dan diserahkan ke ekspedisi.
                        </div>
                        {selectedOrder.trackingNumber && (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-semibold text-stone-500">No. Resi:</span>
                            <span className="font-mono bg-white border border-stone-200 px-2 py-0.5 rounded text-xs font-bold text-varena-espresso">
                              {selectedOrder.trackingNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard?.writeText(selectedOrder.trackingNumber);
                                setCopiedResiModal(true);
                                setTimeout(() => setCopiedResiModal(false), 2000);
                              }}
                              className="text-[10px] bg-stone-100 hover:bg-stone-200 px-2 py-0.5 rounded transition text-varena-espresso inline-flex items-center gap-0.5 border border-stone-200"
                            >
                              {copiedResiModal ? (
                                <><Check className="w-3 h-3 text-emerald-600" /><span className="text-emerald-700">Tersalin</span></>
                              ) : (
                                <><Copy className="w-3 h-3" /><span>Salin</span></>
                              )}
                            </button>
                            <a
                              href={`https://cekresi.com/?noresi=${selectedOrder.trackingNumber}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-indigo-600 hover:text-indigo-800 underline inline-flex items-center gap-0.5"
                            >
                              Lacak via cekresi.com ↗
                            </a>
                          </div>
                        )}
                        {selectedOrder.shippedAt && (
                          <div className="text-[10px] text-varena-taupe mt-1 font-mono">
                            {new Date(selectedOrder.shippedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Event: Paket Sedang Dikemas */}
                  {(selectedOrder.orderStatus === 'PAID' || selectedOrder.orderStatus === 'PROCESSING' || selectedOrder.orderStatus === 'SHIPPED' || selectedOrder.orderStatus === 'COMPLETED') && (
                    <div className="relative flex gap-3 pb-4">
                      <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                        selectedOrder.orderStatus === 'PAID' || selectedOrder.orderStatus === 'PROCESSING'
                          ? 'bg-blue-500 ring-2 ring-blue-300 ring-offset-1 animate-pulse'
                          : 'bg-blue-400'
                      }`}>
                        <Package className="w-4 h-4 text-white" />
                      </div>
                      <div className="pt-0.5 pb-1 flex-1">
                        <div className="font-bold text-xs text-blue-800">
                          Paket Sedang Dikemas
                          {(selectedOrder.orderStatus === 'PAID' || selectedOrder.orderStatus === 'PROCESSING') && (
                            <span className="ml-1.5 text-[10px] font-normal bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Proses saat ini</span>
                          )}
                        </div>
                        <div className="text-[11px] text-stone-600 mt-0.5">
                          Tim logistik gudang sedang menyiapkan paket di <span className="font-semibold">{selectedOrder.warehouseOriginName || 'Gudang Pusat VARENA'}</span>.
                        </div>
                        {selectedOrder.paidAt && (
                          <div className="text-[10px] text-varena-taupe mt-1 font-mono">
                            {new Date(selectedOrder.paidAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Event: Pembayaran Dikonfirmasi */}
                  {(selectedOrder.orderStatus === 'PAID' || selectedOrder.orderStatus === 'PROCESSING' || selectedOrder.orderStatus === 'SHIPPED' || selectedOrder.orderStatus === 'COMPLETED') && (
                    <div className="relative flex gap-3 pb-4">
                      <div className="relative z-10 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                      <div className="pt-0.5 pb-1 flex-1">
                        <div className="font-bold text-xs text-emerald-800">Pembayaran Dikonfirmasi</div>
                        <div className="text-[11px] text-stone-600 mt-0.5">
                          Dana diterima dan diverifikasi sistem VARENA. Pesanan diteruskan ke tim gudang.
                        </div>
                        {selectedOrder.paidAt && (
                          <div className="text-[10px] text-varena-taupe mt-1 font-mono">
                            {new Date(selectedOrder.paidAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Event: Pesanan Dibuat (always shown) */}
                  <div className="relative flex gap-3">
                    <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                      selectedOrder.orderStatus === 'PENDING_PAYMENT'
                        ? selectedOrder.paymentConfirmationStatus === 'SUBMITTED'
                          ? 'bg-blue-500 ring-2 ring-blue-300 ring-offset-1 animate-pulse'
                          : 'bg-amber-500 ring-2 ring-amber-300 ring-offset-1 animate-pulse'
                        : 'bg-stone-400'
                    }`}>
                      <ShoppingBag className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="pt-0.5 flex-1">
                      <div className="font-bold text-xs text-stone-700">
                        Pesanan Dibuat
                        {selectedOrder.orderStatus === 'PENDING_PAYMENT' && selectedOrder.paymentConfirmationStatus === 'SUBMITTED' && (
                          <span className="ml-1.5 text-[10px] font-normal bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Menunggu Verifikasi Admin</span>
                        )}
                        {selectedOrder.orderStatus === 'PENDING_PAYMENT' && selectedOrder.paymentConfirmationStatus !== 'SUBMITTED' && (
                          <span className="ml-1.5 text-[10px] font-normal bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Menunggu Pembayaran</span>
                        )}
                      </div>
                      {selectedOrder.orderStatus === 'PENDING_PAYMENT' && selectedOrder.paymentConfirmationStatus === 'SUBMITTED' && (
                        <div className="text-[11px] text-blue-700 mt-1 font-medium bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1.5 flex items-start gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-blue-600" />
                          <span>
                            Konfirmasi transfer dari <strong>{selectedOrder.senderBankName}</strong> a.n. <strong>{selectedOrder.senderAccountName}</strong> telah dikirim. Menunggu verifikasi Tim Finance VARENA.
                          </span>
                        </div>
                      )}
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        No. Pesanan: <span className="font-mono font-semibold">{selectedOrder.orderNumber}</span>
                      </div>
                      <div className="text-[10px] text-varena-taupe mt-1 font-mono">
                        {new Date(selectedOrder.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rincian Produk yang Dibeli */}
              <div className="p-4 rounded-xl bg-white border border-varena-taupe/20 space-y-3">
                <div className="font-bold text-varena-espresso text-xs flex items-center justify-between border-b border-varena-taupe/20 pb-2">
                  <div className="flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-varena-gold" />
                    <span>Daftar Produk ({selectedOrder.items?.length || 0} Item)</span>
                  </div>
                  <span className="text-[10px] text-varena-taupe font-medium">
                    Tipe: {formatOrderType(selectedOrder.orderType)}
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
                <div className="space-y-3 text-xs">
                  {/* Dikirim dari */}
                  <div>
                    <div className="text-[10px] text-varena-taupe uppercase font-bold tracking-wider">Dikirim dari Gudang:</div>
                    <div className="mt-1 font-semibold text-varena-espresso">
                      {selectedOrder.warehouseOriginName || 'Gudang Pusat VARENA'}
                      {selectedOrder.warehouseOriginCity && (
                        <span className="text-stone-500 font-normal"> — {selectedOrder.warehouseOriginCity}</span>
                      )}
                    </div>
                  </div>

                  {/* Kurir & Resi */}
                  <div>
                    <div className="text-[10px] text-varena-taupe uppercase font-bold tracking-wider">Kurir & No. Resi:</div>
                    {selectedOrder.trackingNumber ? (
                      <div className="mt-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
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
                            className="text-[10px] bg-stone-100 hover:bg-stone-200 px-1.5 py-0.5 rounded transition text-varena-espresso inline-flex items-center gap-0.5 border border-stone-200"
                            title="Salin No Resi"
                          >
                            {copiedResiModal ? (
                              <><Check className="w-3 h-3 text-emerald-600" /><span className="text-emerald-700">Tersalin</span></>
                            ) : (
                              <><Copy className="w-3 h-3 text-stone-600" /><span>Salin</span></>
                            )}
                          </button>
                        </div>
                        <a
                          href={`https://cekresi.com/?noresi=${selectedOrder.trackingNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-indigo-600 hover:text-indigo-800 underline inline-flex items-center gap-0.5"
                        >
                          Lacak paket via cekresi.com ↗
                        </a>
                      </div>
                    ) : (
                      <div className="mt-1 text-stone-500 italic text-[11px]">
                        Nomor resi akan diterbitkan otomatis setelah paket diserahkan ke kurir.
                      </div>
                    )}
                  </div>

                  {/* Penerima & Alamat */}
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
                <div className="font-bold text-varena-espresso text-xs flex items-center justify-between border-b border-varena-taupe/20 pb-2">
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-varena-gold" />
                    <span>Rincian Pembayaran</span>
                  </div>
                  {modalBreakdown?.isAgentRestock && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
                      Pasokan Agen Grosir
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-stone-600">
                    <span>{modalBreakdown?.isAgentRestock ? 'Subtotal Pasokan:' : 'Subtotal Harga Produk:'}</span>
                    <span className="font-mono font-medium text-varena-espresso">
                      Rp{(modalBreakdown?.subtotal || selectedOrder.subtotal || 0).toLocaleString('id-ID')}
                    </span>
                  </div>

                  {modalBreakdown && modalBreakdown.discount > 0 && (
                    <div className="flex justify-between text-purple-700 font-medium">
                      <span>{modalBreakdown.isAgentRestock ? 'Potongan Diskon Agen:' : 'Potongan Diskon:'}</span>
                      <span className="font-mono">
                        -Rp{modalBreakdown.discount.toLocaleString('id-ID')}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-stone-600">
                    <span>
                      {modalBreakdown?.isAgentRestock ? 'Ongkos Kirim Pusat ke Agen:' : 'Biaya Ongkos Kirim:'}
                    </span>
                    {modalBreakdown?.isAgentRestock ? (
                      <div className="flex items-center gap-1.5">
                        <span className="line-through text-stone-400 font-mono text-[10px]">Rp50.000</span>
                        <span className="font-bold text-emerald-700 uppercase">GRATIS</span>
                      </div>
                    ) : (
                      <span className="font-mono text-emerald-700 font-semibold">
                        {selectedOrder.shippingCost && selectedOrder.shippingCost > 0
                          ? `Rp${selectedOrder.shippingCost.toLocaleString('id-ID')}`
                          : 'Gratis Ongkir (Promo Korporasi)'}
                      </span>
                    )}
                  </div>

                  {/* Skema Hybrid */}
                  {modalBreakdown?.isHybrid && (
                    <div className="mt-2 pt-2 border-t border-stone-200 space-y-1.5 bg-purple-50/70 p-2.5 rounded-lg border border-purple-100 text-[11px]">
                      <div className="text-[10px] uppercase font-bold text-purple-950 tracking-wider">
                        Rincian Pembayaran Metode Hybrid:
                      </div>
                      <div className="flex justify-between text-emerald-800 font-medium">
                        <span>• Bayar dari Saldo Kas Deposit:</span>
                        <span className="font-mono font-bold">-Rp{modalBreakdown.depositUsed.toLocaleString('id-ID')} (Lunas / Terpotong)</span>
                      </div>
                      <div className="flex justify-between text-purple-900">
                        <span>• Sisa Tagihan Pokok:</span>
                        <span className="font-mono font-semibold">
                          Rp{(modalBreakdown.netSubtotal - modalBreakdown.depositUsed).toLocaleString('id-ID')}
                        </span>
                      </div>
                      {modalBreakdown.uniqueCode > 0 && (
                        <div className="flex justify-between text-amber-800">
                          <span>• Kode Unik Transfer Manual (3 Digit):</span>
                          <span className="font-mono font-bold">+Rp{modalBreakdown.uniqueCode}</span>
                        </div>
                      )}
                      <div className="pt-1 border-t border-purple-200 flex justify-between font-bold text-purple-950">
                        <span>Total Transfer Bank Manual (Exact):</span>
                        <span className="font-mono">Rp{modalBreakdown.manualAmount.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  )}

                  {/* Jika bukan Hybrid tapi ada kode unik */}
                  {!modalBreakdown?.isHybrid && modalBreakdown && modalBreakdown.uniqueCode > 0 && (
                    <div className="flex justify-between text-amber-800">
                      <span>Kode Unik Transfer:</span>
                      <span className="font-mono font-bold">
                        +Rp{modalBreakdown.uniqueCode}
                      </span>
                    </div>
                  )}

                  {/* Jika 100% deposit */}
                  {modalBreakdown?.isDepositFull && (
                    <div className="mt-1.5 pt-1.5 border-t border-stone-200 flex justify-between text-emerald-800 font-semibold bg-emerald-50/60 p-2 rounded">
                      <span>• Potong Saldo Kas Deposit:</span>
                      <span className="font-mono font-bold">-Rp{modalBreakdown.depositUsed.toLocaleString('id-ID')} (Lunas 100%)</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-varena-taupe/20 flex justify-between items-center text-xs">
                    <span className="font-bold text-varena-espresso">Total Akhir Tagihan:</span>
                    <span className="font-serif font-bold text-base text-varena-espresso font-mono">
                      Rp{(modalBreakdown?.total || selectedOrder.total).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-varena-taupe/20 text-[10px] text-stone-500 space-y-1">
                  <div>
                    Metode Pembayaran:{' '}
                    <strong>
                      {modalBreakdown?.isHybrid
                        ? 'Hybrid (Saldo Kas Deposit + Transfer Bank BRI)'
                        : modalBreakdown?.isDepositFull
                        ? 'Saldo Kas Deposit Agen (100% Lunas)'
                        : 'Transfer Bank BRI (Operasional Resmi)'}
                    </strong>
                  </div>
                  <div>Waktu Pemesanan: {new Date(selectedOrder.createdAt).toLocaleString('id-ID')}</div>
                  {selectedOrder.paidAt && (
                    <div>Waktu Lunas: {new Date(selectedOrder.paidAt).toLocaleString('id-ID')}</div>
                  )}
                </div>
              </div>

              {/* Instruksi Transfer Bank (Tampil HANYA jika PENDING_PAYMENT dan butuh transfer manual) */}
              {selectedOrder.orderStatus === 'PENDING_PAYMENT' && !modalBreakdown?.isDepositFull && (
                <div className="space-y-3 pt-1">
                  {modalBreakdown?.isHybrid && (
                    <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 text-[11px] font-medium">
                      Saldo deposit sebesar <strong>Rp{modalBreakdown.depositUsed.toLocaleString('id-ID')}</strong> telah dipotong otomatis. Silakan transfer sisa tagihan manual di bawah ini:
                    </div>
                  )}

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
                          navigator.clipboard?.writeText(String(modalBreakdown?.manualAmount || selectedOrder.total));
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
                    <div className="font-serif text-2xl font-bold text-varena-gold-light tracking-tight font-mono">
                      Rp{(modalBreakdown?.manualAmount || selectedOrder.total).toLocaleString('id-ID')}
                    </div>
                    {modalBreakdown && modalBreakdown.uniqueCode > 0 && (
                      <div className="text-[11px] text-varena-gold-light/85 mt-1 font-medium">
                        (termasuk kode unik: +Rp{modalBreakdown.uniqueCode} untuk verifikasi otomatis)
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
              {modalBreakdown?.isAgentRestock ? (
                <Link
                  href={`/agent/checkout?orderNumber=${selectedOrder.orderNumber}`}
                  className="text-center py-2 px-3 rounded-lg bg-purple-700 hover:bg-purple-800 text-white transition font-bold text-xs shadow-xs"
                >
                  Buka Portal Pelacakan Pasokan Agen →
                </Link>
              ) : (
                <Link
                  href={`/checkout?orderNumber=${selectedOrder.orderNumber}`}
                  className="text-center py-2 px-3 rounded-lg border border-varena-taupe/30 text-varena-espresso hover:bg-varena-ivory transition font-medium text-xs"
                >
                  Halaman Invoice Lengkap →
                </Link>
              )}

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
      {/* Reusable Luxury Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        detail={confirmModal.detail}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        variant={confirmModal.variant}
        icon={confirmModal.icon}
        isLoading={confirmModal.isLoading}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Reusable Toast Notification */}
      <Toast
        isOpen={toast.isOpen}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
