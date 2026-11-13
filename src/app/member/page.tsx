'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Wallet, GitFork, Share2, Copy, Check, ArrowUpRight, TrendingUp, Users, ShoppingBag } from 'lucide-react';

export default function MemberDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [commissionSummary, setCommissionSummary] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('varena_user');
    if (!stored) {
      router.push('/login');
      return;
    }
    const parsed = JSON.parse(stored);
    setUser(parsed);

    const memberCode = parsed.memberCode || 'VRN-0001';

    Promise.all([
      fetch(`/api/v1/wallet?memberCode=${memberCode}`).then((r) => r.json()),
      fetch(`/api/v1/commission/summary?memberCode=${memberCode}`).then((r) => r.json()),
    ])
      .then(([wData, cData]) => {
        if (wData.wallet) setWallet(wData.wallet);
        if (cData.summary) setCommissionSummary(cData.summary);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [router]);

  const referralLink = user ? `${typeof window !== 'undefined' ? window.location.origin : ''}/r/${user.memberCode || 'VRN-0001'}` : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      {/* Top Welcome Card */}
      <div className="bg-gradient-to-r from-varena-espresso-dark via-[#3A2C23] to-varena-espresso text-varena-ivory p-6 sm:p-8 rounded-2xl border border-varena-gold/30 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="inline-block px-2.5 py-0.5 rounded text-[10px] uppercase font-mono font-semibold bg-varena-gold/20 text-varena-gold-light border border-varena-gold/30 mb-2">
            Mitra Resmi VARENA
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-varena-ivory-light">
            Halo, {user.displayName}
          </h1>
          <p className="text-xs text-varena-taupe-light mt-1 font-mono">
            ID Mitra: <span className="text-varena-gold-light font-bold">{user.memberCode || 'VRN-0001'}</span>
          </p>
        </div>

        {/* Referral Share Box */}
        <div className="bg-varena-espresso/80 border border-varena-gold/40 p-3.5 rounded-xl flex flex-col gap-2 max-w-sm w-full">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-varena-gold-light flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5" />
              <span>Tautan Referral Anda:</span>
            </span>
            {copied && <span className="text-[10px] text-emerald-400 font-semibold">Tersalin!</span>}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={referralLink}
              className="bg-black/30 border border-[#5A4535] text-[11px] font-mono text-varena-ivory px-2.5 py-1.5 rounded flex-1 select-all outline-none"
            />
            <button
              onClick={handleCopy}
              className="p-1.5 rounded bg-varena-gold text-varena-espresso hover:bg-varena-gold-hover transition"
              title="Salin Link"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Financial Snapshot Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Available Wallet Balance */}
        <div className="bg-white p-5 rounded-2xl border border-varena-taupe/20 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-varena-taupe">
              <span>Saldo Dompet Tersedia</span>
              <Wallet className="w-4 h-4 text-varena-gold" />
            </div>
            <div className="font-serif text-2xl sm:text-3xl font-bold text-varena-espresso mt-2">
              Rp{(wallet?.availableBalance || 0).toLocaleString('id-ID')}
            </div>
            <div className="text-[10px] text-varena-taupe mt-1">
              Sumber: Buku besar append-only
            </div>
          </div>
          <Link
            href="/member/wallet"
            className="mt-4 pt-3 border-t border-varena-taupe/20 text-xs font-semibold text-varena-gold hover:text-varena-gold-hover flex items-center justify-between"
          >
            <span>Tarik Saldo / Mutasi</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Direct Sponsor Reward */}
        <div className="bg-white p-5 rounded-2xl border border-varena-taupe/20 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-varena-taupe">
              <span>Komisi Sponsor Langsung</span>
              <Users className="w-4 h-4 text-varena-gold" />
            </div>
            <div className="font-serif text-2xl sm:text-3xl font-bold text-varena-espresso mt-2">
              Rp{(commissionSummary?.directSponsorEarned || 0).toLocaleString('id-ID')}
            </div>
            <div className="text-[10px] text-varena-taupe mt-1">
              Rp50.000 / qualifying first pack
            </div>
          </div>
          <Link
            href="/member/network"
            className="mt-4 pt-3 border-t border-varena-taupe/20 text-xs font-semibold text-varena-gold hover:text-varena-gold-hover flex items-center justify-between"
          >
            <span>Lihat Mitra Sponsor</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Development Placement Reward */}
        <div className="bg-white p-5 rounded-2xl border border-varena-taupe/20 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-varena-taupe">
              <span>Komisi Generasi Placement</span>
              <GitFork className="w-4 h-4 text-varena-gold" />
            </div>
            <div className="font-serif text-2xl sm:text-3xl font-bold text-varena-espresso mt-2">
              Rp{(commissionSummary?.developmentPlacementEarned || 0).toLocaleString('id-ID')}
            </div>
            <div className="text-[10px] text-varena-taupe mt-1">
              Hingga 10 tingkat upline aktif
            </div>
          </div>
          <Link
            href="/member/network"
            className="mt-4 pt-3 border-t border-varena-taupe/20 text-xs font-semibold text-varena-gold hover:text-varena-gold-hover flex items-center justify-between"
          >
            <span>Jelajahi Pohon Jaringan</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-4">
        <h2 className="font-serif text-lg font-bold text-varena-espresso">Aksi Cepat Mitra</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <Link
            href="/member/network"
            className="p-3.5 rounded-xl border border-varena-taupe/20 hover:border-varena-gold hover:bg-varena-ivory-light transition flex flex-col items-center text-center gap-2"
          >
            <div className="p-2 rounded-full bg-varena-espresso text-varena-gold-light">
              <GitFork className="w-4 h-4" />
            </div>
            <span className="font-semibold text-varena-espresso">Pohon Jaringan</span>
          </Link>

          <Link
            href="/member/wallet"
            className="p-3.5 rounded-xl border border-varena-taupe/20 hover:border-varena-gold hover:bg-varena-ivory-light transition flex flex-col items-center text-center gap-2"
          >
            <div className="p-2 rounded-full bg-varena-espresso text-varena-gold-light">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="font-semibold text-varena-espresso">Tarik Dana</span>
          </Link>

          <Link
            href="/checkout"
            className="p-3.5 rounded-xl border border-varena-taupe/20 hover:border-varena-gold hover:bg-varena-ivory-light transition flex flex-col items-center text-center gap-2"
          >
            <div className="p-2 rounded-full bg-varena-espresso text-varena-gold-light">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <span className="font-semibold text-varena-espresso">Order Produk</span>
          </Link>

          <button
            onClick={handleCopy}
            className="p-3.5 rounded-xl border border-varena-taupe/20 hover:border-varena-gold hover:bg-varena-ivory-light transition flex flex-col items-center text-center gap-2"
          >
            <div className="p-2 rounded-full bg-varena-espresso text-varena-gold-light">
              <Share2 className="w-4 h-4" />
            </div>
            <span className="font-semibold text-varena-espresso">Bagikan Referral</span>
          </button>
        </div>
      </div>
    </div>
  );
}

