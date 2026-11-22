'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';

export default function MaintenanceBanner() {
  const pathname = usePathname();
  const [maintenance, setMaintenance] = useState<{
    isActive: boolean;
    freezeWithdrawals: boolean;
    freezePurchases: boolean;
    freezeDeposits: boolean;
    message: string;
  } | null>(null);

  // Jangan tampilkan di halaman /admin agar tidak mengganggu kontrol admin
  const isAdminRoute = pathname?.startsWith('/admin');

  useEffect(() => {
    if (isAdminRoute) return;

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

  return (
    <div className="sticky top-0 z-[90] bg-gradient-to-r from-amber-600 to-rose-600 text-white shadow-md border-b border-amber-700/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-center gap-2 text-xs font-medium text-center">
        <AlertTriangle className="w-4 h-4 text-amber-200 shrink-0 animate-pulse" />
        <span>
          <strong className="uppercase bg-black/25 px-1.5 py-0.5 rounded mr-1.5 text-[10px] font-mono tracking-wide">
            Mode Pemeliharaan
          </strong>
          {maintenance.message}
        </span>
      </div>
    </div>
  );
}
