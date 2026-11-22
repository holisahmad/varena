'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Pagination from '@/components/ui/Pagination';
import { useNotifications } from '@/contexts/NotificationContext';
import { formatPayoutStatus, formatReferenceType, formatLedgerMemo } from '@/lib/formatters';
import { compressImageToWebP } from '@/lib/image-compression';
import { calculatePayoutFees, PAYOUT_CONFIG } from '@/config/payout';
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
  Clock,
  Copy,
  Check,
  X,
  RotateCcw,
} from 'lucide-react';

export default function MemberWalletPage() {
  const router = useRouter();
  const { ackWallet } = useNotifications();
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
  const [showWithdrawConfirmModal, setShowWithdrawConfirmModal] = useState(false);
  const [showCancelDepositConfirmModal, setShowCancelDepositConfirmModal] = useState(false);
  const [uniqueCodeBalance, setUniqueCodeBalance] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Pagination states
  const [withdrawalPage, setWithdrawalPage] = useState(1);
  const [statementPage, setStatementPage] = useState(1);
  const WITHDRAWALS_PER_PAGE = 5;
  const STATEMENTS_PER_PAGE = 10;

  // Shopping Deposit state
  const [shoppingDeposit, setShoppingDeposit] = useState<any>(null);
  const [shopDepositStep, setShopDepositStep] = useState<1 | 2>(1);
  const [shopDepositModalOpen, setShopDepositModalOpen] = useState(false);
  const [shopDepositAmount, setShopDepositAmount] = useState('500000');
  const [depositBankMode, setDepositBankMode] = useState<'SAVED' | 'MANUAL'>('SAVED');
  const [shopDepositBankName, setShopDepositBankName] = useState('');
  const [shopDepositAccountNumber, setShopDepositAccountNumber] = useState('');
  const [shopDepositNotes, setShopDepositNotes] = useState('');
  const [shopDepositSubmitting, setShopDepositSubmitting] = useState(false);
  const [shopDepositResult, setShopDepositResult] = useState<any>(null);
  const [shopDepositProofUrl, setShopDepositProofUrl] = useState('');
  const [shopDepositUploadingProof, setShopDepositUploadingProof] = useState(false);
  const [depositConfirmed, setDepositConfirmed] = useState(false);
  const [shopDepositConfirming, setShopDepositConfirming] = useState(false);
  const [shopDepositCancelling, setShopDepositCancelling] = useState(false);
  const [depositTimeLeft, setDepositTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
    expired: boolean;
  } | null>(null);

  // Copy state & helper
  const [copiedBank, setCopiedBank] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);

  const copyAccountNumber = (accountNum: string) => {
    navigator.clipboard?.writeText(accountNum.replace(/\s+/g, ''));
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2000);
  };

  const copyAmount = (amount: number | string) => {
    navigator.clipboard?.writeText(String(amount));
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2000);
  };

  // 1-hour countdown timer for deposit transfer
  useEffect(() => {
    if (!shopDepositResult || shopDepositStep !== 2) {
      setDepositTimeLeft(null);
      return;
    }

    const createdTime = new Date(shopDepositResult.createdAt || Date.now()).getTime();
    const expiryTime = createdTime + 1 * 60 * 60 * 1000;

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiryTime - now) / 1000));
      if (diff <= 0) {
        setDepositTimeLeft({ hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, expired: true });
      } else {
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;
        setDepositTimeLeft({ hours, minutes, seconds, totalSeconds: diff, expired: false });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [shopDepositResult, shopDepositStep]);

  // Ref untuk menyimpan memberCode agar loadWallet bisa dipanggil ulang tanpa merusak closure
  const memberCodeRef = useRef<string>('VRN-0001');

  useEffect(() => {
    const stored = localStorage.getItem('varena_user');
    if (!stored) {
      router.push('/login');
      return;
    }
    const parsed = JSON.parse(stored);
    setUser(parsed);
    setBindAccountHolder(parsed.displayName || parsed.legalName || '');
    memberCodeRef.current = parsed.memberCode || 'VRN-0001';
    // Initial load — tampilkan loading hanya jika belum ada data
    loadWallet(memberCodeRef.current, true);
    // ackWallet dipanggil sekali saat mount, tidak perlu masuk dependency array
    ackWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  /**
   * loadWallet — Stale-While-Revalidate pattern
   * isInitial=true  → tampilkan skeleton hanya jika wallet masih null (pertama kali buka)
   * isInitial=false → silent background refresh, tabel TIDAK unmount/flicker
   */
  const loadWallet = (code: string, isInitial = false) => {
    if (isInitial && !wallet) setLoading(true);
    fetch(`/api/v1/wallet?memberCode=${code}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.wallet) {
          setWallet(data.wallet);
          if (data.wallet.bankInfo?.displayName || data.wallet.bankInfo?.legalName) {
            setBindAccountHolder(data.wallet.bankInfo.legalName || data.wallet.bankInfo.displayName);
          }
          if (data.wallet.bankInfo?.bankName) {
            setShopDepositBankName((prev) => prev || data.wallet.bankInfo.bankName);
            setShopDepositAccountNumber((prev) => prev || data.wallet.bankInfo.bankAccountNumber);
          }
        }
        // Also fetch uniqueCodeBalance from member profile
        const memberCode = code;
        fetch(`/api/v1/member/profile?memberCode=${memberCode}`)
          .then((r) => r.json())
          .then((p) => { if (p.member) setUniqueCodeBalance(p.member.uniqueCodeBalance || 0); })
          .catch(() => {});
        // Also fetch shopping deposit balance
        fetch(`/api/v1/member/deposit?memberCode=${code}`)
          .then((r) => r.json())
          .then((d) => { if (d.balance !== undefined) setShoppingDeposit(d); })
          .catch(() => {});
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

  const handleOpenWithdrawConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!isBankBound) {
      setErrorMsg('Harap simpan dan kunci rekening bank Anda terlebih dahulu.');
      return;
    }
    const val = parseInt(amount, 10);
    if (!val || val < 50000) {
      setErrorMsg('Nominal penarikan minimal Rp50.000.');
      return;
    }
    if (val > totalWithdrawable) {
      setErrorMsg(`Nominal melebihi saldo yang dapat ditarik (maks Rp${totalWithdrawable.toLocaleString('id-ID')}).`);
      return;
    }
    setShowWithdrawConfirmModal(true);
  };

  const handleExecutePayout = async () => {
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
      setShowWithdrawConfirmModal(false);
      loadWallet(user.memberCode || 'VRN-0001');
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengajukan penarikan dana.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleShopDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setShopDepositSubmitting(true);
    setErrorMsg('');
    try {
      const activeBank =
        depositBankMode === 'SAVED' && wallet?.bankInfo?.bankName
          ? wallet.bankInfo.bankName
          : shopDepositBankName;
      const activeAcc =
        depositBankMode === 'SAVED' && wallet?.bankInfo?.bankAccountNumber
          ? wallet.bankInfo.bankAccountNumber
          : shopDepositAccountNumber;

      const res = await fetch('/api/v1/member/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberCode: user.memberCode,
          amount: shopDepositAmount,
          bankName: activeBank,
          accountNumber: activeAcc,
          notes: shopDepositNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShopDepositResult(data);
        setDepositConfirmed(false);
        setShopDepositStep(2);
      } else {
        setErrorMsg(data.error || 'Gagal mengajukan top up saldo belanja.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setShopDepositSubmitting(false);
    }
  };

  const handleShopDepositProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !shopDepositResult?.transactionId) return;
    setShopDepositUploadingProof(true);
    try {
      // Auto kompresi client-side ke WebP (memotong ukuran foto HP dari ~4MB ke ~50KB)
      const compressed = await compressImageToWebP(file, { maxWidth: 1000, quality: 0.82 });

      const formData = new FormData();
      formData.append('file', compressed.file);
      formData.append('transactionId', shopDepositResult.transactionId);
      formData.append('memberCode', user.memberCode);
      const res = await fetch('/api/v1/agent/deposit/proof', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setShopDepositProofUrl(data.proofUrl);
        setSuccessMsg(`Bukti transfer berhasil dikompresi WebP & diunggah (${compressed.compressionRatio})!`);
      } else {
        setErrorMsg(data.error || 'Gagal upload bukti.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal upload bukti transfer.');
    } finally {
      setShopDepositUploadingProof(false);
    }
  };

  const handleConfirmShopDeposit = async () => {
    if (!shopDepositResult?.transactionId || !user) return;
    setShopDepositConfirming(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/v1/member/deposit/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: shopDepositResult.transactionId,
          memberCode: user.memberCode,
          proofUrl: shopDepositProofUrl || null,
          notes: shopDepositNotes || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDepositConfirmed(true);
        setSuccessMsg(data.message || 'Konfirmasi pembayaran berhasil dikirim!');
        loadWallet(user.memberCode);
      } else {
        setErrorMsg(data.error || 'Gagal mengirim konfirmasi deposit.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setShopDepositConfirming(false);
    }
  };

  const handleCancelShopDeposit = async () => {
    if (!shopDepositResult?.transactionId || !user) return;
    setShopDepositCancelling(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/v1/member/deposit/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: shopDepositResult.transactionId,
          memberCode: user.memberCode,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCancelDepositConfirmModal(false);
        setShopDepositModalOpen(false);
        setShopDepositStep(1);
        setShopDepositResult(null);
        setShopDepositProofUrl('');
        setDepositConfirmed(false);
        setSuccessMsg('Permintaan deposit berhasil dibatalkan.');
        loadWallet(user.memberCode);
      } else {
        setErrorMsg(data.error || 'Gagal membatalkan deposit.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setShopDepositCancelling(false);
    }
  };

  if (!user) return null;

  const isBankBound = Boolean(wallet?.bankInfo?.isBankLocked && wallet?.bankInfo?.bankAccountNumber);
  const registeredName = wallet?.bankInfo?.legalName || wallet?.bankInfo?.displayName || user.displayName;

  const bonusBalance = wallet?.availableBalance || 0;
  const eligibleUniqueCode = uniqueCodeBalance >= 10000 ? Math.floor(uniqueCodeBalance / 1000) * 1000 : 0;
  const remainingUniqueCode = uniqueCodeBalance - eligibleUniqueCode;
  const totalWithdrawable = bonusBalance + eligibleUniqueCode;
  const enteredAmount = parseInt(amount, 10) || 0;
  const payoutFees = calculatePayoutFees(enteredAmount);
  const netEstimated = payoutFees.netAmount;

  const paginatedWithdrawals = (wallet?.withdrawals || []).slice(
    (withdrawalPage - 1) * WITHDRAWALS_PER_PAGE,
    withdrawalPage * WITHDRAWALS_PER_PAGE
  );
  const withdrawalTotalPages = Math.ceil((wallet?.withdrawals?.length || 0) / WITHDRAWALS_PER_PAGE) || 1;

  const paginatedStatements = (wallet?.statement || []).slice(
    (statementPage - 1) * STATEMENTS_PER_PAGE,
    statementPage * STATEMENTS_PER_PAGE
  );
  const statementTotalPages = Math.ceil((wallet?.statement?.length || 0) / STATEMENTS_PER_PAGE) || 1;

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

                <form onSubmit={handleBindBankAccount} className="space-y-3" suppressHydrationWarning>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-varena-espresso mb-1">Pilih Bank *</label>
                      <select
                        value={bindBankName}
                        suppressHydrationWarning
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
                        suppressHydrationWarning
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
                      suppressHydrationWarning
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
                    suppressHydrationWarning
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
              <form onSubmit={handleOpenWithdrawConfirm} className="space-y-3.5 text-xs" suppressHydrationWarning>
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

                {/* Saldo Breakdown */}
                <div className="p-3.5 rounded-xl bg-varena-ivory-light border border-varena-taupe/20 space-y-2 text-xs">
                  <div className="font-semibold text-varena-espresso text-[11px] uppercase tracking-wide">Rincian Saldo Dapat Ditarik</div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-stone-600">Saldo Bonus Komisi:</span>
                    <span className="font-mono font-semibold text-varena-espresso">Rp{bonusBalance.toLocaleString('id-ID')}</span>
                  </div>

                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-stone-600">Kode Unik Terkumpul:</span>
                      <div className="text-[10px] text-stone-500 font-mono">Total: Rp{uniqueCodeBalance.toLocaleString('id-ID')}</div>
                    </div>
                    <div className="text-right">
                      <span className={`font-mono font-semibold ${uniqueCodeBalance >= 10000 ? 'text-emerald-700' : 'text-stone-400'}`}>
                        Eligible: Rp{eligibleUniqueCode.toLocaleString('id-ID')}
                      </span>
                      {uniqueCodeBalance >= 10000 ? (
                        <div className="text-[10px] text-stone-500">
                          {remainingUniqueCode > 0 ? `Sisa Rp${remainingUniqueCode.toLocaleString('id-ID')} tersimpan di akun` : 'Kelipatan Rp1.000'}
                        </div>
                      ) : (
                        <div className="text-[10px] text-stone-400">(min. Rp10.000 untuk dapat ditarik)</div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-varena-taupe/20 flex justify-between font-bold text-sm">
                    <span className="text-varena-espresso">Total Dapat Ditarik:</span>
                    <span className="font-mono text-varena-gold font-bold">
                      Rp{totalWithdrawable.toLocaleString('id-ID')}
                    </span>
                  </div>
                  {eligibleUniqueCode > 0 && (
                    <div className="text-[10px] text-emerald-700 font-medium">
                      ✓ Termasuk Rp{eligibleUniqueCode.toLocaleString('id-ID')} dari saldo kode unik (kelipatan Rp1.000)
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-varena-espresso">Nominal Penarikan (Rp) *</label>
                    <span className="text-[10px] text-stone-500 font-mono">
                      Maks: Rp{totalWithdrawable.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <input
                    type="number"
                    min="50000"
                    max={totalWithdrawable}
                    step="1000"
                    required
                    suppressHydrationWarning
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Minimal Rp50.000 (kelipatan Rp1.000)"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold font-mono text-sm"
                  />
                </div>

                {/* Quick Selection Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {[50000, 60000, 100000, 250000].map((quickVal) => (
                    <button
                      key={quickVal}
                      type="button"
                      onClick={() => setAmount(String(quickVal))}
                      disabled={totalWithdrawable < quickVal}
                      className="px-2.5 py-1 text-[10px] font-medium rounded border border-stone-300 hover:border-varena-gold hover:text-varena-gold transition disabled:opacity-40 disabled:hover:border-stone-300 disabled:hover:text-inherit"
                    >
                      {(quickVal / 1000).toLocaleString('id-ID')}k
                    </button>
                  ))}
                  {totalWithdrawable >= 50000 && (
                    <button
                      type="button"
                      onClick={() => setAmount(String(totalWithdrawable))}
                      className="px-2.5 py-1 text-[10px] font-bold rounded border border-varena-gold bg-varena-gold/10 text-varena-espresso hover:bg-varena-gold/20 transition"
                    >
                      Tarik Semua (Rp{totalWithdrawable.toLocaleString('id-ID')})
                    </button>
                  )}
                </div>

                {/* Real-time Net Transfer Calculation Preview */}
                {enteredAmount >= 50000 && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-2">
                    <div className="flex justify-between items-center font-bold">
                      <span>Total Masuk Rekening Bank:</span>
                      <span className="font-mono text-base text-emerald-800 font-extrabold">
                        Rp{payoutFees.netAmount.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="space-y-1 pt-1.5 border-t border-emerald-200/80 text-[11px] text-emerald-900 font-mono">
                      <div className="flex justify-between">
                        <span>Nominal Penarikan:</span>
                        <span>Rp{enteredAmount.toLocaleString('id-ID')}</span>
                      </div>
                      {payoutFees.scheme === 'GATEWAY' ? (
                        <>
                          <div className="flex justify-between text-stone-600">
                            <span>Biaya Admin ({payoutFees.adminFeePercent}%):</span>
                            <span className="text-rose-700">-Rp{payoutFees.adminFee.toLocaleString('id-ID')}</span>
                          </div>
                          <div className="flex justify-between text-stone-600">
                            <span>Biaya Transfer Bank:</span>
                            <span className="text-rose-700">-Rp{payoutFees.transferFee.toLocaleString('id-ID')}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between text-stone-600">
                          <span>Biaya Admin Transfer:</span>
                          <span className="text-rose-700">-Rp{payoutFees.totalFee.toLocaleString('id-ID')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="text-[10px] text-stone-500 pt-1 border-t border-stone-100 flex items-center justify-between">
                  <span>Kebijakan Potongan:</span>
                  <span className="font-mono font-semibold text-stone-700">
                    {payoutFees.scheme === 'GATEWAY'
                      ? 'Admin 10% + Biaya Transfer Rp5.000'
                      : 'Biaya transfer antar bank: Rp6.500 (otomatis dipotong)'}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={submitting || totalWithdrawable < 50000 || !amount || enteredAmount < 50000 || enteredAmount > totalWithdrawable}
                  className="w-full py-3 rounded-lg bg-varena-espresso text-varena-gold-light font-semibold text-xs hover:bg-varena-espresso-dark transition disabled:opacity-50 flex items-center justify-center gap-2 shadow cursor-pointer"
                >
                  <Wallet className="w-4 h-4" />
                  <span>{`Lanjut ke Konfirmasi Penarikan ${enteredAmount >= 50000 ? `(Rp${enteredAmount.toLocaleString('id-ID')})` : ''}`}</span>
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

          {/* Shopping Deposit Card */}
          <div className="bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-500" />
                <div>
                  <h2 className="font-serif text-base font-bold text-varena-espresso">Saldo Deposit Belanja</h2>
                  <p className="text-[11px] text-varena-taupe">Gunakan untuk pembayaran pembelian produk VARENA</p>
                </div>
              </div>
              <button
                onClick={() => { setShopDepositModalOpen(true); setShopDepositStep(1); setShopDepositResult(null); setShopDepositProofUrl(''); }}
                className="px-4 py-2 rounded-xl bg-varena-espresso text-varena-gold font-bold text-xs hover:bg-varena-espresso-dark transition"
              >
                + Top Up Saldo Belanja
              </button>
            </div>

            {/* Saldo Aktif & Status Pending */}
            {(() => {
              const pendingList = shoppingDeposit?.transactions?.filter(
                (t: any) => t.status === 'PENDING' && t.type === 'SHOPPING_TOPUP'
              ) || [];
              const pendingTotal = pendingList.reduce(
                (sum: number, t: any) => sum + (t.amount || 0),
                0
              );

              return (
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl border border-blue-200 space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="text-[11px] text-blue-600 font-semibold uppercase tracking-widest mb-1">
                        Saldo Aktif (Siap Belanja)
                      </div>
                      <div className="text-2xl font-bold font-mono text-blue-900">
                        Rp{(shoppingDeposit?.balance || 0).toLocaleString('id-ID')}
                      </div>
                    </div>
                    {pendingTotal > 0 && (
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                          <span>Menunggu Approval Admin</span>
                        </span>
                        <div className="text-sm font-bold font-mono text-amber-800 mt-0.5">
                          +Rp{pendingTotal.toLocaleString('id-ID')}
                        </div>
                      </div>
                    )}
                  </div>

                  {pendingTotal > 0 && (
                    <div className="p-2.5 rounded-lg bg-amber-50/90 border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                      ⏳ <strong>Konfirmasi Keuangan:</strong> Pengajuan top-up Anda sebesar <strong>Rp{pendingTotal.toLocaleString('id-ID')}</strong> sedang dalam antrean verifikasi mutasi bank oleh admin. Dana belum masuk ke Saldo Aktif dan akan otomatis bertambah setelah disetujui admin.
                    </div>
                  )}
                </div>
              );
            })()}

            {shoppingDeposit?.transactions && shoppingDeposit.transactions.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-stone-600 mb-2">Riwayat Deposit Belanja</h3>
                <div className="divide-y divide-stone-100">
                  {shoppingDeposit.transactions.slice(0, 10).map((tx: any) => {
                    const statusConfig: Record<string, { label: string; cls: string }> = {
                      COMPLETED:            { label: '✅ Disetujui',              cls: 'bg-emerald-100 text-emerald-800' },
                      PENDING:              { label: '⏳ Menunggu Admin',         cls: 'bg-amber-100 text-amber-800 border border-amber-300' },
                      PENDING_PAYMENT:      { label: '🕐 Menunggu Transfer (1 Jam)', cls: 'bg-sky-100 text-sky-800 border border-sky-300' },
                      WAITING_VERIFICATION: { label: '🔍 Sedang Diverifikasi',   cls: 'bg-blue-100 text-blue-800 border border-blue-300' },
                      REJECTED:             { label: '❌ Ditolak',               cls: 'bg-rose-100 text-rose-800' },
                      EXPIRED:              { label: '⏰ Kedaluwarsa',            cls: 'bg-stone-100 text-stone-500' },
                      CANCELLED:            { label: '🚫 Dibatalkan',             cls: 'bg-stone-100 text-stone-500' },
                    };
                    const st = statusConfig[tx.status] || { label: tx.status, cls: 'bg-stone-100 text-stone-600' };
                    const canResubmit = tx.status === 'EXPIRED' || tx.status === 'CANCELLED';
                    return (
                      <div key={tx.id} className="py-2.5 flex items-start justify-between gap-2 text-xs">
                        <div>
                          <div className="font-semibold text-stone-700">
                            {tx.type === 'SHOPPING_TOPUP' ? 'Top Up Saldo Belanja'
                              : tx.type === 'SHOPPING_PAYMENT' ? 'Pembayaran Belanja'
                              : tx.type}
                          </div>
                          <div className="text-[10px] text-stone-400 font-mono">{tx.referenceId}</div>
                          <div className="text-[10px] text-stone-400">
                            {new Date(tx.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <div className={`font-mono font-bold ${tx.type === 'SHOPPING_TOPUP' ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {tx.type === 'SHOPPING_TOPUP' ? '+' : '-'}Rp{(tx.amount || 0).toLocaleString('id-ID')}
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${st.cls}`}>
                            {st.label}
                          </span>
                          {canResubmit && (
                            <button
                              type="button"
                              onClick={() => {
                                setShopDepositAmount(String(tx.amount || 500000));
                                setShopDepositStep(1);
                                setShopDepositResult(null);
                                setShopDepositProofUrl('');
                                setDepositConfirmed(false);
                                setShopDepositModalOpen(true);
                              }}
                              className="mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-varena-espresso text-varena-gold hover:bg-varena-espresso-dark transition"
                            >
                              🔄 Ajukan Ulang
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

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
                <table className="w-full text-xs text-left min-w-[560px]">
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
                    {paginatedWithdrawals.map((w: any) => (
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
                            {formatPayoutStatus(w.status)}
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

              <div className="pt-2">
                <Pagination
                  currentPage={withdrawalPage}
                  totalPages={withdrawalTotalPages}
                  totalItems={wallet.withdrawals.length}
                  onPageChange={(p) => setWithdrawalPage(p)}
                />
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
              <>
                <div className="overflow-x-auto">
                <table className="w-full text-xs text-left min-w-[480px]">
                  <thead className="bg-varena-ivory-light text-varena-taupe uppercase font-semibold border-b border-varena-taupe/20">
                    <tr>
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">Deskripsi / Memo</th>
                      <th className="py-2.5 px-3">Tipe</th>
                      <th className="py-2.5 px-3 text-right">Nominal (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-varena-taupe/10">
                    {paginatedStatements.map((s: any) => {
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
                            <div className="font-semibold">{formatLedgerMemo(s.memo)}</div>
                            <div className="text-[10px] text-varena-taupe mt-0.5">{formatReferenceType(s.referenceType)}</div>
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

                <div className="pt-2">
                  <Pagination
                    currentPage={statementPage}
                    totalPages={statementTotalPages}
                    totalItems={wallet.statement.length}
                    onPageChange={(p) => setStatementPage(p)}
                  />
                </div>
              </>
            ) : (
              <div className="text-center py-16 text-xs text-varena-taupe bg-varena-ivory-light rounded-xl border border-dashed border-varena-taupe/30">
                Belum ada mutasi buku besar pada akun ini. Lakukan penjualan retail atau daftarkan mitra baru untuk menghasilkan komisi.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MODAL: TOP UP SALDO BELANJA ── */}
      {shopDepositModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl border border-blue-200 overflow-hidden max-h-[90vh] flex flex-col my-auto">
            <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
              <h3 className="font-serif text-lg font-bold text-varena-espresso flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-500" />
                <span>Top Up Saldo Deposit Belanja</span>
              </h3>
              <button
                onClick={() => { setShopDepositModalOpen(false); setShopDepositStep(1); setShopDepositResult(null); setShopDepositProofUrl(''); }}
                className="text-stone-400 hover:text-stone-700"
              >✕</button>
            </div>

            {/* Step indicator */}
            <div className="flex items-center px-6 pt-4 gap-3 text-xs font-semibold shrink-0">
              <div className={`flex items-center gap-1.5 ${shopDepositStep === 1 ? 'text-varena-espresso' : 'text-emerald-700'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${shopDepositStep === 1 ? 'bg-blue-500 text-white' : 'bg-emerald-600 text-white'}`}>
                  {shopDepositStep === 1 ? '1' : '✓'}
                </span>
                Isi Formulir
              </div>
              <div className="flex-1 h-px bg-stone-200" />
              <div className={`flex items-center gap-1.5 ${shopDepositStep === 2 ? 'text-varena-espresso' : 'text-stone-400'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${shopDepositStep === 2 ? 'bg-blue-500 text-white' : 'bg-stone-200 text-stone-500'}`}>
                  2
                </span>
                Transfer &amp; Bukti
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {shopDepositStep === 1 ? (
                <form onSubmit={handleShopDepositSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-stone-700 font-bold mb-1">Nominal Top Up (Rp) *</label>
                    <input
                      type="number"
                      min={50000}
                      step={10000}
                      required
                      value={shopDepositAmount}
                      onChange={(e) => setShopDepositAmount(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-stone-300 font-bold text-base text-varena-espresso outline-none focus:border-blue-500"
                    />
                    <p className="text-stone-400 mt-1">Minimal deposit Rp50.000</p>
                  </div>

                  {/* Rekening Pengirim (Default dari Setting atau Manual) */}
                  <div className="space-y-1.5">
                    <label className="block text-stone-700 font-bold">Rekening Bank Pengirim (Asal Transfer) *</label>

                    {wallet?.bankInfo?.bankName && depositBankMode === 'SAVED' ? (
                      <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/60 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase text-blue-700 tracking-wider">
                            ✓ Rekening Utama (Tersimpan di Setting)
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setDepositBankMode('MANUAL');
                              setShopDepositBankName('');
                              setShopDepositAccountNumber('');
                            }}
                            className="text-[11px] font-semibold text-blue-600 hover:underline"
                          >
                            Transfer dari Bank Lain →
                          </button>
                        </div>
                        <div className="font-bold text-sm text-stone-900">
                          Bank {wallet.bankInfo.bankName} - <span className="font-mono">{wallet.bankInfo.bankAccountNumber}</span>
                        </div>
                        <div className="text-[11px] text-stone-600">
                          a.n. <strong>{wallet.bankInfo.bankAccountHolder}</strong>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 p-3 rounded-xl bg-stone-50 border border-stone-200">
                        {wallet?.bankInfo?.bankName && (
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                setDepositBankMode('SAVED');
                                setShopDepositBankName(wallet.bankInfo.bankName);
                                setShopDepositAccountNumber(wallet.bankInfo.bankAccountNumber);
                              }}
                              className="text-[11px] font-bold text-blue-600 hover:underline"
                            >
                              ← Gunakan Rekening Utama Tersimpan
                            </button>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-stone-600 font-semibold mb-1">Nama Bank Pengirim *</label>
                            <input
                              type="text"
                              required
                              placeholder="BRI / BCA / Mandiri"
                              value={shopDepositBankName}
                              onChange={(e) => setShopDepositBankName(e.target.value)}
                              className="w-full p-2 rounded-lg border border-stone-300 outline-none focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-stone-600 font-semibold mb-1">No. Rekening Pengirim *</label>
                            <input
                              type="text"
                              required
                              placeholder="Nomor rekening Anda"
                              value={shopDepositAccountNumber}
                              onChange={(e) => setShopDepositAccountNumber(e.target.value.replace(/[^0-9]/g, ''))}
                              className="w-full p-2 rounded-lg border border-stone-300 font-mono outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-stone-600 font-semibold mb-1">Catatan Tambahan (Opsional):</label>
                    <input
                      type="text"
                      placeholder="Contoh: Top up saldo belanja untuk pesanan mitra"
                      value={shopDepositNotes}
                      onChange={(e) => setShopDepositNotes(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-stone-300 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-800 leading-relaxed">
                    <strong>Transfer ke:</strong> BRI <span className="font-mono font-bold">3065 0102 4471 539</span> a.n. <strong>Sunariyo</strong>.<br />
                    Kode unik 3-digit akan digenerate otomatis di langkah berikutnya — pastikan transfer dengan nominal tepat.
                  </div>

                  <div className="pt-1 flex justify-end gap-2 border-t border-stone-100">
                    <button
                      type="button"
                      onClick={() => setShopDepositModalOpen(false)}
                      className="py-2 px-4 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={shopDepositSubmitting}
                      className="py-2 px-5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {shopDepositSubmitting ? 'Memproses...' : 'Lanjut ke Instruksi Transfer →'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4 text-xs">
                  {/* 1-Hour Countdown Timer */}
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-amber-900">
                      <Clock className="w-4 h-4 text-amber-600 animate-pulse flex-shrink-0" />
                      <div className="text-left">
                        <div className="font-bold text-[11px] uppercase tracking-wide">Batas Waktu Transfer (1 Jam)</div>
                        <div className="text-[10px] text-amber-700">Harap transfer & konfirmasi sebelum waktu habis.</div>
                      </div>
                    </div>
                    <div className="font-mono font-bold text-amber-900 text-sm bg-white px-2.5 py-1 rounded-lg border border-amber-300 shadow-2xs">
                      {depositTimeLeft ? (
                        `${String(depositTimeLeft.hours).padStart(2, '0')}:${String(depositTimeLeft.minutes).padStart(2, '0')}:${String(depositTimeLeft.seconds).padStart(2, '0')}`
                      ) : (
                        '01:00:00'
                      )}
                    </div>
                  </div>

                  {/* Transfer instruction card */}
                  <div className="rounded-2xl bg-blue-900 text-white p-5 space-y-3 shadow-md">
                    <div className="text-blue-300 font-semibold text-[11px] uppercase tracking-widest">
                      Instruksi Pembayaran Transfer
                    </div>
                    <div className="text-center">
                      <div className="text-blue-200 text-[11px] mb-1">Transfer TEPAT sejumlah:</div>
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-3xl font-bold font-mono tracking-tight text-white">
                          Rp{(shopDepositResult?.transferTotal || 0).toLocaleString('id-ID')}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyAmount(shopDepositResult?.transferTotal || 0)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-950 bg-white hover:bg-blue-50 px-2.5 py-1 rounded-lg transition shadow-xs cursor-pointer"
                          title="Salin Angka Nominal Transfer"
                        >
                          {copiedAmount ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700 font-bold">Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-blue-900" />
                              <span>Salin</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="text-blue-200 text-[10px] mt-1">
                        (Rp{Number(shopDepositAmount).toLocaleString('id-ID')} + kode unik verifikasi Rp{shopDepositResult?.uniqueCode})
                      </div>
                    </div>
                    <div className="border-t border-white/15 pt-3 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-white/70">Bank Tujuan:</span>
                        <span className="font-bold">BRI (Bank Rakyat Indonesia)</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/70">Nomor Rekening:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm tracking-wide">3065 0102 4471 539</span>
                          <button
                            type="button"
                            onClick={() => copyAccountNumber('306501024471539')}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-950 bg-blue-100 hover:bg-white px-2 py-0.5 rounded transition cursor-pointer"
                            title="Salin Nomor Rekening"
                          >
                            {copiedBank ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-700 font-bold">Tersalin</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-blue-900" />
                                <span>Salin</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/70">Atas Nama:</span>
                        <span className="font-bold">Sunariyo</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/70">Kode Unik:</span>
                        <span className="font-mono font-bold text-yellow-300">+Rp{shopDepositResult?.uniqueCode}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/70">ID Referensi:</span>
                        <span className="font-mono text-[10px] text-blue-200">{shopDepositResult?.referenceId}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-[11px] leading-relaxed">
                    ⚠️ <strong>PENTING:</strong> Pastikan nominal transfer <strong>persis sama</strong> hingga 3 digit kode unik terakhir agar admin dapat memverifikasi dana Anda dengan cepat.
                  </div>

                  {/* Proof upload */}
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1.5">
                      Unggah Bukti Transfer (Opsional / Dianjurkan):
                    </label>
                    {shopDepositProofUrl ? (
                      <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700 font-semibold">Bukti berhasil diunggah!</span>
                      </div>
                    ) : (
                      <label
                        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-4 cursor-pointer transition ${
                          shopDepositUploadingProof
                            ? 'border-stone-200 bg-stone-50'
                            : 'border-blue-300 hover:border-blue-500 bg-blue-50/40'
                        }`}
                      >
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          disabled={shopDepositUploadingProof}
                          onChange={handleShopDepositProofUpload}
                        />
                        {shopDepositUploadingProof ? (
                          <span className="text-stone-500">Mengunggah...</span>
                        ) : (
                          <>
                            <Info className="w-5 h-5 text-blue-500 mb-1" />
                            <span className="text-stone-600 font-semibold text-xs">Pilih file struk / screenshot transfer</span>
                            <span className="text-stone-400 text-[10px] mt-0.5">JPG / PNG / PDF — maks 5MB</span>
                          </>
                        )}
                      </label>
                    )}
                  </div>

                  {/* Tombol Konfirmasi Sudah Bayar oleh Mitra */}
                  <div className="pt-2">
                    {depositConfirmed ? (
                      <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-1.5">
                        <div className="font-bold flex items-center gap-1.5 text-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Konfirmasi Pembayaran Berhasil Dikirim!</span>
                        </div>
                        {shopDepositProofUrl ? (
                          <p className="text-[11px] text-emerald-700 leading-relaxed">
                            ✓ <strong>Bukti Transfer Terlampir:</strong> Bukti foto transfer Anda telah tercatat. Tim Keuangan akan segera memverifikasi dan menyetujui penambahan saldo deposit Anda.
                          </p>
                        ) : (
                          <p className="text-[11px] text-amber-800 leading-relaxed bg-amber-50 p-2 rounded border border-amber-200">
                            ⚠ <strong>Konfirmasi Tanpa Bukti Foto:</strong> Tim Keuangan akan mencocokkan mutasi bank rekening berdasarkan nominal <strong>Rp{(shopDepositResult?.transferTotal || 0).toLocaleString('id-ID')}</strong> (termasuk kode unik <strong>+Rp{shopDepositResult?.uniqueCode}</strong>). Saldo akan otomatis bertambah setelah mutasi diverifikasi.
                          </p>
                        )}
                        <div className="text-[10px] text-stone-500 pt-1">
                          Status: <span className="font-bold text-blue-700">MENUNGGU VERIFIKASI ADMIN</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {depositTimeLeft?.expired ? (
                          /* Expired — tawari topup baru */
                          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-2">
                            <div className="font-bold flex items-center gap-1.5 text-xs">
                              <AlertCircle className="w-4 h-4 text-rose-500" />
                              <span>Batas Waktu Transfer Kedaluwarsa</span>
                            </div>
                            <p className="text-[11px] text-rose-700">
                              Waktu 1 jam untuk melakukan transfer telah habis. Ajukan permintaan deposit baru.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setShopDepositStep(1);
                                setShopDepositResult(null);
                                setShopDepositProofUrl('');
                                setDepositConfirmed(false);
                              }}
                              className="w-full py-2.5 px-4 rounded-xl bg-varena-espresso text-varena-gold font-bold text-xs transition hover:bg-varena-espresso-dark flex items-center justify-center gap-2"
                            >
                              🔄 Ajukan Topup Baru (Nominal Sama)
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={shopDepositConfirming}
                            onClick={handleConfirmShopDeposit}
                            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-md active:scale-[0.99] disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>
                              {shopDepositConfirming
                                ? 'Mengirim Konfirmasi...'
                                : '✓ Saya Sudah Transfer (Konfirmasi Pembayaran)'}
                            </span>
                          </button>
                        )}
                        {/* Tombol Batalkan — hanya saat belum expired dan belum konfirmasi */}
                        {!depositTimeLeft?.expired && (
                          <button
                            type="button"
                            disabled={shopDepositCancelling || shopDepositConfirming}
                            onClick={() => setShowCancelDepositConfirmModal(true)}
                            className="w-full py-2 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs transition disabled:opacity-50"
                          >
                            {shopDepositCancelling ? 'Membatalkan...' : '✕ Batalkan Permintaan Deposit Ini'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex justify-between items-center gap-2 border-t border-stone-100">
                    <span className="text-stone-400 text-[11px]">ID Ref: {shopDepositResult?.referenceId}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setShopDepositModalOpen(false);
                        setShopDepositStep(1);
                        setShopDepositResult(null);
                        setShopDepositProofUrl('');
                        setDepositConfirmed(false);
                      }}
                      className="py-2 px-5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold transition text-xs"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* ── MODAL: KONFIRMASI PENARIKAN SALDO MITRA ── */}
      {showWithdrawConfirmModal && wallet?.bankInfo && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-stone-900 to-stone-800 text-white border-b border-stone-700">
              <div className="w-9 h-9 rounded-xl bg-varena-gold/20 border border-varena-gold/40 flex items-center justify-center flex-shrink-0 text-varena-gold">
                <Wallet className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-serif font-bold text-sm text-white">Konfirmasi Penarikan Saldo</p>
                <p className="text-[11px] text-stone-300">Review rincian transaksi sebelum diteruskan ke antrean Finance</p>
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowWithdrawConfirmModal(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg transition disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Rekening Tujuan Box */}
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-stone-500 font-semibold uppercase tracking-wider">
                  <span>Rekening Tujuan Terikat</span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="w-3 h-3" />
                    Terverifikasi
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-stone-900 text-sm">
                      {wallet.bankInfo.bankName} - {wallet.bankInfo.bankAccountNumber.slice(0, 4)}••••{wallet.bankInfo.bankAccountNumber.slice(-3)}
                    </div>
                    <div className="text-[11px] text-stone-600 mt-0.5">
                      a.n. <strong className="text-stone-900">{wallet.bankInfo.bankAccountHolder}</strong>
                    </div>
                  </div>
                  <Lock className="w-5 h-5 text-emerald-600" />
                </div>
              </div>

              {/* Rincian Finansial */}
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2.5">
                <div className="text-[11px] font-bold text-emerald-950 uppercase tracking-wide">
                  Rincian Penarikan &amp; Biaya
                </div>

                <div className="space-y-1.5 font-mono text-[11px] text-emerald-900">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-sans text-stone-700">Nominal Penarikan:</span>
                    <span className="font-bold text-stone-900">Rp{enteredAmount.toLocaleString('id-ID')}</span>
                  </div>

                  {payoutFees.scheme === 'GATEWAY' ? (
                    <>
                      <div className="flex justify-between items-center text-rose-700">
                        <span className="font-sans">Biaya Layanan Admin ({payoutFees.adminFeePercent}%):</span>
                        <span>-Rp{payoutFees.adminFee.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between items-center text-rose-700">
                        <span className="font-sans">Biaya Transfer Jaringan Bank:</span>
                        <span>-Rp{payoutFees.transferFee.toLocaleString('id-ID')}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between items-center text-rose-700">
                      <span className="font-sans">Biaya Admin Transfer Antar Bank:</span>
                      <span>-Rp{payoutFees.totalFee.toLocaleString('id-ID')}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-emerald-200 flex justify-between items-center font-bold text-xs sm:text-sm">
                    <span className="font-sans text-emerald-950">Total Masuk ke Rekening (Net):</span>
                    <span className="text-emerald-800 text-base font-extrabold">
                      Rp{payoutFees.netAmount.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notice Keamanan & Prosedur */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Setelah dikonfirmasi, saldo sebesar <strong>Rp{enteredAmount.toLocaleString('id-ID')}</strong> akan dialihkan ke status <em>Pending Hold</em> dan diverifikasi oleh Finance pusat (SOP Maker-Checker). Proses transfer tuntas dalam 1x24 jam hari kerja.
                </p>
              </div>

              {/* Error display */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowWithdrawConfirmModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 font-semibold text-xs transition disabled:opacity-50"
                >
                  Periksa Kembali
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleExecutePayout}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>Memproses Pengajuan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Ya, Ajukan Penarikan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: BATALKAN DEPOSIT BELANJA ── */}
      {showCancelDepositConfirmModal && shopDepositResult && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 px-5 py-4 bg-rose-50 border-b border-rose-100">
              <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0 text-rose-600">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-serif font-bold text-sm text-rose-950">Batalkan Permintaan Deposit</p>
                <p className="text-[11px] text-rose-700 font-mono truncate">ID: {shopDepositResult.transactionId}</p>
              </div>
              <button
                type="button"
                disabled={shopDepositCancelling}
                onClick={() => setShowCancelDepositConfirmModal(false)}
                className="text-rose-400 hover:text-rose-700 p-1 rounded-lg transition disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
                <strong className="block mb-1 text-amber-950">Perhatian Sebelum Membatalkan:</strong>
                Permintaan deposit dengan kode unik ini akan dibatalkan. Jika Anda <strong>sudah melakukan transfer</strong> ke rekening pusat, mohon jangan dibatalkan dan segera upload bukti transfer Anda.
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  disabled={shopDepositCancelling}
                  onClick={() => setShowCancelDepositConfirmModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 font-semibold text-xs transition disabled:opacity-50"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  disabled={shopDepositCancelling}
                  onClick={handleCancelShopDeposit}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {shopDepositCancelling ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>Membatalkan...</span>
                    </>
                  ) : (
                    <>
                      <X className="w-3.5 h-3.5" />
                      <span>Ya, Batalkan Deposit</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
