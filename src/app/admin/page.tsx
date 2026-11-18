'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Users,
  ShieldAlert,
  GitFork,
  RefreshCw,
  AlertCircle,
  Package,
  Truck,
  CreditCard,
  Clock,
  Search,
  Send,
  UserCheck,
  UserX,
  FileText,
  PhoneCall,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Check,
} from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ORDERS' | 'PAYOUTS' | 'NETWORK' | 'LOGS'>('OVERVIEW');

  // Authentication & RBAC Guard
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data States
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersSummary, setOrdersSummary] = useState<any>(null);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);

  // Filters
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [logDays, setLogDays] = useState(60);
  const [logEntityFilter, setLogEntityFilter] = useState('ALL');

  // Maker-checker approval state
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [transferRef, setTransferRef] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);

  // Shipping Modal State
  const [shippingModalOrder, setShippingModalOrder] = useState<any | null>(null);
  const [courierName, setCourierName] = useState('JNE Express');
  const [trackingNumber, setTrackingNumber] = useState('');

  // Placement transfer form
  const [transferMemberCode, setTransferMemberCode] = useState('');
  const [transferNewParentCode, setTransferNewParentCode] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferStatus, setTransferStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('varena_user');
    if (!stored) {
      router.push('/login?redirect=/admin');
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      const corporateRoles = ['OWNER', 'OPERATIONS', 'ADMIN_1', 'ADMIN_2', 'KOPERASI', 'AUDITOR'];
      const hasAccess = parsed.roles && parsed.roles.some((r: string) => corporateRoles.includes(r));

      if (!hasAccess) {
        setAccessDenied(true);
        setCurrentUser(parsed);
        setAuthChecking(false);
        return;
      }

      const activeUserId = parsed.userId || parsed.id;
      parsed.userId = activeUserId;
      parsed.id = activeUserId;

      setCurrentUser(parsed);
      setAuthChecking(false);
      loadDashboardData(activeUserId);
    } catch {
      router.push('/login?redirect=/admin');
    }
  }, [router]);

  const loadDashboardData = (userId?: string) => {
    const uid = userId || currentUser?.userId || currentUser?.id;
    if (!uid) return;
    setLoading(true);

    Promise.all([
      fetch('/api/v1/admin/stats', { headers: { 'x-user-id': uid } }).then((r) => r.json()),
      fetch('/api/v1/payout/admin', { headers: { 'x-user-id': uid } }).then((r) => r.json()),
      fetch('/api/v1/admin/orders', { headers: { 'x-user-id': uid } }).then((r) => r.json()),
      fetch(`/api/v1/admin/audit-logs?days=${logDays}`, { headers: { 'x-user-id': uid } }).then((r) => r.json()),
    ])
      .then(([sData, wData, oData, lData]) => {
        if (sData.stats) setStats(sData.stats);
        if (wData.withdrawals) setWithdrawals(wData.withdrawals);
        if (oData.orders) {
          setOrders(oData.orders);
          setOrdersSummary(oData.summary);
        }
        if (lData.logs) {
          setAuditLogs(lData.logs);
          setAuditTotal(lData.totalCount);
        }
      })
      .catch((e) => console.error('Admin data fetch error:', e))
      .finally(() => setLoading(false));
  };

  // Filter Orders
  const loadFilteredOrders = (status = orderStatusFilter, query = orderSearchQuery) => {
    const uid = currentUser?.userId || currentUser?.id;
    if (!uid) return;

    fetch(`/api/v1/admin/orders?status=${status}&q=${encodeURIComponent(query)}`, {
      headers: { 'x-user-id': uid },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.orders) {
          setOrders(data.orders);
          setOrdersSummary(data.summary);
        }
      });
  };

  // Filter Audit Logs
  const loadFilteredLogs = (days = logDays, entity = logEntityFilter) => {
    const uid = currentUser?.userId || currentUser?.id;
    if (!uid) return;

    fetch(`/api/v1/admin/audit-logs?days=${days}&entityType=${entity}`, {
      headers: { 'x-user-id': uid },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.logs) {
          setAuditLogs(data.logs);
          setAuditTotal(data.totalCount);
        }
      });
  };

  // Approve Payout Action
  const handleApproveWithdrawal = async (withdrawalId: string) => {
    if (!transferRef) {
      alert('Masukkan nomor referensi transfer bank terlebih dahulu.');
      return;
    }
    setActionLoading(true);
    const uid = currentUser?.userId || currentUser?.id;
    try {
      const res = await fetch('/api/v1/payout/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': uid,
        },
        body: JSON.stringify({
          withdrawalId,
          providerReference: transferRef,
          actorUserId: uid,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyetujui payout.');

      alert('Payout berhasil disetujui dan mutasi buku besar telah diposting!');
      setApprovingId(null);
      setTransferRef('');
      loadDashboardData(uid);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm Manual Order Payment
  const handleConfirmOrderPayment = async (orderId: string) => {
    if (!confirm('Konfirmasi bahwa pembayaran pesanan ini telah diterima di rekening perusahaan? Komisi jaringan akan otomatis dialokasikan ke buku besar.')) {
      return;
    }
    const uid = currentUser?.userId || currentUser?.id;
    setActionLoading(true);
    try {
      const res = await fetch('/api/v1/admin/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': uid,
        },
        body: JSON.stringify({
          action: 'CONFIRM_PAYMENT',
          orderId,
          providerReference: `MANUAL-BCA-${Date.now().toString().slice(-6)}`,
          actorUserId: uid,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal konfirmasi pembayaran.');

      alert('Pembayaran pesanan berhasil dikonfirmasi! Komisi jaringan dan buku besar telah diposting.');
      loadDashboardData(uid);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Process Shipment (Input Courier & Tracking Number)
  const handleShipOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingModalOrder || !trackingNumber.trim()) {
      alert('Mohon isi nomor resi pengiriman.');
      return;
    }
    const uid = currentUser?.userId || currentUser?.id;
    setActionLoading(true);
    try {
      const res = await fetch('/api/v1/admin/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': uid,
        },
        body: JSON.stringify({
          action: 'SHIP_ORDER',
          orderId: shippingModalOrder.id,
          courierName,
          trackingNumber: trackingNumber.trim(),
          actorUserId: uid,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memproses pengiriman.');

      alert(`Pesanan ${shippingModalOrder.orderNumber} berhasil diperbarui menjadi TERKIRIM (${courierName} - ${trackingNumber}).`);
      setShippingModalOrder(null);
      setTrackingNumber('');
      loadDashboardData(uid);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Complete Order
  const handleCompleteOrder = async (orderId: string) => {
    if (!confirm('Tandai pesanan ini telah selesai dan paket telah sampai di tangan pembeli?')) {
      return;
    }
    const uid = currentUser?.userId || currentUser?.id;
    setActionLoading(true);
    try {
      const res = await fetch('/api/v1/admin/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': uid,
        },
        body: JSON.stringify({
          action: 'COMPLETE_ORDER',
          orderId,
          actorUserId: uid,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyelesaikan pesanan.');

      alert('Pesanan telah ditandai SELESAI.');
      loadDashboardData(uid);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Placement Transfer
  const handleExecutePlacementTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferStatus(null);
    const uid = currentUser?.userId || currentUser?.id;
    try {
      const res = await fetch('/api/v1/network/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': uid,
        },
        body: JSON.stringify({
          memberCode: transferMemberCode.trim().toUpperCase(),
          newParentCode: transferNewParentCode.trim().toUpperCase(),
          reason: transferReason,
          actorUserId: uid,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memindahkan penempatan.');

      setTransferStatus({ type: 'success', message: data.message });
      setTransferMemberCode('');
      setTransferNewParentCode('');
      setTransferReason('');
      loadDashboardData(uid);
    } catch (err: any) {
      setTransferStatus({ type: 'error', message: err.message });
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 rounded-full border-2 border-varena-gold border-t-transparent animate-spin mb-4" />
        <h2 className="font-serif text-lg font-bold text-varena-espresso">Memverifikasi Otoritas Akses Eksekutif...</h2>
        <p className="text-xs text-varena-taupe mt-1">Sistem memeriksa kredensial korporasi dan otorisasi RBAC.</p>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white border border-red-200 rounded-2xl shadow-sm text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="font-serif text-xl font-bold text-varena-espresso">Akses Terbatas: Khusus Pengelola Perusahaan</h2>
        <p className="text-xs text-varena-taupe mt-2 leading-relaxed">
          Akun Anda (<strong>{currentUser?.displayName}</strong> · Role: <span className="font-mono text-varena-gold font-semibold">{currentUser?.roles?.join(', ')}</span>) tidak memiliki hak akses administratif ke VARENA Business.
        </p>
        <p className="text-[11px] text-varena-taupe-light mt-2 leading-relaxed">
          Sesuai kepatuhan hukum Permendag RI No. 70/2019, panel manajemen kas, logistik, audit buku besar, dan persetujuan pencairan hanya dapat diakses oleh direksi (Owner) dan administrator resmi perusahaan.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={() => router.push('/member')}
            className="w-full py-2.5 px-4 rounded-lg bg-varena-gold text-varena-espresso font-semibold text-xs hover:bg-varena-gold-hover transition shadow"
          >
            Kembali ke Portal Kemitraan Saya
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('varena_user');
              router.push('/login?redirect=/admin');
            }}
            className="w-full py-2.5 px-4 rounded-lg border border-varena-taupe/30 text-varena-espresso font-medium text-xs hover:bg-varena-ivory transition"
          >
            Masuk Menggunakan Akun Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-varena-taupe/20">
        <div>
          <div className="inline-block px-2.5 py-0.5 rounded text-[10px] uppercase font-mono font-semibold bg-varena-gold/20 text-varena-espresso border border-varena-gold/40 mb-1">
            VARENA Executive & Operations Console
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-varena-espresso">
            Pusat Komando Manajemen Bisnis
          </h1>
          <p className="text-xs text-varena-taupe-dark mt-0.5">
            Pengawasan real-time arus kas, logistik pesanan, maker-checker pencairan, pohon jaringan, dan audit trail 60 hari.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-varena-espresso">{currentUser?.displayName}</div>
            <div className="text-[10px] text-varena-gold font-mono uppercase">{currentUser?.roles?.join(', ')}</div>
          </div>
          <button
            onClick={() => loadDashboardData()}
            className="px-3.5 py-2 rounded-lg border border-varena-taupe/30 text-xs font-semibold hover:bg-varena-ivory flex items-center gap-1.5 shadow-sm bg-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-varena-taupe/20 pb-2 text-xs font-medium">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`px-4 py-2 rounded-lg transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'OVERVIEW'
              ? 'bg-varena-espresso text-varena-gold-light font-semibold shadow'
              : 'text-varena-taupe hover:text-varena-espresso hover:bg-varena-ivory'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Arus Kas & Keuangan</span>
        </button>

        <button
          onClick={() => setActiveTab('ORDERS')}
          className={`px-4 py-2 rounded-lg transition whitespace-nowrap flex items-center gap-2 relative ${
            activeTab === 'ORDERS'
              ? 'bg-varena-espresso text-varena-gold-light font-semibold shadow'
              : 'text-varena-taupe hover:text-varena-espresso hover:bg-varena-ivory'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Pesanan & Pengiriman</span>
          {ordersSummary?.paidReadyToShip > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-mono">
              {ordersSummary.paidReadyToShip}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('PAYOUTS')}
          className={`px-4 py-2 rounded-lg transition whitespace-nowrap flex items-center gap-2 relative ${
            activeTab === 'PAYOUTS'
              ? 'bg-varena-espresso text-varena-gold-light font-semibold shadow'
              : 'text-varena-taupe hover:text-varena-espresso hover:bg-varena-ivory'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Pencairan Dana (Maker-Checker)</span>
          {withdrawals.filter((w) => w.status === 'REQUESTED').length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-600 text-white font-mono">
              {withdrawals.filter((w) => w.status === 'REQUESTED').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('NETWORK')}
          className={`px-4 py-2 rounded-lg transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'NETWORK'
              ? 'bg-varena-espresso text-varena-gold-light font-semibold shadow'
              : 'text-varena-taupe hover:text-varena-espresso hover:bg-varena-ivory'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Manajemen User & Jaringan</span>
          {stats?.inactiveMembersCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-600 text-white font-mono">
              {stats.inactiveMembersCount} Inaktif
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('LOGS')}
          className={`px-4 py-2 rounded-lg transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'LOGS'
              ? 'bg-varena-espresso text-varena-gold-light font-semibold shadow'
              : 'text-varena-taupe hover:text-varena-espresso hover:bg-varena-ivory'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Audit Log Sistem (60 Hari)</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: EXECUTIVE FINANCIAL OVERVIEW */}
      {/* ==================================================================== */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Top KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Total Penjualan Kotor */}
            <div className="bg-white p-5 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-varena-taupe">
                <span>Total Penjualan Kotor</span>
                <DollarSign className="w-4 h-4 text-varena-gold" />
              </div>
              <div className="font-serif text-2xl font-bold text-varena-espresso">
                Rp{(stats?.grossSales || 0).toLocaleString('id-ID')}
              </div>
              <div className="text-[11px] text-varena-taupe flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{stats?.paidOrdersCount || 0} pesanan terbayar</span>
              </div>
            </div>

            {/* Gross Margin Setelah HPP */}
            <div className="bg-white p-5 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-varena-taupe">
                <span>Gross Margin (Setelah HPP)</span>
                <TrendingUp className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="font-serif text-2xl font-bold text-emerald-800">
                Rp{(stats?.grossMargin || 0).toLocaleString('id-ID')}
              </div>
              <div className="text-[11px] text-varena-taupe">
                Beban HPP: Rp{(stats?.totalHpp || 0).toLocaleString('id-ID')}
              </div>
            </div>

            {/* Total Komisi & Payout */}
            <div className="bg-white p-5 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-varena-taupe">
                <span>Komisi Terdistribusi</span>
                <Users className="w-4 h-4 text-varena-gold" />
              </div>
              <div className="font-serif text-2xl font-bold text-varena-espresso">
                Rp{(stats?.totalCommissionDistributed || 0).toLocaleString('id-ID')}
              </div>
              <div className="text-[11px] text-varena-taupe">
                Dicairkan: Rp{(stats?.totalPayoutDisbursed || 0).toLocaleString('id-ID')}
              </div>
            </div>

            {/* Order Belum Bayar / Piutang */}
            <div className="bg-white p-5 rounded-2xl border border-amber-300 bg-amber-50/40 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-amber-800">
                <span className="font-semibold">Order Belum Bayar (Piutang)</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="font-serif text-2xl font-bold text-amber-900">
                Rp{(stats?.pendingOrdersAmount || 0).toLocaleString('id-ID')}
              </div>
              <div className="text-[11px] text-amber-700">
                {stats?.pendingOrdersCount || 0} pesanan menunggu pembayaran
              </div>
            </div>
          </div>

          {/* Arus Kas Masuk vs Keluar + Cadangan */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-varena-taupe/20 space-y-3">
              <span className="text-xs text-varena-taupe font-semibold uppercase tracking-wider block">
                Arus Kas Masuk (Inflow)
              </span>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-varena-taupe/10">
                  <span className="text-varena-taupe">Penjualan Paket Box:</span>
                  <span className="font-mono font-bold text-varena-espresso">
                    Rp{(stats?.grossSales ? stats.grossSales - 675000 : 0).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-varena-taupe/10">
                  <span className="text-varena-taupe">Penjualan Eceran Sachet:</span>
                  <span className="font-mono font-bold text-varena-espresso">Rp675.000</span>
                </div>
                <div className="flex justify-between pt-1 font-semibold text-emerald-800">
                  <span>Total Kas Masuk Diterima:</span>
                  <span className="font-mono">Rp{(stats?.grossSales || 0).toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-varena-taupe/20 space-y-3">
              <span className="text-xs text-varena-taupe font-semibold uppercase tracking-wider block">
                Beban & Liabilitas Komisi (Outflow)
              </span>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-varena-taupe/10">
                  <span className="text-varena-taupe">Komisi Mitra (Terposting):</span>
                  <span className="font-mono font-bold text-varena-espresso">
                    Rp{(stats?.totalCommissionDistributed || 0).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-varena-taupe/10">
                  <span className="text-varena-taupe">Pencairan Dana Ditransfer:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    Rp{(stats?.totalPayoutDisbursed || 0).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between pt-1 font-semibold text-amber-800">
                  <span>Antrean Penarikan Pending:</span>
                  <span className="font-mono">Rp{(stats?.pendingPayoutAmount || 0).toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-varena-taupe/20 space-y-3">
              <span className="text-xs text-varena-taupe font-semibold uppercase tracking-wider block">
                Ketahanan Modal & Cadangan
              </span>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-varena-taupe/10">
                  <span className="text-varena-taupe">Cadangan Titik Kosong (Unallocated):</span>
                  <span className="font-mono font-bold text-amber-800">
                    Rp{(stats?.totalUnallocatedReserve || 0).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-varena-taupe/10">
                  <span className="text-varena-taupe">Net Residual Operasional:</span>
                  <span className="font-mono font-bold text-emerald-800">
                    Rp{(stats?.netResidual || 0).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between pt-1 text-[11px] text-varena-taupe">
                  <span>Integritas Pembukuan:</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Double-Entry ACID Balance</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Notice: Unpaid Orders Table */}
          {stats?.pendingOrdersList && stats.pendingOrdersList.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-amber-300 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-base font-bold text-varena-espresso flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Daftar Pesanan Menunggu Pembayaran (Perlu Follow Up)</span>
                  </h3>
                  <p className="text-xs text-varena-taupe mt-0.5">
                    Pesanan yang telah dibuat oleh pembeli/prospek mitra namun belum ditransfer pembayarannya.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('ORDERS')}
                  className="text-xs font-semibold text-varena-gold hover:text-varena-espresso flex items-center gap-1"
                >
                  <span>Lihat Semua Pesanan</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-amber-50 text-amber-900 uppercase font-semibold border-b border-amber-200">
                    <tr>
                      <th className="py-2.5 px-3">No. Pesanan</th>
                      <th className="py-2.5 px-3">Calon Pembeli</th>
                      <th className="py-2.5 px-3">No. Kontak</th>
                      <th className="py-2.5 px-3">Sponsor / Referral</th>
                      <th className="py-2.5 px-3">Nominal Tagihan</th>
                      <th className="py-2.5 px-3 text-right">Aksi Cepat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100">
                    {stats.pendingOrdersList.map((po: any) => (
                      <tr key={po.id} className="hover:bg-amber-50/50">
                        <td className="py-2.5 px-3 font-mono font-bold text-varena-espresso">{po.orderNumber}</td>
                        <td className="py-2.5 px-3 font-medium text-varena-espresso">{po.buyerName}</td>
                        <td className="py-2.5 px-3 font-mono text-varena-taupe">{po.buyerPhone}</td>
                        <td className="py-2.5 px-3 font-mono text-varena-espresso font-semibold">{po.referral}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-amber-800">
                          Rp{po.total.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleConfirmOrderPayment(po.id)}
                            className="px-2.5 py-1 rounded bg-emerald-700 text-white font-semibold text-[11px] hover:bg-emerald-800 transition"
                          >
                            Konfirmasi Bayar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: ORDER MANAGEMENT & LOGISTICS (ADMIN PENJUALAN) */}
      {/* ==================================================================== */}
      {activeTab === 'ORDERS' && (
        <div className="space-y-6">
          {/* Summary Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <button
              onClick={() => {
                setOrderStatusFilter('ALL');
                loadFilteredOrders('ALL', orderSearchQuery);
              }}
              className={`p-3 rounded-xl border text-left transition ${
                orderStatusFilter === 'ALL'
                  ? 'border-varena-gold bg-varena-espresso text-varena-gold-light font-semibold'
                  : 'border-varena-taupe/20 bg-white text-varena-taupe hover:border-varena-gold'
              }`}
            >
              <div className="text-[10px] uppercase">Semua Pesanan</div>
              <div className="text-xl font-bold font-serif">{ordersSummary?.totalOrders || 0}</div>
            </button>

            <button
              onClick={() => {
                setOrderStatusFilter('PENDING_PAYMENT');
                loadFilteredOrders('PENDING_PAYMENT', orderSearchQuery);
              }}
              className={`p-3 rounded-xl border text-left transition ${
                orderStatusFilter === 'PENDING_PAYMENT'
                  ? 'border-amber-400 bg-amber-900 text-amber-200 font-semibold'
                  : 'border-varena-taupe/20 bg-white text-varena-taupe hover:border-amber-400'
              }`}
            >
              <div className="text-[10px] uppercase">Menunggu Bayar</div>
              <div className="text-xl font-bold font-serif text-amber-700">{ordersSummary?.pendingPayment || 0}</div>
            </button>

            <button
              onClick={() => {
                setOrderStatusFilter('PAID');
                loadFilteredOrders('PAID', orderSearchQuery);
              }}
              className={`p-3 rounded-xl border text-left transition ${
                orderStatusFilter === 'PAID'
                  ? 'border-emerald-500 bg-emerald-900 text-emerald-200 font-semibold'
                  : 'border-varena-taupe/20 bg-white text-varena-taupe hover:border-emerald-500'
              }`}
            >
              <div className="text-[10px] uppercase">Dibayar / Perlu Kirim</div>
              <div className="text-xl font-bold font-serif text-emerald-700">{ordersSummary?.paidReadyToShip || 0}</div>
            </button>

            <button
              onClick={() => {
                setOrderStatusFilter('SHIPPED');
                loadFilteredOrders('SHIPPED', orderSearchQuery);
              }}
              className={`p-3 rounded-xl border text-left transition ${
                orderStatusFilter === 'SHIPPED'
                  ? 'border-blue-500 bg-blue-900 text-blue-200 font-semibold'
                  : 'border-varena-taupe/20 bg-white text-varena-taupe hover:border-blue-500'
              }`}
            >
              <div className="text-[10px] uppercase">Dalam Pengiriman</div>
              <div className="text-xl font-bold font-serif text-blue-700">{ordersSummary?.shipped || 0}</div>
            </button>

            <button
              onClick={() => {
                setOrderStatusFilter('COMPLETED');
                loadFilteredOrders('COMPLETED', orderSearchQuery);
              }}
              className={`p-3 rounded-xl border text-left transition ${
                orderStatusFilter === 'COMPLETED'
                  ? 'border-varena-espresso bg-varena-espresso text-varena-gold-light font-semibold'
                  : 'border-varena-taupe/20 bg-white text-varena-taupe hover:border-varena-espresso'
              }`}
            >
              <div className="text-[10px] uppercase">Selesai / Diterima</div>
              <div className="text-xl font-bold font-serif text-slate-700">{ordersSummary?.completed || 0}</div>
            </button>
          </div>

          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-varena-taupe absolute left-3 top-3" />
              <input
                type="text"
                value={orderSearchQuery}
                onChange={(e) => {
                  setOrderSearchQuery(e.target.value);
                  loadFilteredOrders(orderStatusFilter, e.target.value);
                }}
                placeholder="Cari nomor pesanan, nama pembeli, nomor telepon, atau nomor resi kurir..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-varena-taupe/30 text-xs focus:outline-none focus:border-varena-gold bg-white"
              />
            </div>
            <button
              onClick={() => loadFilteredOrders(orderStatusFilter, orderSearchQuery)}
              className="px-4 py-2 rounded-lg bg-varena-espresso text-varena-gold-light font-semibold text-xs hover:bg-varena-espresso-dark transition shadow"
            >
              Cari Pesanan
            </button>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-2xl border border-varena-taupe/20 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-varena-taupe/15 flex items-center justify-between">
              <h2 className="font-serif text-lg font-bold text-varena-espresso flex items-center gap-2">
                <Package className="w-5 h-5 text-varena-gold" />
                <span>Histori & Alur Pemrosesan Pesanan Penjualan</span>
              </h2>
              <span className="text-xs text-varena-taupe font-mono">
                {orders.length} Pesanan Ditampilkan
              </span>
            </div>

            {orders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-varena-ivory-light text-varena-taupe uppercase font-semibold border-b border-varena-taupe/20">
                    <tr>
                      <th className="py-2.5 px-3">No. Order / Tanggal</th>
                      <th className="py-2.5 px-3">Pembeli & Alamat</th>
                      <th className="py-2.5 px-3">Item Produk</th>
                      <th className="py-2.5 px-3">Total Belanja</th>
                      <th className="py-2.5 px-3">Referral Sponsor</th>
                      <th className="py-2.5 px-3">Status & Logistik</th>
                      <th className="py-2.5 px-3 text-right">Aksi Alur Order</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-varena-taupe/10">
                    {orders.map((o) => (
                      <tr key={o.id} className="hover:bg-varena-ivory-light/40">
                        <td className="py-2.5 px-3">
                          <div className="font-mono font-bold text-varena-espresso">{o.orderNumber}</div>
                          <div className="text-[10px] text-varena-taupe">
                            {new Date(o.createdAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 max-w-[200px]">
                          <div className="font-semibold text-varena-espresso">{o.buyerName}</div>
                          <div className="text-[10px] text-varena-taupe font-mono">{o.buyerPhone}</div>
                          <div className="text-[10px] text-varena-taupe truncate" title={o.shippingAddress}>
                            {o.shippingAddress}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          {o.items?.map((it: any) => (
                            <div key={it.id} className="text-[11px]">
                              <span className="font-semibold text-varena-espresso">{it.quantity}x</span> {it.nameSnapshot}
                            </div>
                          ))}
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-mono bg-varena-ivory text-varena-taupe border border-varena-taupe/20">
                            {o.orderType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-varena-espresso whitespace-nowrap">
                          Rp{o.total.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-3">
                          {o.referralMember ? (
                            <div>
                              <div className="font-semibold text-varena-espresso">{o.referralMember.displayName}</div>
                              <div className="text-[10px] text-varena-taupe font-mono">{o.referralMember.memberCode}</div>
                            </div>
                          ) : (
                            <span className="text-varena-taupe text-[10px] italic">Organik / Non-Referral</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold block w-fit mb-1 ${
                              o.orderStatus === 'COMPLETED'
                                ? 'bg-slate-100 text-slate-800 border border-slate-300'
                                : o.orderStatus === 'SHIPPED'
                                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                : o.orderStatus === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {o.orderStatus === 'PENDING_PAYMENT'
                              ? 'MENUNGGU PEMBAYARAN'
                              : o.orderStatus === 'PAID'
                              ? 'DIBAYAR (PERLU KIRIM)'
                              : o.orderStatus === 'SHIPPED'
                              ? 'DALAM PENGIRIMAN'
                              : o.orderStatus === 'COMPLETED'
                              ? 'SELESAI DITERIMA'
                              : o.orderStatus}
                          </span>
                          {o.trackingNumber && (
                            <div className="text-[10px] font-mono text-varena-taupe">
                              {o.courierName}: <strong>{o.trackingNumber}</strong>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {/* Alur Aksi Berdasarkan Status */}
                          {o.orderStatus === 'PENDING_PAYMENT' && (
                            <button
                              onClick={() => handleConfirmOrderPayment(o.id)}
                              disabled={actionLoading}
                              className="px-2.5 py-1.5 rounded bg-emerald-700 text-white font-semibold text-xs hover:bg-emerald-800 transition shadow-sm whitespace-nowrap"
                            >
                              Konfirmasi Bayar
                            </button>
                          )}

                          {o.orderStatus === 'PAID' && (
                            <button
                              onClick={() => {
                                setShippingModalOrder(o);
                                setTrackingNumber(`JNE-${Date.now().toString().slice(-8)}-ID`);
                              }}
                              className="px-2.5 py-1.5 rounded bg-varena-espresso text-varena-gold-light font-semibold text-xs hover:bg-varena-espresso-dark transition shadow-sm flex items-center gap-1.5 ml-auto whitespace-nowrap"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>Input Resi & Kirim</span>
                            </button>
                          )}

                          {o.orderStatus === 'SHIPPED' && (
                            <button
                              onClick={() => handleCompleteOrder(o.id)}
                              disabled={actionLoading}
                              className="px-2.5 py-1.5 rounded border border-emerald-600 text-emerald-800 font-semibold text-xs hover:bg-emerald-50 transition shadow-sm whitespace-nowrap"
                            >
                              Tandai Diterima
                            </button>
                          )}

                          {o.orderStatus === 'COMPLETED' && (
                            <span className="text-[10px] text-emerald-700 font-semibold flex items-center justify-end gap-1">
                              <Check className="w-3.5 h-3.5" />
                              <span>Selesai</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-xs text-varena-taupe">
                Tidak ada pesanan yang sesuai dengan filter pencarian saat ini.
              </div>
            )}
          </div>

          {/* Modal Input Resi Kurir Pengiriman */}
          {shippingModalOrder && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-varena-gold/40">
                <div className="flex items-center justify-between border-b border-varena-taupe/20 pb-3">
                  <h3 className="font-serif text-lg font-bold text-varena-espresso flex items-center gap-2">
                    <Truck className="w-5 h-5 text-varena-gold" />
                    <span>Input Resi Pengiriman Pesanan</span>
                  </h3>
                  <button
                    onClick={() => setShippingModalOrder(null)}
                    className="text-varena-taupe hover:text-varena-espresso text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-3 rounded-lg bg-varena-ivory-light text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-varena-taupe">No. Pesanan:</span>
                    <span className="font-mono font-bold text-varena-espresso">{shippingModalOrder.orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-varena-taupe">Penerima:</span>
                    <span className="font-medium text-varena-espresso">{shippingModalOrder.buyerName}</span>
                  </div>
                  <div className="text-varena-taupe text-[11px] truncate">
                    Tujuan: {shippingModalOrder.shippingAddress}
                  </div>
                </div>

                <form onSubmit={handleShipOrderSubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-varena-espresso mb-1">Pilih Ekspedisi / Kurir *</label>
                    <select
                      value={courierName}
                      onChange={(e) => setCourierName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold bg-white"
                    >
                      <option value="JNE Express">JNE Express</option>
                      <option value="J&T Express">J&T Express</option>
                      <option value="SiCepat Ekspres">SiCepat Ekspres</option>
                      <option value="Pos Indonesia">Pos Indonesia</option>
                      <option value="Anteraja">Anteraja</option>
                      <option value="Kurir Internal VARENA">Kurir Internal VARENA</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-varena-espresso mb-1">Nomor Resi / AWB Pelacakan *</label>
                    <input
                      type="text"
                      required
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="Contoh: JNE882019482ID"
                      className="w-full px-3 py-2 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold uppercase font-mono font-bold"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShippingModalOrder(null)}
                      className="flex-1 py-2 rounded-lg border border-varena-taupe/30 text-varena-taupe hover:bg-varena-ivory transition"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="flex-1 py-2 rounded-lg bg-varena-espresso text-varena-gold-light font-semibold hover:bg-varena-espresso-dark transition shadow"
                    >
                      {actionLoading ? 'Menyimpan...' : 'Kirim Paket Sekarang'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: PAYOUT APPROVAL (ADMIN KEUANGAN MAKER-CHECKER) */}
      {/* ==================================================================== */}
      {activeTab === 'PAYOUTS' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-lg font-bold text-varena-espresso flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-varena-gold" />
                  <span>Verifikasi & Persetujuan Penarikan Dana (Maker-Checker Payout)</span>
                </h2>
                <p className="text-xs text-varena-taupe mt-0.5">
                  Setiap pencairan uang kas keluar wajib diverifikasi dan dicantumkan nomor referensi perbankan resmi untuk audit trail.
                </p>
              </div>
              <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                {withdrawals.filter((w) => w.status === 'REQUESTED').length} Permohonan Tertunda
              </span>
            </div>

            {withdrawals.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-varena-ivory-light text-varena-taupe uppercase font-semibold border-b border-varena-taupe/20">
                    <tr>
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">Mitra Pemohon</th>
                      <th className="py-2.5 px-3">Nominal Diminta</th>
                      <th className="py-2.5 px-3">Potongan Admin</th>
                      <th className="py-2.5 px-3">Bersih Ditransfer</th>
                      <th className="py-2.5 px-3">Rekening Bank Tujuan</th>
                      <th className="py-2.5 px-3">Status Finance</th>
                      <th className="py-2.5 px-3 text-right">Aksi Persetujuan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-varena-taupe/10">
                    {withdrawals.map((w: any) => (
                      <tr key={w.id} className="hover:bg-varena-ivory-light/40">
                        <td className="py-2.5 px-3 text-varena-taupe whitespace-nowrap">
                          {new Date(w.requestedAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-varena-espresso">{w.member?.displayName}</div>
                          <div className="text-[10px] text-varena-taupe font-mono">{w.member?.memberCode}</div>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold">Rp{w.amount.toLocaleString('id-ID')}</td>
                        <td className="py-2.5 px-3 text-varena-taupe font-mono">Rp{w.fee.toLocaleString('id-ID')}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-800 whitespace-nowrap">
                          Rp{w.netAmount.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-varena-espresso">{w.bankName} - {w.accountNumberMasked}</div>
                          <div className="text-[10px] text-varena-taupe">a.n. {w.accountHolder}</div>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              w.status === 'PAID' || w.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : w.status === 'REQUESTED' || w.status === 'UNDER_REVIEW'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {w.status === 'REQUESTED'
                              ? 'MENUNGGU VERIFIKASI'
                              : w.status === 'APPROVED' || w.status === 'PAID'
                              ? 'SELESAI DICAIRKAN'
                              : w.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          {w.status === 'REQUESTED' ? (
                            approvingId === w.id ? (
                              <div className="flex items-center gap-1.5 justify-end">
                                <input
                                  type="text"
                                  value={transferRef}
                                  onChange={(e) => setTransferRef(e.target.value)}
                                  placeholder="No. Ref Transfer"
                                  className="px-2 py-1 rounded border border-varena-taupe/40 text-xs w-36 uppercase font-mono"
                                />
                                <button
                                  onClick={() => handleApproveWithdrawal(w.id)}
                                  disabled={actionLoading}
                                  className="px-2.5 py-1 rounded bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition shadow"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => setApprovingId(null)}
                                  className="px-1.5 py-1 text-varena-taupe hover:text-varena-espresso"
                                >
                                  Batal
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setApprovingId(w.id);
                                  setTransferRef(`TRF-${Date.now().toString().slice(-6)}`);
                                }}
                                className="px-3 py-1.5 rounded bg-varena-espresso text-varena-gold-light font-semibold hover:bg-varena-espresso-dark transition shadow"
                              >
                                Setujui Payout
                              </button>
                            )
                          ) : (
                            <span className="text-[10px] font-mono text-varena-taupe">
                              Ref: {w.providerReference || '-'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 text-xs text-varena-taupe bg-varena-ivory-light rounded-xl border border-dashed border-varena-taupe/30">
                Tidak ada permohonan penarikan dana saat ini.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: USER MANAGEMENT, NETWORK HIERARCHY & PUSH LEADER */}
      {/* ==================================================================== */}
      {activeTab === 'NETWORK' && (
        <div className="space-y-6">
          {/* User Metrics Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-white p-5 rounded-2xl border border-varena-taupe/20 space-y-1">
              <span className="text-varena-taupe">Total Akun Terdaftar</span>
              <div className="font-serif text-2xl font-bold text-varena-espresso">{stats?.totalUsers || 0} Akun</div>
              <div className="text-[10px] text-varena-taupe">Termasuk akun korporasi & mitra</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-varena-taupe/20 space-y-1">
              <span className="text-varena-taupe">Mitra Aktif (Sudah Belanja)</span>
              <div className="font-serif text-2xl font-bold text-emerald-800">{stats?.activeMembersCount || 0} Mitra</div>
              <div className="text-[10px] text-varena-taupe">Telah memenuhi syarat pembelanjaan produk</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-amber-300 bg-amber-50/40 space-y-1">
              <span className="text-amber-800 font-semibold">User Belum Aktif (Perlu Follow Up)</span>
              <div className="font-serif text-2xl font-bold text-amber-900">{stats?.inactiveMembersCount || 0} Orang</div>
              <div className="text-[10px] text-amber-700">Sudah buat akun tapi belum belanja paket perdana</div>
            </div>
          </div>

          {/* Section: "Push Leader" Intelligence */}
          <div className="bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-bold text-varena-espresso flex items-center gap-2">
                  <PhoneCall className="w-5 h-5 text-varena-gold" />
                  <span>Push Leader & Jaringan (Rekomendasi Tindak Lanjut Manajemen)</span>
                </h3>
                <p className="text-xs text-varena-taupe mt-0.5">
                  Identifikasi leader yang memiliki downline belum aktif atau pesanan belum bayar terbanyak untuk didorong follow up.
                </p>
              </div>
            </div>

            {stats?.pushLeaders && stats.pushLeaders.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.pushLeaders.map((ldr: any) => (
                  <div
                    key={ldr.memberCode}
                    className="p-4 rounded-xl border border-varena-taupe/20 bg-varena-ivory-light/50 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-varena-espresso">{ldr.displayName}</div>
                        <div className="text-[10px] text-varena-taupe font-mono">{ldr.memberCode}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-varena-gold/20 text-varena-espresso">
                        Leader
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-varena-taupe">Downline Belum Belanja:</span>
                        <span className="font-bold text-amber-800">{ldr.inactiveDownlineCount} Orang</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-varena-taupe">Order Belum Dibayar:</span>
                        <span className="font-bold text-amber-800">
                          {ldr.pendingOrdersCount} Pesanan
                          {ldr.pendingOrdersTotal > 0 && ` (Rp${ldr.pendingOrdersTotal.toLocaleString('id-ID')})`}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-varena-taupe/15 flex items-center justify-between text-xs">
                      <span className="text-varena-taupe font-mono text-[11px]">{ldr.phone}</span>
                      <a
                        href={`https://wa.me/${ldr.phone.replace(/^0/, '62')}?text=${encodeURIComponent(
                          `Halo ${ldr.displayName}, salam dari Manajemen VARENA. Kami melihat ada ${ldr.inactiveDownlineCount} calon mitra di jaringan Anda yang belum aktivasi belanja perdana. Mari kita follow up bersama!`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded bg-emerald-700 text-white font-semibold text-[11px] hover:bg-emerald-800 transition flex items-center gap-1 shadow-sm"
                      >
                        <Send className="w-3 h-3" />
                        <span>Push WA</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-varena-taupe">
                Seluruh jaringan mitra saat ini dalam kondisi prima dan aktif berbelanja.
              </div>
            )}
          </div>

          {/* Section: Inactive Members Details */}
          {stats?.inactiveMembersList && stats.inactiveMembersList.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-3">
              <h3 className="font-serif text-base font-bold text-varena-espresso flex items-center gap-2">
                <UserX className="w-4 h-4 text-amber-600" />
                <span>Rincian User Tidak Aktif (Sudah Daftar tapi Belum Belanja Pertama)</span>
              </h3>
              <p className="text-xs text-varena-taupe">
                User berikut telah menyelesaikan pendaftaran namun belum melakukan order First Pack.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-varena-ivory-light text-varena-taupe uppercase font-semibold border-b border-varena-taupe/20">
                    <tr>
                      <th className="py-2.5 px-3">Kode Mitra</th>
                      <th className="py-2.5 px-3">Nama Lengkap</th>
                      <th className="py-2.5 px-3">Email & No. HP</th>
                      <th className="py-2.5 px-3">Sponsor Pembina</th>
                      <th className="py-2.5 px-3">Upline Parent</th>
                      <th className="py-2.5 px-3">Tanggal Daftar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-varena-taupe/10">
                    {stats.inactiveMembersList.map((im: any) => (
                      <tr key={im.id} className="hover:bg-varena-ivory-light/40">
                        <td className="py-2.5 px-3 font-mono font-bold text-varena-espresso">{im.memberCode}</td>
                        <td className="py-2.5 px-3 font-medium text-varena-espresso">{im.displayName}</td>
                        <td className="py-2.5 px-3">
                          <div>{im.email}</div>
                          <div className="text-[10px] text-varena-taupe font-mono">{im.phone}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          {im.sponsor ? (
                            <div>
                              <div className="font-semibold text-varena-espresso">{im.sponsor.displayName}</div>
                              <div className="text-[10px] text-varena-taupe font-mono">{im.sponsor.memberCode}</div>
                            </div>
                          ) : (
                            <span className="text-varena-taupe italic">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-varena-espresso">{im.placementParent}</td>
                        <td className="py-2.5 px-3 text-varena-taupe">
                          {new Date(im.joinedAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section: Total User per Level Hierarki */}
          <div className="bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-4">
            <h3 className="font-serif text-base font-bold text-varena-espresso flex items-center gap-2">
              <Layers className="w-5 h-5 text-varena-gold" />
              <span>Distribusi Anggota Jaringan per Level Kedalaman (Depth Tree)</span>
            </h3>
            <p className="text-xs text-varena-taupe">
              Visualisasi jumlah mitra yang tersebar pada tiap tingkatan kedalaman hierarki (Level 1 sampai Level 10+).
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
              {stats?.levelDistribution &&
                Object.entries(stats.levelDistribution).map(([lvlName, count]: [string, any]) => (
                  <div
                    key={lvlName}
                    className="p-3 rounded-xl border border-varena-taupe/20 bg-varena-ivory-light/40 text-center space-y-1"
                  >
                    <div className="text-[10px] text-varena-taupe font-medium">{lvlName}</div>
                    <div className="text-lg font-bold font-serif text-varena-espresso">{count} Orang</div>
                  </div>
                ))}
            </div>
          </div>

          {/* Placement Transfer Tool */}
          <div className="bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <GitFork className="w-5 h-5 text-varena-gold" />
              <h3 className="font-serif text-base font-bold text-varena-espresso">
                Koreksi & Pemindahan Penempatan Jaringan (Spreading)
              </h3>
            </div>
            <p className="text-xs text-varena-taupe">
              Pindahkan posisi downline di bawah parent baru. Sistem memvalidasi anti-cycle (mencegah loop) dan mencatat riwayat audit secara permanen.
            </p>

            {transferStatus && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                  transferStatus.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {transferStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{transferStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleExecutePlacementTransfer} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-varena-espresso mb-1">ID Mitra yang Dipindahkan *</label>
                <input
                  type="text"
                  required
                  value={transferMemberCode}
                  onChange={(e) => setTransferMemberCode(e.target.value)}
                  placeholder="Contoh: VRN-0003"
                  className="w-full px-3 py-2 rounded-lg border border-varena-taupe/30 uppercase font-mono focus:outline-none focus:border-varena-gold"
                />
              </div>

              <div>
                <label className="block font-semibold text-varena-espresso mb-1">ID Parent Baru (Target Upline) *</label>
                <input
                  type="text"
                  required
                  value={transferNewParentCode}
                  onChange={(e) => setTransferNewParentCode(e.target.value)}
                  placeholder="Contoh: VRN-0001"
                  className="w-full px-3 py-2 rounded-lg border border-varena-taupe/30 uppercase font-mono focus:outline-none focus:border-varena-gold"
                />
              </div>

              <div>
                <label className="block font-semibold text-varena-espresso mb-1">Alasan Penempatan *</label>
                <input
                  type="text"
                  required
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="Misal: Penyesuaian struktur pembinaan"
                  className="w-full px-3 py-2 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
                />
              </div>

              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="py-2.5 px-6 rounded-lg bg-varena-espresso text-varena-gold-light font-semibold hover:bg-varena-espresso-dark transition shadow"
                >
                  Jalankan Pemindahan Penempatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 5: SYSTEM AUDIT LOG (60 DAYS RETENTION) */}
      {/* ==================================================================== */}
      {activeTab === 'LOGS' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-lg font-bold text-varena-espresso flex items-center gap-2">
                  <FileText className="w-5 h-5 text-varena-gold" />
                  <span>Jejak Audit Sistem Terpadu (Audit Trail 60 Hari)</span>
                </h2>
                <p className="text-xs text-varena-taupe mt-0.5">
                  Mencatat seluruh aksi administratif, persetujuan payout, perubahan status pengiriman, penempatan jaringan, dan transaksi buku besar.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <select
                  value={logDays}
                  onChange={(e) => {
                    const days = parseInt(e.target.value, 10);
                    setLogDays(days);
                    loadFilteredLogs(days, logEntityFilter);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-varena-taupe/30 bg-white font-medium focus:outline-none"
                >
                  <option value={7}>7 Hari Terakhir</option>
                  <option value={30}>30 Hari Terakhir</option>
                  <option value={60}>60 Hari Terakhir</option>
                </select>

                <select
                  value={logEntityFilter}
                  onChange={(e) => {
                    setLogEntityFilter(e.target.value);
                    loadFilteredLogs(logDays, e.target.value);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-varena-taupe/30 bg-white font-medium focus:outline-none"
                >
                  <option value="ALL">Semua Entitas</option>
                  <option value="WITHDRAWAL">Pencairan Dana (Withdrawal)</option>
                  <option value="ORDER">Pesanan Penjualan (Order)</option>
                  <option value="PLACEMENT">Penempatan Jaringan</option>
                  <option value="MEMBER">Mitra & Member</option>
                  <option value="MARKETING_PLAN">Marketing Plan</option>
                </select>
              </div>
            </div>

            {auditLogs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-varena-ivory-light text-varena-taupe uppercase font-semibold border-b border-varena-taupe/20">
                    <tr>
                      <th className="py-2.5 px-3">Waktu Kejadian</th>
                      <th className="py-2.5 px-3">Aktor Pelaksana</th>
                      <th className="py-2.5 px-3">Aksi / Operasi</th>
                      <th className="py-2.5 px-3">Entitas Terkait</th>
                      <th className="py-2.5 px-3">Alasan / Catatan Sistem</th>
                      <th className="py-2.5 px-3">Rincian Perubahan Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-varena-taupe/10">
                    {auditLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-varena-ivory-light/40">
                        <td className="py-2.5 px-3 text-varena-taupe whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-varena-espresso">{log.actor?.displayName}</div>
                          <div className="text-[10px] text-varena-gold font-mono">{log.actor?.role}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-varena-ivory text-varena-espresso border border-varena-taupe/30">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">
                          <span className="font-bold text-varena-espresso">{log.entityType}</span>
                          <span className="text-varena-taupe block text-[10px] truncate max-w-[120px]" title={log.entityId}>
                            {log.entityId}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 max-w-[200px] text-varena-taupe-dark">
                          {log.reason || '-'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[10px] max-w-[220px]">
                          {log.afterJson && (
                            <div className="p-1.5 rounded bg-slate-50 border border-slate-200 text-slate-800 break-words">
                              {log.afterJson}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-xs text-varena-taupe bg-varena-ivory-light rounded-xl border border-dashed border-varena-taupe/30">
                Tidak ada riwayat audit log pada rentang waktu ini.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
