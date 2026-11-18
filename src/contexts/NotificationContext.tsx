'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface MemberBadge {
  role: 'member';
  orders: { count: number; latestAt: string | null };
  wallet: { latestAt: string | null };
  total: number;
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
}

type BadgeData = MemberBadge | AdminBadge | { role: 'guest'; total: 0 } | null;

// ─── Ack helpers (localStorage) ─────────────────────────────────────────────

const ACK_KEY = 'varena_notif_ack';

function getAck(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(ACK_KEY) || '{}');
  } catch {
    return {};
  }
}

function setAck(key: string) {
  const ack = getAck();
  ack[key] = new Date().toISOString();
  localStorage.setItem(ACK_KEY, JSON.stringify(ack));
}

function isNewer(latestAt: string | null | undefined, ackKey: string): boolean {
  if (!latestAt) return false;
  const ack = getAck();
  if (!ack[ackKey]) return true; // never acked
  return new Date(latestAt) > new Date(ack[ackKey]);
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface NotificationContextValue {
  badge: BadgeData;
  // Computed member badge counts (0 = no badge)
  memberOrdersBadge: number;
  memberWalletBadge: number;
  // Computed admin badge counts
  adminOrdersBadge: number;
  adminPayoutBadge: number;
  // Ack functions — call when user navigates to that section
  ackOrders: () => void;
  ackWallet: () => void;
  ackAdminOrders: () => void;
  ackAdminPayout: () => void;
  // Force refresh
  refresh: () => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  badge: null,
  memberOrdersBadge: 0,
  memberWalletBadge: 0,
  adminOrdersBadge: 0,
  adminPayoutBadge: 0,
  ackOrders: () => {},
  ackWallet: () => {},
  ackAdminOrders: () => {},
  ackAdminPayout: () => {},
  refresh: () => {},
});

// ─── Provider ────────────────────────────────────────────────────────────────

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [badge, setBadge] = useState<BadgeData>(null);
  // tick forces re-render of computed badges after ack
  const [tick, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchBadge = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('varena_user');
    if (!stored) {
      setBadge({ role: 'guest', total: 0 });
      return;
    }
    let user: any;
    try {
      user = JSON.parse(stored);
    } catch {
      return;
    }
    if (!user?.id) return;

    try {
      const res = await fetch('/api/v1/notifications/badge', {
        headers: {
          'x-user-id': user.id,
          'x-user-email': user.email || '',
        },
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      setBadge(data);
    } catch {
      // silent fail — badge just stays stale
    }
  }, []);

  // Initial fetch + 60s polling
  useEffect(() => {
    fetchBadge();
    intervalRef.current = setInterval(fetchBadge, 60_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchBadge]);

  // ── Computed badge values (re-evaluated on badge change or ack tick) ──────

  const memberOrdersBadge = (() => {
    if (!badge || badge.role !== 'member') return 0;
    if (!isNewer(badge.orders.latestAt, 'orders')) return 0;
    return badge.orders.count;
  })();

  const memberWalletBadge = (() => {
    if (!badge || badge.role !== 'member') return 0;
    return isNewer(badge.wallet.latestAt, 'wallet') ? 1 : 0;
  })();

  const adminOrdersBadge = (() => {
    if (!badge || badge.role !== 'admin') return 0;
    if (!isNewer(badge.orders.latestAt, 'adminOrders')) return 0;
    return badge.orders.totalCount;
  })();

  const adminPayoutBadge = (() => {
    if (!badge || badge.role !== 'admin') return 0;
    if (!isNewer(badge.payout.latestAt, 'adminPayout')) return 0;
    return badge.payout.pendingCount;
  })();

  // ── Ack helpers ───────────────────────────────────────────────────────────

  const ackOrders = useCallback(() => {
    setAck('orders');
    setTick((t) => t + 1);
  }, []);

  const ackWallet = useCallback(() => {
    setAck('wallet');
    setTick((t) => t + 1);
  }, []);

  const ackAdminOrders = useCallback(() => {
    setAck('adminOrders');
    setTick((t) => t + 1);
  }, []);

  const ackAdminPayout = useCallback(() => {
    setAck('adminPayout');
    setTick((t) => t + 1);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        badge,
        memberOrdersBadge,
        memberWalletBadge,
        adminOrdersBadge,
        adminPayoutBadge,
        ackOrders,
        ackWallet,
        ackAdminOrders,
        ackAdminPayout,
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
