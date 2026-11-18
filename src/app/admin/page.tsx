'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Pagination from '@/components/ui/Pagination';
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
  ChevronLeft,
  Menu,
  X,
  ShieldCheck,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  Download,
  CheckSquare,
  Square,
  MapPin,
  QrCode,
  MessageSquare,
  Eye,
  Copy,
} from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ORDERS' | 'PAYOUTS' | 'NETWORK' | 'STOCKIST' | 'LOGS' | 'OUTBOX'>('OVERVIEW');

  // Sidebar State (Expanded vs Collapsed & Mobile Drawer)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('varena_admin_sidebar_collapsed');
      if (saved !== null) {
        setSidebarCollapsed(saved === 'true');
      }
    } catch { }
  }, []);

  // Lock body scroll when mobile drawer is open to prevent page scrolling behind sidebar
  useEffect(() => {
    if (mobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileSidebarOpen]);

  const toggleSidebar = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    try {
      localStorage.setItem('varena_admin_sidebar_collapsed', String(next));
    } catch { }
  };

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

  // Pagination States
  const [orderPage, setOrderPage] = useState(1);
  const [orderTotalPages, setOrderTotalPages] = useState(1);
  const [orderTotal, setOrderTotal] = useState(0);

  const [payoutPage, setPayoutPage] = useState(1);
  const [payoutTotalPages, setPayoutTotalPages] = useState(1);
  const [payoutTotal, setPayoutTotal] = useState(0);

  const [logPage, setLogPage] = useState(1);
  const [logTotalPages, setLogTotalPages] = useState(1);
  const [logTotal, setLogTotal] = useState(0);

  // Filters
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [logDays, setLogDays] = useState(60);
  const [logEntityFilter, setLogEntityFilter] = useState('ALL');

  // Maker-checker approval state
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [transferRef, setTransferRef] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);

  // Order Detail Modal State
  const [viewOrderDetail, setViewOrderDetail] = useState<any | null>(null);

  // Shipping Modal State
  const [shippingModalOrder, setShippingModalOrder] = useState<any | null>(null);
  const [courierName, setCourierName] = useState('JNE Express');
  const [trackingNumber, setTrackingNumber] = useState('');

  // Bulk Shipping State
  const [bulkShipModalOpen, setBulkShipModalOpen] = useState(false);
  const [bulkShipInput, setBulkShipInput] = useState('');
  const [bulkShipLoading, setBulkShipLoading] = useState(false);

  // Payment confirmation state
  const [paymentProofOrders, setPaymentProofOrders] = useState<any[]>([]);
  const [rejectingPaymentId, setRejectingPaymentId] = useState<string | null>(null);

  // Placement transfer form
  const [transferMemberCode, setTransferMemberCode] = useState('');
  const [transferNewParentCode, setTransferNewParentCode] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferStatus, setTransferStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Omni-Search State
  const [omniQuery, setOmniQuery] = useState('');
  const [omniResults, setOmniResults] = useState<any>(null);
  const [omniLoading, setOmniLoading] = useState(false);
  const [showOmniDropdown, setShowOmniDropdown] = useState(false);

  // Batch Payout State
  const [selectedPayouts, setSelectedPayouts] = useState<string[]>([]);
  const [batchRef, setBatchRef] = useState('');
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchApproving, setBatchApproving] = useState(false);

  // Regional Stockist Hubs State
  const [stockists, setStockists] = useState<any[]>([]);
  const [newStockistMemberCode, setNewStockistMemberCode] = useState('');
  const [newStockistType, setNewStockistType] = useState('MASTER');
  const [newStockistCity, setNewStockistCity] = useState('');
  const [newStockistQuota, setNewStockistQuota] = useState(100);
  const [stockistLoading, setStockistLoading] = useState(false);

  // WhatsApp Outbox State
  const [waOutboxMessages, setWaOutboxMessages] = useState<any[]>([]);
  const [waOutboxLoading, setWaOutboxLoading] = useState(false);

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
      loadDashboardData(parsed);
    } catch {
      router.push('/login?redirect=/admin');
    }
  }, [router]);

  const getAdminHeaders = (customUser?: any): Record<string, string> => {
    const user = customUser || currentUser;
    let uid = typeof customUser === 'string' ? customUser : (user?.userId || user?.id || '');
    let email = typeof customUser === 'object' ? customUser?.email : (user?.email || '');

    if (!uid || !email) {
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('varena_user') : null;
        if (raw) {
          const u = JSON.parse(raw);
          if (!uid) uid = u.userId || u.id || '';
          if (!email) email = u.email || '';
        }
      } catch { }
    }

    return {
      'x-user-id': uid || '',
      'x-user-email': email || '',
    };
  };

  const loadDashboardData = (customUser?: any) => {
    const authHeaders = getAdminHeaders(customUser);
    if (!authHeaders['x-user-id'] && !authHeaders['x-user-email']) return;
    setLoading(true);

    const checkRes = async (res: Response) => {
      if (res.status === 403 || res.status === 401) {
        setAccessDenied(true);
        return {};
      }
      return res.json();
    };

    Promise.all([
      fetch('/api/v1/admin/stats', { headers: authHeaders }).then(checkRes),
      fetch('/api/v1/payout/admin?page=1&limit=15', { headers: authHeaders }).then(checkRes),
      fetch('/api/v1/admin/orders?page=1&limit=15', { headers: authHeaders }).then(checkRes),
      fetch(`/api/v1/admin/audit-logs?days=${logDays}&page=1&limit=20`, { headers: authHeaders }).then(checkRes),
    ])
      .then(([sData, wData, oData, lData]) => {
        if (sData?.stats) setStats(sData.stats);
        if (wData?.withdrawals) {
          setWithdrawals(wData.withdrawals);
          setPayoutPage(wData.pagination?.page || 1);
          setPayoutTotalPages(wData.pagination?.totalPages || 1);
          setPayoutTotal(wData.pagination?.total || wData.withdrawals.length);
        }
        if (oData?.orders) {
          setOrders(oData.orders);
          setOrdersSummary(oData.summary);
          setPaymentProofOrders(oData.orders.filter((o: any) => o.paymentConfirmationStatus === 'SUBMITTED'));
          setOrderPage(oData.pagination?.page || 1);
          setOrderTotalPages(oData.pagination?.totalPages || 1);
          setOrderTotal(oData.pagination?.total || oData.orders.length);
        }
        if (lData?.logs) {
          setAuditLogs(lData.logs);
          setAuditTotal(lData.totalCount);
          setLogPage(lData.pagination?.page || 1);
          setLogTotalPages(lData.pagination?.totalPages || 1);
          setLogTotal(lData.pagination?.total || lData.totalCount);
        }
      })
      .catch((e) => console.error('Admin data fetch error:', e))
      .finally(() => setLoading(false));
  };

  // Filter Orders with Pagination
  const loadFilteredOrders = (status = orderStatusFilter, query = orderSearchQuery, page = 1) => {
    const authHeaders = getAdminHeaders();
    if (!authHeaders['x-user-id'] && !authHeaders['x-user-email']) return;

    fetch(`/api/v1/admin/orders?status=${status}&q=${encodeURIComponent(query)}&page=${page}&limit=15`, {
      headers: authHeaders,
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.orders) {
          setOrders(data.orders);
          setOrdersSummary(data.summary);
          setPaymentProofOrders(data.orders.filter((o: any) => o.paymentConfirmationStatus === 'SUBMITTED'));
          setOrderPage(data.pagination?.page || 1);
          setOrderTotalPages(data.pagination?.totalPages || 1);
          setOrderTotal(data.pagination?.total || data.orders.length);
        }
      });
  };

  // Payouts Pagination
  const loadPayouts = (page = 1) => {
    const authHeaders = getAdminHeaders();
    if (!authHeaders['x-user-id'] && !authHeaders['x-user-email']) return;

    fetch(`/api/v1/payout/admin?page=${page}&limit=15`, {
      headers: authHeaders,
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.withdrawals) {
          setWithdrawals(data.withdrawals);
          setPayoutPage(data.pagination?.page || 1);
          setPayoutTotalPages(data.pagination?.totalPages || 1);
          setPayoutTotal(data.pagination?.total || data.withdrawals.length);
        }
      });
  };

  // Filter Audit Logs with Pagination
  const loadFilteredLogs = (days = logDays, entity = logEntityFilter, page = 1) => {
    const authHeaders = getAdminHeaders();
    if (!authHeaders['x-user-id'] && !authHeaders['x-user-email']) return;

    fetch(`/api/v1/admin/audit-logs?days=${days}&entityType=${entity}&page=${page}&limit=20`, {
      headers: authHeaders,
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.logs) {
          setAuditLogs(data.logs);
          setAuditTotal(data.totalCount);
          setLogPage(data.pagination?.page || 1);
          setLogTotalPages(data.pagination?.totalPages || 1);
          setLogTotal(data.pagination?.total || data.totalCount);
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
    const authHeaders = getAdminHeaders();
    try {
      const res = await fetch('/api/v1/payout/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          withdrawalId,
          providerReference: transferRef,
          actorUserId: authHeaders['x-user-id'],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyetujui payout.');

      alert('Payout berhasil disetujui dan mutasi buku besar telah diposting!');
      setApprovingId(null);
      setTransferRef('');
      loadDashboardData();
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
    const authHeaders = getAdminHeaders();
    setActionLoading(true);
    try {
      const res = await fetch('/api/v1/admin/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          action: 'CONFIRM_PAYMENT',
          orderId,
          providerReference: `MANUAL-BCA-${Date.now().toString().slice(-6)}`,
          actorUserId: authHeaders['x-user-id'],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal konfirmasi pembayaran.');

      alert('Pembayaran pesanan berhasil dikonfirmasi! Komisi jaringan dan buku besar telah diposting.');
      loadDashboardData();
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
    const authHeaders = getAdminHeaders();
    setActionLoading(true);
    try {
      const res = await fetch('/api/v1/admin/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          action: 'SHIP_ORDER',
          orderId: shippingModalOrder.id,
          courierName,
          trackingNumber: trackingNumber.trim(),
          actorUserId: authHeaders['x-user-id'],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memproses pengiriman.');

      alert(`Pesanan ${shippingModalOrder.orderNumber} berhasil diperbarui menjadi TERKIRIM (${courierName} - ${trackingNumber}).`);
      setShippingModalOrder(null);
      setTrackingNumber('');
      loadDashboardData();
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
    const authHeaders = getAdminHeaders();
    setActionLoading(true);
    try {
      const res = await fetch('/api/v1/admin/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          action: 'COMPLETE_ORDER',
          orderId,
          actorUserId: authHeaders['x-user-id'],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyelesaikan pesanan.');

      alert('Pesanan telah ditandai SELESAI.');
      loadDashboardData();
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
    const authHeaders = getAdminHeaders();
    try {
      const res = await fetch('/api/v1/network/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          memberCode: transferMemberCode.trim().toUpperCase(),
          newParentCode: transferNewParentCode.trim().toUpperCase(),
          reason: transferReason,
          actorUserId: authHeaders['x-user-id'],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memindahkan penempatan.');

      setTransferStatus({ type: 'success', message: data.message });
      setTransferMemberCode('');
      setTransferNewParentCode('');
      setTransferReason('');
      loadDashboardData();
    } catch (err: any) {
      setTransferStatus({ type: 'error', message: err.message });
    }
  };

  // Omni-Search Handler
  const handleOmniSearch = async (query: string) => {
    setOmniQuery(query);
    if (query.trim().length < 2) {
      setOmniResults(null);
      setShowOmniDropdown(false);
      return;
    }
    setOmniLoading(true);
    setShowOmniDropdown(true);
    try {
      const res = await fetch(`/api/v1/admin/search?q=${encodeURIComponent(query.trim())}`, {
        headers: getAdminHeaders(),
      });
      const data = await res.json();
      setOmniResults(data);
    } catch (e) {
      console.error('Omni search error:', e);
    } finally {
      setOmniLoading(false);
    }
  };

  // Batch Payout Handlers
  const handleSelectAllPayouts = () => {
    const requested = withdrawals.filter((w) => w.status === 'REQUESTED').map((w) => w.id);
    if (selectedPayouts.length === requested.length) {
      setSelectedPayouts([]);
    } else {
      setSelectedPayouts(requested);
    }
  };

  const handleTogglePayout = (id: string) => {
    setSelectedPayouts((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBatchApprovePayouts = async () => {
    if (selectedPayouts.length === 0) {
      alert('Pilih minimal satu permohonan penarikan dana.');
      return;
    }
    const authHeaders = getAdminHeaders();
    setBatchApproving(true);
    try {
      const res = await fetch('/api/v1/admin/payouts/batch-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          withdrawalIds: selectedPayouts,
          batchReference: batchRef.trim() || undefined,
          actorUserId: authHeaders['x-user-id'],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyetujui massal.');
      alert(data.message || 'Persetujuan massal berhasil dieksekusi!');
      setBatchModalOpen(false);
      setSelectedPayouts([]);
      setBatchRef('');
      loadDashboardData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBatchApproving(false);
    }
  };

  // Bulk Shipping Handler
  const handleBulkShipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkShipInput.trim()) {
      alert('Masukkan daftar resi pengiriman.');
      return;
    }
    const lines = bulkShipInput.split('\n').map((l) => l.trim()).filter(Boolean);
    const shipments: Array<{ orderNumber: string; courierName: string; trackingNumber: string }> = [];
    for (const line of lines) {
      const parts = line.split(',').map((p) => p.trim());
      if (parts.length >= 2) {
        shipments.push({
          orderNumber: parts[0],
          courierName: parts.length >= 3 ? parts[1] : 'JNE Express',
          trackingNumber: parts.length >= 3 ? parts[2] : parts[1],
        });
      }
    }
    if (shipments.length === 0) {
      alert('Format input tidak valid. Gunakan format baris: NO_ORDER, KURIR, NO_RESI');
      return;
    }
    setBulkShipLoading(true);
    const authHeaders = getAdminHeaders();
    try {
      const res = await fetch('/api/v1/admin/orders/bulk-ship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ shipments, actorUserId: authHeaders['x-user-id'] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memproses pengiriman massal.');
      alert(data.message || 'Pengiriman massal berhasil diproses!');
      setBulkShipModalOpen(false);
      setBulkShipInput('');
      loadDashboardData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBulkShipLoading(false);
    }
  };

  // Stockists Handlers
  const loadStockists = async () => {
    try {
      const res = await fetch('/api/v1/stockists', {
        headers: getAdminHeaders(),
      });
      const data = await res.json();
      if (data.stockists) setStockists(data.stockists);
    } catch (e) {
      console.error('Failed to load stockists:', e);
    }
  };

  const handleSaveStockist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStockistMemberCode || !newStockistCity) {
      alert('Lengkapi kode mitra dan kota wilayah stokis.');
      return;
    }
    setStockistLoading(true);
    const authHeaders = getAdminHeaders();
    try {
      const res = await fetch('/api/v1/stockists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          memberCode: newStockistMemberCode.trim().toUpperCase(),
          stockistType: newStockistType,
          stockistCity: newStockistCity.trim(),
          quotaDelta: Number(newStockistQuota) || 0,
          actorUserId: authHeaders['x-user-id'],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memperbarui stokis.');
      alert(data.message || 'Data stokis berhasil disimpan!');
      setNewStockistMemberCode('');
      setNewStockistCity('');
      loadStockists();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setStockistLoading(false);
    }
  };

  // WhatsApp Outbox Loader
  const loadWaOutbox = async () => {
    setWaOutboxLoading(true);
    try {
      const res = await fetch('/api/v1/admin/wa-outbox');
      const data = await res.json();
      if (data.messages) setWaOutboxMessages(data.messages);
    } catch (e) {
      console.error('Failed to load WA outbox:', e);
    } finally {
      setWaOutboxLoading(false);
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

  const menuItems = [
    {
      id: 'OVERVIEW',
      label: 'Arus Kas & Keuangan',
      icon: TrendingUp,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'ORDERS',
      label: 'Pesanan & Logistik',
      icon: Package,
      badge: ordersSummary?.paidReadyToShip > 0 ? ordersSummary.paidReadyToShip : null,
      badgeColor: 'bg-amber-500',
    },
    {
      id: 'PAYOUTS',
      label: 'Pencairan Payout',
      icon: CreditCard,
      badge: withdrawals.filter((w) => w.status === 'REQUESTED').length > 0
        ? withdrawals.filter((w) => w.status === 'REQUESTED').length
        : null,
      badgeColor: 'bg-rose-600',
    },
    {
      id: 'NETWORK',
      label: 'User & Jaringan',
      icon: Users,
      badge: stats?.inactiveMembersCount > 0 ? `${stats.inactiveMembersCount}` : null,
      badgeColor: 'bg-amber-600',
    },
    {
      id: 'STOCKIST',
      label: 'Pusat Stokis Hub',
      icon: MapPin,
      badge: null,
      badgeColor: '',
      onSelect: () => loadStockists(),
    },
    {
      id: 'LOGS',
      label: 'Audit Log 60 Hari',
      icon: FileText,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'OUTBOX',
      label: 'WhatsApp Gateway',
      icon: MessageSquare,
      badge: null,
      badgeColor: '',
      onSelect: () => loadWaOutbox(),
    },
  ];

  const currentTabInfo = menuItems.find((m) => m.id === activeTab) || menuItems[0];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row w-full bg-slate-50/70">
      {/* Mobile Slide-Over Backdrop (menempel persis di bawah header top-16) */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed top-16 inset-x-0 bottom-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* LEFT SIDEBAR (Desktop Sticky top-16 & Mobile Drawer menempel langsung di bawah header top-16) */}
      <aside
        className={`fixed top-16 bottom-0 left-0 h-[calc(100dvh-4rem)] z-[45] bg-varena-espresso text-varena-ivory-light flex flex-col border-r border-[#4A3B30] shadow-2xl transition-all duration-300 ease-in-out lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:z-20 ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } ${sidebarCollapsed ? 'lg:w-[72px]' : 'lg:w-[260px]'} w-[280px]`}
      >
        {/* Sidebar Header Brand / Title */}
        <div className="h-14 lg:h-16 flex items-center justify-between px-4 border-b border-[#4A3B30] bg-[#2A1D16] lg:bg-transparent flex-shrink-0">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-varena-gold/20 border border-varena-gold/40 flex items-center justify-center flex-shrink-0 text-varena-gold shadow-sm">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="truncate">
                <div className="font-serif font-bold text-sm tracking-wide text-varena-gold-light uppercase truncate">
                  VARENA Console
                </div>
                <div className="text-[10px] text-varena-taupe-light font-mono truncate">
                  Pusat Kendali Bisnis
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <div className="w-9 h-9 rounded-lg bg-varena-gold/20 border border-varena-gold/40 flex items-center justify-center text-varena-gold shadow-sm" title="VARENA Console">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
          )}

          {/* Mobile Close Button */}
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-varena-ivory-light hover:text-white bg-white/10 hover:bg-white/20 transition flex items-center gap-1.5 lg:hidden shadow-sm border border-white/10"
            aria-label="Tutup Menu"
          >
            <X className="w-3.5 h-3.5" />
            <span>Tutup</span>
          </button>
        </div>

        {/* Navigation Items List */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  if (item.onSelect) item.onSelect();
                  setMobileSidebarOpen(false);
                }}
                title={sidebarCollapsed ? item.label : undefined}
                className={`w-full relative flex items-center rounded-xl transition-all duration-150 text-xs ${sidebarCollapsed ? 'justify-center p-3' : 'px-3.5 py-2.5 gap-3'
                  } ${isActive
                    ? 'bg-varena-gold text-varena-espresso font-bold shadow-md shadow-black/20'
                    : 'text-varena-ivory/80 hover:text-white hover:bg-white/10 font-medium'
                  }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-varena-espresso' : 'text-varena-gold-light'}`} />
                {!sidebarCollapsed && (
                  <div className="flex-1 flex items-center justify-between text-left truncate">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold text-white ${item.badgeColor || 'bg-amber-500'}`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
                {sidebarCollapsed && item.badge && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-varena-espresso" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer with Collapse Toggle & Current User Info */}
        <div className="p-3 border-t border-[#4A3B30] space-y-2">
          {!sidebarCollapsed && currentUser && (
            <div className="p-2.5 rounded-xl bg-black/25 border border-[#524134] text-xs">
              <div className="font-semibold text-varena-ivory truncate">{currentUser.displayName}</div>
              <div className="text-[10px] text-varena-gold font-mono uppercase truncate mt-0.5">
                {currentUser.roles?.join(', ')}
              </div>
            </div>
          )}

          {/* Desktop Expand / Collapse Button */}
          <button
            onClick={toggleSidebar}
            className="hidden lg:flex w-full items-center justify-center p-2 rounded-lg text-varena-taupe-light hover:text-white hover:bg-white/10 transition text-xs gap-2"
            title={sidebarCollapsed ? 'Perbesar Menu' : 'Perkecil Menu'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4 text-varena-gold-light" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 text-varena-gold-light" />
                <span className="text-[11px] font-medium">Perkecil Panel</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* RIGHT WORKSPACE (FLEX-1) */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Sticky Topbar inside Workspace (z-30 under navbar z-50) */}
        <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-varena-taupe/20 px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger Button (Mobile Only) */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-varena-taupe/30 text-varena-espresso hover:bg-varena-ivory transition flex-shrink-0"
              aria-label="Buka Menu Navigasi Admin"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <div className="text-[10px] uppercase font-mono font-bold text-varena-gold tracking-wider">
                Panel Modul
              </div>
              <h1 className="font-serif text-base sm:text-xl font-bold text-varena-espresso truncate">
                {currentTabInfo.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <div className="text-right hidden md:block">
              <div className="text-xs font-semibold text-varena-espresso">{currentUser?.displayName}</div>
              <div className="text-[10px] text-varena-gold font-mono uppercase">{currentUser?.roles?.join(', ')}</div>
            </div>
            {/* Quick Refresh Button */}
            <button
              onClick={() => loadDashboardData()}
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg border border-varena-taupe/30 text-xs font-semibold hover:bg-varena-ivory flex items-center gap-1.5 shadow-sm bg-white text-varena-espresso transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Segarkan</span>
            </button>
          </div>
        </div>

        {/* Global Omni-Search Bar & Quick Filter (Clean z-20 so it scrolls smoothly under sticky header) */}
        <div className="px-4 sm:px-6 lg:px-8 pt-4">
          <div className="relative z-20">
            <div className="relative">
              <Search className="w-4 h-4 text-varena-taupe absolute left-3.5 top-3" />
              <input
                type="text"
                value={omniQuery}
                onChange={(e) => handleOmniSearch(e.target.value)}
                onFocus={() => { if (omniQuery.length >= 2) setShowOmniDropdown(true); }}
                placeholder="Cari kode mitra, nomor pesanan, resi kurir, atau rekening bank..."
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-varena-taupe/30 text-xs focus:outline-none focus:border-varena-gold bg-white shadow-sm font-medium"
              />
              {omniLoading && (
                <RefreshCw className="w-4 h-4 text-varena-gold absolute right-3.5 top-3 animate-spin" />
              )}
            </div>

            {/* Dropdown Hasil Omni-Search */}
            {showOmniDropdown && omniResults && (
              <div className="absolute top-12 left-0 right-0 bg-white rounded-2xl shadow-2xl border border-varena-gold/40 max-h-[480px] overflow-y-auto p-4 space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-xs font-semibold text-varena-espresso">
                    Hasil Pencarian: &ldquo;{omniQuery}&rdquo; ({omniResults.totalMatches || 0} kecocokan ditemukan)
                  </span>
                  <button
                    onClick={() => setShowOmniDropdown(false)}
                    className="text-xs text-varena-taupe hover:text-varena-espresso font-bold"
                  >
                    ✕ Tutup
                  </button>
                </div>

                {/* Grup 1: Mitra Jaringan */}
                {omniResults.members?.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-varena-espresso uppercase flex items-center gap-1.5 mb-2">
                      <Users className="w-3.5 h-3.5 text-varena-gold" />
                      <span>Mitra Jaringan ({omniResults.members.length})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {omniResults.members.map((m: any) => (
                        <div
                          key={m.id}
                          onClick={() => {
                            setActiveTab('NETWORK');
                            setShowOmniDropdown(false);
                          }}
                          className="p-2.5 rounded-lg border border-varena-taupe/20 hover:border-varena-gold cursor-pointer bg-varena-ivory-light/30 transition flex justify-between items-center"
                        >
                          <div>
                            <div className="font-bold text-varena-espresso">{m.displayName} <span className="font-mono text-[10px] text-varena-gold">({m.memberCode})</span></div>
                            <div className="text-[10px] text-varena-taupe">{m.user?.phone || m.user?.email || '-'}</div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${m.memberStatus === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {m.memberStatus}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grup 2: Pesanan & Logistik */}
                {omniResults.orders?.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-varena-espresso uppercase flex items-center gap-1.5 mb-2">
                      <Package className="w-3.5 h-3.5 text-varena-gold" />
                      <span>Pesanan & Logistik ({omniResults.orders.length})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {omniResults.orders.map((o: any) => (
                        <div
                          key={o.id}
                          onClick={() => {
                            setActiveTab('ORDERS');
                            setOrderSearchQuery(o.orderNumber);
                            setShowOmniDropdown(false);
                          }}
                          className="p-2.5 rounded-lg border border-varena-taupe/20 hover:border-varena-gold cursor-pointer bg-varena-ivory-light/30 transition flex justify-between items-center"
                        >
                          <div>
                            <div className="font-mono font-bold text-varena-espresso">{o.orderNumber}</div>
                            <div className="text-[10px] text-varena-taupe">{o.buyerName} · Rp{o.total?.toLocaleString('id-ID')}</div>
                            {o.trackingNumber && (
                              <div className="text-[10px] text-blue-700 font-mono">Resi: {o.trackingNumber} ({o.courierName})</div>
                            )}
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800">
                            {o.orderStatus}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grup 3: Permohonan Payout */}
                {omniResults.payouts?.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-varena-espresso uppercase flex items-center gap-1.5 mb-2">
                      <CreditCard className="w-3.5 h-3.5 text-varena-gold" />
                      <span>Pencairan Dana Finance ({omniResults.payouts.length})</span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      {omniResults.payouts.map((p: any) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setActiveTab('PAYOUTS');
                            setShowOmniDropdown(false);
                          }}
                          className="p-2 rounded-lg border border-varena-taupe/20 hover:border-varena-gold cursor-pointer bg-white transition flex justify-between items-center"
                        >
                          <div>
                            <span className="font-bold text-varena-espresso">{p.member?.displayName}</span> · <span className="font-mono text-emerald-800 font-bold">Rp{p.netAmount?.toLocaleString('id-ID')}</span>
                            <div className="text-[10px] text-varena-taupe">{p.bankName} - {p.accountNumberMasked} (a.n {p.accountHolder})</div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                            {p.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grup 4: Mutasi Buku Besar (Double-Entry Ledger) */}
                {omniResults.ledger?.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-varena-espresso uppercase flex items-center gap-1.5 mb-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Mutasi Buku Besar ACID ({omniResults.ledger.length})</span>
                    </div>
                    <div className="space-y-1 text-[11px]">
                      {omniResults.ledger.map((l: any) => (
                        <div key={l.id} className="p-2 rounded bg-slate-50 border border-slate-200 flex justify-between items-center">
                          <div>
                            <span className="font-mono font-bold text-varena-espresso">{l.referenceType}</span>
                            <div className="text-[10px] text-varena-taupe">{l.memo}</div>
                          </div>
                          <span className="font-mono text-[10px] text-varena-taupe">{new Date(l.createdAt).toLocaleDateString('id-ID')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {omniResults.totalMatches === 0 && (
                  <div className="text-center py-6 text-xs text-varena-taupe">
                    Tidak ada data yang cocok dengan &ldquo;{omniQuery}&rdquo;.
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Module Content Workspace */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 space-y-6">

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
                      <span className="text-varena-taupe">Penjualan Produk (Box & Sachet):</span>
                      <span className="font-mono font-bold text-varena-espresso">
                        Rp{(stats?.productSales || stats?.grossSales || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-varena-taupe/10">
                      <span className="text-varena-taupe">Penerimaan Ongkir Member:</span>
                      <span className="font-mono font-bold text-emerald-700">
                        Rp{(stats?.shippingCollected || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 font-semibold text-emerald-800">
                      <span>Total Kas Masuk Diterima:</span>
                      <span className="font-mono">Rp{(stats?.grossSales || 0).toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-varena-taupe/20 space-y-3">
                  <span className="text-xs text-varena-taupe font-semibold uppercase tracking-wider block">
                    Beban & Biaya Operasional (Outflow)
                  </span>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-varena-taupe/10">
                      <span className="text-varena-taupe">Beban HPP Produk:</span>
                      <span className="font-mono font-bold text-rose-700">
                        Rp{(stats?.totalHpp || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-varena-taupe/10">
                      <span className="text-varena-taupe">Komisi Mitra (Terposting):</span>
                      <span className="font-mono font-bold text-varena-espresso">
                        Rp{(stats?.totalCommissionDistributed || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-varena-taupe/10">
                      <span className="text-varena-taupe">Beban Ongkir Stokis (Kantor):</span>
                      <span className="font-mono font-bold text-amber-800">
                        Rp{(stats?.stockistShippingExpense || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 font-semibold text-slate-700">
                      <span>Total Pencairan Ditransfer:</span>
                      <span className="font-mono">Rp{(stats?.totalPayoutDisbursed || 0).toLocaleString('id-ID')}</span>
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
                    <table className="w-full text-xs text-left min-w-[600px]">
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
                  className={`p-3 rounded-xl border text-left transition ${orderStatusFilter === 'ALL'
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
                  className={`p-3 rounded-xl border text-left transition ${orderStatusFilter === 'PENDING_PAYMENT'
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
                  className={`p-3 rounded-xl border text-left transition ${orderStatusFilter === 'PAID'
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
                  className={`p-3 rounded-xl border text-left transition ${orderStatusFilter === 'SHIPPED'
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
                  className={`p-3 rounded-xl border text-left transition ${orderStatusFilter === 'COMPLETED'
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
                    placeholder="Cari nomor pesanan, nama pembeli, telepon, atau resi..."
                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-varena-taupe/30 text-xs focus:outline-none focus:border-varena-gold bg-white"
                  />
                </div>
                <button
                  onClick={() => loadFilteredOrders(orderStatusFilter, orderSearchQuery)}
                  className="px-4 py-2 rounded-lg bg-varena-espresso text-varena-gold-light font-semibold text-xs hover:bg-varena-espresso-dark transition shadow"
                >
                  Cari Pesanan
                </button>
                <button
                  onClick={() => setBulkShipModalOpen(true)}
                  className="px-4 py-2 rounded-lg bg-varena-gold text-varena-espresso font-semibold text-xs hover:bg-varena-gold-hover transition shadow flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Bulk Resi Pengiriman</span>
                </button>
              </div>

              {/* Payment Proof Review Section */}
              {paymentProofOrders.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-300 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <h3 className="font-serif font-bold text-amber-900">
                      Konfirmasi Transfer Manual ({paymentProofOrders.length} pesanan)
                    </h3>
                  </div>
                  <p className="text-xs text-amber-800">
                    Pesanan berikut memiliki bukti transfer yang dikirim member dan menunggu verifikasi admin.
                  </p>
                  <div className="space-y-2">
                    {paymentProofOrders.map((o) => (
                      <div key={o.id} className="p-3 rounded-lg bg-white border border-amber-200 space-y-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="font-mono font-bold text-varena-espresso text-sm">{o.orderNumber}</div>
                            <div className="text-xs text-varena-taupe">{o.buyerName} · Rp{o.total?.toLocaleString('id-ID')}</div>
                            {o.senderBankName && (
                              <div className="text-xs text-stone-600 mt-0.5">
                                Bank: <strong>{o.senderBankName}</strong> · a.n. <strong>{o.senderAccountName}</strong> · Transfer: <strong>Rp{o.transferAmountPaid?.toLocaleString('id-ID')}</strong>
                              </div>
                            )}
                            {o.transferNotes && (
                              <div className="text-xs italic text-stone-500">Catatan: {o.transferNotes}</div>
                            )}
                          </div>
                          <div className="flex gap-2 flex-wrap items-center">
                            {o.paymentProofUrl && (
                              <a
                                href={o.paymentProofUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1 text-[11px] rounded bg-blue-100 text-blue-800 font-semibold border border-blue-200 hover:bg-blue-200 transition"
                              >
                                Lihat Bukti Transfer
                              </a>
                            )}
                            <button
                              onClick={async () => {
                                if (!confirm(`Verifikasi & tandai lunas pesanan ${o.orderNumber}?`)) return;
                                setActionLoading(true);
                                try {
                                  const authHeaders = getAdminHeaders();
                                  const res = await fetch('/api/v1/admin/orders', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', ...authHeaders },
                                    body: JSON.stringify({ action: 'CONFIRM_PAYMENT', orderId: o.id, actorUserId: authHeaders['x-user-id'] }),
                                  });
                                  const d = await res.json();
                                  if (!res.ok) throw new Error(d.error);
                                  alert('Pembayaran berhasil diverifikasi & komisi telah dihitung!');
                                  setPaymentProofOrders(prev => prev.filter(x => x.id !== o.id));
                                  loadFilteredOrders();
                                } catch (e: any) { alert(e.message); } finally { setActionLoading(false); }
                              }}
                              disabled={actionLoading}
                              className="px-2.5 py-1 text-[11px] rounded bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition"
                            >
                              ✓ Verifikasi & Lunas
                            </button>
                            <button
                              onClick={async () => {
                                if (!confirm(`Tolak konfirmasi transfer pesanan ${o.orderNumber}? Member perlu mengulang konfirmasi.`)) return;
                                setRejectingPaymentId(o.id);
                                try {
                                  const res = await fetch('/api/v1/orders/confirm-payment', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ orderId: o.id, action: 'REJECT' }),
                                  });
                                  const d = await res.json();
                                  if (!res.ok) throw new Error(d.error);
                                  setPaymentProofOrders(prev => prev.filter(x => x.id !== o.id));
                                  loadFilteredOrders();
                                } catch (e: any) { alert(e.message); } finally { setRejectingPaymentId(null); }
                              }}
                              disabled={rejectingPaymentId === o.id}
                              className="px-2 py-1 text-[11px] rounded bg-rose-100 text-rose-800 font-semibold border border-rose-200 hover:bg-rose-200 transition"
                            >
                              ✗ Tolak
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                  <>
                    <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left min-w-[900px]">
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
                              <button
                                type="button"
                                onClick={() => setViewOrderDetail(o)}
                                className="text-left group cursor-pointer"
                                title="Klik untuk lihat detail transaksi lengkap"
                              >
                                <div className="font-mono font-bold text-varena-espresso group-hover:text-amber-800 flex items-center gap-1 transition">
                                  <span>{o.orderNumber}</span>
                                  <Eye className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-800 transition" />
                                </div>
                                <div className="text-[10px] text-varena-taupe">
                                  {new Date(o.createdAt).toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </div>
                              </button>
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
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold block w-fit mb-1 ${o.orderStatus === 'COMPLETED'
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

                              <button
                                type="button"
                                onClick={() => setViewOrderDetail(o)}
                                className="text-[10px] text-stone-500 hover:text-varena-espresso underline block mt-1 ml-auto"
                              >
                                Detail Transaksi →
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                    <div className="p-3 border-t border-varena-taupe/15">
                      <Pagination
                        currentPage={orderPage}
                        totalPages={orderTotalPages}
                        totalItems={orderTotal}
                        onPageChange={(p) => loadFilteredOrders(orderStatusFilter, orderSearchQuery, p)}
                      />
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-xs text-varena-taupe">
                    Tidak ada pesanan yang sesuai dengan filter pencarian saat ini.
                  </div>
                )}
              </div>

              {/* Modal Detail & Audit Pesanan Admin */}
              {viewOrderDetail && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
                  <div className="bg-white rounded-2xl max-w-2xl w-full border border-varena-taupe/20 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
                    {/* Header */}
                    <div className="p-4 sm:p-5 bg-varena-espresso text-varena-gold-light flex items-center justify-between flex-shrink-0">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-varena-gold/20 flex items-center justify-center text-varena-gold">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-serif font-bold text-base text-white">Rincian Lengkap Pesanan</h3>
                          <div className="text-[11px] text-varena-gold-light/80 font-mono mt-0.5">
                            {viewOrderDetail.orderNumber}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setViewOrderDetail(null)}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-5 sm:p-6 space-y-4 overflow-y-auto text-xs">
                      {/* Status and Timestamp Summary */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                        <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                          <div className="text-[10px] text-stone-500 uppercase font-bold">Status Pesanan</div>
                          <div className="font-bold text-xs mt-1 text-varena-espresso">{viewOrderDetail.orderStatus}</div>
                        </div>
                        <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                          <div className="text-[10px] text-stone-500 uppercase font-bold">Tipe Order</div>
                          <div className="font-bold text-xs mt-1 text-varena-espresso">{viewOrderDetail.orderType}</div>
                        </div>
                        <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                          <div className="text-[10px] text-stone-500 uppercase font-bold">Total Nilai</div>
                          <div className="font-bold text-xs mt-1 text-varena-espresso font-mono">Rp{viewOrderDetail.total.toLocaleString('id-ID')}</div>
                        </div>
                        <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                          <div className="text-[10px] text-stone-500 uppercase font-bold">Tanggal Order</div>
                          <div className="font-semibold text-[11px] mt-1 text-varena-espresso">
                            {new Date(viewOrderDetail.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                      </div>

                      {/* Customer & Shipping Details */}
                      <div className="p-4 rounded-xl bg-varena-ivory-light border border-varena-taupe/20 space-y-2">
                        <div className="font-bold text-varena-espresso text-xs flex items-center gap-1.5 border-b border-varena-taupe/20 pb-1.5">
                          <MapPin className="w-4 h-4 text-varena-gold" />
                          <span>Penerima & Alamat Pengiriman</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                          <div>
                            <div className="text-stone-500 font-semibold">Nama Pembeli / Penerima:</div>
                            <div className="font-bold text-varena-espresso text-xs">{viewOrderDetail.buyerName}</div>
                            <div className="text-stone-600 font-mono mt-0.5">{viewOrderDetail.buyerPhone}</div>
                            {viewOrderDetail.buyerEmail && <div className="text-stone-600">{viewOrderDetail.buyerEmail}</div>}
                          </div>
                          <div>
                            <div className="text-stone-500 font-semibold">Alamat Tujuan:</div>
                            <div className="text-varena-espresso leading-relaxed">{viewOrderDetail.shippingAddress}</div>
                            {(viewOrderDetail.shippingDistrict || viewOrderDetail.shippingCity) && (
                              <div className="text-stone-600 mt-0.5">
                                {[viewOrderDetail.shippingDistrict, viewOrderDetail.shippingCity, viewOrderDetail.shippingProvince, viewOrderDetail.shippingPostalCode].filter(Boolean).join(', ')}
                              </div>
                            )}
                            {viewOrderDetail.shippingNotes && (
                              <div className="text-stone-500 italic mt-1">Catatan kurir: {viewOrderDetail.shippingNotes}</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Items Ordered */}
                      <div className="p-4 rounded-xl bg-white border border-varena-taupe/20 space-y-2">
                        <div className="font-bold text-varena-espresso text-xs border-b border-varena-taupe/20 pb-1.5">
                          Rincian Produk ({viewOrderDetail.items?.length || 0} Item)
                        </div>
                        <div className="divide-y divide-varena-taupe/10">
                          {viewOrderDetail.items?.map((it: any) => (
                            <div key={it.id} className="py-2 flex items-center justify-between text-[11px]">
                              <div>
                                <span className="font-bold text-varena-espresso">{it.quantity}x</span> {it.nameSnapshot}
                                <span className="text-[10px] text-stone-400 font-mono ml-2">SKU: {it.skuSnapshot}</span>
                              </div>
                              <div className="font-mono font-bold text-varena-espresso">
                                Rp{(it.lineTotal || it.unitPrice * it.quantity).toLocaleString('id-ID')}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Logistics & Tracking */}
                      <div className="p-4 rounded-xl bg-white border border-varena-taupe/20 space-y-2">
                        <div className="font-bold text-varena-espresso text-xs flex items-center gap-1.5 border-b border-varena-taupe/20 pb-1.5">
                          <Truck className="w-4 h-4 text-varena-gold" />
                          <span>Status Pengiriman Kurir</span>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                          <div>
                            <div className="text-stone-500">Ekspedisi Kurir:</div>
                            <div className="font-bold text-varena-espresso">{viewOrderDetail.courierName || 'Belum Ditentukan'}</div>
                          </div>
                          <div>
                            <div className="text-stone-500">Nomor Resi:</div>
                            <div className="font-mono font-bold text-varena-espresso">
                              {viewOrderDetail.trackingNumber || 'Belum Ada Resi'}
                            </div>
                          </div>
                          <div>
                            <div className="text-stone-500">Sumber Pemenuhan:</div>
                            <div className="font-medium text-varena-espresso">{viewOrderDetail.fulfillmentSource}</div>
                          </div>
                        </div>
                      </div>

                      {/* Manual Transfer Proof If Present */}
                      {viewOrderDetail.paymentConfirmationStatus && viewOrderDetail.paymentConfirmationStatus !== 'NONE' && (
                        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 space-y-2">
                          <div className="font-bold text-amber-950 text-xs flex items-center gap-1.5 border-b border-amber-200 pb-1.5">
                            <CreditCard className="w-4 h-4 text-amber-700" />
                            <span>Data Konfirmasi Transfer Manual</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                            <div>Bank Asal: <strong>{viewOrderDetail.senderBankName || '-'}</strong></div>
                            <div>Nama Pemilik: <strong>{viewOrderDetail.senderAccountName || '-'}</strong></div>
                            <div>Nominal Ditransfer: <strong className="font-mono">Rp{viewOrderDetail.transferAmountPaid?.toLocaleString('id-ID') || '-'}</strong></div>
                            <div>Status Konfirmasi: <strong className="text-amber-800">{viewOrderDetail.paymentConfirmationStatus}</strong></div>
                          </div>
                          {viewOrderDetail.transferNotes && (
                            <div className="text-[11px] text-stone-600 italic">Catatan: {viewOrderDetail.transferNotes}</div>
                          )}
                          {viewOrderDetail.paymentProofUrl && (
                            <div className="pt-1">
                              <a
                                href={viewOrderDetail.paymentProofUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block px-3 py-1 text-xs rounded bg-amber-700 hover:bg-amber-800 text-white font-semibold transition"
                              >
                                Buka Foto Bukti Transfer ↗
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-stone-50 border-t border-varena-taupe/20 flex flex-col sm:flex-row justify-between items-center gap-2 flex-shrink-0">
                      <div className="text-stone-500 text-[11px]">
                        VARENA Order Management
                      </div>
                      <div className="flex gap-2">
                        {viewOrderDetail.orderStatus === 'PENDING_PAYMENT' && (
                          <button
                            type="button"
                            onClick={() => {
                              const o = viewOrderDetail;
                              setViewOrderDetail(null);
                              handleConfirmOrderPayment(o.id);
                            }}
                            className="py-2 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition"
                          >
                            Konfirmasi Lunas Sekarang
                          </button>
                        )}
                        {viewOrderDetail.orderStatus === 'PAID' && (
                          <button
                            type="button"
                            onClick={() => {
                              const o = viewOrderDetail;
                              setViewOrderDetail(null);
                              setShippingModalOrder(o);
                              setTrackingNumber(`JNE-${Date.now().toString().slice(-8)}-ID`);
                            }}
                            className="py-2 px-3 rounded-lg bg-varena-espresso hover:bg-varena-espresso-dark text-varena-gold-light font-semibold text-xs transition"
                          >
                            Input Resi & Kirim
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setViewOrderDetail(null)}
                          className="py-2 px-4 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 font-semibold text-xs transition"
                        >
                          Tutup
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Input Resi Kurir Pengiriman */}
              {shippingModalOrder && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-varena-gold/40 max-h-[90vh] overflow-y-auto">
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

              {/* Modal Bulk Input Resi Pengiriman Massal */}
              {bulkShipModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-varena-gold/40 max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-varena-taupe/20 pb-3">
                      <h3 className="font-serif text-lg font-bold text-varena-espresso flex items-center gap-2">
                        <Truck className="w-5 h-5 text-varena-gold" />
                        <span>Input Resi Pengiriman Massal (Bulk Shipping)</span>
                      </h3>
                      <button
                        onClick={() => setBulkShipModalOpen(false)}
                        className="text-varena-taupe hover:text-varena-espresso text-sm font-bold"
                      >
                        ✕
                      </button>
                    </div>

                    <p className="text-xs text-varena-taupe leading-relaxed">
                      Tempel data resi dari manifest ekspedisi logistik. Satu pesanan per baris dengan format CSV:<br />
                      <code className="font-mono bg-varena-ivory px-1.5 py-0.5 rounded text-[11px] font-bold text-varena-espresso">NOMOR_PESANAN, NAMA_KURIR, NOMOR_RESI</code>
                    </p>

                    <form onSubmit={handleBulkShipSubmit} className="space-y-3 text-xs">
                      <div>
                        <label className="block font-semibold text-varena-espresso mb-1">
                          Data Resi Ekspedisi (Baris per Baris) *
                        </label>
                        <textarea
                          rows={6}
                          required
                          value={bulkShipInput}
                          onChange={(e) => setBulkShipInput(e.target.value)}
                          placeholder={`VRN-ORD-202611-1001, JNE Express, JNE882019482ID\nVRN-ORD-202611-1002, SiCepat, SCP992100412ID\nVRN-ORD-202611-1003, J&T Express, JT100293884ID`}
                          className="w-full px-3 py-2 rounded-lg border border-varena-taupe/30 font-mono text-xs focus:outline-none focus:border-varena-gold bg-slate-50"
                        />
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setBulkShipModalOpen(false)}
                          className="flex-1 py-2 rounded-lg border border-varena-taupe/30 text-varena-taupe hover:bg-varena-ivory transition"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          disabled={bulkShipLoading}
                          className="flex-1 py-2 rounded-lg bg-varena-espresso text-varena-gold-light font-semibold hover:bg-varena-espresso-dark transition shadow"
                        >
                          {bulkShipLoading ? 'Memproses Resi...' : 'Proses Pengiriman Massal'}
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

                {/* Batch Action Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-varena-ivory-light border border-varena-taupe/20">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllPayouts}
                      className="px-3 py-1.5 rounded-lg border border-varena-taupe/30 bg-white text-xs font-semibold hover:bg-varena-ivory flex items-center gap-1.5 text-varena-espresso transition"
                    >
                      {selectedPayouts.length > 0 && selectedPayouts.length === withdrawals.filter((w) => w.status === 'REQUESTED').length ? (
                        <CheckSquare className="w-4 h-4 text-varena-gold" />
                      ) : (
                        <Square className="w-4 h-4 text-varena-taupe" />
                      )}
                      <span>Pilih Semua Menunggu ({withdrawals.filter((w) => w.status === 'REQUESTED').length})</span>
                    </button>
                    {selectedPayouts.length > 0 && (
                      <span className="text-xs font-mono font-bold text-varena-espresso bg-varena-gold/20 px-2 py-1 rounded border border-varena-gold/40">
                        {selectedPayouts.length} permohonan dipilih
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href="/api/v1/admin/payouts/batch-export?status=REQUESTED"
                      download="varena_batch_payout_export.csv"
                      className="px-3 py-1.5 rounded-lg border border-varena-taupe/30 bg-white text-xs font-semibold hover:bg-varena-ivory flex items-center gap-1.5 text-varena-espresso shadow-sm transition"
                    >
                      <Download className="w-3.5 h-3.5 text-varena-gold" />
                      <span>Export CSV Bank Transfer</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        if (selectedPayouts.length === 0) {
                          alert('Pilih minimal satu permohonan penarikan.');
                          return;
                        }
                        setBatchRef(`BATCH-BCA-${Date.now().toString().slice(-6)}`);
                        setBatchModalOpen(true);
                      }}
                      disabled={selectedPayouts.length === 0}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-700 text-white font-semibold text-xs hover:bg-emerald-800 disabled:opacity-50 transition shadow flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve Massal ({selectedPayouts.length})</span>
                    </button>
                  </div>
                </div>

                {withdrawals.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left min-w-[950px]">
                      <thead className="bg-varena-ivory-light text-varena-taupe uppercase font-semibold border-b border-varena-taupe/20">
                        <tr>
                          <th className="py-2.5 px-3 w-8">#</th>
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
                            <td className="py-2.5 px-3">
                              {w.status === 'REQUESTED' ? (
                                <input
                                  type="checkbox"
                                  checked={selectedPayouts.includes(w.id)}
                                  onChange={() => handleTogglePayout(w.id)}
                                  className="rounded border-varena-taupe/40 cursor-pointer"
                                />
                              ) : (
                                <span className="text-slate-300 text-xs">-</span>
                              )}
                            </td>
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
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${w.status === 'PAID' || w.status === 'APPROVED'
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

                    <div className="p-3 border-t border-varena-taupe/15">
                      <Pagination
                        currentPage={payoutPage}
                        totalPages={payoutTotalPages}
                        totalItems={payoutTotal}
                        onPageChange={(p) => loadPayouts(p)}
                      />
                    </div>
                  </>
                ) : (
                  <div className="text-center py-10 text-xs text-varena-taupe bg-varena-ivory-light rounded-xl border border-dashed border-varena-taupe/30">
                    Tidak ada permohonan penarikan dana saat ini.
                  </div>
                )}
              </div>

              {/* Modal Batch Payout Approval */}
              {batchModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-varena-gold/40 max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-varena-taupe/20 pb-3">
                      <h3 className="font-serif text-lg font-bold text-varena-espresso flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                        <span>Persetujuan Pencairan Dana Massal</span>
                      </h3>
                      <button
                        onClick={() => setBatchModalOpen(false)}
                        className="text-varena-taupe hover:text-varena-espresso text-sm font-bold"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                      <div className="flex justify-between font-semibold text-emerald-900">
                        <span>Jumlah Permohonan:</span>
                        <span>{selectedPayouts.length} Mitra</span>
                      </div>
                      <div className="flex justify-between text-emerald-800">
                        <span>Total Bersih Ditransfer:</span>
                        <span className="font-mono font-bold">
                          Rp{withdrawals
                            .filter((w) => selectedPayouts.includes(w.id))
                            .reduce((sum, w) => sum + w.netAmount, 0)
                            .toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="block font-semibold text-varena-espresso mb-1">
                          Nomor Referensi Batch Bank / KlikBCA / Mandiri MCM *
                        </label>
                        <input
                          type="text"
                          required
                          value={batchRef}
                          onChange={(e) => setBatchRef(e.target.value)}
                          placeholder="Contoh: BATCH-BCA-881920"
                          className="w-full px-3 py-2 rounded-lg border border-varena-taupe/30 font-mono font-bold uppercase focus:outline-none focus:border-varena-gold"
                        />
                        <p className="text-[11px] text-varena-taupe mt-1">
                          Nomor ini akan dicatat di buku besar ACID dan jejak audit 60 hari untuk seluruh permohonan yang disetujui.
                        </p>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setBatchModalOpen(false)}
                          className="flex-1 py-2 rounded-lg border border-varena-taupe/30 text-varena-taupe hover:bg-varena-ivory transition"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={handleBatchApprovePayouts}
                          disabled={batchApproving}
                          className="flex-1 py-2 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition shadow"
                        >
                          {batchApproving ? 'Memproses...' : 'Eksekusi Persetujuan Massal'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
                    <table className="w-full text-xs text-left min-w-[600px]">
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
                    className={`p-3 rounded-lg text-xs flex items-center gap-2 ${transferStatus.type === 'success'
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
                  <>
                    <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left min-w-[600px]">
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

                    <div className="p-3 border-t border-varena-taupe/15">
                      <Pagination
                        currentPage={logPage}
                        totalPages={logTotalPages}
                        totalItems={logTotal}
                        onPageChange={(p) => loadFilteredLogs(logDays, logEntityFilter, p)}
                      />
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-xs text-varena-taupe bg-varena-ivory-light rounded-xl border border-dashed border-varena-taupe/30">
                    Tidak ada riwayat audit log pada rentang waktu ini.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* TAB 6: REGIONAL STOCKIST HUBS (MASTER & MOBILE STOKIS) */}
          {/* ==================================================================== */}
          {activeTab === 'STOCKIST' && (
            <div className="space-y-6">
              {/* Stockist Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="bg-white p-5 rounded-2xl border border-varena-taupe/20 space-y-1">
                  <span className="text-varena-taupe">Master Stokis Wilayah</span>
                  <div className="font-serif text-2xl font-bold text-varena-gold-dark">
                    {stockists.filter((s) => s.type === 'MASTER').length} Hub Utama
                  </div>
                  <div className="text-[10px] text-varena-taupe">Pusat logistik pengadaan regional per provinsi/kota besar</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-varena-taupe/20 space-y-1">
                  <span className="text-varena-taupe">Mobile Stokis Jaringan</span>
                  <div className="font-serif text-2xl font-bold text-blue-800">
                    {stockists.filter((s) => s.type === 'MOBILE').length} Titik Distribusi
                  </div>
                  <div className="text-[10px] text-varena-taupe">Distribusi cepat tingkat kabupaten/kota untuk supply mitra</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-varena-taupe/20 space-y-1">
                  <span className="text-varena-taupe">Total Kuota Stok Wilayah</span>
                  <div className="font-serif text-2xl font-bold text-emerald-800">
                    {stockists.reduce((sum, s) => sum + (s.inventory || 0), 0)} Box
                  </div>
                  <div className="text-[10px] text-varena-taupe">Total inventori fisik yang teralokasi di seluruh hub stokis</div>
                </div>
              </div>

              {/* Form Penunjukan & Penyesuaian Kuota Stokis */}
              <div className="bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-varena-gold" />
                  <h3 className="font-serif text-base font-bold text-varena-espresso">
                    Penunjukan Otoritas & Alokasi Kuota Stokis Regional
                  </h3>
                </div>
                <p className="text-xs text-varena-taupe">
                  Tetapkan mitra yang memenuhi kualifikasi sebagai Master Stokis atau Mobile Stokis untuk mempercepat rantai pasok produk di wilayah tertentu.
                </p>

                <form onSubmit={handleSaveStockist} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-varena-espresso mb-1">Kode ID Mitra *</label>
                    <input
                      type="text"
                      required
                      value={newStockistMemberCode}
                      onChange={(e) => setNewStockistMemberCode(e.target.value)}
                      placeholder="Contoh: VRN-0002"
                      className="w-full px-3 py-2 rounded-lg border border-varena-taupe/30 uppercase font-mono focus:outline-none focus:border-varena-gold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-varena-espresso mb-1">Tingkatan Stokis *</label>
                    <select
                      value={newStockistType}
                      onChange={(e) => setNewStockistType(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-varena-taupe/30 bg-white focus:outline-none focus:border-varena-gold"
                    >
                      <option value="MASTER">Master Stokis (Hub Utama)</option>
                      <option value="MOBILE">Mobile Stokis (Sub-Hub)</option>
                      <option value="NONE">Hapus Status Stokis</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-varena-espresso mb-1">Kota / Wilayah *</label>
                    <input
                      type="text"
                      required
                      value={newStockistCity}
                      onChange={(e) => setNewStockistCity(e.target.value)}
                      placeholder="Contoh: Surabaya, Jawa Timur"
                      className="w-full px-3 py-2 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-varena-espresso mb-1">Tambah/Set Kuota (Box) *</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={newStockistQuota}
                      onChange={(e) => setNewStockistQuota(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 rounded-lg border border-varena-taupe/30 font-mono focus:outline-none focus:border-varena-gold"
                    />
                  </div>

                  <div className="sm:col-span-4 pt-1">
                    <button
                      type="submit"
                      disabled={stockistLoading}
                      className="py-2.5 px-6 rounded-lg bg-varena-espresso text-varena-gold-light font-semibold hover:bg-varena-espresso-dark transition shadow"
                    >
                      {stockistLoading ? 'Menyimpan...' : 'Simpan Otoritas Stokis'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Tabel Daftar Stokis Regional */}
              <div className="bg-white rounded-2xl border border-varena-taupe/20 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-varena-taupe/15 flex items-center justify-between">
                  <h3 className="font-serif text-base font-bold text-varena-espresso flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-varena-gold" />
                    <span>Daftar Hub Master & Mobile Stokis Aktif</span>
                  </h3>
                  <button
                    onClick={loadStockists}
                    className="text-xs text-varena-taupe hover:text-varena-espresso font-semibold flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Segarkan</span>
                  </button>
                </div>

                {stockists.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left min-w-[600px]">
                      <thead className="bg-varena-ivory-light text-varena-taupe uppercase font-semibold border-b border-varena-taupe/20">
                        <tr>
                          <th className="py-2.5 px-3">Kode Mitra</th>
                          <th className="py-2.5 px-3">Nama Stokis</th>
                          <th className="py-2.5 px-3">Tingkatan Hub</th>
                          <th className="py-2.5 px-3">Wilayah / Kota</th>
                          <th className="py-2.5 px-3">Stok Box Tersedia</th>
                          <th className="py-2.5 px-3">Kontak Terdaftar</th>
                          <th className="py-2.5 px-3 text-right">Aksi Cepat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-varena-taupe/10">
                        {stockists.map((s: any) => (
                          <tr key={s.id} className="hover:bg-varena-ivory-light/40">
                            <td className="py-2.5 px-3 font-mono font-bold text-varena-espresso">{s.memberCode}</td>
                            <td className="py-2.5 px-3 font-semibold text-varena-espresso">{s.name}</td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${s.type === 'MASTER'
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : 'bg-blue-100 text-blue-900 border border-blue-300'
                                  }`}
                              >
                                {s.type === 'MASTER' ? '⭐ MASTER STOKIS' : '📦 MOBILE STOKIS'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-700">{s.city}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-emerald-800">{s.inventory} Box</td>
                            <td className="py-2.5 px-3 font-mono text-varena-taupe">{s.phone || '-'}</td>
                            <td className="py-2.5 px-3 text-right">
                              {s.phone && (
                                <a
                                  href={`https://wa.me/${s.phone.replace(/^0/, '62')}?text=${encodeURIComponent(
                                    `Halo ${s.name} (${s.memberCode}), salam dari Manajemen Pusat VARENA terkait pengelolaan stok wilayah ${s.city}.`
                                  )}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2.5 py-1 rounded bg-emerald-700 text-white font-semibold text-[11px] hover:bg-emerald-800 transition inline-flex items-center gap-1 shadow-sm"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>Hubungi WA</span>
                                </a>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-xs text-varena-taupe">
                    Belum ada mitra yang ditunjuk sebagai Master atau Mobile Stokis.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* TAB 7: WHATSAPP GATEWAY OUTBOX MONITOR */}
          {/* ==================================================================== */}
          {activeTab === 'OUTBOX' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="font-serif text-lg font-bold text-varena-espresso flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-emerald-700" />
                      <span>WhatsApp Gateway & Automated Dispatch Outbox</span>
                    </h2>
                    <p className="text-xs text-varena-taupe mt-0.5">
                      Log pengiriman pesan otomatis (Invoice Pesanan, Resi Pengiriman Logistik, Notifikasi Komisi Masuk, Konfirmasi Payout).
                    </p>
                  </div>

                  <button
                    onClick={loadWaOutbox}
                    disabled={waOutboxLoading}
                    className="px-3.5 py-2 rounded-lg border border-varena-taupe/30 text-xs font-semibold hover:bg-varena-ivory flex items-center gap-1.5 shadow-sm bg-white"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${waOutboxLoading ? 'animate-spin' : ''}`} />
                    <span>Segarkan Outbox</span>
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                  <div>
                    <strong>Status Gateway:</strong> Aktif Terintegrasi (Webhook Outbox Engine)
                  </div>
                  <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-emerald-300 font-semibold">
                    {waOutboxMessages.length} Pesan Disimpan
                  </span>
                </div>

                {waOutboxMessages.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left min-w-[600px]">
                      <thead className="bg-varena-ivory-light text-varena-taupe uppercase font-semibold border-b border-varena-taupe/20">
                        <tr>
                          <th className="py-2.5 px-3">Waktu Dispatch</th>
                          <th className="py-2.5 px-3">Penerima Pesan</th>
                          <th className="py-2.5 px-3">Tipe Template</th>
                          <th className="py-2.5 px-3">Cuplikan Isi Pesan</th>
                          <th className="py-2.5 px-3">Status Pengiriman</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-varena-taupe/10">
                        {waOutboxMessages.map((msg: any, idx: number) => (
                          <tr key={idx} className="hover:bg-varena-ivory-light/40">
                            <td className="py-2.5 px-3 text-varena-taupe whitespace-nowrap">
                              {new Date(msg.sentAt).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-varena-espresso">{msg.recipientName}</div>
                              <div className="text-[10px] text-varena-taupe font-mono">{msg.recipientPhone}</div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-varena-ivory text-varena-espresso border border-varena-taupe/30">
                                {msg.templateType}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 max-w-[320px] font-mono text-[11px]">
                              <div className="p-2 rounded bg-slate-50 border border-slate-200 text-slate-700 whitespace-pre-wrap break-words max-h-24 overflow-y-auto">
                                {msg.message}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                {msg.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-xs text-varena-taupe bg-varena-ivory-light rounded-xl border border-dashed border-varena-taupe/30">
                    Belum ada pesan yang dikirim melalui gateway WhatsApp pada sesi ini.
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
