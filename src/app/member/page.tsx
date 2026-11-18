'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Wallet,
  GitFork,
  Share2,
  Copy,
  Check,
  ArrowUpRight,
  TrendingUp,
  Users,
  ShoppingBag,
  Package,
  Truck,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Gift,
} from 'lucide-react';

export default function MemberDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [commissionSummary, setCommissionSummary] = useState<any>(null);
  const [personalOrders, setPersonalOrders] = useState<any[]>([]);
  const [referralOrders, setReferralOrders] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [memberProfile, setMemberProfile] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem('varena_user');
    if (!stored) {
      router.push('/login');
      return;
    }
    const parsed = JSON.parse(stored);
    setUser(parsed);

    const memberCode = parsed.memberCode || 'VRN-0001';
    const userId = parsed.userId || parsed.id;
    loadDashboard(memberCode, userId);
  }, [router]);

  const loadDashboard = (memberCode: string, userId: string) => {
    setLoading(true);
    Promise.all([
      fetch(`/api/v1/wallet?memberCode=${memberCode}`).then((r) => r.json()),
      fetch(`/api/v1/commission/summary?memberCode=${memberCode}`).then((r) => r.json()),
      fetch(`/api/v1/orders/my-orders?memberCode=${memberCode}&userId=${userId}`).then((r) => r.json()),
      fetch(`/api/v1/member/profile?memberCode=${memberCode}&userId=${userId}`).then((r) => r.json()),
    ])
      .then(([wData, cData, oData, pData]) => {
        if (wData.wallet) setWallet(wData.wallet);
        if (cData.summary) setCommissionSummary(cData.summary);
        if (oData.personalOrders) setPersonalOrders(oData.personalOrders);
        if (oData.referralOrders) setReferralOrders(oData.referralOrders);
        if (pData.member) setMemberProfile(pData.member);
      })
      .catch((e) => console.error('Dashboard load error:', e))
      .finally(() => setLoading(false));
  };

  const referralLink = user ? `${typeof window !== 'undefined' ? window.location.origin : ''}/r/${user.memberCode || 'VRN-0001'}` : '';

  const copyToClipboard = async (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {}
    }

    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      textArea.setAttribute('readonly', '');
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.warn('Fallback copy failed:', err);
      return false;
    }
  };

  const handleCopy = async () => {
    const ok = await copyToClipboard(referralLink);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: 'Kemitraan VARENA — Grow Together. Build Value.',
          text: `Mari bergabung bersama VARENA melalui link referral saya (${user?.displayName}):`,
          url: referralLink,
        });
        return;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          await handleCopy();
        }
        return;
      }
    }
    await handleCopy();
  };

  // Buyer confirms order received
  const handleConfirmReceived = async (orderId: string) => {
    if (!confirm('Konfirmasi bahwa barang pesanan Anda telah sampai dengan baik?')) {
      return;
    }
    setActionLoadingId(orderId);
    try {
      const res = await fetch('/api/v1/orders/confirm-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          userId: user?.userId || user?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengonfirmasi penerimaan.');

      alert('Terima kasih! Pesanan Anda telah ditandai selesai.');
      loadDashboard(user?.memberCode || 'VRN-0001', user?.userId || user?.id);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      {/* Top Welcome Card */}
      <div className="bg-gradient-to-r from-varena-espresso-dark via-[#3A2C23] to-varena-espresso text-varena-ivory p-5 sm:p-8 rounded-2xl border border-varena-gold/30 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-varena-gold/60 p-0.5 bg-varena-espresso-dark flex-shrink-0 shadow-md">
            <Image
              src="/brand/logo-circle.png"
              alt="VARENA Luxury Emblem"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div>
            <div className="inline-block px-2.5 py-0.5 rounded text-[10px] uppercase font-mono font-semibold bg-varena-gold/20 text-varena-gold-light border border-varena-gold/30 mb-1">
              Portal Kemitraan Resmi
            </div>
            <h1 className="font-serif text-xl sm:text-3xl font-bold text-varena-ivory-light">
              Halo, {user.displayName}
            </h1>
            <p className="text-xs text-varena-taupe-light mt-0.5 font-mono">
              ID Mitra: <span className="text-varena-gold-light font-bold">{user.memberCode || 'VRN-0001'}</span>
            </p>
          </div>
        </div>

        {/* Referral Share Box */}
        <div className="bg-varena-espresso/80 border border-varena-gold/40 p-3.5 rounded-xl flex flex-col gap-2 w-full sm:max-w-sm">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-varena-gold-light flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5" />
              <span>Tautan Referral:</span>
            </span>
            {copied && <span className="text-[10px] text-emerald-400 font-semibold animate-pulse">Tersalin!</span>}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={referralLink}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="bg-black/30 border border-[#5A4535] text-[11px] font-mono text-varena-ivory px-2.5 py-1.5 rounded flex-1 min-w-0 select-all outline-none cursor-pointer"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="px-2.5 py-1.5 rounded bg-varena-gold text-varena-espresso hover:bg-varena-gold-hover transition shadow flex items-center gap-1 text-[11px] font-semibold"
              title="Salin Tautan"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin' : 'Salin'}</span>
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="px-2.5 py-1.5 rounded bg-varena-espresso-light border border-varena-gold/50 text-varena-gold-light hover:bg-varena-gold hover:text-varena-espresso transition shadow flex items-center gap-1 text-[11px] font-semibold"
              title="Bagikan ke WhatsApp/Aplikasi lain"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bagikan</span>
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
            {wallet?.pendingHold > 0 && (
              <div className="text-[11px] text-amber-700 mt-1 font-mono">
                Rp{wallet.pendingHold.toLocaleString('id-ID')} sedang direview finance
              </div>
            )}
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

      {/* Unique Code Balance Card - only show if member has uniqueCodeBalance */}
      {memberProfile && (
        <div className="bg-white p-5 rounded-2xl border border-varena-taupe/20 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-varena-taupe mb-1">
                <Gift className="w-4 h-4 text-varena-gold" />
                <span>Kode Unik Terkumpul</span>
              </div>
              <div className="font-serif text-2xl font-bold text-varena-espresso mt-1">
                Rp{(memberProfile.uniqueCodeBalance || 0).toLocaleString('id-ID')}
              </div>
              <div className="text-[11px] text-varena-taupe mt-1 leading-relaxed">
                {memberProfile.uniqueCodeBalance >= 10000 ? (
                  <>
                    ✓ <strong className="text-emerald-700">Rp{(Math.floor(memberProfile.uniqueCodeBalance / 1000) * 1000).toLocaleString('id-ID')}</strong> eligible ditarik
                    {memberProfile.uniqueCodeBalance % 1000 > 0 && (
                      <span className="block text-stone-500 text-[10px]">
                        Sisa Rp{(memberProfile.uniqueCodeBalance % 1000).toLocaleString('id-ID')} tersimpan
                      </span>
                    )}
                  </>
                ) : (
                  `Terkumpul Rp${(memberProfile.uniqueCodeBalance || 0).toLocaleString('id-ID')} dari Rp10.000 minimum`
                )}
              </div>
            </div>
            <div className={`px-2 py-1 rounded-full text-[10px] font-bold ${
              memberProfile.uniqueCodeBalance >= 10000
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-stone-100 text-stone-600 border border-stone-200'
            }`}>
              {memberProfile.uniqueCodeBalance >= 10000 ? 'Eligible Tarik' : 'Belum Eligible'}
            </div>
          </div>
          {memberProfile.uniqueCodeBalance > 0 && memberProfile.uniqueCodeBalance < 10000 && (
            <div className="mt-3">
              <div className="w-full bg-stone-100 rounded-full h-1.5">
                <div
                  className="bg-varena-gold h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (memberProfile.uniqueCodeBalance / 10000) * 100)}%` }}
                />
              </div>
              <div className="text-[10px] text-varena-taupe mt-1 text-right">
                {Math.round((memberProfile.uniqueCodeBalance / 10000) * 100)}% menuju threshold
              </div>
            </div>
          )}
          <Link
            href="/member/wallet"
            className="mt-3 pt-3 border-t border-varena-taupe/20 text-xs font-semibold text-varena-gold hover:text-varena-gold-hover flex items-center justify-between"
          >
            <span>Tarik Dana / Lihat Detail</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Section: Pesanan & Pengiriman Saya (Sinkronisasi Logistik) */}
      <div className="bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg font-bold text-varena-espresso flex items-center gap-2">
              <Package className="w-5 h-5 text-varena-gold" />
              <span>Pesanan & Pengiriman Saya</span>
            </h2>
            <p className="text-xs text-varena-taupe mt-0.5">
              Lacak status pemrosesan pesanan, nomor resi kurir pengiriman, dan konfirmasi penerimaan barang.
            </p>
          </div>
          <Link
            href="/checkout"
            className="px-3 py-1.5 rounded-lg bg-varena-espresso text-varena-gold-light font-semibold text-xs hover:bg-varena-espresso-dark transition flex items-center gap-1.5 shadow"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Belanja Lagi</span>
          </Link>
        </div>

        {personalOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[600px]">
              <thead className="bg-varena-ivory-light text-varena-taupe uppercase font-semibold border-b border-varena-taupe/20">
                <tr>
                  <th className="py-2.5 px-3">No. Pesanan</th>
                  <th className="py-2.5 px-3">Produk</th>
                  <th className="py-2.5 px-3">Total Belanja</th>
                  <th className="py-2.5 px-3">Status Pesanan</th>
                  <th className="py-2.5 px-3">Kurir & No. Resi</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-varena-taupe/10">
                {personalOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-varena-ivory-light/40">
                    <td className="py-2.5 px-3">
                      <div className="font-mono font-bold text-varena-espresso">{po.orderNumber}</div>
                      <div className="text-[10px] text-varena-taupe">
                        {new Date(po.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      {po.items?.map((it: any, idx: number) => (
                        <div key={idx} className="font-medium text-varena-espresso">
                          {it.quantity}x {it.name}
                        </div>
                      ))}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-varena-espresso whitespace-nowrap">
                      Rp{po.total.toLocaleString('id-ID')}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold inline-block ${
                          po.orderStatus === 'COMPLETED'
                            ? 'bg-slate-100 text-slate-800 border border-slate-300'
                            : po.orderStatus === 'SHIPPED'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : po.orderStatus === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {po.orderStatus === 'PENDING_PAYMENT'
                          ? 'Menunggu Pembayaran'
                          : po.orderStatus === 'PAID'
                          ? 'Dibayar (Diproses Gudang)'
                          : po.orderStatus === 'SHIPPED'
                          ? 'Sedang Dikirim Kurir'
                          : po.orderStatus === 'COMPLETED'
                          ? 'Pesanan Selesai'
                          : po.orderStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {po.trackingNumber ? (
                        <div>
                          <div className="font-semibold text-varena-espresso flex items-center gap-1">
                            <Truck className="w-3.5 h-3.5 text-varena-gold" />
                            <span>{po.courierName}</span>
                          </div>
                          <div className="text-[10px] font-mono text-varena-taupe mt-0.5">
                            Resi: <strong>{po.trackingNumber}</strong>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-varena-taupe italic">Belum dikirim</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {po.orderStatus === 'SHIPPED' && (
                        <button
                          onClick={() => handleConfirmReceived(po.id)}
                          disabled={actionLoadingId === po.id}
                          className="px-2.5 py-1.5 rounded bg-emerald-700 text-white font-semibold text-[11px] hover:bg-emerald-800 transition shadow whitespace-nowrap"
                        >
                          {actionLoadingId === po.id ? 'Memproses...' : 'Konfirmasi Diterima'}
                        </button>
                      )}
                      {po.orderStatus === 'COMPLETED' && (
                        <span className="text-[10px] text-emerald-700 font-semibold flex items-center justify-end gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Diterima</span>
                        </span>
                      )}
                      {po.orderStatus === 'PAID' && (
                        <span className="text-[10px] text-varena-taupe">Sedang dikemas</span>
                      )}
                      {po.orderStatus === 'PENDING_PAYMENT' && (
                        <Link
                          href="/checkout"
                          className="text-amber-800 font-semibold underline text-[11px]"
                        >
                          Bayar Sekarang
                        </Link>
                      )}
                      {po.orderStatus === 'PENDING_PAYMENT' && po.uniqueCode > 0 && (
                        <Link
                          href={`/confirm-payment?orderNumber=${po.orderNumber}`}
                          className="text-[11px] text-amber-700 hover:underline block mt-1"
                        >
                          Konfirmasi transfer salah →
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-varena-taupe bg-varena-ivory-light rounded-xl border border-dashed border-varena-taupe/30">
            Anda belum memiliki riwayat pesanan pribadi. Klik <strong>Belanja Lagi</strong> untuk memesan produk VARENA Kopi Sehat.
          </div>
        )}
      </div>

      {/* Section: Penjualan dari Referral Saya */}
      {referralOrders.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-lg font-bold text-varena-espresso flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-varena-gold" />
                <span>Penjualan dari Link Referral Saya</span>
              </h2>
              <p className="text-xs text-varena-taupe mt-0.5">
                Pesanan yang dihasilkan melalui pembagian tautan referral Anda beserta bonus komisi yang diperoleh.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-varena-gold/20 text-varena-espresso">
              {referralOrders.length} Transaksi Referral
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[560px]">
              <thead className="bg-varena-ivory-light text-varena-taupe uppercase font-semibold border-b border-varena-taupe/20">
                <tr>
                  <th className="py-2.5 px-3">No. Pesanan</th>
                  <th className="py-2.5 px-3">Nama Pembeli</th>
                  <th className="py-2.5 px-3">Tipe Pembelian</th>
                  <th className="py-2.5 px-3">Total Belanja</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Komisi Diterima</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-varena-taupe/10">
                {referralOrders.map((ro) => (
                  <tr key={ro.id} className="hover:bg-varena-ivory-light/40">
                    <td className="py-2.5 px-3 font-mono font-bold text-varena-espresso">{ro.orderNumber}</td>
                    <td className="py-2.5 px-3 font-medium text-varena-espresso">{ro.buyerName}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-varena-ivory border border-varena-taupe/20">
                        {ro.orderType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono">Rp{ro.total.toLocaleString('id-ID')}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          ro.orderStatus === 'PAID' || ro.orderStatus === 'SHIPPED' || ro.orderStatus === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {ro.orderStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800">
                      Rp{ro.commissionEarned.toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
