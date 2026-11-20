'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface NotificationItem {
  id: string;
  type:
    | 'ORDER_PENDING'
    | 'ORDER_SHIPPED'
    | 'ORDER_COMPLETED'
    | 'COMMISSION_NEW'
    | 'PAYOUT_STATUS'
    | 'DOWNLINE_NEW'
    | 'DOWNLINE_ORDER'
    | 'DEPOSIT_APPROVED'
    | 'DEPOSIT_REJECTED'
    | 'AGENT_STATUS'
    | 'ADMIN_ORDER'
    | 'ADMIN_PAYOUT'
    | 'ADMIN_PAYMENT_PROOF'
    | 'ADMIN_AGENT_APPLY'
    | 'ADMIN_DEPOSIT_REQUEST'
    | 'ADMIN_NEW_MEMBER';
  title: string;
  message: string;
  url: string;
  createdAt: string;
}

interface MemberBadge {
  role: 'member';
  orders: { count: number; latestAt: string | null };
  wallet: { latestAt: string | null };
  total: number;
  items?: NotificationItem[];
}

interface AdminBadge {
  role: 'admin';
  orders: {
    pendingPaymentCount: number;
    needShippingCount: number;
    totalCount: number;
    latestAt: string | null;
  };
  payout: { pendingCount: number; latestAt: string | null };
  total: number;
  items?: NotificationItem[];
}

type BadgeData = MemberBadge | AdminBadge | { role: 'guest'; total: 0; items?: [] } | null;

// ─── User-Isolated Read Items Storage (localStorage) ────────────────────────

function getUserKey(): string {
  if (typeof window === 'undefined') return 'guest';
  try {
    const stored = localStorage.getItem('varena_user');
    if (!stored) return 'guest';
    const parsed = JSON.parse(stored);
    return parsed?.userId || parsed?.id || parsed?.email || 'guest';
  } catch {
    return 'guest';
  }
}

function getReadIds(): string[] {
  if (typeof window === 'undefined') return [];
  const key = `varena_read_notif_ids_${getUserKey()}`;
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

function saveReadIds(ids: string[]) {
  if (typeof window === 'undefined') return;
  const key = `varena_read_notif_ids_${getUserKey()}`;
  try {
    localStorage.setItem(key, JSON.stringify(ids.slice(-100)));
  } catch {}
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface NotificationContextValue {
  badge: BadgeData;
  items: NotificationItem[];
  totalBadgeCount: number;
  memberOrdersBadge: number;
  memberWalletBadge: number;
  memberNetworkBadge: number;
  adminOrdersBadge: number;
  adminPayoutBadge: number;
  adminMiscBadge: number;
  isItemRead: (id: string) => boolean;
  ackOrders: () => void;
  ackWallet: () => void;
  ackNetwork: () => void;
  ackAdminOrders: () => void;
  ackAdminPayout: () => void;
  ackAdminMisc: () => void;
  markItemAsRead: (id: string) => void;
  markAllAsRead: () => void;
  refresh: () => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  badge: null,
  items: [],
  totalBadgeCount: 0,
  memberOrdersBadge: 0,
  memberWalletBadge: 0,
  memberNetworkBadge: 0,
  adminOrdersBadge: 0,
  adminPayoutBadge: 0,
  adminMiscBadge: 0,
  isItemRead: () => false,
  ackOrders: () => {},
  ackWallet: () => {},
  ackNetwork: () => {},
  ackAdminOrders: () => {},
  ackAdminPayout: () => {},
  ackAdminMisc: () => {},
  markItemAsRead: () => {},
  markAllAsRead: () => {},
  refresh: () => {},
});

// ─── Provider ────────────────────────────────────────────────────────────────

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [badge, setBadge] = useState<BadgeData>(null);
  const [readIds, setReadIds] = useState<string[]>([]);
  const pathname = usePathname();

  // Load read IDs isolated by current user session
  useEffect(() => {
    setReadIds(getReadIds());
  }, [pathname]);

  const fetchBadge = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('varena_user');
    if (!stored) {
      setBadge({ role: 'guest', total: 0, items: [] });
      return;
    }

    let user: any = null;
    try {
      user = JSON.parse(stored);
    } catch {
      setBadge({ role: 'guest', total: 0, items: [] });
      return;
    }

    const userId = user?.userId || user?.id || '';
    const userEmail = user?.email || '';

    if (!userId && !userEmail) {
      setBadge({ role: 'guest', total: 0, items: [] });
      return;
    }

    try {
      const res = await fetch('/api/v1/notifications/badge', {
        headers: {
          'x-user-id': userId,
          'x-user-email': userEmail,
        },
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      setBadge(data);
    } catch {
      // silent fail
    }
  }, []);

  // ── Realtime Synchronization: 4s polling + focus + visibility + storage ──
  useEffect(() => {
    fetchBadge();

    // 1. Fast 4-second active polling (only when tab is open and visible)
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchBadge();
      }
    }, 4000);

    // 2. Instant fetch on tab focus / visibility
    const handleVisibility = () => {
      if (!document.hidden) fetchBadge();
    };
    const handleFocus = () => fetchBadge();

    // 3. Instant fetch when user login/logout happens
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'varena_user') {
        fetchBadge();
        setReadIds(getReadIds());
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('storage', handleStorage);
    };
  }, [pathname, fetchBadge]);

  const items: NotificationItem[] =
    badge && 'items' in badge && Array.isArray(badge.items) ? badge.items : [];

  // ── Stable ref: ack callbacks baca items dari ref, bukan closure ──────────
  // Ini mencegah ackOrders/ackWallet/etc. berubah identitas setiap 4 detik
  // (yang akan memicu useEffect di wallet/member page → setLoading(true) → flicker)
  const itemsRef = useRef<NotificationItem[]>(items);
  itemsRef.current = items;

  const isItemRead = useCallback(
    (id: string) => readIds.includes(id),
    [readIds]
  );

  // Unread items
  const unreadItems = items.filter((it) => !readIds.includes(it.id));

  // ── Badge counts per kategori ─────────────────────────────────────────────
  const memberOrdersBadge = unreadItems.filter(
    (it) => it.type === 'ORDER_PENDING' || it.type === 'ORDER_SHIPPED' || it.type === 'ORDER_COMPLETED'
  ).length;

  const memberWalletBadge = unreadItems.filter(
    (it) => it.type === 'COMMISSION_NEW' || it.type === 'PAYOUT_STATUS' || it.type === 'DEPOSIT_APPROVED' || it.type === 'DEPOSIT_REJECTED'
  ).length;

  const memberNetworkBadge = unreadItems.filter(
    (it) => it.type === 'DOWNLINE_NEW' || it.type === 'DOWNLINE_ORDER' || it.type === 'AGENT_STATUS'
  ).length;

  const adminOrdersBadge = unreadItems.filter(
    (it) => it.type === 'ADMIN_ORDER' || it.type === 'ADMIN_PAYMENT_PROOF'
  ).length;

  const adminPayoutBadge = unreadItems.filter(
    (it) => it.type === 'ADMIN_PAYOUT'
  ).length;

  const adminMiscBadge = unreadItems.filter(
    (it) => it.type === 'ADMIN_AGENT_APPLY' || it.type === 'ADMIN_DEPOSIT_REQUEST' || it.type === 'ADMIN_NEW_MEMBER'
  ).length;

  const totalBadgeCount = unreadItems.length;

  // ── Ack and Read Handlers ──────────────────────────────────────────────────
  // PENTING: semua ack callback menggunakan itemsRef.current (bukan items closure)
  // agar dependency array bisa [] → identitas fungsi STABIL → tidak ada re-render loop

  const markItemAsRead = useCallback((id: string) => {
    setReadIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      saveReadIds(next);
      return next;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    const allIds = itemsRef.current.map((it) => it.id);
    setReadIds((prev) => {
      const next = Array.from(new Set([...prev, ...allIds]));
      saveReadIds(next);
      return next;
    });
  }, []);

  const ackOrders = useCallback(() => {
    const orderIds = itemsRef.current
      .filter((it) => it.type === 'ORDER_PENDING' || it.type === 'ORDER_SHIPPED' || it.type === 'ORDER_COMPLETED')
      .map((it) => it.id);
    if (orderIds.length > 0) {
      setReadIds((prev) => {
        const next = Array.from(new Set([...prev, ...orderIds]));
        saveReadIds(next);
        return next;
      });
    }
  }, []);

  const ackWallet = useCallback(() => {
    const walletIds = itemsRef.current
      .filter((it) => it.type === 'COMMISSION_NEW' || it.type === 'PAYOUT_STATUS' || it.type === 'DEPOSIT_APPROVED' || it.type === 'DEPOSIT_REJECTED')
      .map((it) => it.id);
    if (walletIds.length > 0) {
      setReadIds((prev) => {
        const next = Array.from(new Set([...prev, ...walletIds]));
        saveReadIds(next);
        return next;
      });
    }
  }, []);

  const ackNetwork = useCallback(() => {
    const networkIds = itemsRef.current
      .filter((it) => it.type === 'DOWNLINE_NEW' || it.type === 'DOWNLINE_ORDER' || it.type === 'AGENT_STATUS')
      .map((it) => it.id);
    if (networkIds.length > 0) {
      setReadIds((prev) => {
        const next = Array.from(new Set([...prev, ...networkIds]));
        saveReadIds(next);
        return next;
      });
    }
  }, []);

  const ackAdminOrders = useCallback(() => {
    const adminOrderIds = itemsRef.current
      .filter((it) => it.type === 'ADMIN_ORDER' || it.type === 'ADMIN_PAYMENT_PROOF')
      .map((it) => it.id);
    if (adminOrderIds.length > 0) {
      setReadIds((prev) => {
        const next = Array.from(new Set([...prev, ...adminOrderIds]));
        saveReadIds(next);
        return next;
      });
    }
  }, []);

  const ackAdminPayout = useCallback(() => {
    const payoutIds = itemsRef.current.filter((it) => it.type === 'ADMIN_PAYOUT').map((it) => it.id);
    if (payoutIds.length > 0) {
      setReadIds((prev) => {
        const next = Array.from(new Set([...prev, ...payoutIds]));
        saveReadIds(next);
        return next;
      });
    }
  }, []);

  const ackAdminMisc = useCallback(() => {
    const miscIds = itemsRef.current
      .filter((it) => it.type === 'ADMIN_AGENT_APPLY' || it.type === 'ADMIN_DEPOSIT_REQUEST' || it.type === 'ADMIN_NEW_MEMBER')
      .map((it) => it.id);
    if (miscIds.length > 0) {
      setReadIds((prev) => {
        const next = Array.from(new Set([...prev, ...miscIds]));
        saveReadIds(next);
        return next;
      });
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        badge,
        items,
        totalBadgeCount,
        memberOrdersBadge,
        memberWalletBadge,
        memberNetworkBadge,
        adminOrdersBadge,
        adminPayoutBadge,
        adminMiscBadge,
        isItemRead,
        ackOrders,
        ackWallet,
        ackNetwork,
        ackAdminOrders,
        ackAdminPayout,
        ackAdminMisc,
        markItemAsRead,
        markAllAsRead,
        refresh: fetchBadge,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

// ─── Consumer hook ────────────────────────────────────────────────────────────

export function useNotifications() {
  return useContext(NotificationContext);
}
