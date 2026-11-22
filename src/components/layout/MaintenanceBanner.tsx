'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  AlertTriangle,
  ShoppingBag,
  Wallet,
  CreditCard,
  X,
  ChevronDown,
  Info,
} from 'lucide-react';

interface MaintenanceState {
  isActive: boolean;
  freezeWithdrawals: boolean;
  freezePurchases: boolean;
  freezeDeposits: boolean;
  message: string;
}

export default function MaintenanceBanner() {
  const pathname = usePathname();
  const [maintenance, setMaintenance] = useState<MaintenanceState | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  // Jangan tampilkan di halaman /admin agar tidak mengganggu operasional admin
  const isAdminRoute = pathname?.startsWith('/admin');

  useEffect(() => {
    if (isAdminRoute) return;

    // Cek apakah user pernah dismiss banner di session ini
    try {
      const dismissedSession = sessionStorage.getItem('varena_maint_dismissed');
      if (dismissedSession === '1') {
        setIsDismissed(true);
      }
    } catch {}

    fetch('/api/v1/maintenance/status')
      .then((r) => r.json())
      .then((data) => {
        if (data?.maintenance?.isActive) {
          setMaintenance(data.maintenance);
        } else {
          setMaintenance(null);
        }
      })
      .catch(() => {});
  }, [pathname, isAdminRoute]);

  if (isAdminRoute || !maintenance?.isActive) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('varena_maint_dismissed', '1');
    } catch {}
  };

  const handleReopen = () => {
    setIsDismissed(false);
    try {
      sessionStorage.removeItem('varena_maint_dismissed');
    } catch {}
  };

  // Jika di-dismiss, tampilkan floating pill minimalis di sudut bawah agar tidak menghalangi namun tetap transparan
  if (isDismissed) {
    return (
      <button
        type="button"
        onClick={handleReopen}
        className="fixed bottom-4 left-4 z-[90] inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-900/90 hover:bg-stone-900 text-amber-300 text-xs font-semibold shadow-xl border border-amber-500/40 backdrop-blur-xs transition hover:scale-105 animate-in fade-in"
        title="Klik untuk membuka detail status pemeliharaan sistem"
      >
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
        <span>Mode Pemeliharaan Aktif</span>
        <ChevronDown className="w-3.5 h-3.5 opacity-70" />
      </button>
    );
  }

  return (
    <div className="sticky top-0 z-[90] bg-gradient-to-r from-stone-950 via-amber-950/95 to-stone-950 text-stone-100 shadow-xl border-b border-amber-500/30 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          {/* Main Info */}
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4 text-amber-300 animate-pulse" />
            </div>

            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  Pemeliharaan Sistem Aktif
                </span>
                <span className="text-[11px] text-amber-200/90 font-medium hidden sm:inline">
                  Pemberitahuan Manajemen VARENA
                </span>
              </div>

              <p className="text-stone-200 text-xs sm:text-[13px] leading-relaxed">
                {maintenance.message}
              </p>

              {/* Badges pembatasan transaksi aktif */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] text-stone-400 font-medium">Fitur terdampak:</span>

                {maintenance.freezePurchases && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    <ShoppingBag className="w-3 h-3" />
                    <span>Belanja &amp; Checkout Dikunci</span>
                  </span>
                )}

                {maintenance.freezeWithdrawals && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                    <Wallet className="w-3 h-3" />
                    <span>Penarikan Dana (WD) Dikunci</span>
                  </span>
                )}

                {maintenance.freezeDeposits && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <CreditCard className="w-3 h-3" />
                    <span>Top Up Saldo Belanja Dikunci</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Dismiss button */}
          <div className="flex items-center justify-end shrink-0 pt-1 md:pt-0">
            <button
              type="button"
              onClick={handleDismiss}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-stone-200 hover:text-white transition text-xs font-medium border border-white/15"
              title="Tutup banner untuk sesi ini"
            >
              <span>Sembunyikan</span>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
