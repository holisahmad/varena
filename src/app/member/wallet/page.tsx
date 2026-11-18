'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  History,
  AlertCircle,
  CheckCircle2,
  Lock,
  Building2,
  CreditCard,
  UserCheck,
  Info,
} from 'lucide-react';

export default function MemberWalletPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Bank Binding State
  const [bindBankName, setBindBankName] = useState('BCA');
  const [bindAccountNumber, setBindAccountNumber] = useState('');
  const [bindAccountHolder, setBindAccountHolder] = useState('');
  const [bindingBank, setBindingBank] = useState(false);
  const [bindError, setBindError] = useState('');
  const [bindSuccess, setBindSuccess] = useState('');

  // Withdrawal form
  const [amount, setAmount] = useState('');
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
    setBindAccountHolder(parsed.displayName || parsed.legalName || '');
    loadWallet(parsed.memberCode || 'VRN-0001');
  }, [router]);

  const loadWallet = (code: string) => {
    setLoading(true);
    fetch(`/api/v1/wallet?memberCode=${code}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.wallet) {
          setWallet(data.wallet);
          if (data.wallet.bankInfo?.displayName || data.wallet.bankInfo?.legalName) {
            setBindAccountHolder(data.wallet.bankInfo.legalName || data.wallet.bankInfo.displayName);
          }
        }
      })
      .finally(() => setLoading(false));
  };

  const handleBindBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setBindError('');
    setBindSuccess('');
    setBindingBank(true);

    try {
      const res = await fetch('/api/v1/member/bank-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberCode: user.memberCode || 'VRN-0001',
          bankName: bindBankName,
          accountNumber: bindAccountNumber,
          accountHolder: bindAccountHolder,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan dan mengikat rekening bank.');
      }

      setBindSuccess('Rekening bank berhasil disimpan dan dikunci untuk penarikan dana!');
      loadWallet(user.memberCode || 'VRN-0001');
    } catch (err: any) {
      setBindError(err.message);
    } finally {
      setBindingBank(false);
    }
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
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengajukan penarikan dana.');
      }

      setSuccessMsg('Pengajuan penarikan dana berhasil diajukan! Menunggu persetujuan finance (maker-checker).');
      setAmount('');
      loadWallet(user.memberCode || 'VRN-0001');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  const isBankBound = Boolean(wallet?.bankInfo?.isBankLocked && wallet?.bankInfo?.bankAccountNumber);
  const registeredName = wallet?.bankInfo?.legalName || wallet?.bankInfo?.displayName || user.displayName;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-varena-espresso">
          Dompet Digital & Buku Besar
        </h1>
        <p className="text-xs text-varena-taupe-dark mt-1">
          Pencatatan mutasi saldo berbasis double-entry ledger dengan pengamanan rekening penarikan terikat.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Balance, Bank Binding & Payout Form */}
        <div className="md:col-span-5 space-y-6">
          {/* Balance Widget */}
          <div className="bg-gradient-to-br from-varena-espresso-dark to-varena-espresso text-varena-ivory p-6 rounded-2xl border border-varena-gold/40 shadow-md space-y-3">
            <div className="flex items-center justify-between text-xs text-varena-taupe-light">
              <span>Saldo Dompet Tersedia</span>
              <span className="font-mono text-[10px] bg-black/40 px-2 py-0.5 rounded text-varena-gold-light">
                {wallet?.accountCode || 'ACC-MBR'}
              </span>
            </div>
            <div className="font-serif text-3xl sm:text-4xl font-bold text-varena-gold-light">
              Rp{(wallet?.availableBalance || 0).toLocaleString('id-ID')}
            </div>

            {wallet?.pendingHold > 0 && (
              <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-400/30 text-xs text-amber-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span>Tertahan (Review Finance):</span>
                </span>
                <span className="font-mono font-bold text-amber-300">
                  Rp{wallet.pendingHold.toLocaleString('id-ID')}
                </span>
              </div>
            )}

            <div className="pt-3 border-t border-[#4A3B30] flex items-center justify-between text-[11px] text-varena-ivory/70">
              <span>Total Saldo Buku Besar:</span>
              <span className="font-mono font-semibold text-varena-gold-light">
                Rp{(wallet?.ledgerBalance ?? wallet?.availableBalance ?? 0).toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          {/* Section: Bound Bank Account (Anti-Hijacking Protection) */}
          <div className="bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-base font-bold text-varena-espresso flex items-center gap-2">
                <Building2 className="w-4 h-4 text-varena-gold" />
                <span>Rekening Bank Terikat</span>
              </h2>
              {isBankBound ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <Lock className="w-3 h-3" />
                  <span>Terkunci & Aman</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  <AlertCircle className="w-3 h-3" />
                  <span>Belum Terikat</span>
                </span>
              )}
            </div>

            {isBankBound ? (
              /* Verified & Bound Bank Card */
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-gradient-to-r from-stone-900 to-stone-800 text-white shadow-inner border border-amber-500/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] tracking-wider uppercase text-amber-300 font-bold flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5" />
                      {wallet.bankInfo.bankName}
                    </span>
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/40">
                      <ShieldCheck className="w-3 h-3" />
                      Terverifikasi
                    </span>
                  </div>

                  <div className="font-mono text-base font-bold tracking-widest text-white/95">
                    {wallet.bankInfo.bankAccountNumber.length > 6
                      ? `${wallet.bankInfo.bankAccountNumber.slice(0, 4)} •••• ${wallet.bankInfo.bankAccountNumber.slice(-4)}`
                      : wallet.bankInfo.bankAccountNumber}
                  </div>

                  <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[11px] text-stone-300">
                    <span className="flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                      <span>{wallet.bankInfo.bankAccountHolder}</span>
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">Terkunci</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-[11px] text-stone-600 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <p>
                    Rekening ini terikat permanen dengan akun Anda. Seluruh penarikan dana otomatis disalurkan ke rekening ini untuk mencegah pencurian saldo jika akun diakses orang lain.
                  </p>
                </div>
              </div>
            ) : (
              /* Bank Account Binding Form */
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-[11px] space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-950">
                    <Info className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span>Ketentuan Pengikatan Rekening:</span>
                  </div>
                  <p className="text-amber-800">
                    Nama pada rekening bank <strong className="font-bold text-amber-950">harus sesuai persis</strong> dengan nama akun terdaftar Anda (<strong>{registeredName}</strong>). Sekali disimpan, data rekening dikunci dan tidak bisa diisi manual per transaksi.
                  </p>
                </div>

                {bindError && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-2 border border-red-200">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{bindError}</span>
                  </div>
                )}

                {bindSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2 border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{bindSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleBindBankAccount} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-varena-espresso mb-1">Pilih Bank *</label>
                      <select
                        value={bindBankName}
                        onChange={(e) => setBindBankName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold bg-white"
                      >
                        <option value="BCA">BCA</option>
                        <option value="MANDIRI">Bank Mandiri</option>
                        <option value="BRI">BRI</option>
                        <option value="BNI">BNI</option>
                        <option value="BSI">BSI (Syariah)</option>
                        <option value="CIMB">CIMB Niaga</option>
                        <option value="PERMATA">Permata Bank</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-varena-espresso mb-1">No. Rekening *</label>
                      <input
                        type="text"
                        required
                        value={bindAccountNumber}
                        onChange={(e) => setBindAccountNumber(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="Contoh: 1234567890"
                        className="w-full px-3 py-2 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-varena-espresso mb-1">Nama Pemilik Rekening *</label>
                    <input
                      type="text"
                      required
                      value={bindAccountHolder}
                      onChange={(e) => setBindAccountHolder(e.target.value)}
                      placeholder={`Harus sesuai: ${registeredName}`}
                      className="w-full px-3.5 py-2 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
                    />
                    <span className="text-[10px] text-varena-taupe block mt-0.5">
                      Nama terdaftar di akun: <strong className="text-varena-espresso">{registeredName}</strong>
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={bindingBank || !bindAccountNumber || !bindAccountHolder}
                    className="w-full py-2.5 rounded-lg bg-varena-espresso text-varena-gold-light font-semibold text-xs hover:bg-varena-espresso-dark transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{bindingBank ? 'Memverifikasi...' : 'Simpan & Kunci Rekening'}</span>
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Section: Withdrawal Form (Uses Bound Bank Automatically) */}
          <div className="bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-4">
            <h2 className="font-serif text-base font-bold text-varena-espresso flex items-center gap-2">
              <Wallet className="w-4 h-4 text-varena-gold" />
              <span>Tarik Saldo ke Rekening</span>
            </h2>

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

            {isBankBound ? (
              <form onSubmit={handleRequestPayout} className="space-y-3.5 text-xs">
                {/* Destination Bank Display (Read-Only) */}
                <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-stone-500 block uppercase font-bold">Rekening Tujuan Terikat:</span>
                    <span className="font-semibold text-stone-900">
                      {wallet.bankInfo.bankName} - {wallet.bankInfo.bankAccountNumber.slice(0, 4)}••••{wallet.bankInfo.bankAccountNumber.slice(-3)}
                    </span>
                    <span className="text-[10px] text-stone-600 block">
                      a.n. {wallet.bankInfo.bankAccountHolder}
                    </span>
                  </div>
                  <Lock className="w-4 h-4 text-emerald-600" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-varena-espresso">Nominal Penarikan (Rp) *</label>
                    <span className="text-[10px] text-stone-500 font-mono">
                      Maks: Rp{(wallet?.availableBalance || 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <input
                    type="number"
                    min="50000"
                    max={wallet?.availableBalance || 0}
                    step="10000"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Minimal Rp50.000"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold font-mono text-sm"
                  />
                </div>

                {/* Quick Selection Buttons */}
                <div className="flex items-center gap-2">
                  {[50000, 100000, 250000, 500000].map((quickVal) => (
                    <button
                      key={quickVal}
                      type="button"
                      onClick={() => setAmount(String(quickVal))}
                      disabled={(wallet?.availableBalance || 0) < quickVal}
                      className="px-2.5 py-1 text-[10px] font-medium rounded border border-stone-300 hover:border-varena-gold hover:text-varena-gold transition disabled:opacity-40 disabled:hover:border-stone-300 disabled:hover:text-inherit"
                    >
                      {(quickVal / 1000).toLocaleString('id-ID')}k
                    </button>
                  ))}
                  {wallet?.availableBalance >= 50000 && (
                    <button
                      type="button"
                      onClick={() => setAmount(String(wallet.availableBalance))}
                      className="px-2.5 py-1 text-[10px] font-bold rounded border border-varena-gold bg-varena-gold/10 text-varena-espresso hover:bg-varena-gold/20 transition"
                    >
                      Tarik Semua
                    </button>
                  )}
                </div>

                <div className="text-[10px] text-stone-500 pt-1 border-t border-stone-100 flex items-center justify-between">
                  <span>Biaya transfer antar bank:</span>
                  <span className="font-mono font-semibold text-stone-700">Rp5.000 (otomatis dipotong)</span>
                </div>

                <button
                  type="submit"
                  disabled={submitting || (wallet?.availableBalance || 0) < 50000 || !amount || parseInt(amount, 10) < 50000}
                  className="w-full py-3 rounded-lg bg-varena-espresso text-varena-gold-light font-semibold text-xs hover:bg-varena-espresso-dark transition disabled:opacity-50 flex items-center justify-center gap-2 shadow"
                >
                  <Wallet className="w-4 h-4" />
                  <span>{submitting ? 'Memproses Penarikan...' : 'Kirim Permohonan Penarikan'}</span>
                </button>
              </form>
            ) : (
              <div className="p-4 rounded-xl bg-stone-50 border border-dashed border-stone-300 text-center space-y-2">
                <Lock className="w-6 h-6 text-stone-400 mx-auto" />
                <p className="text-xs text-stone-600 font-medium">
                  Penarikan dana dinonaktifkan sementara.
                </p>
                <p className="text-[11px] text-stone-500">
                  Silakan simpan & ikat rekening bank Anda pada formulir di atas terlebih dahulu untuk membuka fitur penarikan saldo.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Ledger Statement & Withdrawal Tracking */}
        <div className="md:col-span-7 space-y-6">
          {/* Withdrawal Requests Tracking */}
          {wallet?.withdrawals && wallet.withdrawals.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg font-bold text-varena-espresso flex items-center gap-2">
                  <ArrowDownRight className="w-5 h-5 text-varena-gold" />
                  <span>Riwayat Penarikan Dana (Payout)</span>
                </h2>
                <span className="text-xs text-varena-taupe font-mono">
                  {wallet.withdrawals.length} riwayat
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-varena-ivory-light text-varena-taupe uppercase font-semibold border-b border-varena-taupe/20">
                    <tr>
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">Nominal Bersih</th>
                      <th className="py-2.5 px-3">Rekening Tujuan</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">No. Ref Bank</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-varena-taupe/10">
                    {wallet.withdrawals.map((w: any) => (
                      <tr key={w.id} className="hover:bg-varena-ivory-light/40">
                        <td className="py-2.5 px-3 text-varena-taupe whitespace-nowrap">
                          {new Date(w.requestedAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-varena-espresso whitespace-nowrap">
                          <div>Rp{w.netAmount.toLocaleString('id-ID')}</div>
                          <div className="text-[10px] text-varena-taupe font-normal">
                            Bruto: Rp{w.amount.toLocaleString('id-ID')} (Fee: Rp{w.fee.toLocaleString('id-ID')})
                          </div>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="font-medium text-varena-espresso">{w.bankName}</div>
                          <div className="font-mono text-[10px] text-varena-taupe">{w.accountNumberMasked}</div>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              w.status === 'PAID' || w.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : w.status === 'REQUESTED' || w.status === 'UNDER_REVIEW'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {w.status === 'REQUESTED'
                              ? 'Menunggu Review Finance'
                              : w.status === 'APPROVED' || w.status === 'PAID'
                              ? 'Selesai Dicairkan'
                              : w.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-[10px] text-varena-taupe whitespace-nowrap">
                          {w.providerReference || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Ledger Statement Table */}
          <div className="bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-4">
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
    </div>
  );
}
