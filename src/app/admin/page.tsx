'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, CheckCircle2, TrendingUp, DollarSign, Users, ShieldAlert, GitFork, RefreshCw, AlertCircle } from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Maker-checker approval state
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [transferRef, setTransferRef] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);

  // Placement transfer form
  const [transferMemberCode, setTransferMemberCode] = useState('');
  const [transferNewParentCode, setTransferNewParentCode] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferStatus, setTransferStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/v1/admin/stats').then((r) => r.json()),
      fetch('/api/v1/payout/admin').then((r) => r.json()),
    ])
      .then(([sData, wData]) => {
        if (sData.stats) setStats(sData.stats);
        if (wData.withdrawals) setWithdrawals(wData.withdrawals);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  };

  const handleApproveWithdrawal = async (withdrawalId: string) => {
    if (!transferRef) {
      alert('Masukkan nomor referensi transfer bank terlebih dahulu.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/api/v1/payout/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          withdrawalId,
          providerReference: transferRef,
          actorUserId: 'ADMIN_FINANCE',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyetujui payout.');
      }

      alert('Payout berhasil disetujui dan mutasi buku besar telah diposting!');
      setApprovingId(null);
      setTransferRef('');
      loadAllData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecutePlacementTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferStatus(null);
    try {
      const res = await fetch('/api/v1/network/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberCode: transferMemberCode.trim().toUpperCase(),
          newParentCode: transferNewParentCode.trim().toUpperCase(),
          reason: transferReason,
          actorUserId: 'ADMIN_OPERATIONS',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memindahkan penempatan.');
      }

      setTransferStatus({ type: 'success', message: data.message });
      setTransferMemberCode('');
      setTransferNewParentCode('');
      setTransferReason('');
    } catch (err: any) {
      setTransferStatus({ type: 'error', message: err.message });
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-block px-2.5 py-0.5 rounded text-[10px] uppercase font-mono font-semibold bg-varena-gold/20 text-varena-espresso border border-varena-gold/40 mb-1">
            VARENA Business Management
          </div>
          <h1 className="font-serif text-3xl font-bold text-varena-espresso">
            Dashboard Eksekutif & Operasional
          </h1>
          <p className="text-xs text-varena-taupe-dark">
            Pemantauan penjualan, margin HPP, liabilitas komisi, maker-checker pencairan, dan struktur penempatan.
          </p>
        </div>

        <button
          onClick={loadAllData}
          className="px-4 py-2 rounded-lg border border-varena-taupe/30 text-xs font-semibold hover:bg-varena-ivory flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        {/* Gross Sales */}
        <div className="bg-white p-5 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-1">
          <span className="text-varena-taupe">Total Penjualan Kotor</span>
          <div className="font-serif text-2xl font-bold text-varena-espresso">
            Rp{(stats?.grossSales || 0).toLocaleString('id-ID')}
          </div>
          <div className="text-[10px] text-varena-taupe">
            {stats?.paidOrdersCount || 0} pesanan terverifikasi
          </div>
        </div>

        {/* Gross Margin */}
        <div className="bg-white p-5 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-1">
          <span className="text-varena-taupe">Gross Margin (Setelah HPP)</span>
          <div className="font-serif text-2xl font-bold text-emerald-800">
            Rp{(stats?.grossMargin || 0).toLocaleString('id-ID')}
          </div>
          <div className="text-[10px] text-varena-taupe">
            Total HPP: Rp{(stats?.totalHpp || 0).toLocaleString('id-ID')}
          </div>
        </div>

        {/* Commission Distributed */}
        <div className="bg-white p-5 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-1">
          <span className="text-varena-taupe">Komisi Terdistribusi</span>
          <div className="font-serif text-2xl font-bold text-varena-espresso">
            Rp{(stats?.totalCommissionDistributed || 0).toLocaleString('id-ID')}
          </div>
          <div className="text-[10px] text-varena-taupe">
            Direct Reward + Upline Dev
          </div>
        </div>

        {/* Unallocated Reserve */}
        <div className="bg-white p-5 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-1">
          <span className="text-varena-taupe">Cadangan Unallocated</span>
          <div className="font-serif text-2xl font-bold text-amber-800">
            Rp{(stats?.totalUnallocatedReserve || 0).toLocaleString('id-ID')}
          </div>
          <div className="text-[10px] text-varena-taupe">
            Titik kosong jaringan (liability)
          </div>
        </div>
      </div>

      {/* Maker-Checker Withdrawal Approval Section */}
      <div className="bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg font-bold text-varena-espresso flex items-center gap-2">
              <Building2 className="w-5 h-5 text-varena-gold" />
              <span>Verifikasi & Persetujuan Penarikan Dana (Maker-Checker)</span>
            </h2>
            <p className="text-xs text-varena-taupe mt-0.5">
              Setiap pencairan uang perusahaan wajib diverifikasi dan mencantumkan nomor referensi perbankan resmi.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-varena-espresso">
            {withdrawals.filter((w) => w.status === 'REQUESTED').length} Permohonan Tertunda
          </span>
        </div>

        {withdrawals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-varena-ivory-light text-varena-taupe uppercase font-semibold border-b border-varena-taupe/20">
                <tr>
                  <th className="py-2.5 px-3">Mitra</th>
                  <th className="py-2.5 px-3">Nominal Diminta</th>
                  <th className="py-2.5 px-3">Potongan Biaya</th>
                  <th className="py-2.5 px-3">Bersih Ditransfer</th>
                  <th className="py-2.5 px-3">Rekening Tujuan</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-varena-taupe/10">
                {withdrawals.map((w: any) => (
                  <tr key={w.id} className="hover:bg-varena-ivory-light/40">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-varena-espresso">{w.member?.displayName}</div>
                      <div className="text-[10px] text-varena-taupe font-mono">{w.member?.memberCode}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold">Rp{w.amount.toLocaleString('id-ID')}</td>
                    <td className="py-2.5 px-3 text-varena-taupe font-mono">Rp{w.fee.toLocaleString('id-ID')}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-800">
                      Rp{w.netAmount.toLocaleString('id-ID')}
                    </td>
                    <td className="py-2.5 px-3">
                      <div>{w.bankName} - {w.accountNumberMasked}</div>
                      <div className="text-[10px] text-varena-taupe">a.n. {w.accountHolder}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          w.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {w.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
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
                              className="px-2.5 py-1 rounded bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition"
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
                            className="px-3 py-1.5 rounded bg-varena-espresso text-varena-gold-light font-semibold hover:bg-varena-espresso-dark transition"
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
        ) : (
          <div className="text-center py-10 text-xs text-varena-taupe bg-varena-ivory-light rounded-xl border border-dashed border-varena-taupe/30">
            Tidak ada permohonan penarikan dana saat ini.
          </div>
        )}
      </div>

      {/* Placement Management & Marketing Plan Inspector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Placement Spreading / Transfer Form */}
        <div className="bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <GitFork className="w-5 h-5 text-varena-gold" />
            <h2 className="font-serif text-lg font-bold text-varena-espresso">
              Manajemen Penempatan Jaringan (Spreading)
            </h2>
          </div>
          <p className="text-xs text-varena-taupe">
            Pindahkan posisi downline di bawah parent baru. Sistem memvalidasi anti-cycle (mencegah loop) dan mencatat riwayat audit secara permanen.
          </p>

          {transferStatus && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                transferStatus.type === 'success'
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

          <form onSubmit={handleExecutePlacementTransfer} className="space-y-3 text-xs">
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
              <label className="block font-semibold text-varena-espresso mb-1">Alasan Penempatan / Koreksi *</label>
              <input
                type="text"
                required
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                placeholder="Misal: Penyesuaian struktur pembinaan area Jakarta Selatan"
                className="w-full px-3 py-2 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-varena-espresso text-varena-gold-light font-semibold hover:bg-varena-espresso-dark transition shadow"
            >
              Jalankan Pemindahan Penempatan
            </button>
          </form>
        </div>

        {/* Marketing Plan Inspector */}
        <div className="bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-varena-gold" />
            <h2 className="font-serif text-lg font-bold text-varena-espresso">
              Skema Marketing Plan Baseline Aktif
            </h2>
          </div>
          <div className="p-4 rounded-xl bg-varena-ivory-light border border-varena-gold/40 text-xs space-y-2.5">
            <div className="flex justify-between">
              <span className="text-varena-taupe">Kode Versi Plan:</span>
              <span className="font-mono font-bold text-varena-espresso">MP-2026-V1</span>
            </div>
            <div className="flex justify-between">
              <span className="text-varena-taupe">Nomor Surat Keputusan:</span>
              <span className="font-mono text-varena-espresso">DIR-VARENA-SK-2026/001</span>
            </div>
            <div className="pt-2 border-t border-varena-taupe/20 space-y-1.5">
              <div className="flex justify-between">
                <span>First Pack - Direct Sponsor Reward:</span>
                <span className="font-bold text-emerald-800">Rp50.000 / box</span>
              </div>
              <div className="flex justify-between">
                <span>First Pack - Upline Development Reward:</span>
                <span className="font-bold text-emerald-800">Rp10.000 / level (Maks 10 level)</span>
              </div>
              <div className="flex justify-between">
                <span>Repeat Purchase - Upline Dev Reward:</span>
                <span className="font-bold text-emerald-800">Rp1.000 / level / sachet</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-varena-taupe leading-relaxed">
            Sesuai aturan keamanan arsitektur, parameter nominal komisi bersifat berversi (*versioned & immutable*). Perubahan hanya dapat dilakukan melalui pembuatan draf versi baru dan persetujuan bertingkat direksi (*maker-checker*).
          </div>
        </div>
      </div>
    </div>
  );
}
