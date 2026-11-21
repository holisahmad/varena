'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Pagination from '@/components/ui/Pagination';
import ConfirmDialog, { DialogVariant } from '@/components/ui/ConfirmDialog';
import Toast from '@/components/ui/Toast';
import ProductManagementTab from '@/components/admin/ProductManagementTab';
import SystemSettingsTab from '@/components/admin/SystemSettingsTab';
import ShippingLabelModal from '@/components/admin/ShippingLabelModal';
import {
  formatOrderStatus,
  formatOrderType,
  formatAuditAction,
  formatEntityType,
  formatReferenceType,
  formatProductCategory,
  formatFulfillmentSource,
  formatPaymentConfirmationStatus,
  formatPayoutStatus,
  formatMemberStatus,
  formatAgentStatus,
  formatAgentType,
  getOrderStatusBadge,
  ORDER_STATUS_BADGES,
} from '@/lib/formatters';
import { useNotifications } from '@/contexts/NotificationContext';
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
  Store,
  Award,
  Sliders,
  Gift,
  Percent,
  Tag,
  Printer,
} from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const { adminOrdersBadge, adminPayoutBadge, ackAdminOrders, ackAdminPayout, ackAdminMisc } = useNotifications();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'PRODUCTS' | 'ORDERS' | 'PAYOUTS' | 'NETWORK' | 'STOCKIST' | 'SETTINGS' | 'LOGS' | 'OUTBOX'>('OVERVIEW');

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
  const [shippingLabelOrder, setShippingLabelOrder] = useState<any | null>(null);

  // Shipping Modal State
  const [shippingModalOrder, setShippingModalOrder] = useState<any | null>(null);
  const [courierName, setCourierName] = useState('JNE Express');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [warehouseOriginName, setWarehouseOriginName] = useState('Gudang Pusat VARENA');
  const [warehouseOriginCity, setWarehouseOriginCity] = useState('Jakarta');

  // Bulk Shipping State
  const [bulkShipModalOpen, setBulkShipModalOpen] = useState(false);
  const [bulkShipInput, setBulkShipInput] = useState('');
  const [bulkShipLoading, setBulkShipLoading] = useState(false);
  const [bulkShipReport, setBulkShipReport] = useState<any | null>(null);

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

  // Regional Official Agents & Stockist State
  const [stockists, setStockists] = useState<any[]>([]);
  const [newStockistMemberCode, setNewStockistMemberCode] = useState('');
  const [newStockistType, setNewStockistType] = useState('MASTER');
  const [newStockistCity, setNewStockistCity] = useState('');
  const [newStockistQuota, setNewStockistQuota] = useState(100);
  const [stockistLoading, setStockistLoading] = useState(false);

  // Modern Official Agent State
  const [agents, setAgents] = useState<any[]>([]);
  const [agentApplications, setAgentApplications] = useState<any[]>([]);
  const [routableOrders, setRoutableOrders] = useState<any[]>([]);
  const [agentConfig, setAgentConfig] = useState<any>({ minimumRestockBox: 10, defaultDiscountType: 'PERCENTAGE', defaultDiscountValue: 15.0 });
  const [pendingAgentTopups, setPendingAgentTopups] = useState<any[]>([]);
  const [rejectTopupId, setRejectTopupId] = useState<string | null>(null);
  const [rejectTopupReason, setRejectTopupReason] = useState('');
  const [rejectTopupSubmitting, setRejectTopupSubmitting] = useState(false);
  const [agentSubTab, setAgentSubTab] = useState<'APPLICATIONS' | 'LIST' | 'APPOINT' | 'ROUTING' | 'TOPUP' | 'CONFIG' | 'RANKING'>('LIST');
  const [rankingSortBy, setRankingSortBy] = useState<'SOLD_BOX' | 'SALES_NOMINAL'>('SOLD_BOX');
  const [agentLoading, setAgentLoading] = useState(false);

  // Direct Appointment Form State
  const [appointMemberCode, setAppointMemberCode] = useState('');
  const [appointType, setAppointType] = useState('REGIONAL_AGENT');
  const [appointCity, setAppointCity] = useState('');
  const [appointProvince, setAppointProvince] = useState('');
  const [appointAddress, setAppointAddress] = useState('');
  const [appointInitialStock, setAppointInitialStock] = useState(20);
  const [appointDiscountType, setAppointDiscountType] = useState('PERCENTAGE');
  const [appointDiscountValue, setAppointDiscountValue] = useState(15);
  // Calon Agen Verification State
  const [candidateMember, setCandidateMember] = useState<any>(null);
  const [candidateChecking, setCandidateChecking] = useState(false);
  const [candidateError, setCandidateError] = useState('');
  const [candidateConfirmed, setCandidateConfirmed] = useState(false);

  // Agent Monitoring & Detail State
  const [monitoringAgent, setMonitoringAgent] = useState<any>(null);
  const [monitoringModalOpen, setMonitoringModalOpen] = useState(false);
  const [monitoringTab, setMonitoringTab] = useState<'OVERVIEW' | 'REWARDS' | 'STOCK' | 'ORDERS'>('OVERVIEW');

  // Approve Application Modal
  const [approveAppModalOpen, setApproveAppModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [appInitialStock, setAppInitialStock] = useState(20);
  const [appDiscountType, setAppDiscountType] = useState('PERCENTAGE');
  const [appDiscountValue, setAppDiscountValue] = useState(15);

  // Award Reward Modal
  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [selectedRewardAgent, setSelectedRewardAgent] = useState<any>(null);
  const [rewardType, setRewardType] = useState<'CASH_BONUS' | 'PHYSICAL_GOODS'>('CASH_BONUS');
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardValue, setRewardValue] = useState(1000000);
  const [rewardDesc, setRewardDesc] = useState('');

  // Order Routing Modal
  const [routeOrderModalOpen, setRouteOrderModalOpen] = useState(false);
  const [selectedRouteOrder, setSelectedRouteOrder] = useState<any>(null);
  const [selectedRouteAgentId, setSelectedRouteAgentId] = useState('');
  const [routeOrderNote, setRouteOrderNote] = useState('');

  // Config Form State
  const [configMoq, setConfigMoq] = useState(10);
  const [configDiscountType, setConfigDiscountType] = useState('PERCENTAGE');
  const [configDiscountValue, setConfigDiscountValue] = useState(15);

  // WhatsApp Outbox State
  const [waOutboxMessages, setWaOutboxMessages] = useState<any[]>([]);
  const [waOutboxLoading, setWaOutboxLoading] = useState(false);

  // Elegant Confirmation Dialog & Toast Notification State
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
    onConfirm: () => { },
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
    // Always collect legacy user info first
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

    // JWT-first + always include legacy headers for backward compat
    const token = typeof window !== 'undefined' ? localStorage.getItem('varena_token') : null;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-user-id': uid || '',
      'x-user-email': email || '',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  const loadDashboardData = (customUser?: any) => {
    const authHeaders = getAdminHeaders(customUser);
    const hasAuth = authHeaders['Authorization'] || authHeaders['x-user-id'] || authHeaders['x-user-email'];
    if (!hasAuth) return;
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
      fetch('/api/v1/admin/agents', { headers: authHeaders }).then(checkRes),
    ])
      .then(([sData, wData, oData, lData, aData]) => {
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
        if (aData?.success) {
          setAgents(aData.agents || []);
          setAgentApplications(aData.applications || []);
          setRoutableOrders(aData.routableOrders || []);
          if (aData.config) {
            setAgentConfig(aData.config);
            setConfigMoq(aData.config.minimumRestockBox);
            setConfigDiscountType(aData.config.defaultDiscountType);
            setConfigDiscountValue(aData.config.defaultDiscountValue);
          }
          setPendingAgentTopups(aData.pendingTopups || []);
          setStockists(aData.agents || []);
        }
      })
      .catch((e) => console.error('Admin data fetch error:', e))
      .finally(() => setLoading(false));
  };

  // Filter Orders with Pagination
  const loadFilteredOrders = (status = orderStatusFilter, query = orderSearchQuery, page = 1) => {
    const authHeaders = getAdminHeaders();
    if (!authHeaders['Authorization'] && !authHeaders['x-user-id'] && !authHeaders['x-user-email']) return;

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
    if (!authHeaders['Authorization'] && !authHeaders['x-user-id'] && !authHeaders['x-user-email']) return;

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
    if (!authHeaders['Authorization'] && !authHeaders['x-user-id'] && !authHeaders['x-user-email']) return;

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
      showToast('Masukkan nomor referensi transfer bank terlebih dahulu.', 'error');
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

      showToast('Payout berhasil disetujui dan mutasi buku besar telah diposting!', 'success');
      setApprovingId(null);
      setTransferRef('');
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || 'Gagal menyetujui payout.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm Manual Order Payment
  const handleConfirmOrderPayment = (orderId: string, orderNumber?: string) => {
    showConfirm({
      title: 'Konfirmasi Pembayaran Pesanan',
      message: `Konfirmasi bahwa pembayaran pesanan ${orderNumber || orderId} telah diterima di rekening perusahaan? Komisi jaringan akan langsung dialokasikan ke buku besar.`,
      variant: 'emerald',
      icon: 'shield',
      confirmText: 'Ya, Konfirmasi Lunas',
      cancelText: 'Batal',
      onConfirm: async () => {
        const authHeaders = getAdminHeaders();
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

        showToast('Pembayaran pesanan berhasil dikonfirmasi! Komisi jaringan dan buku besar telah diposting.', 'success');
        loadDashboardData();
        loadFilteredOrders();
      },
    });
  };

  // Process Shipment (Input Courier & Tracking Number)
  const handleShipOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingModalOrder || !trackingNumber.trim()) {
      showToast('Mohon isi nomor resi pengiriman.', 'error');
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
          warehouseOriginName,
          warehouseOriginCity,
          actorUserId: authHeaders['x-user-id'],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memproses pengiriman.');

      showToast(`Pesanan ${shippingModalOrder.orderNumber} berhasil diperbarui menjadi TERKIRIM (${courierName} - ${trackingNumber}) dari ${warehouseOriginName}.`, 'success');
      setShippingModalOrder(null);
      setTrackingNumber('');
      setWarehouseOriginName('Gudang Pusat VARENA');
      setWarehouseOriginCity('Jakarta');
      loadDashboardData();
      loadFilteredOrders();
    } catch (err: any) {
      showToast(err.message || 'Gagal memproses pengiriman.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Complete Order
  const handleCompleteOrder = (orderId: string, orderNumber?: string) => {
    showConfirm({
      title: 'Tandai Pesanan Selesai',
      message: `Tandai pesanan ${orderNumber || orderId} telah selesai dan paket telah sampai dengan baik di tangan pembeli?`,
      variant: 'emerald',
      icon: 'check',
      confirmText: 'Ya, Tandai Selesai',
      cancelText: 'Batal',
      onConfirm: async () => {
        const authHeaders = getAdminHeaders();
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

        showToast('Pesanan telah berhasil ditandai SELESAI.', 'success');
        loadDashboardData();
        loadFilteredOrders();
      },
    });
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
      const normalized = {
        totalMatches: data.totalMatches || 0,
        members: data.members || data.results?.members || [],
        orders: data.orders || data.results?.orders || [],
        payouts: data.payouts || data.results?.payouts || [],
        ledger: data.ledger || data.results?.ledger || [],
      };
      setOmniResults(normalized);
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
      showToast('Pilih minimal satu permohonan penarikan dana.', 'error');
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
      showToast(data.message || 'Persetujuan massal berhasil dieksekusi!', 'success');
      setBatchModalOpen(false);
      setSelectedPayouts([]);
      setBatchRef('');
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || 'Gagal mengeksekusi persetujuan massal.', 'error');
    } finally {
      setBatchApproving(false);
    }
  };

  // Bulk Shipping Handler
  const handleBulkShipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkShipInput.trim()) {
      showToast('Masukkan data manifest resi pengiriman.', 'error');
      return;
    }
    const lines = bulkShipInput.split('\n').map((l) => l.trim()).filter(Boolean);
    const shipments: Array<{ orderNumber: string; courierName?: string; trackingNumber: string }> = [];
    for (const line of lines) {
      const lower = line.toLowerCase();
      if ((lower.includes('order') || lower.includes('pesanan')) && (lower.includes('resi') || lower.includes('kurir'))) {
        continue;
      }
      const delimiter = line.includes('\t')
        ? '\t'
        : line.includes(';')
        ? ';'
        : line.includes('|')
        ? '|'
        : ',';
      const parts = line.split(delimiter).map((p) => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length >= 2) {
        if (parts.length >= 3) {
          shipments.push({
            orderNumber: parts[0],
            courierName: parts[1] || 'JNE Express',
            trackingNumber: parts[2],
          });
        } else {
          shipments.push({
            orderNumber: parts[0],
            trackingNumber: parts[1],
          });
        }
      }
    }
    if (shipments.length === 0) {
      showToast('Format input tidak valid. Gunakan format baris: NO_ORDER, KURIR, NO_RESI (atau salin langsung dari tabel Excel).', 'error');
      return;
    }
    setBulkShipLoading(true);
    const authHeaders = getAdminHeaders();
    try {
      const res = await fetch('/api/v1/admin/orders/bulk-ship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ shipments, rawText: bulkShipInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memproses pengiriman massal.');
      setBulkShipReport(data);
      showToast(data.message || 'Pengiriman massal berhasil diproses!', 'success');
      loadDashboardData();
      loadFilteredOrders();
    } catch (err: any) {
      showToast(err.message || 'Gagal memproses pengiriman massal.', 'error');
    } finally {
      setBulkShipLoading(false);
    }
  };

  // Official Regional Agents Handlers
  const loadAgents = async () => {
    setAgentLoading(true);
    const authHeaders = getAdminHeaders();
    try {
      const res = await fetch('/api/v1/admin/agents', {
        headers: authHeaders,
      });
      const data = await res.json();
      if (data.success) {
        setAgents(data.agents || []);
        if (data.agents && monitoringAgent) {
          const fresh = (data.agents || []).find((ag: any) => ag.id === monitoringAgent.id);
          if (fresh) setMonitoringAgent(fresh);
        }
        setAgentApplications(data.applications || []);
        setRoutableOrders(data.routableOrders || []);
        if (data.config) {
          setAgentConfig(data.config);
          setConfigMoq(data.config.minimumRestockBox);
          setConfigDiscountType(data.config.defaultDiscountType);
          setConfigDiscountValue(data.config.defaultDiscountValue);
        }
        setPendingAgentTopups(data.pendingTopups || []);
        setStockists(data.agents || []);
      }
    } catch (e) {
      console.error('Failed to load agents:', e);
    } finally {
      setAgentLoading(false);
    }
  };
  const loadStockists = loadAgents;

  const handleApproveApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    setAgentLoading(true);
    const authHeaders = getAdminHeaders();
    try {
      const res = await fetch('/api/v1/admin/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          action: 'APPROVE_APPLICATION',
          applicationId: selectedApp.id,
          initialStockQuota: Number(appInitialStock) || 0,
          discountType: appDiscountType,
          discountValue: Number(appDiscountValue) || 15,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyetujui pengajuan agen.');
      showToast(data.message || 'Pengajuan agen resmi disetujui!', 'success');
      setApproveAppModalOpen(false);
      setSelectedApp(null);
      loadAgents();
    } catch (err: any) {
      showToast(err.message || 'Gagal menyetujui pengajuan agen.', 'error');
    } finally {
      setAgentLoading(false);
    }
  };

  const handleRejectApplication = (appId: string) => {
    showConfirm({
      title: 'Tolak Pengajuan Keagenan',
      message: 'Apakah Anda yakin ingin menolak pengajuan keagenan resmi ini? Status pengajuan akan diubah menjadi Ditolak.',
      variant: 'rose',
      icon: 'warning',
      confirmText: 'Ya, Tolak Pengajuan',
      cancelText: 'Batal',
      onConfirm: async () => {
        const authHeaders = getAdminHeaders();
        const res = await fetch('/api/v1/admin/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({
            action: 'REJECT_APPLICATION',
            applicationId: appId,
            rejectReason: 'Persyaratan gudang atau kuota belum memenuhi kriteria.',
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal menolak pengajuan.');
        showToast(data.message || 'Pengajuan berhasil ditolak.', 'info');
        loadAgents();
      },
    });
  };

  const lookupCandidateMember = async (code: string) => {
    const cleanCode = code?.trim().toUpperCase();
    if (!cleanCode) return;
    setCandidateChecking(true);
    setCandidateError('');
    try {
      const authHeaders = getAdminHeaders();
      const res = await fetch(`/api/v1/admin/agents?lookupMemberCode=${encodeURIComponent(cleanCode)}`, {
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setCandidateMember(null);
        setCandidateError(data.error || 'Mitra tidak ditemukan dengan ID tersebut.');
      } else {
        setCandidateMember(data.member);
        setCandidateError('');
      }
    } catch {
      setCandidateError('Gagal memverifikasi ID calon agen.');
    } finally {
      setCandidateChecking(false);
    }
  };

  const handleApplyCandidateData = () => {
    if (!candidateMember) return;
    const hasCity = Boolean(candidateMember.city && candidateMember.city.trim() && candidateMember.city !== '-');
    const hasProvince = Boolean(candidateMember.province && candidateMember.province.trim() && candidateMember.province !== '-');
    const hasAddress = Boolean(candidateMember.addressDetail && candidateMember.addressDetail.trim() && candidateMember.addressDetail !== '-');

    if (hasCity) setAppointCity(candidateMember.city);
    if (hasProvince) setAppointProvince(candidateMember.province);
    if (hasAddress) setAppointAddress(candidateMember.addressDetail);
    setCandidateConfirmed(true);

    if (hasCity || hasAddress) {
      showToast(`Data wilayah calon agen ${candidateMember.displayName} (${candidateMember.city || ''}) berhasil dimuat ke formulir!`, 'success');
    } else {
      showToast(`Profil mitra belum memiliki data domisili tersimpan. Silakan isi kota dan alamat di formulir secara manual.`, 'info');
    }
  };

  const handleDirectAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointMemberCode || !appointCity) {
      showToast('Lengkapi kode mitra dan kota wilayah keagenan.', 'error');
      return;
    }
    setAgentLoading(true);
    const authHeaders = getAdminHeaders();
    try {
      const res = await fetch('/api/v1/admin/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          action: 'DIRECT_APPOINTMENT',
          memberCode: appointMemberCode.trim().toUpperCase(),
          agentType: appointType,
          city: appointCity.trim(),
          province: appointProvince.trim() || '-',
          address: appointAddress.trim() || '-',
          initialStockQuota: Number(appointInitialStock) || 0,
          discountType: appointDiscountType,
          discountValue: Number(appointDiscountValue) || 15,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengangkat agen.');
      showToast(data.message || 'Mitra berhasil diangkat menjadi Agen Resmi!', 'success');
      setAppointMemberCode('');
      setAppointCity('');
      setAppointProvince('');
      setAppointAddress('');
      setCandidateMember(null);
      setCandidateConfirmed(false);
      await loadAgents();
      setAgentSubTab('LIST');
    } catch (err: any) {
      showToast(err.message || 'Gagal mengangkat agen.', 'error');
    } finally {
      setAgentLoading(false);
    }
  };

  const handleAssignOrderToAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRouteOrder || !selectedRouteAgentId) {
      showToast('Pilih agen regional tujuan.', 'error');
      return;
    }
    setAgentLoading(true);
    const authHeaders = getAdminHeaders();
    try {
      const res = await fetch('/api/v1/admin/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          action: 'ASSIGN_ORDER_TO_AGENT',
          orderId: selectedRouteOrder.id,
          agentMemberId: selectedRouteAgentId,
          routingNote: routeOrderNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengalihkan pesanan.');
      showToast(data.message || 'Pesanan berhasil dialihkan ke Agen Regional!', 'success');
      setRouteOrderModalOpen(false);
      setSelectedRouteOrder(null);
      setSelectedRouteAgentId('');
      setRouteOrderNote('');
      loadAgents();
    } catch (err: any) {
      showToast(err.message || 'Gagal mengalihkan pesanan.', 'error');
    } finally {
      setAgentLoading(false);
    }
  };

  const handleUpdateAgentConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setAgentLoading(true);
    const authHeaders = getAdminHeaders();
    try {
      const res = await fetch('/api/v1/admin/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          action: 'UPDATE_CONFIG',
          minimumRestockBox: Number(configMoq) || 10,
          defaultDiscountType: configDiscountType,
          defaultDiscountValue: Number(configDiscountValue) || 15,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan konfigurasi.');
      showToast(data.message || 'Konfigurasi keagenan berhasil diperbarui!', 'success');
      loadAgents();
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan konfigurasi.', 'error');
    } finally {
      setAgentLoading(false);
    }
  };

  const handleApproveDepositTopup = (topupOrId: any) => {
    const isObj = typeof topupOrId === 'object' && topupOrId !== null;
    const transactionId = isObj ? topupOrId.id : topupOrId;
    const memberName = isObj ? (topupOrId.member?.displayName || topupOrId.member?.legalName || topupOrId.member?.memberCode || 'Mitra') : 'Mitra';
    const amount = isObj ? (topupOrId.amount || 0) : 0;
    const uniqueCode = isObj ? (topupOrId.uniqueCode || 0) : 0;
    const transferTotal = amount + uniqueCode;
    const bankName = isObj ? topupOrId.bankName : '';
    const accNum = isObj ? topupOrId.accountNumber : '';

    showConfirm({
      title: 'Verifikasi & Persetujuan Topup Saldo Deposit',
      message: `Pastikan dana transfer sebesar Rp${transferTotal.toLocaleString('id-ID')} dengan kode unik (+Rp${uniqueCode}) dari ${memberName} sudah benar-benar MASUK ke mutasi rekening bank perusahaan.`,
      detail: (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs space-y-2 text-stone-800 text-left">
          <div className="font-bold text-amber-950 flex items-center gap-1.5 border-b border-amber-200 pb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Pemeriksaan Mutasi Rekening Bank</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>Mitra Pengirim: <strong>{memberName}</strong></div>
            <div>Bank Asal: <strong>{bankName || '-'}</strong> ({accNum || '-'})</div>
            <div>Nominal Saldo: <strong>Rp{amount.toLocaleString('id-ID')}</strong></div>
            <div>Kode Unik Verifikasi: <strong className="text-amber-800 font-mono">+Rp{uniqueCode}</strong></div>
          </div>
          <div className="pt-2 border-t border-amber-200 flex items-center justify-between">
            <span className="font-semibold text-stone-700">Total Wajib Ada di Mutasi:</span>
            <span className="font-mono font-bold text-emerald-800 text-sm">
              Rp{transferTotal.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="text-[10px] text-amber-800 italic">
            *Setelah Anda klik setujui, saldo deposit belanja/agen akan langsung ditambahkan ke akun mitra dan siap digunakan untuk transaksi.
          </div>
        </div>
      ),
      variant: 'emerald',
      icon: 'shield',
      confirmText: 'Ya, Dana Sudah Masuk & Setujui',
      cancelText: 'Batal / Cek Lagi',
      onConfirm: async () => {
        const authHeaders = getAdminHeaders();
        const res = await fetch('/api/v1/admin/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({
            action: 'APPROVE_DEPOSIT_TOPUP',
            transactionId,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal menyetujui topup deposit.');
        showToast(data.message || 'Topup saldo deposit berhasil disetujui & saldo telah aktif!', 'success');
        loadAgents();
      },
    });
  };

  const handleRejectDepositTopup = async () => {
    if (!rejectTopupId || !rejectTopupReason.trim()) return;
    setRejectTopupSubmitting(true);
    const authHeaders = getAdminHeaders();
    try {
      const res = await fetch('/api/v1/admin/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          action: 'REJECT_TOPUP',
          transactionId: rejectTopupId,
          reason: rejectTopupReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menolak topup deposit.');
      showToast(data.message || 'Pengajuan topup berhasil ditolak.', 'success');
      setRejectTopupId(null);
      setRejectTopupReason('');
      loadAgents();
    } catch (err: any) {
      showToast(err.message || 'Gagal menolak topup.', 'error');
    } finally {
      setRejectTopupSubmitting(false);
    }
  };

  const handleAwardReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRewardAgent || !rewardTitle) {
      showToast('Lengkapi judul dan data reward.', 'error');
      return;
    }
    setAgentLoading(true);
    const authHeaders = getAdminHeaders();
    try {
      const res = await fetch('/api/v1/admin/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          action: 'AWARD_REWARD',
          memberId: selectedRewardAgent.id,
          rewardType,
          rewardTitle,
          rewardValue: Number(rewardValue) || 0,
          description: rewardDesc,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memberikan reward.');
      showToast(data.message || 'Reward prestasi berhasil dicatat dan diberikan ke agen!', 'success');
      setRewardModalOpen(false);
      setSelectedRewardAgent(null);
      setRewardTitle('');
      setRewardDesc('');
      loadAgents();
    } catch (err: any) {
      showToast(err.message || 'Gagal memberikan reward prestasi.', 'error');
    } finally {
      setAgentLoading(false);
    }
  };

  const handleSaveStockist = handleDirectAppointment;

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
      id: 'PRODUCTS',
      label: 'Master Produk',
      icon: Tag,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'ORDERS',
      label: 'Pesanan & Logistik',
      icon: Package,
      badge: Math.max(ordersSummary?.paidReadyToShip ?? 0, adminOrdersBadge) > 0
        ? Math.max(ordersSummary?.paidReadyToShip ?? 0, adminOrdersBadge)
        : null,
      badgeColor: 'bg-red-500',
    },
    {
      id: 'PAYOUTS',
      label: 'Pencairan Payout',
      icon: CreditCard,
      badge: Math.max(withdrawals.filter((w) => w.status === 'REQUESTED').length, adminPayoutBadge) > 0
        ? Math.max(withdrawals.filter((w) => w.status === 'REQUESTED').length, adminPayoutBadge)
        : null,
      badgeColor: 'bg-red-500',
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
      label: 'Keagenan Resmi',
      icon: Store,
      badge: agentApplications.filter((a) => a.status === 'PENDING').length > 0 ? `${agentApplications.filter((a) => a.status === 'PENDING').length}` : null,
      badgeColor: 'bg-amber-600',
      onSelect: () => loadAgents(),
    },
    {
      id: 'SETTINGS',
      label: 'Pengaturan Sistem',
      icon: Sliders,
      badge: null,
      badgeColor: '',
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
                  // Ack notification badges when user opens relevant tab
                  if (item.id === 'ORDERS') ackAdminOrders();
                  if (item.id === 'PAYOUTS') ackAdminPayout();
                  if (item.id === 'STOCKIST' || item.id === 'NETWORK') ackAdminMisc();
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
                            {formatMemberStatus(m.memberStatus)}
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
                            setOrderStatusFilter('ALL');
                            setOrderSearchQuery(o.orderNumber);
                            loadFilteredOrders('ALL', o.orderNumber);
                            setShowOmniDropdown(false);
                          }}
                          className="p-2.5 rounded-lg border border-varena-taupe/20 hover:border-varena-gold cursor-pointer bg-varena-ivory-light/30 transition flex justify-between items-center"
                        >
                          <div>
                            <div className="font-mono font-bold text-varena-espresso">{o.orderNumber}</div>
                            <div className="text-[10px] text-varena-taupe">{o.buyerName} · Rp{o.total?.toLocaleString('id-ID')}</div>
                            {o.trackingNumber && (
                              <div className="text-[10px] text-blue-700 font-mono">Resi: {o.trackingNumber} ({o.courierName || o.courier || '-'})</div>
                            )}
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${ORDER_STATUS_BADGES[o.orderStatus || o.status]?.bg || 'bg-slate-100'} ${ORDER_STATUS_BADGES[o.orderStatus || o.status]?.text || 'text-slate-800'}`}>
                            {formatOrderStatus(o.orderStatus || o.status)}
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
                            <span className="font-bold text-varena-espresso">{p.member?.displayName || p.memberName}</span> · <span className="font-mono text-emerald-800 font-bold">Rp{p.netAmount?.toLocaleString('id-ID')}</span>
                            <div className="text-[10px] text-varena-taupe">{p.bankName} - {p.accountNumberMasked} (a.n {p.accountHolder})</div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                            {formatPayoutStatus(p.status)}
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
                            <span className="font-bold text-varena-espresso">{formatReferenceType(l.referenceType)}</span>
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
          {/* TAB: MASTER PRODUK & SKEMA PENJUALAN DINAMIS */}
          {/* ==================================================================== */}
          {activeTab === 'PRODUCTS' && (
            <ProductManagementTab
              authHeaders={getAdminHeaders()}
              showToast={showToast}
              showConfirm={showConfirm}
            />
          )}

          {/* ==================================================================== */}
          {/* TAB 2: ORDER MANAGEMENT & LOGISTICS (ADMIN PENJUALAN) */}
          {/* ==================================================================== */}
          {activeTab === 'ORDERS' && (
            <div className="space-y-6">
              {/* Summary Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs">
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
                    setOrderStatusFilter('MANUAL_CONFIRMATION');
                    loadFilteredOrders('MANUAL_CONFIRMATION', orderSearchQuery);
                  }}
                  className={`p-3 rounded-xl border text-left transition ${orderStatusFilter === 'MANUAL_CONFIRMATION'
                    ? 'border-blue-400 bg-blue-900 text-blue-100 font-semibold shadow-sm'
                    : 'border-blue-200 bg-blue-50/70 text-blue-900 hover:border-blue-400'
                    }`}
                >
                  <div className="text-[10px] uppercase font-bold text-blue-700">Verifikasi Transfer</div>
                  <div className="text-xl font-bold font-serif text-blue-900 flex items-center justify-between">
                    <span>{ordersSummary?.manualConfirmation || 0}</span>
                    {(ordersSummary?.manualConfirmation || 0) > 0 && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                    )}
                  </div>
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
                              type="button"
                              onClick={() => {
                                showConfirm({
                                  title: 'Verifikasi Pembayaran Manual',
                                  message: `Verifikasi bahwa bukti transfer untuk pesanan ${o.orderNumber} telah valid dan dana telah masuk ke rekening perusahaan?`,
                                  detail: (
                                    <div className="space-y-1 text-xs">
                                      <div><span className="text-stone-500">No. Pesanan:</span> <strong className="font-mono">{o.orderNumber}</strong></div>
                                      <div><span className="text-stone-500">Nama Pembeli:</span> <strong>{o.buyerName}</strong></div>
                                      <div><span className="text-stone-500">Bank Pengirim:</span> <strong>{o.senderBankName || '-'}</strong> a.n <strong>{o.senderAccountName || '-'}</strong></div>
                                      <div><span className="text-stone-500">Nominal Transfer:</span> <strong className="text-emerald-800 font-mono">Rp{(o.transferAmountPaid || o.total).toLocaleString('id-ID')}</strong></div>
                                      {o.transferNotes && <div className="text-stone-500 italic">Catatan: {o.transferNotes}</div>}
                                    </div>
                                  ),
                                  variant: 'emerald',
                                  icon: 'shield',
                                  confirmText: 'Ya, Verifikasi & Tandai Lunas',
                                  cancelText: 'Batal',
                                  onConfirm: async () => {
                                    const authHeaders = getAdminHeaders();
                                    const res = await fetch('/api/v1/admin/orders', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json', ...authHeaders },
                                      body: JSON.stringify({ action: 'CONFIRM_PAYMENT', orderId: o.id, actorUserId: authHeaders['x-user-id'] }),
                                    });
                                    const d = await res.json();
                                    if (!res.ok) throw new Error(d.error);
                                    showToast('Pembayaran berhasil diverifikasi dan komisi telah dihitung!', 'success');
                                    setPaymentProofOrders((prev) => prev.filter((x) => x.id !== o.id));
                                    loadFilteredOrders();
                                    loadDashboardData();
                                  },
                                });
                              }}
                              disabled={actionLoading}
                              className="px-2.5 py-1 text-[11px] rounded bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition"
                            >
                              ✓ Verifikasi & Lunas
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                showConfirm({
                                  title: 'Tolak Konfirmasi Transfer',
                                  message: `Apakah Anda yakin ingin menolak konfirmasi transfer untuk pesanan ${o.orderNumber}? Pembeli akan diminta mengunggah ulang bukti transfer yang valid.`,
                                  variant: 'rose',
                                  icon: 'warning',
                                  confirmText: 'Ya, Tolak Konfirmasi',
                                  cancelText: 'Batal',
                                  onConfirm: async () => {
                                    const res = await fetch('/api/v1/orders/confirm-payment', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ orderId: o.id, action: 'REJECT' }),
                                    });
                                    const d = await res.json();
                                    if (!res.ok) throw new Error(d.error);
                                    showToast('Konfirmasi transfer berhasil ditolak.', 'info');
                                    setPaymentProofOrders((prev) => prev.filter((x) => x.id !== o.id));
                                    loadFilteredOrders();
                                  },
                                });
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
                                <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-medium bg-varena-ivory text-varena-espresso border border-varena-taupe/20">
                                  {formatOrderType(o.orderType)}
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
                                {(() => {
                                  const badge = getOrderStatusBadge(o.orderStatus, o.paymentConfirmationStatus);
                                  return (
                                    <span
                                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold block w-fit mb-1 border ${badge.bg} ${badge.text} ${badge.border}`}
                                    >
                                      {formatOrderStatus(o.orderStatus, o.paymentConfirmationStatus)}
                                    </span>
                                  );
                                })()}
                                {o.paymentConfirmationStatus === 'SUBMITTED' && o.orderStatus === 'PENDING_PAYMENT' && (
                                  <div className="text-[10px] font-semibold text-blue-700 flex items-center gap-1 mt-0.5">
                                    <span>⬆ Bukti transfer dikirim mitra</span>
                                  </div>
                                )}
                                {o.trackingNumber && (
                                  <div className="text-[10px] font-mono text-varena-taupe">
                                    {o.courierName}: <strong>{o.trackingNumber}</strong>
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                {/* Alur Aksi Berdasarkan Status */}
                                {o.orderStatus === 'PENDING_PAYMENT' && o.paymentConfirmationStatus === 'SUBMITTED' && (
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmOrderPayment(o.id, o.orderNumber)}
                                    disabled={actionLoading}
                                    className="px-2.5 py-1.5 rounded bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition shadow-sm whitespace-nowrap"
                                  >
                                    ✓ Verifikasi & Setujui
                                  </button>
                                )}
                                {o.orderStatus === 'PENDING_PAYMENT' && o.paymentConfirmationStatus !== 'SUBMITTED' && (
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmOrderPayment(o.id, o.orderNumber)}
                                    disabled={actionLoading}
                                    className="px-2.5 py-1.5 rounded bg-emerald-700 text-white font-semibold text-xs hover:bg-emerald-800 transition shadow-sm whitespace-nowrap"
                                  >
                                    Konfirmasi Bayar
                                  </button>
                                )}

                                {o.orderStatus === 'PAID' && (
                                  <div className="flex flex-col gap-1 items-end ml-auto">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setShippingModalOrder(o);
                                        setTrackingNumber(`JNE-${Date.now().toString().slice(-8)}-ID`);
                                      }}
                                      className="px-2.5 py-1.5 rounded bg-varena-espresso text-varena-gold-light font-semibold text-xs hover:bg-varena-espresso-dark transition shadow-sm flex items-center gap-1.5 whitespace-nowrap"
                                    >
                                      <Truck className="w-3.5 h-3.5" />
                                      <span>Input Resi & Kirim</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setShippingLabelOrder(o)}
                                      className="px-2.5 py-1 rounded border border-stone-300 hover:border-black bg-white hover:bg-stone-50 text-stone-800 font-semibold text-[11px] transition shadow-2xs flex items-center gap-1.5 whitespace-nowrap"
                                      title="Cetak label resi tempel box pengiriman"
                                    >
                                      <Printer className="w-3.5 h-3.5 text-amber-700" />
                                      <span>Cetak Label Resi</span>
                                    </button>
                                  </div>
                                )}

                                {o.orderStatus === 'SHIPPED' && (
                                  <div className="flex flex-col gap-1 items-end ml-auto">
                                    <button
                                      type="button"
                                      onClick={() => handleCompleteOrder(o.id, o.orderNumber)}
                                      disabled={actionLoading}
                                      className="px-2.5 py-1.5 rounded border border-emerald-600 text-emerald-800 font-semibold text-xs hover:bg-emerald-50 transition shadow-sm whitespace-nowrap"
                                    >
                                      Tandai Diterima
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setShippingLabelOrder(o)}
                                      className="px-2.5 py-1 rounded border border-stone-300 hover:border-black bg-white hover:bg-stone-50 text-stone-800 font-semibold text-[11px] transition shadow-2xs flex items-center gap-1.5 whitespace-nowrap"
                                      title="Cetak ulang label resi tempel box"
                                    >
                                      <Printer className="w-3.5 h-3.5 text-amber-700" />
                                      <span>Cetak Label Resi</span>
                                    </button>
                                  </div>
                                )}

                                {o.orderStatus === 'COMPLETED' && (
                                  <div className="flex flex-col gap-1 items-end ml-auto">
                                    <span className="text-[10px] text-emerald-700 font-semibold flex items-center justify-end gap-1">
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Selesai</span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setShippingLabelOrder(o)}
                                      className="px-2 py-0.5 rounded border border-stone-300 hover:border-black bg-white text-stone-600 hover:text-black text-[10px] transition flex items-center gap-1 whitespace-nowrap"
                                      title="Cetak arsip label resi"
                                    >
                                      <Printer className="w-3 h-3 text-stone-500" />
                                      <span>Arsip Label</span>
                                    </button>
                                  </div>
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
                          <div className="font-bold text-xs mt-1 text-varena-espresso">{formatOrderStatus(viewOrderDetail.orderStatus)}</div>
                        </div>
                        <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                          <div className="text-[10px] text-stone-500 uppercase font-bold">Tipe Order</div>
                          <div className="font-bold text-xs mt-1 text-varena-espresso">{formatOrderType(viewOrderDetail.orderType)}</div>
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
                            <div className="font-medium text-varena-espresso">{formatFulfillmentSource(viewOrderDetail.fulfillmentSource)}</div>
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
                            <div>Status Konfirmasi: <strong className="text-amber-800">{formatPaymentConfirmationStatus(viewOrderDetail.paymentConfirmationStatus)}</strong></div>
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
                    <div className="p-4 bg-stone-50 border-t border-varena-taupe/20 flex flex-row flex-wrap justify-between items-center gap-2 flex-shrink-0">
                      <div className="text-stone-500 text-[11px]">
                        VARENA Order Management
                      </div>
                      <div className="flex gap-2">
                        {/* Tombol Cetak Label Resi untuk pesanan yang sudah lunas / dikirim / selesai */}
                        {(viewOrderDetail.orderStatus === 'PAID' || viewOrderDetail.orderStatus === 'SHIPPED' || viewOrderDetail.orderStatus === 'COMPLETED') && (
                          <button
                            type="button"
                            onClick={() => {
                              const o = viewOrderDetail;
                              setShippingLabelOrder(o);
                            }}
                            className="py-2 px-3 rounded-lg border border-stone-300 hover:border-black bg-white hover:bg-stone-50 text-stone-800 font-semibold text-xs transition flex items-center gap-1.5 shadow-2xs"
                            title="Cetak label resi tempel box pengiriman"
                          >
                            <Printer className="w-3.5 h-3.5 text-amber-700" />
                            <span>Cetak Label Resi</span>
                          </button>
                        )}
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
                              // Set default warehouse based on fulfillmentMode
                              if (o?.fulfillmentMode === 'ASSIGNED_AGENT' && o?.assignedAgentMemberId) {
                                const agentCity = o?.agentCity || 'Daerah';
                                setWarehouseOriginName(`Gudang Agen ${agentCity}`);
                                setWarehouseOriginCity(agentCity);
                              } else {
                                setWarehouseOriginName('Gudang Pusat VARENA');
                                setWarehouseOriginCity('Jakarta');
                              }
                            }}
                            className="py-2 px-3 rounded-lg bg-varena-espresso hover:bg-varena-espresso-dark text-varena-gold-light font-semibold text-xs transition"
                          >
                            Input Resi & Kirim
                          </button>
                        )}
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
                      {/* Gudang Pengirim */}
                      <div>
                        <label className="block font-semibold text-varena-espresso mb-1">
                          Dikirim dari Gudang *
                        </label>
                        <select
                          value={warehouseOriginName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setWarehouseOriginName(val);
                            // Auto-resolve city from warehouse name
                            const cityMap: Record<string, string> = {
                              'Gudang Pusat VARENA': 'Jakarta',
                              'Gudang Transit Surabaya': 'Surabaya',
                              'Gudang Transit Bandung': 'Bandung',
                              'Gudang Transit Medan': 'Medan',
                              'Gudang Transit Makassar': 'Makassar',
                            };
                            setWarehouseOriginCity(cityMap[val] || shippingModalOrder?.agentCity || 'Jakarta');
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold bg-white"
                        >
                          <option value="Gudang Pusat VARENA">🏭 Gudang Pusat VARENA — Jakarta</option>
                          <option value="Gudang Transit Surabaya">🏭 Gudang Transit Surabaya</option>
                          <option value="Gudang Transit Bandung">🏭 Gudang Transit Bandung</option>
                          <option value="Gudang Transit Medan">🏭 Gudang Transit Medan</option>
                          <option value="Gudang Transit Makassar">🏭 Gudang Transit Makassar</option>
                          {shippingModalOrder?.fulfillmentMode === 'ASSIGNED_AGENT' && (
                            <option value={`Gudang Agen ${shippingModalOrder?.agentCity || 'Daerah'}`}>
                              🏪 Gudang Agen {shippingModalOrder?.agentCity || 'Daerah'} (Ditugaskan)
                            </option>
                          )}
                        </select>
                        <p className="text-[10px] text-varena-taupe mt-1">
                          Gudang asal pengiriman akan tercatat pada detail pesanan mitra.
                        </p>
                      </div>

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
                  <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl border border-varena-gold/40 max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-varena-taupe/20 pb-3">
                      <h3 className="font-serif text-lg font-bold text-varena-espresso flex items-center gap-2">
                        <Truck className="w-5 h-5 text-varena-gold" />
                        <span>Input Resi Pengiriman Massal (Bulk Shipping)</span>
                      </h3>
                      <button
                        onClick={() => {
                          setBulkShipModalOpen(false);
                          setBulkShipReport(null);
                        }}
                        className="text-varena-taupe hover:text-varena-espresso text-sm font-bold"
                      >
                        ✕
                      </button>
                    </div>

                    {bulkShipReport ? (
                      /* Tampilan Laporan Hasil Pemrosesan Resi */
                      <div className="space-y-4 text-xs">
                        <div className="p-3.5 rounded-xl bg-varena-ivory border border-varena-gold/30">
                          <p className="font-semibold text-varena-espresso mb-2">{bulkShipReport.message}</p>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                              <div className="font-bold text-base text-emerald-700">{bulkShipReport.shippedCount || 0}</div>
                              <div className="text-[11px] text-emerald-600 font-medium">Terkirim</div>
                            </div>
                            <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="font-bold text-base text-blue-700">{bulkShipReport.updatedCount || 0}</div>
                              <div className="text-[11px] text-blue-600 font-medium">Resi Diperbarui</div>
                            </div>
                            <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
                              <div className="font-bold text-base text-amber-700">{bulkShipReport.skippedCount || 0}</div>
                              <div className="text-[11px] text-amber-600 font-medium">Dilewati</div>
                            </div>
                          </div>
                        </div>

                        {/* Rincian Baris */}
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1 font-mono text-[11px]">
                          {bulkShipReport.shippedOrders?.map((s: any, idx: number) => (
                            <div key={`ship-${idx}`} className="p-2 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-center justify-between">
                              <div>
                                <span className="font-bold text-emerald-900">{s.orderNumber}</span>
                                <span className="text-emerald-700 ml-2">({s.courierName} - {s.trackingNumber})</span>
                              </div>
                              <span className="px-2 py-0.5 bg-emerald-200 text-emerald-800 rounded font-semibold text-[10px]">TERKIRIM</span>
                            </div>
                          ))}
                          {bulkShipReport.updatedOrders?.map((u: any, idx: number) => (
                            <div key={`upd-${idx}`} className="p-2 bg-blue-50/70 border border-blue-200 rounded-lg flex items-center justify-between">
                              <div>
                                <span className="font-bold text-blue-900">{u.orderNumber}</span>
                                <span className="text-blue-700 ml-2">({u.courierName} - {u.trackingNumber})</span>
                              </div>
                              <span className="px-2 py-0.5 bg-blue-200 text-blue-800 rounded font-semibold text-[10px]">DIPERBARUI</span>
                            </div>
                          ))}
                          {bulkShipReport.skippedOrders?.map((sk: any, idx: number) => (
                            <div key={`skip-${idx}`} className="p-2 bg-amber-50/70 border border-amber-200 rounded-lg flex items-start justify-between gap-2">
                              <div>
                                <span className="font-bold text-amber-900">{sk.orderNumber}</span>
                                <div className="text-amber-800 text-[10px] mt-0.5 font-sans">{sk.reason}</div>
                              </div>
                              <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded font-semibold text-[10px] whitespace-nowrap">DILEWATI</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-varena-taupe/20">
                          <button
                            type="button"
                            onClick={() => {
                              setBulkShipReport(null);
                              setBulkShipInput('');
                            }}
                            className="flex-1 py-2 rounded-lg border border-varena-taupe/30 text-varena-espresso font-semibold hover:bg-varena-ivory transition"
                          >
                            Input Manifest Lagi
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setBulkShipModalOpen(false);
                              setBulkShipReport(null);
                              setBulkShipInput('');
                            }}
                            className="flex-1 py-2 rounded-lg bg-varena-espresso text-varena-gold-light font-semibold hover:bg-varena-espresso-dark transition shadow"
                          >
                            Selesai & Tutup
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Form Input Resi */
                      <form onSubmit={handleBulkShipSubmit} className="space-y-3 text-xs">
                        <div className="p-3 bg-varena-ivory rounded-xl border border-varena-gold/30 text-varena-espresso space-y-1">
                          <div className="font-semibold flex items-center gap-1.5">
                            <span className="text-varena-gold font-bold">ℹ️</span> Format Input Manifest (CSV atau Salin dari Excel):
                          </div>
                          <p className="text-[11px] text-varena-taupe leading-relaxed">
                            Tempel data resi per baris. Sistem otomatis mengenali pemisah koma (<code className="font-mono bg-white px-1 rounded">,</code>), titik-koma (<code className="font-mono bg-white px-1 rounded">;</code>), atau tab Excel:
                          </p>
                          <div className="bg-white p-2 rounded-lg font-mono text-[11px] border border-varena-taupe/20 text-varena-espresso">
                            NO_PESANAN, NAMA_KURIR, NOMOR_RESI<br />
                            <span className="text-varena-taupe">// atau 2 kolom (kurir otomatis terdeteksi):</span><br />
                            NO_PESANAN, NOMOR_RESI
                          </div>
                        </div>

                        <div>
                          <label className="block font-semibold text-varena-espresso mb-1">
                            Data Resi Ekspedisi (Baris per Baris) *
                          </label>
                          <textarea
                            rows={7}
                            required
                            value={bulkShipInput}
                            onChange={(e) => setBulkShipInput(e.target.value)}
                            placeholder={`VRN-ORD-2026-0005, JNE Express, JNE882019482ID\nVRN-ORD-2026-0006, SiCepat, SCP992100412ID\nVRN-ORD-2026-0007, J&T Express, JT100293884ID`}
                            className="w-full px-3 py-2 rounded-lg border border-varena-taupe/30 font-mono text-xs focus:outline-none focus:border-varena-gold bg-slate-50 leading-relaxed"
                          />
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setBulkShipModalOpen(false);
                              setBulkShipReport(null);
                            }}
                            className="flex-1 py-2 rounded-lg border border-varena-taupe/30 text-varena-taupe hover:bg-varena-ivory transition"
                          >
                            Batal
                          </button>
                          <button
                            type="submit"
                            disabled={bulkShipLoading}
                            className="flex-1 py-2 rounded-lg bg-varena-espresso text-varena-gold-light font-semibold hover:bg-varena-espresso-dark transition shadow"
                          >
                            {bulkShipLoading ? 'Memvalidasi & Memproses...' : 'Proses Pengiriman Massal'}
                          </button>
                        </div>
                      </form>
                    )}
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

                {/* Gateway Integration Status & Fee Policy */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-xs text-blue-950">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-700 flex-shrink-0" />
                    <span><strong>Kebijakan Payout:</strong> Potongan Admin 10% + Biaya Transfer Rp5.000 (Otomatis terhitung).</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[11px] bg-white px-2.5 py-1 rounded-lg border border-blue-300 self-start sm:self-auto shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-stone-700 font-semibold">Mode: Transfer Manual</span>
                    <span className="text-blue-700 font-bold">(Modul Xendit Siap)</span>
                  </div>
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
                          showToast('Pilih minimal satu permohonan penarikan.', 'error');
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
                            <th className="py-2.5 px-3">Potongan (Admin 10% + Trf 5rb)</th>
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
                                  {formatPayoutStatus(w.status)}
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
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-varena-ivory text-varena-espresso border border-varena-taupe/30 block w-fit">
                                  {formatAuditAction(log.action)}
                                </span>
                                <span className="text-[9px] text-stone-400 font-mono mt-0.5 block">
                                  {log.action}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-[11px]">
                                <span className="font-semibold text-varena-espresso block">{formatEntityType(log.entityType)}</span>
                                <span className="text-varena-taupe font-mono block text-[10px] truncate max-w-[120px]" title={log.entityId}>
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
          {/* TAB 6: KEAGENAN RESMI WILAYAH (REGIONAL AGENTS) */}
          {/* ==================================================================== */}
          {activeTab === 'STOCKIST' && (
            <div className="space-y-6">
              {/* Agent Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                <div className="bg-white p-5 rounded-2xl border border-varena-taupe/20 space-y-1">
                  <span className="text-varena-taupe">Total Agen Aktif</span>
                  <div className="font-serif text-2xl font-bold text-varena-espresso">
                    {agents.length} Titik Wilayah
                  </div>
                  <div className="text-[10px] text-varena-taupe">Representasi penyaluran resmi terverifikasi</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-varena-taupe/20 space-y-1">
                  <span className="text-varena-taupe">Total Stok Gudang Agen</span>
                  <div className="font-serif text-2xl font-bold text-emerald-800">
                    {agents.reduce((sum, a) => sum + (a.inventory || 0), 0)} Box
                  </div>
                  <div className="text-[10px] text-varena-taupe">Stok fisik tersebar di jaringan agen regional</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-varena-taupe/20 space-y-1">
                  <span className="text-varena-taupe">Pengajuan Menunggu Review</span>
                  <div className="font-serif text-2xl font-bold text-amber-700">
                    {agentApplications.filter((a) => a.status === 'PENDING').length} Pengajuan
                  </div>
                  <div className="text-[10px] text-varena-taupe">Mitra mengajukan permohonan keagenan</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-varena-taupe/20 space-y-1">
                  <span className="text-varena-taupe">Order Siap Dialihkan</span>
                  <div className="font-serif text-2xl font-bold text-blue-800">
                    {routableOrders.length} Pesanan
                  </div>
                  <div className="text-[10px] text-varena-taupe">Bisa dipenuhi gudang agen terdekat</div>
                </div>
              </div>

              {/* Sub-Navigation Pills */}
              <div className="bg-white p-2 rounded-2xl border border-varena-taupe/20 shadow-sm flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setAgentSubTab('LIST')}
                  className={`px-4 py-2 rounded-xl font-semibold transition ${agentSubTab === 'LIST'
                      ? 'bg-varena-espresso text-varena-gold shadow'
                      : 'text-slate-600 hover:bg-varena-ivory-light'
                    }`}
                >
                  Daftar Agen Aktif ({agents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAgentSubTab('APPLICATIONS')}
                  className={`px-4 py-2 rounded-xl font-semibold transition flex items-center gap-1.5 ${agentSubTab === 'APPLICATIONS'
                      ? 'bg-varena-espresso text-varena-gold shadow'
                      : 'text-slate-600 hover:bg-varena-ivory-light'
                    }`}
                >
                  <span>Pengajuan Masuk</span>
                  {agentApplications.filter((a) => a.status === 'PENDING').length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-500 text-white font-bold">
                      {agentApplications.filter((a) => a.status === 'PENDING').length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setAgentSubTab('ROUTING')}
                  className={`px-4 py-2 rounded-xl font-semibold transition flex items-center gap-1.5 ${agentSubTab === 'ROUTING'
                      ? 'bg-varena-espresso text-varena-gold shadow'
                      : 'text-slate-600 hover:bg-varena-ivory-light'
                    }`}
                >
                  <span>Alihkan Pesanan ({routableOrders.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAgentSubTab('TOPUP')}
                  className={`px-4 py-2 rounded-xl font-semibold transition flex items-center gap-1.5 ${agentSubTab === 'TOPUP'
                      ? 'bg-varena-espresso text-varena-gold shadow'
                      : 'text-slate-600 hover:bg-varena-ivory-light'
                    }`}
                >
                  <span>Topup Deposit</span>
                  {pendingAgentTopups.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-bold">
                      {pendingAgentTopups.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setAgentSubTab('APPOINT')}
                  className={`px-4 py-2 rounded-xl font-semibold transition ${agentSubTab === 'APPOINT'
                      ? 'bg-varena-espresso text-varena-gold shadow'
                      : 'text-slate-600 hover:bg-varena-ivory-light'
                    }`}
                >
                  Penunjukan Langsung
                </button>
                <button
                  type="button"
                  onClick={() => setAgentSubTab('CONFIG')}
                  className={`px-4 py-2 rounded-xl font-semibold transition ${agentSubTab === 'CONFIG'
                      ? 'bg-varena-espresso text-varena-gold shadow'
                      : 'text-slate-600 hover:bg-varena-ivory-light'
                    }`}
                >
                  Aturan Keagenan (MOQ)
                </button>
                <button
                  type="button"
                  onClick={() => setAgentSubTab('RANKING')}
                  className={`px-4 py-2 rounded-xl font-semibold transition flex items-center gap-1.5 ${agentSubTab === 'RANKING'
                      ? 'bg-varena-espresso text-varena-gold shadow'
                      : 'text-slate-600 hover:bg-varena-ivory-light'
                    }`}
                >
                  <span>🏆 Board Ranking Agen</span>
                </button>
              </div>

              {/* SUBTAB 1: DAFTAR AGEN AKTIF & MONITORING PROGRES */}
              {agentSubTab === 'LIST' && (
                <div className="space-y-4">
                  {/* KPI Ringkasan Jaringan Keagenan */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-white p-4 rounded-2xl border border-varena-taupe/20 shadow-xs space-y-1">
                      <div className="flex items-center justify-between text-varena-taupe text-[11px] font-semibold">
                        <span>Total Sisa Stok Fisik</span>
                        <Package className="w-4 h-4 text-emerald-700" />
                      </div>
                      <div className="text-2xl font-bold font-serif text-varena-espresso">
                        {agents.reduce((sum: number, a: any) => sum + (a.inventory || 0), 0)} <span className="text-xs font-normal text-slate-500 font-sans">Box</span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Tersebar di {agents.length} agen aktif
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-varena-taupe/20 shadow-xs space-y-1">
                      <div className="flex items-center justify-between text-varena-taupe text-[11px] font-semibold">
                        <span>Total Produk Terjual</span>
                        <TrendingUp className="w-4 h-4 text-blue-700" />
                      </div>
                      <div className="text-2xl font-bold font-serif text-varena-espresso">
                        {agents.reduce((sum: number, a: any) => sum + (a.totalSoldBoxes || 0), 0)} <span className="text-xs font-normal text-slate-500 font-sans">Box</span>
                      </div>
                      <div className="text-[10px] text-blue-700 font-medium">
                        Didistribusikan ke konsumen/mitra
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-varena-taupe/20 shadow-xs space-y-1">
                      <div className="flex items-center justify-between text-varena-taupe text-[11px] font-semibold">
                        <span>Total Omset Penjualan</span>
                        <DollarSign className="w-4 h-4 text-varena-gold" />
                      </div>
                      <div className="text-xl font-bold font-mono text-varena-espresso">
                        Rp{agents.reduce((sum: number, a: any) => sum + (a.totalSalesNominal || 0), 0).toLocaleString('id-ID')}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Nilai pesanan terselesaikan
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-varena-taupe/20 shadow-xs space-y-1">
                      <div className="flex items-center justify-between text-varena-taupe text-[11px] font-semibold">
                        <span>Total Reward Diberikan</span>
                        <Award className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="text-xl font-bold font-mono text-amber-900">
                        Rp{agents.reduce((sum: number, a: any) => sum + (a.totalRewardValue || 0), 0).toLocaleString('id-ID')}
                      </div>
                      <div className="text-[10px] text-amber-700 font-medium">
                        {agents.reduce((sum: number, a: any) => sum + (a.rewardsCount || 0), 0)} Penghargaan resmi kantor
                      </div>
                    </div>
                  </div>

                  {/* Tabel Daftar Agen dengan Kolom Progres Stok & Penjualan */}
                  <div className="bg-white rounded-2xl border border-varena-taupe/20 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-varena-taupe/15 flex items-center justify-between">
                      <div>
                        <h3 className="font-serif text-base font-bold text-varena-espresso flex items-center gap-2">
                          <Store className="w-4 h-4 text-varena-gold" />
                          <span>Monitoring Stok &amp; Progres Pencapaian Agen</span>
                        </h3>
                        <p className="text-xs text-varena-taupe mt-0.5">
                          Pantau stok real-time, volume penjualan, omset, dan riwayat reward tiap agen resmi.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={loadAgents}
                        disabled={agentLoading}
                        className="text-xs text-varena-taupe hover:text-varena-espresso font-semibold flex items-center gap-1 bg-stone-50 hover:bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-200 transition"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${agentLoading ? 'animate-spin' : ''}`} />
                        <span>Segarkan Data</span>
                      </button>
                    </div>

                    {agents.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left min-w-[980px]">
                          <thead className="bg-varena-ivory-light text-varena-taupe uppercase font-semibold border-b border-varena-taupe/20">
                            <tr>
                              <th className="py-2.5 px-3">Kode &amp; Agen</th>
                              <th className="py-2.5 px-3">Wilayah / Kota</th>
                              <th className="py-2.5 px-3">Sisa Stok Fisik</th>
                              <th className="py-2.5 px-3">Total Terjual</th>
                              <th className="py-2.5 px-3">Nominal Penjualan</th>
                              <th className="py-2.5 px-3">Reward Diterima</th>
                              <th className="py-2.5 px-3">Saldo Kas Deposit</th>
                              <th className="py-2.5 px-3 text-right">Aksi &amp; Detail</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-varena-taupe/10">
                            {agents.map((a: any) => (
                              <tr key={a.id} className="hover:bg-varena-ivory-light/40 transition">
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-bold text-varena-espresso">{a.memberCode}</span>
                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                      a.type === 'MASTER_AGENT' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {a.type === 'MASTER_AGENT' ? 'MASTER' : 'WILAYAH'}
                                    </span>
                                  </div>
                                  <div className="font-semibold text-varena-espresso text-sm mt-0.5">{a.displayName}</div>
                                  <div className="text-[10px] text-varena-taupe font-mono">{a.phone || a.email || '-'}</div>
                                </td>
                                <td className="py-2.5 px-3 font-medium text-slate-700">
                                  <div className="font-semibold">{a.city}</div>
                                  <div className="text-[10px] text-varena-taupe">{a.province}</div>
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="font-mono font-bold text-sm text-emerald-800 flex items-center gap-1.5">
                                    <span>{a.inventory} Box</span>
                                    {a.inventory < 10 ? (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-rose-100 text-rose-700 font-bold">
                                        Menipis
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-100 text-emerald-800 font-bold">
                                        Aman
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-stone-400 mt-0.5">
                                    Pasokan Masuk: {a.totalRestockBoxes || 0} Box
                                  </div>
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="font-mono font-bold text-sm text-blue-900">
                                    {a.totalSoldBoxes || 0} Box
                                  </div>
                                  <div className="text-[10px] text-stone-400 mt-0.5">
                                    {a.completedOrdersCount || 0} pesanan selesai
                                  </div>
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="font-mono font-bold text-sm text-varena-espresso">
                                    Rp{(a.totalSalesNominal || 0).toLocaleString('id-ID')}
                                  </div>
                                  <div className="text-[10px] text-emerald-700 font-medium">
                                    Omset Terdistribusi
                                  </div>
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="font-bold text-amber-900 flex items-center gap-1">
                                    <Award className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span>{a.rewardsCount || 0} Reward</span>
                                  </div>
                                  {a.totalRewardValue > 0 ? (
                                    <div className="font-mono text-[11px] text-amber-700 font-semibold mt-0.5">
                                      Valuasi: Rp{(a.totalRewardValue || 0).toLocaleString('id-ID')}
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-stone-400 italic">Belum ada reward</div>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                                  Rp{(a.depositBalance || 0).toLocaleString('id-ID')}
                                </td>
                                <td className="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMonitoringAgent(a);
                                      setMonitoringTab('OVERVIEW');
                                      setMonitoringModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-varena-espresso text-varena-gold font-bold text-[11px] hover:bg-varena-espresso-dark transition inline-flex items-center gap-1 shadow-xs"
                                    title="Monitor Progres, Stok & Reward Agen"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>Detail &amp; Progres</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedRewardAgent(a);
                                      setRewardTitle('');
                                      setRewardDesc('');
                                      setRewardValue(1000000);
                                      setRewardModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-amber-600 text-white font-semibold text-[11px] hover:bg-amber-700 transition inline-flex items-center gap-1 shadow-xs"
                                  >
                                    <Award className="w-3 h-3" />
                                    <span>Beri Reward</span>
                                  </button>
                                  {a.phone && (
                                    <a
                                      href={`https://wa.me/${a.phone.replace(/^0/, '62')}?text=${encodeURIComponent(
                                        `Halo Agen ${a.displayName} (${a.memberCode}), salam dari Manajemen Pusat VARENA terkait stok dan perkembangan penjualan keagenan wilayah ${a.city}.`
                                      )}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white font-semibold text-[11px] hover:bg-emerald-800 transition inline-flex items-center gap-1 shadow-xs"
                                    >
                                      <Send className="w-3 h-3" />
                                      <span>WA</span>
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
                        Belum ada agen resmi terdaftar. Anda dapat menyetujui pengajuan mitra atau menggunakan tab Penunjukan Langsung.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUBTAB 2: PENGAJUAN MASUK (APPLICATIONS) */}
              {agentSubTab === 'APPLICATIONS' && (
                <div className="bg-white rounded-2xl border border-varena-taupe/20 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-varena-taupe/15 flex items-center justify-between">
                    <div>
                      <h3 className="font-serif text-base font-bold text-varena-espresso flex items-center gap-2">
                        <Store className="w-4 h-4 text-varena-gold" />
                        <span>Pengajuan Permohonan Keagenan Masuk</span>
                      </h3>
                      <p className="text-xs text-varena-taupe mt-0.5">
                        Tinjau permohonan dari mitra mandiri sebelum disetujui sebagai representasi agen resmi.
                      </p>
                    </div>
                  </div>

                  {agentApplications.length > 0 ? (
                    <div className="divide-y divide-varena-taupe/10">
                      {agentApplications.map((app: any) => (
                        <div key={app.id} className="p-5 hover:bg-varena-ivory-light/30 transition space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-varena-espresso">
                                  {app.member?.displayName || 'Mitra'}
                                </span>
                                <span className="font-mono text-xs text-varena-gold font-bold">
                                  ({app.member?.memberCode})
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${app.status === 'APPROVED'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : app.status === 'REJECTED'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                >
                                  {app.status === 'APPROVED' ? 'Disetujui' : app.status === 'REJECTED' ? 'Ditolak' : 'Menunggu Verifikasi'}
                                </span>
                              </div>
                              <div className="text-xs text-varena-taupe mt-0.5">
                                Diajukan pada {new Date(app.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </div>
                            </div>

                            {app.status === 'PENDING' && (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedApp(app);
                                    setAppInitialStock(20);
                                    setAppDiscountType('PERCENTAGE');
                                    setAppDiscountValue(15);
                                    setApproveAppModalOpen(true);
                                  }}
                                  className="px-3.5 py-1.5 rounded-lg bg-emerald-700 text-white font-semibold text-xs hover:bg-emerald-800 transition shadow-xs flex items-center gap-1"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Setujui &amp; Angkat Agen</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectApplication(app.id)}
                                  className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-semibold text-xs transition"
                                >
                                  Tolak
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                            <div>
                              <span className="text-varena-taupe block text-[11px]">Kota &amp; Provinsi Target</span>
                              <span className="font-semibold text-slate-800">{app.city}, {app.province}</span>
                            </div>
                            <div>
                              <span className="text-varena-taupe block text-[11px]">Kapasitas Gudang</span>
                              <span className="font-semibold text-slate-800">{app.storageCapacity} Box</span>
                            </div>
                            <div>
                              <span className="text-varena-taupe block text-[11px]">WhatsApp Pemohon</span>
                              <span className="font-mono font-semibold text-slate-800">{app.contactPhone}</span>
                            </div>
                            <div className="sm:col-span-3">
                              <span className="text-varena-taupe block text-[11px]">Alamat Lengkap Gudang/Toko</span>
                              <span className="text-slate-800">{app.warehouseAddress}</span>
                            </div>
                            {app.notes && (
                              <div className="sm:col-span-3 text-[11px] text-slate-600 italic">
                                &quot;{app.notes}&quot;
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-xs text-varena-taupe">
                      Tidak ada permohonan keagenan yang menunggu persetujuan.
                    </div>
                  )}
                </div>
              )}

              {/* SUBTAB 3: ALIKHAN PESANAN KE AGEN (ORDER ROUTING) */}
              {agentSubTab === 'ROUTING' && (
                <div className="bg-white rounded-2xl border border-varena-taupe/20 shadow-sm overflow-hidden space-y-4 p-5">
                  <div>
                    <h3 className="font-serif text-base font-bold text-varena-espresso flex items-center gap-2">
                      <Truck className="w-4 h-4 text-varena-gold" />
                      <span>Pengalihan Pesanan Regional ke Agen Terdekat</span>
                    </h3>
                    <p className="text-xs text-varena-taupe mt-1">
                      Pesanan konsumen/mitra dari kota tertentu dapat dialihkan pemenuhannya ke agen setempat untuk menghemat ongkir, mempercepat kiriman lokal, dan memberi keuntungan kuantiti ke agen.
                    </p>
                  </div>

                  {routableOrders.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left min-w-[700px]">
                        <thead className="bg-varena-ivory-light text-varena-taupe uppercase font-semibold border-b border-varena-taupe/20">
                          <tr>
                            <th className="py-2.5 px-3">No. Invoice</th>
                            <th className="py-2.5 px-3">Pembeli &amp; Kota</th>
                            <th className="py-2.5 px-3">Alamat Tujuan</th>
                            <th className="py-2.5 px-3">Total Pesanan</th>
                            <th className="py-2.5 px-3 text-right">Aksi Pengalihan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-varena-taupe/10">
                          {routableOrders.map((ord: any) => (
                            <tr key={ord.id} className="hover:bg-varena-ivory-light/40">
                              <td className="py-2.5 px-3 font-mono font-bold text-varena-espresso">{ord.orderNumber}</td>
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-800">{ord.buyerName}</div>
                                <div className="text-[10px] text-varena-gold font-bold">{ord.shippingCity || 'Kota belum diisi'}</div>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">{ord.shippingAddress}</td>
                              <td className="py-2.5 px-3 font-mono font-semibold text-varena-espresso">
                                Rp{(ord.total || 0).toLocaleString('id-ID')}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedRouteOrder(ord);
                                    setSelectedRouteAgentId(agents[0]?.id || '');
                                    setRouteOrderNote(`Pengalihan pengiriman lokal untuk tujuan kota ${ord.shippingCity || ''}`);
                                    setRouteOrderModalOpen(true);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-blue-700 text-white font-semibold text-xs hover:bg-blue-800 transition shadow-xs inline-flex items-center gap-1"
                                >
                                  <Truck className="w-3.5 h-3.5" />
                                  <span>Alihkan ke Agen</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-10 text-xs text-varena-taupe bg-varena-ivory-light rounded-xl border border-dashed border-varena-taupe/30">
                      Tidak ada pesanan baru yang siap dialihkan saat ini.
                    </div>
                  )}
                </div>
              )}

              {/* SUBTAB 4: APPROVAL TOPUP DEPOSIT */}
              {agentSubTab === 'TOPUP' && (
                <div className="bg-white rounded-2xl border border-varena-taupe/20 shadow-sm overflow-hidden p-5 space-y-4">
                  <div>
                    <h3 className="font-serif text-base font-bold text-varena-espresso flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-varena-gold" />
                      <span>Verifikasi Pengajuan Topup Saldo Deposit</span>
                    </h3>
                    <p className="text-xs text-varena-taupe mt-1">
                      Verifikasi transfer bank dari agen &amp; mitra. Cocokkan nominal + kode unik dengan mutasi rekening BRI sebelum menyetujui.
                    </p>
                  </div>

                  {pendingAgentTopups.length > 0 ? (
                    <div className="divide-y divide-varena-taupe/10">
                      {pendingAgentTopups.map((topup: any) => {
                        const transferTotal = (topup.amount || 0) + (topup.uniqueCode || 0);
                        const isShoppingTopup = topup.type === 'SHOPPING_TOPUP';
                        return (
                          <div key={topup.id} className="py-5 space-y-3">
                            {/* Top row: name + badge */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-sm text-varena-espresso">
                                {topup.member?.displayName} ({topup.member?.memberCode})
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isShoppingTopup ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                                {isShoppingTopup ? 'DEPOSIT BELANJA MITRA' : 'DEPOSIT AGEN'}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] bg-orange-100 text-orange-800 font-bold">
                                PENDING REVIEW
                              </span>
                            </div>

                            {/* Detail boxes */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                              <div className="bg-stone-50 rounded-xl p-3">
                                <div className="text-varena-taupe mb-0.5">Nominal Deposit</div>
                                <div className="font-mono font-bold text-emerald-800 text-sm">
                                  Rp{(topup.amount || 0).toLocaleString('id-ID')}
                                </div>
                              </div>
                              <div className="bg-stone-50 rounded-xl p-3">
                                <div className="text-varena-taupe mb-0.5">Kode Unik</div>
                                <div className="font-mono font-bold text-varena-espresso text-sm">
                                  +Rp{(topup.uniqueCode || 0).toLocaleString('id-ID')}
                                </div>
                              </div>
                              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 col-span-2">
                                <div className="text-amber-700 mb-0.5 font-semibold">Total Harus Diterima di BRI</div>
                                <div className="font-mono font-bold text-amber-900 text-base">
                                  Rp{transferTotal.toLocaleString('id-ID')}
                                </div>
                                <div className="text-[10px] text-amber-600">Cocokkan dengan mutasi rekening BRI 3065 0102 4471 539</div>
                              </div>
                            </div>

                            {/* Bank info */}
                            <div className="text-[11px] text-varena-taupe">
                              Diajukan: {new Date(topup.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              {' · '}Bank Pengirim: <strong>{topup.bankName || '-'}</strong> (Rek: {topup.accountNumber || '-'})
                            </div>
                            {topup.notes && (
                              <div className="text-[11px] text-slate-600 font-mono bg-slate-50 px-2 py-1 rounded">
                                Ref: {topup.notes}
                              </div>
                            )}

                            {/* Proof image */}
                            {topup.proofUrl && (
                              <div className="mt-1">
                                <div className="text-[11px] font-semibold text-stone-600 mb-1">Bukti Transfer:</div>
                                <a href={topup.proofUrl} target="_blank" rel="noopener noreferrer">
                                  <img
                                    src={topup.proofUrl}
                                    alt="Bukti Transfer"
                                    className="max-h-32 rounded-lg border border-stone-200 hover:opacity-80 transition cursor-pointer"
                                  />
                                </a>
                              </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => handleApproveDepositTopup(topup)}
                                disabled={agentLoading}
                                className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition shadow"
                              >
                                ✓ Setujui &amp; Tambah Saldo
                              </button>
                              <button
                                type="button"
                                onClick={() => { setRejectTopupId(topup.id); setRejectTopupReason(''); }}
                                className="px-4 py-2 rounded-xl bg-rose-100 text-rose-700 font-bold text-xs hover:bg-rose-200 transition"
                              >
                                ✕ Tolak
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-xs text-varena-taupe bg-varena-ivory-light rounded-xl border border-dashed border-varena-taupe/30">
                      Tidak ada permintaan topup deposit yang pending saat ini.
                    </div>
                  )}
                </div>
              )}

              {/* SUBTAB 5: PENUNJUKAN LANGSUNG (DIRECT APPOINTMENT) */}
              {agentSubTab === 'APPOINT' && (
                <div className="bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <Store className="w-5 h-5 text-varena-gold" />
                    <h3 className="font-serif text-base font-bold text-varena-espresso">
                      Penunjukan Langsung Mitra Sebagai Agen Resmi VARENA
                    </h3>
                  </div>
                  <p className="text-xs text-varena-taupe">
                    Manajemen kantor pusat dapat menunjuk mitra strategis secara langsung menjadi Agen Resmi Wilayah tanpa menunggu pengajuan mandiri.
                  </p>

                  <form onSubmit={handleDirectAppointment} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2">
                    <div className="sm:col-span-3">
                      <label className="block font-semibold text-varena-espresso mb-1">
                        Kode ID Mitra Terdaftar *
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            required
                            value={appointMemberCode}
                            onChange={(e) => {
                              const val = e.target.value.toUpperCase();
                              setAppointMemberCode(val);
                              setCandidateConfirmed(false);
                              if (val.length >= 4) {
                                lookupCandidateMember(val);
                              } else {
                                setCandidateMember(null);
                                setCandidateError('');
                              }
                            }}
                            placeholder="Ketik ID Mitra (Contoh: VRN-0002)"
                            className="w-full px-3 py-2 rounded-lg border border-varena-taupe/30 uppercase font-mono focus:outline-none focus:border-varena-gold text-sm"
                          />
                          {candidateChecking && (
                            <span className="absolute right-3 top-2.5 text-xs text-stone-400">Mengecek...</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => lookupCandidateMember(appointMemberCode)}
                          className="px-4 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold"
                        >
                          Cek ID
                        </button>
                      </div>

                      {/* Notifikasi Error jika tidak ditemukan */}
                      {candidateError && (
                        <div className="mt-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          <span>{candidateError}</span>
                        </div>
                      )}

                      {/* Kartu Verifikasi Calon Agen Otomatis */}
                      {candidateMember && (
                        <div className="mt-2.5 p-3.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-sm text-varena-espresso">
                                  {candidateMember.displayName || candidateMember.legalName}
                                </span>
                                <span className="font-mono text-[11px] bg-amber-200/80 px-2 py-0.5 rounded text-amber-900 font-bold">
                                  {candidateMember.memberCode}
                                </span>
                                {candidateMember.isAgent ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] bg-blue-100 text-blue-800 font-bold">
                                    SUDAH AGEN ({candidateMember.agentType})
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                                    ✓ CALON AGEN TERVERIFIKASI
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-stone-600 mt-1">
                                {candidateMember.phone && <span>📱 {candidateMember.phone} · </span>}
                                Wilayah Terdaftar: <strong>{candidateMember.city || 'Belum diatur'}</strong> ({candidateMember.province || '-'})
                              </div>
                              {candidateMember.addressDetail && (
                                <div className="text-[11px] text-stone-500 mt-0.5 italic">
                                  Alamat Domisili: {candidateMember.addressDetail}
                                </div>
                              )}
                            </div>

                            {/* Tombol OK untuk Masukkan ke Rencana Agen */}
                            <button
                              type="button"
                              onClick={handleApplyCandidateData}
                              className={`px-4 py-2.5 rounded-lg font-bold text-xs transition shadow-sm flex items-center gap-1.5 flex-shrink-0 ${
                                candidateConfirmed
                                  ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                                  : 'bg-varena-gold text-varena-espresso hover:bg-varena-gold-hover'
                              }`}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>{candidateConfirmed ? '✓ Data Telah Diisi' : 'OK / Masukkan ke Rencana Agen'}</span>
                            </button>
                          </div>

                          {candidateConfirmed && (
                            <div className="pt-2 border-t border-amber-200">
                              {candidateMember.city || candidateMember.addressDetail ? (
                                <div className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1.5">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                  <span>
                                    ✓ Data otomatis dimasukkan ke formulir di bawah: Kota <strong>{candidateMember.city || '-'}</strong>, Provinsi <strong>{candidateMember.province || '-'}</strong>, Alamat: <em>{candidateMember.addressDetail || '-'}</em>.
                                  </span>
                                </div>
                              ) : (
                                <div className="text-[11px] text-amber-900 bg-amber-100/80 p-2.5 rounded-lg border border-amber-300 flex items-start gap-1.5">
                                  <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <span className="font-bold">Perhatian:</span> Mitra <strong>{candidateMember.displayName}</strong> belum memiliki riwayat alamat domisili tersimpan di sistem (status: Belum diatur). Silakan ketik nama <strong>Kota / Kabupaten</strong> dan <strong>Alamat Gudang</strong> pada formulir di bawah ini secara manual.
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block font-semibold text-varena-espresso mb-1">Tingkatan Agen *</label>
                      <select
                        value={appointType}
                        onChange={(e) => setAppointType(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-varena-taupe/30 bg-white focus:outline-none focus:border-varena-gold text-sm"
                      >
                        <option value="REGIONAL_AGENT">Agen Resmi Wilayah</option>
                        <option value="MASTER_AGENT">Master Agen Regional (Provinsi)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-varena-espresso mb-1 flex items-center justify-between">
                        <span>Kota / Kabupaten *</span>
                        {appointCity && <span className="text-[10px] text-emerald-700 font-normal">✓ Terisi</span>}
                      </label>
                      <input
                        type="text"
                        required
                        value={appointCity}
                        onChange={(e) => setAppointCity(e.target.value)}
                        placeholder="Contoh: Jakarta Pusat / Surabaya"
                        className={`w-full px-3 py-2 rounded-lg border text-sm transition focus:outline-none focus:border-varena-gold ${
                          appointCity
                            ? 'border-emerald-400 bg-emerald-50/20 text-varena-espresso font-semibold'
                            : 'border-varena-taupe/30'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-varena-espresso mb-1 flex items-center justify-between">
                        <span>Provinsi</span>
                        {appointProvince && <span className="text-[10px] text-emerald-700 font-normal">✓ Terisi</span>}
                      </label>
                      <input
                        type="text"
                        value={appointProvince}
                        onChange={(e) => setAppointProvince(e.target.value)}
                        placeholder="Contoh: DKI Jakarta / Jawa Timur"
                        className={`w-full px-3 py-2 rounded-lg border text-sm transition focus:outline-none focus:border-varena-gold ${
                          appointProvince
                            ? 'border-emerald-400 bg-emerald-50/20 text-varena-espresso font-semibold'
                            : 'border-varena-taupe/30'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-varena-espresso mb-1">Alokasi Stok Awal (Box)</label>
                      <input
                        type="number"
                        min="0"
                        value={appointInitialStock}
                        onChange={(e) => setAppointInitialStock(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-3 py-2 rounded-lg border border-varena-taupe/30 font-mono focus:outline-none focus:border-varena-gold text-sm"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-varena-espresso mb-1">Besaran Diskon Agen</label>
                      <div className="flex gap-2">
                        <select
                          value={appointDiscountType}
                          onChange={(e) => setAppointDiscountType(e.target.value)}
                          className="w-1/2 px-2 py-2 rounded-lg border border-varena-taupe/30 bg-white text-xs"
                        >
                          <option value="PERCENTAGE">Persen (%)</option>
                          <option value="NOMINAL">Nominal (Rp)</option>
                        </select>
                        <input
                          type="number"
                          value={appointDiscountValue}
                          onChange={(e) => setAppointDiscountValue(parseFloat(e.target.value) || 0)}
                          className="w-1/2 px-2 py-2 rounded-lg border border-varena-taupe/30 font-mono text-sm"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block font-semibold text-varena-espresso mb-1 flex items-center justify-between">
                        <span>Alamat Titik Distribusi / Gudang Agen</span>
                        {appointAddress && <span className="text-[10px] text-emerald-700 font-normal">✓ Terisi</span>}
                      </label>
                      <textarea
                        rows={2}
                        value={appointAddress}
                        onChange={(e) => setAppointAddress(e.target.value)}
                        placeholder="Alamat ruko / rumah tempat operasional dan gudang agen..."
                        className={`w-full px-3 py-2 rounded-lg border text-sm transition focus:outline-none focus:border-varena-gold ${
                          appointAddress
                            ? 'border-emerald-400 bg-emerald-50/20 text-varena-espresso font-medium'
                            : 'border-varena-taupe/30'
                        }`}
                      />
                    </div>

                    <div className="sm:col-span-3 pt-2">
                      <button
                        type="submit"
                        disabled={agentLoading}
                        className="py-2.5 px-6 rounded-lg bg-varena-espresso text-varena-gold font-bold hover:bg-varena-espresso-dark transition shadow"
                      >
                        {agentLoading ? 'Memproses...' : 'Tetapkan Sebagai Agen Resmi'}
                      </button>
                    </div>
                  </form>

                  {/* TABEL AGEN AKTIF HASIL PENUNJUKAN */}
                  <div className="pt-6 border-t border-varena-taupe/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-serif font-bold text-sm text-varena-espresso flex items-center gap-2">
                        <Users className="w-4 h-4 text-varena-gold" />
                        Daftar Seluruh Agen Resmi Aktif ({agents.length} Agen)
                      </h4>
                      <button
                        type="button"
                        onClick={() => setAgentSubTab('LIST')}
                        className="text-xs text-varena-gold hover:underline font-semibold"
                      >
                        Lihat di Tab Daftar Agen →
                      </button>
                    </div>

                    {agents.length === 0 ? (
                      <div className="text-center py-6 text-xs text-varena-taupe bg-varena-ivory-light rounded-xl border border-dashed border-varena-taupe/30">
                        Belum ada agen resmi yang terdaftar.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-varena-taupe/20">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-varena-ivory-light text-varena-taupe text-left">
                              <th className="px-3 py-2.5 font-semibold">Kode & Nama</th>
                              <th className="px-3 py-2.5 font-semibold">Tipe</th>
                              <th className="px-3 py-2.5 font-semibold">Wilayah</th>
                              <th className="px-3 py-2.5 font-semibold text-right">Stok Fisik</th>
                              <th className="px-3 py-2.5 font-semibold text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-varena-taupe/10">
                            {agents.slice(0, 5).map((a) => (
                              <tr key={a.id} className="hover:bg-varena-ivory-light/40">
                                <td className="px-3 py-2.5">
                                  <div className="font-semibold text-varena-espresso">{a.displayName}</div>
                                  <div className="text-varena-taupe font-mono text-[11px]">{a.memberCode}</div>
                                </td>
                                <td className="px-3 py-2.5">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                    a.type === 'MASTER_AGENT' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {a.type === 'MASTER_AGENT' ? 'Master Agen' : 'Agen Regional'}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-stone-600">
                                  <div>{a.city || '-'}</div>
                                  <div className="text-[10px] text-stone-400">{a.province || '-'}</div>
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono font-bold text-varena-espresso">
                                  {(a.inventory || 0).toLocaleString('id-ID')} Box
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    AKTIF
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUBTAB 6: KONFIGURASI KEAGENAN (MOQ & DISKON) */}
              {agentSubTab === 'CONFIG' && (
                <div className="bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-4 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-varena-gold" />
                    <h3 className="font-serif text-base font-bold text-varena-espresso">
                      Konfigurasi Parameter Keagenan Resmi VARENA
                    </h3>
                  </div>
                  <p className="text-xs text-varena-taupe">
                    Atur batas minimum kuantiti order pasokan restock agen (MOQ) dan standar diskon yang berlaku secara dinamis.
                  </p>

                  <form onSubmit={handleUpdateAgentConfig} className="space-y-4 text-xs pt-2">
                    <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200">
                      <label className="block font-bold text-amber-950 mb-1">
                        Minimal Pemesanan Restock Agen (MOQ Box) *
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="1"
                          required
                          value={configMoq}
                          onChange={(e) => setConfigMoq(parseInt(e.target.value, 10) || 1)}
                          className="w-32 px-3 py-2 rounded-lg border border-amber-300 font-mono font-bold text-base focus:outline-none focus:border-varena-gold"
                        />
                        <span className="text-xs text-amber-900 font-medium">
                          Box per sekali pemesanan (Saat ini diatur default 10 Box)
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-varena-espresso mb-1">Tipe Diskon Default</label>
                        <select
                          value={configDiscountType}
                          onChange={(e) => setConfigDiscountType(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-varena-taupe/30 bg-white"
                        >
                          <option value="PERCENTAGE">Persentase (%)</option>
                          <option value="NOMINAL">Nominal Potongan per Box (Rp)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-varena-espresso mb-1">Nilai Diskon Default</label>
                        <input
                          type="number"
                          value={configDiscountValue}
                          onChange={(e) => setConfigDiscountValue(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded-lg border border-varena-taupe/30 font-mono text-sm"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={agentLoading}
                        className="py-2.5 px-6 rounded-lg bg-varena-espresso text-varena-gold font-bold hover:bg-varena-espresso-dark transition shadow"
                      >
                        {agentLoading ? 'Menyimpan...' : 'Simpan Konfigurasi Aturan'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* SUBTAB: BOARD RANKING PENJUALAN AGEN */}
              {agentSubTab === 'RANKING' && (() => {
                const rankedAgents = [...agents].sort((a, b) => {
                  if (rankingSortBy === 'SOLD_BOX') return (b.totalSoldBoxes || 0) - (a.totalSoldBoxes || 0);
                  return (b.totalSalesNominal || 0) - (a.totalSalesNominal || 0);
                });
                const top3 = rankedAgents.slice(0, 3);
                const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3.length === 2 ? [top3[1], top3[0]] : top3;
                const podiumStyles: Record<number, { bg: string; border: string; badge: string; emoji: string; height: string; labelBg: string }> = {
                  0: { bg: 'bg-gradient-to-b from-slate-100 to-slate-50', border: 'border-slate-300', badge: 'bg-slate-400 text-white', emoji: '🥈', height: 'h-28', labelBg: 'bg-slate-200' },
                  1: { bg: 'bg-gradient-to-b from-amber-50 to-yellow-50', border: 'border-varena-gold', badge: 'bg-varena-gold text-varena-espresso', emoji: '🥇', height: 'h-36', labelBg: 'bg-amber-100' },
                  2: { bg: 'bg-gradient-to-b from-orange-50 to-amber-50', border: 'border-orange-300', badge: 'bg-orange-400 text-white', emoji: '🥉', height: 'h-24', labelBg: 'bg-orange-100' },
                };
                const podiumRanks = top3.length >= 3 ? [2, 1, 3] : top3.length === 2 ? [2, 1] : [1];
                return (
                  <div className="space-y-6">
                    {/* Header & Sort Toggle */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <h3 className="font-serif text-lg font-bold text-varena-espresso flex items-center gap-2">
                          🏆 Board Ranking Penjualan Agen
                        </h3>
                        <p className="text-xs text-varena-taupe mt-0.5">Peringkat kinerja seluruh agen aktif VARENA berdasarkan volume penjualan</p>
                      </div>
                      <div className="flex gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setRankingSortBy('SOLD_BOX')}
                          className={`px-4 py-2 rounded-xl font-semibold transition border ${rankingSortBy === 'SOLD_BOX'
                            ? 'bg-varena-espresso text-varena-gold border-varena-espresso shadow'
                            : 'bg-white text-slate-600 border-varena-taupe/30 hover:bg-varena-ivory-light'}`}
                        >
                          📦 Volume Box Terjual
                        </button>
                        <button
                          type="button"
                          onClick={() => setRankingSortBy('SALES_NOMINAL')}
                          className={`px-4 py-2 rounded-xl font-semibold transition border ${rankingSortBy === 'SALES_NOMINAL'
                            ? 'bg-varena-espresso text-varena-gold border-varena-espresso shadow'
                            : 'bg-white text-slate-600 border-varena-taupe/30 hover:bg-varena-ivory-light'}`}
                        >
                          💰 Nominal Omset (Rp)
                        </button>
                      </div>
                    </div>

                    {rankedAgents.length === 0 ? (
                      <div className="bg-white rounded-2xl border border-varena-taupe/20 p-12 text-center text-varena-taupe text-sm">
                        Belum ada data agen aktif untuk ditampilkan.
                      </div>
                    ) : (
                      <>
                        {/* TOP 3 PODIUM */}
                        {rankedAgents.length >= 1 && (
                          <div className="bg-gradient-to-b from-varena-ivory-light to-white rounded-3xl border border-varena-taupe/20 shadow-sm p-6">
                            <p className="text-center text-xs font-semibold text-varena-taupe mb-6 uppercase tracking-widest">
                              {rankingSortBy === 'SOLD_BOX' ? '— Podium Teratas: Volume Box Terjual —' : '— Podium Teratas: Nominal Omset Penjualan —'}
                            </p>
                            <div className="flex items-end justify-center gap-4">
                              {podiumOrder.map((agent, idx) => {
                                if (!agent) return null;
                                const rank = podiumRanks[idx];
                                const styleKey = idx as 0 | 1 | 2;
                                const s = podiumStyles[styleKey];
                                const score = rankingSortBy === 'SOLD_BOX'
                                  ? `${(agent.totalSoldBoxes || 0).toLocaleString('id-ID')} Box`
                                  : `Rp${(agent.totalSalesNominal || 0).toLocaleString('id-ID')}`;
                                return (
                                  <div key={agent.id} className="flex flex-col items-center gap-2 flex-1 max-w-[180px]">
                                    <div className={`text-3xl ${styleKey === 1 ? 'animate-bounce' : ''}`}>{s.emoji}</div>
                                    <div className={`w-full rounded-t-2xl border-2 ${s.bg} ${s.border} ${s.height} flex flex-col items-center justify-end pb-3 px-2 gap-1 shadow-sm`}>
                                      <span className={`${s.badge} text-[10px] font-black px-2 py-0.5 rounded-full`}>#{rank}</span>
                                      <div className="text-center">
                                        <div className="font-serif font-bold text-varena-espresso text-xs leading-tight line-clamp-2 text-center">{agent.displayName}</div>
                                        <div className="text-[10px] text-varena-taupe">{agent.city || agent.province || '-'}</div>
                                        <div className={`text-[9px] mt-0.5 px-1.5 py-0.5 rounded-full font-semibold ${s.labelBg} text-varena-espresso`}>
                                          {agent.type === 'MASTER_AGENT' ? 'Master' : 'Regional'}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-center">
                                      <div className="font-mono font-bold text-varena-espresso text-xs">{score}</div>
                                      {(agent.totalRewardValue || 0) > 0 && (
                                        <div className="text-[9px] text-amber-600">🎁 Reward: Rp{(agent.totalRewardValue || 0).toLocaleString('id-ID')}</div>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => { setSelectedRewardAgent(agent); setRewardModalOpen(true); }}
                                      className="text-[10px] px-3 py-1.5 rounded-lg bg-varena-gold/20 hover:bg-varena-gold/40 text-varena-espresso font-semibold border border-varena-gold/30 transition"
                                    >
                                      🎁 Beri Reward
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* FULL LEADERBOARD TABLE */}
                        <div className="bg-white rounded-2xl border border-varena-taupe/20 shadow-sm overflow-hidden">
                          <div className="p-4 border-b border-varena-taupe/15 flex items-center justify-between">
                            <h4 className="font-serif font-bold text-varena-espresso text-sm flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-varena-gold" />
                              Peringkat Lengkap Seluruh Agen ({rankedAgents.length} Agen)
                            </h4>
                            <span className="text-xs text-varena-taupe">
                              Diurutkan berdasarkan: {rankingSortBy === 'SOLD_BOX' ? 'Volume Box Terjual ↓' : 'Nominal Omset ↓'}
                            </span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-varena-ivory-light text-varena-taupe text-left">
                                  <th className="px-4 py-3 font-semibold w-14">#</th>
                                  <th className="px-4 py-3 font-semibold">Kode & Nama Agen</th>
                                  <th className="px-4 py-3 font-semibold">Wilayah</th>
                                  <th className="px-4 py-3 font-semibold text-right">Terjual (Box)</th>
                                  <th className="px-4 py-3 font-semibold text-right">Omset (Rp)</th>
                                  <th className="px-4 py-3 font-semibold text-right">Sisa Stok</th>
                                  <th className="px-4 py-3 font-semibold text-right">Reward</th>
                                  <th className="px-4 py-3 font-semibold text-center">Aksi</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-varena-taupe/10">
                                {rankedAgents.map((agent, idx) => {
                                  const rank = idx + 1;
                                  const rankBadge =
                                    rank === 1 ? <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-white font-black text-xs shadow">🥇</span>
                                    : rank === 2 ? <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-400 text-white font-black text-xs shadow">🥈</span>
                                    : rank === 3 ? <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-400 text-white font-black text-xs shadow">🥉</span>
                                    : <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-varena-ivory-light text-varena-espresso font-bold text-xs border border-varena-taupe/20">#{rank}</span>;
                                  return (
                                    <tr key={agent.id} className={`hover:bg-varena-ivory-light/50 transition ${rank <= 3 ? 'bg-amber-50/30' : ''}`}>
                                      <td className="px-4 py-3">{rankBadge}</td>
                                      <td className="px-4 py-3">
                                        <div className="font-semibold text-varena-espresso">{agent.displayName}</div>
                                        <div className="text-varena-taupe font-mono">{agent.memberCode}</div>
                                        <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${agent.type === 'MASTER_AGENT' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                          {agent.type === 'MASTER_AGENT' ? 'Master Agen' : 'Regional Agen'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-varena-taupe">
                                        <div>{agent.city || '-'}</div>
                                        <div className="text-[10px]">{agent.province || ''}</div>
                                      </td>
                                      <td className="px-4 py-3 text-right">
                                        <div className={`font-mono font-bold ${rankingSortBy === 'SOLD_BOX' ? 'text-varena-espresso' : 'text-slate-500'}`}>
                                          {(agent.totalSoldBoxes || 0).toLocaleString('id-ID')}
                                        </div>
                                        <div className="text-varena-taupe text-[10px]">box terjual</div>
                                      </td>
                                      <td className="px-4 py-3 text-right">
                                        <div className={`font-mono font-bold ${rankingSortBy === 'SALES_NOMINAL' ? 'text-emerald-700' : 'text-slate-500'}`}>
                                          Rp{(agent.totalSalesNominal || 0).toLocaleString('id-ID')}
                                        </div>
                                        <div className="text-varena-taupe text-[10px]">total omset</div>
                                      </td>
                                      <td className="px-4 py-3 text-right">
                                        <div className={`font-mono font-bold ${(agent.inventory || 0) < 5 ? 'text-red-600' : 'text-slate-700'}`}>
                                          {(agent.inventory || 0).toLocaleString('id-ID')}
                                        </div>
                                        <div className="text-varena-taupe text-[10px]">box tersisa</div>
                                      </td>
                                      <td className="px-4 py-3 text-right">
                                        {(agent.totalRewardValue || 0) > 0 ? (
                                          <>
                                            <div className="font-mono font-bold text-amber-600">Rp{(agent.totalRewardValue || 0).toLocaleString('id-ID')}</div>
                                            <div className="text-varena-taupe text-[10px]">{agent.rewardsCount || 0}x reward</div>
                                          </>
                                        ) : (
                                          <span className="text-varena-taupe/60">—</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-3">
                                        <div className="flex items-center justify-center gap-1.5">
                                          <button
                                            type="button"
                                            title="Beri Reward"
                                            onClick={() => { setSelectedRewardAgent(agent); setRewardModalOpen(true); }}
                                            className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 transition"
                                          >
                                            <Gift className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            title="Detail & Progres"
                                            onClick={() => { setMonitoringAgent(agent); setMonitoringModalOpen(true); }}
                                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 transition"
                                          >
                                            <Eye className="w-3.5 h-3.5" />
                                          </button>
                                          {agent.phone && (
                                            <a
                                              href={`https://wa.me/${agent.phone.replace(/\D/g, '').replace(/^0/, '62')}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              title="WhatsApp"
                                              className="p-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 border border-green-200 transition"
                                            >
                                              <MessageSquare className="w-3.5 h-3.5" />
                                            </a>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Footer summary */}
                          <div className="p-4 border-t border-varena-taupe/15 bg-varena-ivory-light/40 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                            <div className="text-center">
                              <div className="font-bold text-varena-espresso text-base font-mono">{rankedAgents.length}</div>
                              <div className="text-varena-taupe">Total Agen</div>
                            </div>
                            <div className="text-center">
                              <div className="font-bold text-varena-espresso text-base font-mono">
                                {rankedAgents.reduce((s, a) => s + (a.totalSoldBoxes || 0), 0).toLocaleString('id-ID')} Box
                              </div>
                              <div className="text-varena-taupe">Total Terjual Jaringan</div>
                            </div>
                            <div className="text-center">
                              <div className="font-bold text-emerald-700 text-base font-mono">
                                Rp{rankedAgents.reduce((s, a) => s + (a.totalSalesNominal || 0), 0).toLocaleString('id-ID')}
                              </div>
                              <div className="text-varena-taupe">Total Omset Jaringan</div>
                            </div>
                            <div className="text-center">
                              <div className="font-bold text-amber-600 text-base font-mono">
                                Rp{rankedAgents.reduce((s, a) => s + (a.totalRewardValue || 0), 0).toLocaleString('id-ID')}
                              </div>
                              <div className="text-varena-taupe">Total Reward Diberikan</div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* MODAL: APPROVE APPLICATION */}
              {approveAppModalOpen && selectedApp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                  <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-varena-gold/40 space-y-4 text-xs">
                    <div className="flex items-center justify-between border-b border-varena-taupe/20 pb-3">
                      <h4 className="font-serif text-base font-bold text-varena-espresso">
                        Persetujuan Keagenan: {selectedApp.member?.displayName}
                      </h4>
                      <button
                        type="button"
                        onClick={() => setApproveAppModalOpen(false)}
                        className="text-varena-taupe hover:text-varena-espresso p-1"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleApproveApplication} className="space-y-4">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="font-bold text-slate-800">Kota Target: {selectedApp.city}, {selectedApp.province}</div>
                        <div className="text-[11px] text-slate-600 mt-0.5">Alamat Gudang: {selectedApp.warehouseAddress}</div>
                      </div>

                      <div>
                        <label className="block font-semibold text-varena-espresso mb-1">Alokasi Stok Fisik Awal (Box)</label>
                        <input
                          type="number"
                          min="0"
                          value={appInitialStock}
                          onChange={(e) => setAppInitialStock(parseInt(e.target.value, 10) || 0)}
                          className="w-full px-3 py-2 rounded-lg border border-varena-taupe/30 font-mono text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-varena-espresso mb-1">Tipe Diskon Agen</label>
                          <select
                            value={appDiscountType}
                            onChange={(e) => setAppDiscountType(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-varena-taupe/30 bg-white"
                          >
                            <option value="PERCENTAGE">Persen (%)</option>
                            <option value="NOMINAL">Nominal (Rp/box)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block font-semibold text-varena-espresso mb-1">Nilai Diskon</label>
                          <input
                            type="number"
                            value={appDiscountValue}
                            onChange={(e) => setAppDiscountValue(parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 rounded-lg border border-varena-taupe/30 font-mono text-sm"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setApproveAppModalOpen(false)}
                          className="px-4 py-2 rounded-lg border border-varena-taupe/30 text-slate-700"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          disabled={agentLoading}
                          className="px-5 py-2 rounded-lg bg-emerald-700 text-white font-bold hover:bg-emerald-800 shadow"
                        >
                          {agentLoading ? 'Menyetujui...' : 'Setujui & Terbitkan Hak Agen'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* MODAL: MONITORING PROGRES, STOK & REWARD AGEN */}
              {monitoringModalOpen && monitoringAgent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                  <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-varena-gold/40 space-y-4 text-xs max-h-[92vh] overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-start justify-between border-b border-varena-taupe/20 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-varena-espresso text-varena-gold flex items-center justify-center font-serif text-lg font-bold shrink-0">
                          <Store className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-serif text-lg font-bold text-varena-espresso">
                              {monitoringAgent.displayName}
                            </h4>
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-varena-ivory-light font-bold text-varena-espresso border border-varena-taupe/20">
                              {monitoringAgent.memberCode}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              monitoringAgent.type === 'MASTER_AGENT' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {monitoringAgent.type === 'MASTER_AGENT' ? 'Master Agen Regional' : 'Agen Resmi Wilayah'}
                            </span>
                          </div>
                          <div className="text-slate-500 text-[11px] mt-0.5 flex flex-wrap items-center gap-2">
                            <span>📍 {monitoringAgent.city}, {monitoringAgent.province}</span>
                            <span>•</span>
                            <span>📱 {monitoringAgent.phone || '-'}</span>
                            {monitoringAgent.email && (
                              <>
                                <span>•</span>
                                <span>✉️ {monitoringAgent.email}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMonitoringModalOpen(false)}
                        className="text-varena-taupe hover:text-varena-espresso p-1.5 rounded-lg hover:bg-stone-100"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* 4 KPI Utama Progres Agen */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200">
                        <span className="text-[10px] uppercase font-bold text-emerald-800 block">Sisa Stok Fisik</span>
                        <div className="text-2xl font-bold font-serif text-emerald-950 mt-1">
                          {monitoringAgent.inventory} <span className="text-xs font-normal text-emerald-700">Box</span>
                        </div>
                        <span className={`text-[10px] font-semibold mt-0.5 inline-block ${
                          monitoringAgent.inventory < 10 ? 'text-rose-700' : 'text-emerald-700'
                        }`}>
                          {monitoringAgent.inventory < 10 ? '⚠ Stok Menipis' : '✓ Stok Memadai'}
                        </span>
                      </div>

                      <div className="p-3 rounded-2xl bg-blue-50/80 border border-blue-200">
                        <span className="text-[10px] uppercase font-bold text-blue-800 block">Total Terjual</span>
                        <div className="text-2xl font-bold font-serif text-blue-950 mt-1">
                          {monitoringAgent.totalSoldBoxes || 0} <span className="text-xs font-normal text-blue-700">Box</span>
                        </div>
                        <span className="text-[10px] text-blue-700 font-semibold mt-0.5 inline-block">
                          {monitoringAgent.completedOrdersCount || 0} pesanan diselesaikan
                        </span>
                      </div>

                      <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200">
                        <span className="text-[10px] uppercase font-bold text-amber-800 block">Nominal Penjualan</span>
                        <div className="text-lg font-bold font-mono text-amber-950 mt-1 truncate">
                          Rp{(monitoringAgent.totalSalesNominal || 0).toLocaleString('id-ID')}
                        </div>
                        <span className="text-[10px] text-amber-700 font-semibold mt-0.5 inline-block">
                          Omset terdistribusi
                        </span>
                      </div>

                      <div className="p-3 rounded-2xl bg-purple-50/80 border border-purple-200">
                        <span className="text-[10px] uppercase font-bold text-purple-800 block">Reward Diberikan</span>
                        <div className="text-lg font-bold font-mono text-purple-950 mt-1 truncate">
                          Rp{(monitoringAgent.totalRewardValue || 0).toLocaleString('id-ID')}
                        </div>
                        <span className="text-[10px] text-purple-700 font-semibold mt-0.5 inline-block">
                          {monitoringAgent.rewardsCount || 0} Penghargaan resmi
                        </span>
                      </div>
                    </div>

                    {/* Navigasi Tab di Dalam Modal */}
                    <div className="flex border-b border-varena-taupe/20 space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setMonitoringTab('OVERVIEW')}
                        className={`py-2 px-3 font-semibold text-xs border-b-2 transition ${
                          monitoringTab === 'OVERVIEW'
                            ? 'border-varena-espresso text-varena-espresso'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Ringkasan Keagenan
                      </button>
                      <button
                        type="button"
                        onClick={() => setMonitoringTab('REWARDS')}
                        className={`py-2 px-3 font-semibold text-xs border-b-2 transition flex items-center gap-1 ${
                          monitoringTab === 'REWARDS'
                            ? 'border-varena-espresso text-varena-espresso'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Award className="w-3.5 h-3.5 text-amber-600" />
                        <span>Penghargaan &amp; Reward ({monitoringAgent.rewards?.length || 0})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMonitoringTab('STOCK')}
                        className={`py-2 px-3 font-semibold text-xs border-b-2 transition flex items-center gap-1 ${
                          monitoringTab === 'STOCK'
                            ? 'border-varena-espresso text-varena-espresso'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Package className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Mutasi Stok ({monitoringAgent.recentMutations?.length || 0})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMonitoringTab('ORDERS')}
                        className={`py-2 px-3 font-semibold text-xs border-b-2 transition flex items-center gap-1 ${
                          monitoringTab === 'ORDERS'
                            ? 'border-varena-espresso text-varena-espresso'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Truck className="w-3.5 h-3.5 text-blue-700" />
                        <span>Pesanan Terdistribusi ({monitoringAgent.recentOrders?.length || 0})</span>
                      </button>
                    </div>

                    {/* CONTENT TAB: OVERVIEW */}
                    {monitoringTab === 'OVERVIEW' && (
                      <div className="space-y-4 pt-1">
                        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <div className="text-stone-500 text-[11px]">Titik Gudang / Alamat Distribusi:</div>
                            <div className="font-semibold text-varena-espresso mt-0.5">{monitoringAgent.address || '-'}</div>
                            <div className="text-stone-500 text-[11px] mt-1">{monitoringAgent.city}, {monitoringAgent.province}</div>
                          </div>
                          <div>
                            <div className="text-stone-500 text-[11px]">Parameter Keagenan:</div>
                            <div className="font-semibold text-varena-espresso mt-0.5">
                              Diskon: {monitoringAgent.discountType === 'PERCENTAGE' ? `${monitoringAgent.discountValue}%` : `Rp${monitoringAgent.discountValue}/box`}
                            </div>
                            <div className="text-stone-600 text-[11px] mt-1">
                              Saldo Kas Deposit: <strong>Rp{(monitoringAgent.depositBalance || 0).toLocaleString('id-ID')}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
                          <div>
                            <span className="font-bold text-amber-950 block">Ingin Memberikan Reward Prestasi Agen?</span>
                            <span className="text-[11px] text-amber-800">
                              Beri apresiasi berupa bonus tunai saldo kas atau aset fisik (motor, emas, laptop).
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRewardAgent(monitoringAgent);
                              setRewardTitle('');
                              setRewardDesc('');
                              setRewardValue(1000000);
                              setRewardModalOpen(true);
                            }}
                            className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition flex items-center gap-1.5 shadow"
                          >
                            <Award className="w-4 h-4" />
                            <span>Beri Reward Prestasi</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* CONTENT TAB: REWARDS */}
                    {monitoringTab === 'REWARDS' && (
                      <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700 text-xs">
                            Riwayat Penghargaan Resmi dari Kantor Pusat ({monitoringAgent.rewards?.length || 0})
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRewardAgent(monitoringAgent);
                              setRewardTitle('');
                              setRewardDesc('');
                              setRewardValue(1000000);
                              setRewardModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition inline-flex items-center gap-1"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>+ Beri Reward Baru</span>
                          </button>
                        </div>

                        {monitoringAgent.rewards && monitoringAgent.rewards.length > 0 ? (
                          <div className="divide-y divide-stone-100 border border-stone-200 rounded-2xl overflow-hidden bg-white">
                            {monitoringAgent.rewards.map((rw: any) => (
                              <div key={rw.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-stone-50/70 transition">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-varena-espresso">{rw.title}</span>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                      rw.rewardType === 'CASH_BONUS' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                                    }`}>
                                      {rw.rewardType === 'CASH_BONUS' ? 'BONUS TUNAI' : 'BARANG FISIK / ASET'}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-600 mt-1 italic">
                                    {rw.reasonNotes || rw.goodsDescription || 'Apresiasi pencapaian target penjualan'}
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    Diterbitkan: {new Date(rw.awardedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="font-mono font-bold text-sm text-emerald-800">
                                    Rp{(rw.totalValue || rw.cashAmount || rw.goodsValuation || 0).toLocaleString('id-ID')}
                                  </div>
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                                    TERVERIFIKASI KANTOR
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-10 bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-stone-400">
                            Belum ada reward yang diberikan kepada agen ini. Klik tombol di atas untuk menerbitkan reward perdana.
                          </div>
                        )}
                      </div>
                    )}

                    {/* CONTENT TAB: STOCK MUTATIONS */}
                    {monitoringTab === 'STOCK' && (
                      <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700 text-xs">
                            Riwayat Pergerakan &amp; Mutasi Stok Fisik Agen
                          </span>
                          <span className="font-mono font-bold text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                            Stok Saat Ini: {monitoringAgent.inventory} Box
                          </span>
                        </div>

                        {monitoringAgent.recentMutations && monitoringAgent.recentMutations.length > 0 ? (
                          <div className="overflow-x-auto border border-stone-200 rounded-2xl overflow-hidden">
                            <table className="w-full text-left text-xs min-w-[500px]">
                              <thead className="bg-stone-50 text-stone-600 border-b">
                                <tr>
                                  <th className="py-2 px-3">Tanggal</th>
                                  <th className="py-2 px-3">Jenis Mutasi</th>
                                  <th className="py-2 px-3">Jumlah (Box)</th>
                                  <th className="py-2 px-3">Sisa Stok</th>
                                  <th className="py-2 px-3">Referensi &amp; Keterangan</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y text-stone-700">
                                {monitoringAgent.recentMutations.map((m: any) => (
                                  <tr key={m.id} className="hover:bg-stone-50/60">
                                    <td className="py-2 px-3 text-stone-500 whitespace-nowrap">
                                      {new Date(m.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="py-2 px-3 font-semibold">
                                      {m.type === 'RESTOCK_FROM_CENTRAL' ? (
                                        <span className="text-emerald-700 font-bold">Pasokan Pusat</span>
                                      ) : m.type === 'DISPATCHED_TO_MEMBER' ? (
                                        <span className="text-blue-700 font-bold">Kirim ke Konsumen</span>
                                      ) : (
                                        <span>{m.type}</span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3 font-mono font-bold">
                                      <span className={m.quantity > 0 || m.type === 'RESTOCK_FROM_CENTRAL' ? 'text-emerald-700' : 'text-rose-700'}>
                                        {m.quantity > 0 || m.type === 'RESTOCK_FROM_CENTRAL' ? '+' : ''}{m.quantity} Box
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 font-mono font-bold text-slate-800">
                                      {m.balanceAfter} Box
                                    </td>
                                    <td className="py-2 px-3 text-[11px] text-stone-600">
                                      {m.referenceId && <strong className="font-mono mr-1 text-slate-800">[{m.referenceId}]</strong>}
                                      {m.notes || '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-10 bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-stone-400">
                            Belum ada riwayat mutasi stok untuk agen ini.
                          </div>
                        )}
                      </div>
                    )}

                    {/* CONTENT TAB: ORDERS DISTRIBUTED */}
                    {monitoringTab === 'ORDERS' && (
                      <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700 text-xs">
                            Riwayat Pesanan yang Dialihkan &amp; Didistribusikan Agen
                          </span>
                          <span className="font-mono text-xs text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 font-bold">
                            Total Omset: Rp{(monitoringAgent.totalSalesNominal || 0).toLocaleString('id-ID')}
                          </span>
                        </div>

                        {monitoringAgent.recentOrders && monitoringAgent.recentOrders.length > 0 ? (
                          <div className="overflow-x-auto border border-stone-200 rounded-2xl overflow-hidden">
                            <table className="w-full text-left text-xs min-w-[550px]">
                              <thead className="bg-stone-50 text-stone-600 border-b">
                                <tr>
                                  <th className="py-2 px-3">No. Invoice</th>
                                  <th className="py-2 px-3">Pembeli</th>
                                  <th className="py-2 px-3">Kuantitas</th>
                                  <th className="py-2 px-3">Total (Rp)</th>
                                  <th className="py-2 px-3">Status Pengiriman</th>
                                  <th className="py-2 px-3">Ekspedisi / Resi</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y text-stone-700">
                                {monitoringAgent.recentOrders.map((o: any) => (
                                  <tr key={o.id} className="hover:bg-stone-50/60">
                                    <td className="py-2 px-3 font-mono font-bold text-varena-espresso">
                                      {o.orderNumber}
                                    </td>
                                    <td className="py-2 px-3">
                                      <div className="font-semibold">{o.buyerName}</div>
                                      <div className="text-[10px] text-stone-400">{o.shippingCity}</div>
                                    </td>
                                    <td className="py-2 px-3 font-mono font-bold">
                                      {o.itemCount} Box
                                    </td>
                                    <td className="py-2 px-3 font-mono font-bold text-emerald-800">
                                      Rp{(o.total || 0).toLocaleString('id-ID')}
                                    </td>
                                    <td className="py-2 px-3">
                                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                        o.orderStatus === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                                      }`}>
                                        {o.orderStatus === 'COMPLETED' ? 'SELESAI' : o.orderStatus}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 font-mono text-[11px] text-stone-600">
                                      {o.trackingNumber ? `${o.courierName || 'Kurir'}: ${o.trackingNumber}` : 'Diantar kurir lokal'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-10 bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-stone-400">
                            Belum ada pesanan konsumen yang dialihkan ke agen ini.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="pt-3 border-t border-varena-taupe/20 flex items-center justify-between">
                      {monitoringAgent.phone ? (
                        <a
                          href={`https://wa.me/${monitoringAgent.phone.replace(/^0/, '62')}?text=${encodeURIComponent(
                            `Halo Agen ${monitoringAgent.displayName} (${monitoringAgent.memberCode}), salam dari Manajemen Pusat VARENA terkait evaluasi stok fisik dan progres keagenan Anda.`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition inline-flex items-center gap-1.5 shadow"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Hubungi Agen via WhatsApp</span>
                        </a>
                      ) : <div />}

                      <button
                        type="button"
                        onClick={() => setMonitoringModalOpen(false)}
                        className="px-5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition"
                      >
                        Tutup Pemantau
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL: AWARD REWARD */}
              {rewardModalOpen && selectedRewardAgent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                  <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-varena-gold/40 space-y-4 text-xs">
                    <div className="flex items-center justify-between border-b border-varena-taupe/20 pb-3">
                      <h4 className="font-serif text-base font-bold text-varena-espresso flex items-center gap-2">
                        <Award className="w-5 h-5 text-amber-600" />
                        <span>Beri Reward Prestasi Agen: {selectedRewardAgent.displayName}</span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => setRewardModalOpen(false)}
                        className="text-varena-taupe hover:text-varena-espresso p-1"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleAwardReward} className="space-y-4">
                      <div>
                        <label className="block font-semibold text-varena-espresso mb-1">Bentuk Penghargaan / Reward *</label>
                        <select
                          value={rewardType}
                          onChange={(e: any) => setRewardType(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-varena-taupe/30 bg-white"
                        >
                          <option value="CASH_BONUS">Bonus Tunai (Kredit ke Saldo Deposit Agen)</option>
                          <option value="PHYSICAL_GOODS">Barang / Aset Fisik (Sepeda Motor, Logam Mulia Emas, dll)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-varena-espresso mb-1">Judul / Nama Reward *</label>
                        <input
                          type="text"
                          required
                          value={rewardTitle}
                          onChange={(e) => setRewardTitle(e.target.value)}
                          placeholder="Contoh: Reward Target Q1 / 1 Unit Yamaha NMAX"
                          className="w-full px-3 py-2 rounded-lg border border-varena-taupe/30 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-varena-espresso mb-1">Nilai Nominal Valuasi (Rp) *</label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={rewardValue}
                          onChange={(e) => setRewardValue(parseInt(e.target.value, 10) || 0)}
                          className="w-full px-3 py-2 rounded-lg border border-varena-taupe/30 font-mono text-sm"
                        />
                        <span className="text-[10px] text-varena-taupe mt-0.5 block">
                          Tercatat dalam buku besar akuntansi sebagai beban apresiasi keagenan.
                        </span>
                      </div>

                      <div>
                        <label className="block font-semibold text-varena-espresso mb-1">Keterangan / Berita Acara</label>
                        <textarea
                          rows={2}
                          value={rewardDesc}
                          onChange={(e) => setRewardDesc(e.target.value)}
                          placeholder="Alasan apresiasi dan catatan serah terima..."
                          className="w-full px-3 py-2 rounded-lg border border-varena-taupe/30 text-sm"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setRewardModalOpen(false)}
                          className="px-4 py-2 rounded-lg border border-varena-taupe/30 text-slate-700"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          disabled={agentLoading}
                          className="px-5 py-2 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-700 shadow"
                        >
                          {agentLoading ? 'Menyimpan...' : 'Terbitkan Reward Resmi'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* MODAL: ORDER ROUTING */}
              {routeOrderModalOpen && selectedRouteOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                  <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-varena-gold/40 space-y-4 text-xs">
                    <div className="flex items-center justify-between border-b border-varena-taupe/20 pb-3">
                      <h4 className="font-serif text-base font-bold text-varena-espresso flex items-center gap-2">
                        <Truck className="w-5 h-5 text-blue-600" />
                        <span>Alihkan Pesanan #{selectedRouteOrder.orderNumber}</span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => setRouteOrderModalOpen(false)}
                        className="text-varena-taupe hover:text-varena-espresso p-1"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleAssignOrderToAgent} className="space-y-4">
                      <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900">
                        <div>Pembeli: <strong>{selectedRouteOrder.buyerName}</strong> ({selectedRouteOrder.shippingCity || '-'})</div>
                        <div className="text-[11px] mt-0.5">{selectedRouteOrder.shippingAddress}</div>
                      </div>

                      <div>
                        <label className="block font-semibold text-varena-espresso mb-1">Pilih Agen Regional Pelaksana *</label>
                        <select
                          required
                          value={selectedRouteAgentId}
                          onChange={(e) => setSelectedRouteAgentId(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-varena-taupe/30 bg-white text-sm"
                        >
                          <option value="">-- Pilih Agen Regional --</option>
                          {agents.map((ag) => (
                            <option key={ag.id} value={ag.id}>
                              {ag.displayName} ({ag.city}) - Stok: {ag.inventory} Box
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-varena-espresso mb-1">Catatan Pengalihan untuk Agen</label>
                        <textarea
                          rows={2}
                          value={routeOrderNote}
                          onChange={(e) => setRouteOrderNote(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-varena-taupe/30 text-sm"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setRouteOrderModalOpen(false)}
                          className="px-4 py-2 rounded-lg border border-varena-taupe/30 text-slate-700"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          disabled={agentLoading}
                          className="px-5 py-2 rounded-lg bg-blue-700 text-white font-bold hover:bg-blue-800 shadow"
                        >
                          {agentLoading ? 'Mengalihkan...' : 'Konfirmasi Alihkan Pengiriman'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================================================================== */}
          {/* TAB: PENGATURAN SISTEM DINAMIS */}
          {/* ==================================================================== */}
          {activeTab === 'SETTINGS' && (
            <SystemSettingsTab
              authHeaders={getAdminHeaders()}
              showToast={showToast}
              showConfirm={showConfirm}
            />
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
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-varena-ivory text-varena-espresso border border-varena-taupe/30">
                                {msg.templateType === 'ORDER_INVOICE'
                                  ? 'Invoice Pesanan'
                                  : msg.templateType === 'ORDER_SHIPPED'
                                    ? 'Notifikasi Pengiriman'
                                    : msg.templateType === 'PAYOUT_COMPLETED'
                                      ? 'Konfirmasi Pencairan'
                                      : msg.templateType?.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 max-w-[320px] font-mono text-[11px]">
                              <div className="p-2 rounded bg-slate-50 border border-slate-200 text-slate-700 whitespace-pre-wrap break-words max-h-24 overflow-y-auto">
                                {msg.message}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                {msg.status === 'SENT' ? 'Terkirim' : msg.status === 'FAILED' ? 'Gagal Kirim' : msg.status}
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

      {/* ── MODAL: TOLAK TOPUP DEPOSIT ── */}
      {rejectTopupId && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-rose-200">
            <h3 className="font-serif text-base font-bold text-rose-700">Tolak Pengajuan Topup Deposit</h3>
            <p className="text-xs text-stone-600">Masukkan alasan penolakan. Alasan ini akan dicatat di histori transaksi dan member akan diberitahu.</p>
            <textarea
              className="w-full border border-stone-300 rounded-lg p-2.5 text-xs outline-none focus:border-rose-400 resize-none"
              rows={3}
              placeholder="Contoh: Nominal transfer tidak sesuai, transfer tidak ditemukan di rekening..."
              value={rejectTopupReason}
              onChange={(e) => setRejectTopupReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setRejectTopupId(null); setRejectTopupReason(''); }}
                className="py-2 px-4 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs"
              >
                Batal
              </button>
              <button
                onClick={handleRejectDepositTopup}
                disabled={rejectTopupSubmitting || !rejectTopupReason.trim()}
                className="py-2 px-5 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition disabled:opacity-50"
              >
                {rejectTopupSubmitting ? 'Memproses...' : 'Tolak Pengajuan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cetak Label Resi Pengiriman (Airway Bill) */}
      {shippingLabelOrder && (
        <ShippingLabelModal
          order={shippingLabelOrder}
          onClose={() => setShippingLabelOrder(null)}
        />
      )}
    </div>
  );
}
