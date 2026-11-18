'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface NotificationItem {
  id: string;
  type: 'ORDER_PENDING' | 'ORDER_SHIPPED' | 'COMMISSION_NEW' | 'PAYOUT_STATUS' | 'ADMIN_ORDER' | 'ADMIN_PAYOUT';
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
  adminOrdersBadge: number;
  adminPayoutBadge: number;
  isItemRead: (id: string) => boolean;
  ackOrders: () => void;
  ackWallet: () => void;
  ackAdminOrders: () => void;
  ackAdminPayout: () => void;
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
  adminOrdersBadge: 0,
  adminPayoutBadge: 0,
  isItemRead: () => false,
  ackOrders: () => {},
  ackWallet: () => {},
  ackAdminOrders: () => {},
  ackAdminPayout: () => {},
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

  const isItemRead = useCallback(
    (id: string) => readIds.includes(id),
    [readIds]
  );

  // Unread items
  const unreadItems = items.filter((it) => !readIds.includes(it.id));

  // Computed badge counts based on unread items
  const memberOrdersBadge = unreadItems.filter(
    (it) => it.type === 'ORDER_PENDING' || it.type === 'ORDER_SHIPPED'
  ).length;

  const memberWalletBadge = unreadItems.filter(
    (it) => it.type === 'COMMISSION_NEW' || it.type === 'PAYOUT_STATUS'
  ).length;

  const adminOrdersBadge = unreadItems.filter(
    (it) => it.type === 'ADMIN_ORDER'
  ).length;

  const adminPayoutBadge = unreadItems.filter(
    (it) => it.type === 'ADMIN_PAYOUT'
  ).length;

  const totalBadgeCount = unreadItems.length;

  // ── Ack and Read Handlers ──────────────────────────────────────────────────

  const markItemAsRead = useCallback((id: string) => {
    setReadIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      saveReadIds(next);
      return next;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    const allIds = items.map((it) => it.id);
    setReadIds((prev) => {
      const next = Array.from(new Set([...prev, ...allIds]));
      saveReadIds(next);
      return next;
    });
  }, [items]);

  const ackOrders = useCallback(() => {
    const orderIds = items
      .filter((it) => it.type === 'ORDER_PENDING' || it.type === 'ORDER_SHIPPED')
      .map((it) => it.id);
    if (orderIds.length > 0) {
      setReadIds((prev) => {
        const next = Array.from(new Set([...prev, ...orderIds]));
        saveReadIds(next);
        return next;
      });
    }
  }, [items]);

  const ackWallet = useCallback(() => {
    const walletIds = items
      .filter((it) => it.type === 'COMMISSION_NEW' || it.type === 'PAYOUT_STATUS')
      .map((it) => it.id);
    if (walletIds.length > 0) {
      setReadIds((prev) => {
        const next = Array.from(new Set([...prev, ...walletIds]));
        saveReadIds(next);
        return next;
      });
    }
  }, [items]);

  const ackAdminOrders = useCallback(() => {
    const adminOrderIds = items.filter((it) => it.type === 'ADMIN_ORDER').map((it) => it.id);
    if (adminOrderIds.length > 0) {
      setReadIds((prev) => {
        const next = Array.from(new Set([...prev, ...adminOrderIds]));
        saveReadIds(next);
        return next;
      });
    }
  }, [items]);

  const ackAdminPayout = useCallback(() => {
    const payoutIds = items.filter((it) => it.type === 'ADMIN_PAYOUT').map((it) => it.id);
    if (payoutIds.length > 0) {
      setReadIds((prev) => {
        const next = Array.from(new Set([...prev, ...payoutIds]));
        saveReadIds(next);
        return next;
      });
    }
  }, [items]);

  return (
    <NotificationContext.Provider
      value={{
        badge,
        items,
        totalBadgeCount,
        memberOrdersBadge,
        memberWalletBadge,
        adminOrdersBadge,
        adminPayoutBadge,
        isItemRead,
        ackOrders,
        ackWallet,
        ackAdminOrders,
        ackAdminPayout,
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
