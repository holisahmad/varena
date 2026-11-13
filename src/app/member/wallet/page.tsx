'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, ArrowDownRight, ArrowUpRight, ShieldCheck, History, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function MemberWalletPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Withdrawal form
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('BCA');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('varena_user');
    if (!stored) {
      router.push('/login');
      return;
    }
    const parsed = JSON.parse(stored);
    setUser(parsed);
    setAccountHolder(parsed.displayName || '');
    loadWallet(parsed.memberCode || 'VRN-0001');
  }, [router]);

  const loadWallet = (code: string) => {
    setLoading(true);
    fetch(`/api/v1/wallet?memberCode=${code}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.wallet) {
          setWallet(data.wallet);
        }
      })
      .finally(() => setLoading(false));
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/v1/payout/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberCode: user.memberCode || 'VRN-0001',
          amount: parseInt(amount, 10),
          bankName,
          accountNumber,
          accountHolder,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengajukan penarikan dana.');
      }

      setSuccessMsg('Pengajuan penarikan dana berhasil diajukan! Menunggu persetujuan finance (maker-checker).');
      setAmount('');
      setAccountNumber('');
      loadWallet(user.memberCode || 'VRN-0001');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-varena-espresso">
          Dompet Digital & Buku Besar
        </h1>
        <p className="text-xs text-varena-taupe-dark mt-1">
          Pencatatan mutasi saldo berbasis double-entry ledger append-only berstandar akuntansi.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Balance Card & Payout Form */}
        <div className="md:col-span-5 space-y-6">
          {/* Balance Widget */}
          <div className="bg-gradient-to-br from-varena-espresso-dark to-varena-espresso text-varena-ivory p-6 rounded-2xl border border-varena-gold/40 shadow-md">
            <div className="flex items-center justify-between text-xs text-varena-taupe-light">
              <span>Saldo Dompet Tersedia</span>
              <span className="font-mono text-[10px] bg-black/40 px-2 py-0.5 rounded text-varena-gold-light">
                {wallet?.accountCode || 'ACC-MBR'}
              </span>
            </div>
            <div className="font-serif text-3xl sm:text-4xl font-bold text-varena-gold-light mt-3">
              Rp{(wallet?.availableBalance || 0).toLocaleString('id-ID')}
            </div>
            <div className="mt-4 pt-4 border-t border-[#4A3B30] flex items-center justify-between text-[11px] text-varena-ivory/70">
              <span>Integritas Buku Besar:</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Terverifikasi ACID</span>
              </span>
            </div>
          </div>

          {/* Payout Form */}
          <div className="bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-4">
            <h2 className="font-serif text-lg font-bold text-varena-espresso">Ajukan Penarikan Dana</h2>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-2 border border-red-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleRequestPayout} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-varena-espresso mb-1">Nominal Penarikan (Rp) *</label>
                <input
                  type="number"
                  min="50000"
                  step="10000"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Minimal Rp50.000"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-varena-espresso mb-1">Bank Tujuan *</label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold bg-white"
                  >
                    <option value="BCA">BCA</option>
                    <option value="Mandiri">Bank Mandiri</option>
                    <option value="BRI">BRI</option>
                    <option value="BNI">BNI</option>
                    <option value="BSI">BSI (Syariah)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-varena-espresso mb-1">No. Rekening *</label>
                  <input
                    type="text"
                    required
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="1234567890"
                    className="w-full px-3 py-2.5 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-varena-espresso mb-1">Nama Pemilik Rekening *</label>
                <input
                  type="text"
                  required
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  placeholder="Nama sesuai buku tabungan"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
                />
              </div>

              <div className="text-[10px] text-varena-taupe pt-1">
                * Biaya transfer bank sebesar Rp5.000 otomatis dipotong dari nominal bersih pencairan.
              </div>

              <button
                type="submit"
                disabled={submitting || (wallet?.availableBalance || 0) < 50000}
                className="w-full py-3 rounded-lg bg-varena-espresso text-varena-gold-light font-semibold text-xs hover:bg-varena-espresso-dark transition disabled:opacity-50 flex items-center justify-center gap-2 shadow"
              >
                <Wallet className="w-4 h-4" />
                <span>{submitting ? 'Mengajukan...' : 'Kirim Permohonan Payout'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Ledger Statement Table */}
        <div className="md:col-span-7 bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-bold text-varena-espresso flex items-center gap-2">
              <History className="w-5 h-5 text-varena-gold" />
              <span>Rekening Koran Buku Besar (Mutasi)</span>
            </h2>
            <span className="text-xs text-varena-taupe">Append-only audit trail</span>
          </div>

          {loading ? (
            <div className="text-center py-16 text-xs text-varena-taupe">Memuat buku besar...</div>
          ) : wallet?.statement && wallet.statement.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-varena-ivory-light text-varena-taupe uppercase font-semibold border-b border-varena-taupe/20">
                  <tr>
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">Deskripsi / Memo</th>
                    <th className="py-2.5 px-3">Tipe</th>
                    <th className="py-2.5 px-3 text-right">Nominal (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-varena-taupe/10">
                  {wallet.statement.map((s: any) => {
                    const isCredit = s.direction === 'CREDIT';
                    return (
                      <tr key={s.id} className="hover:bg-varena-ivory-light/40">
                        <td className="py-2.5 px-3 text-varena-taupe whitespace-nowrap">
                          {new Date(s.date).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-varena-espresso">
                          <div>{s.memo}</div>
                          <div className="text-[10px] text-varena-taupe font-mono">{s.referenceType}</div>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              isCredit
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {isCredit ? '+ CREDIT' : '- DEBIT'}
                          </span>
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap ${
                            isCredit ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {isCredit ? '+' : '-'} Rp{s.amount.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16 text-xs text-varena-taupe bg-varena-ivory-light rounded-xl border border-dashed border-varena-taupe/30">
              Belum ada mutasi buku besar pada akun ini. Lakukan penjualan retail atau daftarkan mitra baru untuk menghasilkan komisi.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
