'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Package,
  Truck,
  TrendingUp,
  CreditCard,
  CheckCheck,
  X,
  ArrowRight,
  Clock,
  Sparkles,
  Users,
  UserPlus,
  CheckCircle2,
  XCircle,
  Store,
  Banknote,
  ShieldCheck,
} from 'lucide-react';
import { useNotifications, NotificationItem } from '@/contexts/NotificationContext';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationDropdown({ isOpen, onClose }: NotificationDropdownProps) {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const {
    items,
    totalBadgeCount,
    markAllAsRead,
    markItemAsRead,
    isItemRead,
  } = useNotifications();

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleItemClick = (item: NotificationItem) => {
    markItemAsRead(item.id);
    onClose();
    router.push(item.url);
  };

  const getItemIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'ORDER_PENDING':
        return (
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center flex-shrink-0">
            <Clock className="w-4 h-4" />
          </div>
        );
      case 'ORDER_SHIPPED':
        return (
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-500 flex items-center justify-center flex-shrink-0">
            <Truck className="w-4 h-4" />
          </div>
        );
      case 'ORDER_COMPLETED':
        return (
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      case 'COMMISSION_NEW':
        return (
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
        );
      case 'PAYOUT_STATUS':
        return (
          <div className="w-8 h-8 rounded-lg bg-varena-gold/20 text-varena-gold-light flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-4 h-4" />
          </div>
        );
      case 'DOWNLINE_NEW':
        return (
          <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center flex-shrink-0">
            <UserPlus className="w-4 h-4" />
          </div>
        );
      case 'DOWNLINE_ORDER':
        return (
          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4" />
          </div>
        );
      case 'DEPOSIT_APPROVED':
        return (
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center flex-shrink-0">
            <Banknote className="w-4 h-4" />
          </div>
        );
      case 'DEPOSIT_REJECTED':
        return (
          <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-500 flex items-center justify-center flex-shrink-0">
            <XCircle className="w-4 h-4" />
          </div>
        );
      case 'AGENT_STATUS':
        return (
          <div className="w-8 h-8 rounded-lg bg-varena-gold/20 text-varena-gold-light flex items-center justify-center flex-shrink-0">
            <Store className="w-4 h-4" />
          </div>
        );
      case 'ADMIN_ORDER':
        return (
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center flex-shrink-0">
            <Package className="w-4 h-4" />
          </div>
        );
      case 'ADMIN_PAYMENT_PROOF':
        return (
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
        );
      case 'ADMIN_PAYOUT':
        return (
          <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-500 flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-4 h-4" />
          </div>
        );
      case 'ADMIN_AGENT_APPLY':
        return (
          <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center flex-shrink-0">
            <Store className="w-4 h-4" />
          </div>
        );
      case 'ADMIN_DEPOSIT_REQUEST':
        return (
          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center flex-shrink-0">
            <Banknote className="w-4 h-4" />
          </div>
        );
      case 'ADMIN_NEW_MEMBER':
        return (
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center flex-shrink-0">
            <UserPlus className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-lg bg-stone-500/15 text-stone-400 flex items-center justify-center flex-shrink-0">
            <Bell className="w-4 h-4" />
          </div>
        );
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Baru saja';
      if (diffMins < 60) return `${diffMins} mnt lalu`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} jam lalu`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} hari lalu`;
    } catch {
      return '';
    }
  };

  return (
    <>
      {/* Mobile Backdrop overlay */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] md:hidden" onClick={onClose} />

      {/* Popover Card */}
      <div
        ref={dropdownRef}
        className="fixed inset-x-3 top-16 md:absolute md:inset-x-auto md:right-0 md:top-full md:mt-2 md:w-[380px] z-50 bg-[#251A14] text-varena-ivory-light border border-varena-gold/30 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-3.5 bg-black/30 border-b border-[#3D2C22] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-varena-gold/20 flex items-center justify-center text-varena-gold">
              <Bell className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-1.5">
              <h4 className="font-serif font-bold text-sm text-varena-gold-light">Notifikasi</h4>
              {totalBadgeCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {totalBadgeCount}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {totalBadgeCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[11px] text-varena-gold-light/80 hover:text-varena-gold hover:underline flex items-center gap-1 transition"
                title="Tandai semua sudah dibaca"
              >
                <CheckCheck className="w-3 h-3 text-emerald-400" />
                <span>Tandai Dibaca</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-varena-taupe-light hover:text-white hover:bg-white/10 transition"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content List */}
        <div className="max-h-[420px] overflow-y-auto divide-y divide-[#35251C]">
          {items.length === 0 ? (
            <div className="py-10 px-4 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-varena-taupe-light">
                <Sparkles className="w-6 h-6 text-varena-gold/60" />
              </div>
              <p className="text-xs font-medium text-varena-ivory-light">Semua sudah diperbarui</p>
              <p className="text-[11px] text-varena-taupe-light max-w-[240px] mx-auto">
                Tidak ada notifikasi baru saat ini.
              </p>
            </div>
          ) : (
            items.map((item) => {
              const unread = !isItemRead(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className={`w-full text-left p-3 hover:bg-white/10 transition flex items-start gap-3 group relative cursor-pointer ${
                    unread ? 'bg-white/[0.04]' : 'opacity-80'
                  }`}
                >
                  {getItemIcon(item.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 truncate">
                        {unread && <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />}
                        <span className="text-xs font-semibold text-varena-gold-light truncate group-hover:text-white transition">
                          {item.title}
                        </span>
                      </div>
                      <span className="text-[10px] text-varena-taupe-light font-mono flex-shrink-0">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-varena-ivory/80 line-clamp-2 mt-0.5 leading-snug">
                      {item.message}
                    </p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-varena-taupe-light group-hover:text-varena-gold group-hover:translate-x-0.5 transition flex-shrink-0 mt-1 opacity-60 group-hover:opacity-100" />
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 bg-black/40 border-t border-[#3D2C22] flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => { onClose(); router.push('/member#pesanan'); }}
            className="text-[11px] text-varena-gold-light hover:text-white transition flex items-center gap-1 font-medium"
          >
            <span>Riwayat Pesanan</span>
            <ArrowRight className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => { onClose(); router.push('/member/wallet'); }}
            className="text-[11px] text-varena-taupe-light hover:text-varena-gold-light transition font-medium"
          >
            Dompet &amp; Komisi
          </button>
        </div>
      </div>
    </>
  );
}
