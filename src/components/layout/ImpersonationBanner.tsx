'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ShieldAlert, ArrowLeftCircle, Loader2 } from 'lucide-react';

export default function ImpersonationBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const [impersonationInfo, setImpersonationInfo] = useState<{
    isImpersonated: boolean;
    memberCode?: string;
    memberName?: string;
    adminName?: string;
  } | null>(null);
  const [reverting, setReverting] = useState(false);

  useEffect(() => {
    const checkStatus = () => {
      try {
        const storedUser = localStorage.getItem('varena_user');
        const backupToken = localStorage.getItem('varena_admin_backup_token');

        if (storedUser && backupToken) {
          const parsed = JSON.parse(storedUser);
          if (parsed.isImpersonated) {
            setImpersonationInfo({
              isImpersonated: true,
              memberCode: parsed.memberCode || 'Mitra',
              memberName: parsed.displayName || parsed.legalName || 'Mitra',
              adminName: parsed.impersonatorName || 'Admin',
            });
            return;
          }
        }
        setImpersonationInfo(null);
      } catch {
        setImpersonationInfo(null);
      }
    };

    checkStatus();
    window.addEventListener('storage', checkStatus);
    return () => window.removeEventListener('storage', checkStatus);
  }, [pathname]);

  if (!impersonationInfo?.isImpersonated) return null;

  const handleRevert = async () => {
    if (reverting) return;
    setReverting(true);
    try {
      const backupToken = localStorage.getItem('varena_admin_backup_token');
      const backupUser = localStorage.getItem('varena_admin_backup_user');

      if (backupToken) {
        await fetch('/api/v1/admin/impersonate/revert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminToken: backupToken }),
        }).catch(() => {});

        localStorage.setItem('varena_token', backupToken);
        if (backupUser) {
          localStorage.setItem('varena_user', backupUser);
        }
      }

      localStorage.removeItem('varena_admin_backup_token');
      localStorage.removeItem('varena_admin_backup_user');

      window.location.href = '/admin';
    } catch (err) {
      console.error('Failed to revert impersonation:', err);
      window.location.href = '/admin';
    } finally {
      setReverting(false);
    }
  };

  return (
    <div className="sticky top-0 z-[100] bg-gradient-to-r from-amber-600 via-amber-700 to-rose-700 text-white shadow-lg border-b border-amber-500/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 text-center sm:text-left">
          <ShieldAlert className="w-4 h-4 text-amber-200 shrink-0 animate-pulse" />
          <span>
            <strong className="tracking-wide uppercase bg-black/20 px-1.5 py-0.5 rounded mr-1.5 text-[10px] font-mono">
              Mode Maintenance Admin
            </strong>
            Anda sedang menginspeksi akun mitra{' '}
            <strong className="text-amber-100 underline decoration-amber-300">
              {impersonationInfo.memberName} ({impersonationInfo.memberCode})
            </strong>{' '}
            sebagai Admin{' '}
            <strong className="text-amber-100">{impersonationInfo.adminName}</strong>.
          </span>
        </div>

        <button
          type="button"
          onClick={handleRevert}
          disabled={reverting}
          className="shrink-0 px-3.5 py-1.5 rounded-lg bg-white text-amber-950 font-bold hover:bg-amber-50 transition shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer text-xs"
        >
          {reverting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Memulihkan Sesi...</span>
            </>
          ) : (
            <>
              <ArrowLeftCircle className="w-3.5 h-3.5 text-rose-700" />
              <span>Selesai &amp; Kembali ke Admin</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
