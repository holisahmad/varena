'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  ShieldCheck,
  CreditCard,
  MapPin,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Save,
  Sparkles,
  Phone,
  Mail,
  Clock,
  ShieldAlert,
  ShieldOff,
  Ban,
  ShoppingBag,
  Eye,
  EyeOff,
  KeyRound,
  Check,
} from 'lucide-react';

const INDONESIA_BANKS = [
  'BCA',
  'Bank Mandiri',
  'BRI',
  'BNI',
  'BSI (Bank Syariah Indonesia)',
  'CIMB Niaga',
  'Bank Permata',
  'Bank Danamon',
  'Bank Mega',
  'BTPN / Jenius',
  'Bank Jago',
  'Seabank',
];

export default function MemberProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form states
  const [memberCode, setMemberCode] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [nik, setNik] = useState('');
  const [phone, setPhone] = useState('');

  // Bank states
  const [bankName, setBankName] = useState('BCA');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');
  const [isBankLocked, setIsBankLocked] = useState(false);
  const [lockBankCheckbox, setLockBankCheckbox] = useState(false);

  // Address states
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [addressDetail, setAddressDetail] = useState('');

  // Progress
  const [completionPercent, setCompletionPercent] = useState(50);

  // Status state
  const [memberStatus, setMemberStatus] = useState('ACTIVE');

  // Password states
  const [isInitialPasswordSetup, setIsInitialPasswordSetup] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState('');
  const [passwordErrorMessage, setPasswordErrorMessage] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('varena_user');
    if (!stored) {
      router.push('/login?redirect=/member/profile');
      return;
    }

    try {
      const u = JSON.parse(stored);
      fetchProfile(u.memberCode, u.userId || u.id);
    } catch {
      router.push('/login');
    }
  }, [router]);

  const fetchProfile = async (code?: string, uid?: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/member/profile?memberCode=${code || ''}&userId=${uid || ''}`);
      const data = await res.json();
      if (data.success && data.member) {
        const m = data.member;
        setMemberCode(m.memberCode || '');
        setEmail(m.email || '');
        setDisplayName(m.displayName || '');
        setLegalName(m.legalName || '');
        setNik(m.nik || '');
        setPhone(m.phone || '');
        setMemberStatus(m.memberStatus || 'PENDING');

        setBankName(m.bankName || 'BCA');
        setBankAccountNumber(m.bankAccountNumber || '');
        setBankAccountHolder(m.bankAccountHolder || '');
        setIsBankLocked(Boolean(m.isBankLocked));

        setRecipientName(m.recipientName || m.displayName || '');
        setRecipientPhone(m.recipientPhone || m.phone || '');
        setProvince(m.province || '');
        setCity(m.city || '');
        setDistrict(m.district || '');
        setPostalCode(m.postalCode || '');
        setAddressDetail(m.addressDetail || '');

        setCompletionPercent(m.completionPercent || 50);
        setIsInitialPasswordSetup(Boolean(m.isInitialPasswordSetup));
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setErrorMessage('');

    // WhatsApp phone validation
    const cleanPhone = (phone || '').trim().replace(/[\s-]/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      setErrorMessage('Nomor WhatsApp aktif wajib diisi minimal 9 digit.');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/v1/member/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberCode,
          displayName,
          legalName,
          nik,
          phone: cleanPhone,
          bankName,
          bankAccountNumber,
          bankAccountHolder,
          lockBank: lockBankCheckbox,
          recipientName: recipientName || displayName,
          recipientPhone: recipientPhone || cleanPhone,
          province,
          city,
          district,
          postalCode,
          addressDetail,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan data.');
      }

      setSaveSuccess(true);
      if (lockBankCheckbox) {
        setIsBankLocked(true);
        setLockBankCheckbox(false);
      }

      // Update local storage user display name, phone, and saved shipping address
      const stored = localStorage.getItem('varena_user');
      if (stored) {
        try {
          const u = JSON.parse(stored);
          u.displayName = displayName;
          u.phone = cleanPhone;
          u.recipientName = recipientName || displayName;
          u.recipientPhone = recipientPhone || cleanPhone;
          u.province = province;
          u.city = city;
          u.district = district;
          u.postalCode = postalCode;
          u.addressDetail = addressDetail;
          localStorage.setItem('varena_user', JSON.stringify(u));
        } catch { }
      }

      // Recalculate percent locally
      let steps = 1;
      if (cleanPhone) steps++;
      if (province && city && addressDetail) steps++;
      if (bankAccountNumber && bankAccountHolder) steps++;
      setCompletionPercent(Math.round((steps / 4) * 100));

      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordSuccessMessage('');
    setPasswordErrorMessage('');

    if (newPassword.length < 8) {
      setPasswordErrorMessage('Kata sandi baru minimal harus 8 karakter.');
      setPasswordSaving(false);
      return;
    }

    if (newPassword.length > 128) {
      setPasswordErrorMessage('Kata sandi baru maksimal 128 karakter.');
      setPasswordSaving(false);
      return;
    }

    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    if (!hasLetter || !hasNumber) {
      setPasswordErrorMessage('Kata sandi harus mengombinasikan huruf dan angka.');
      setPasswordSaving(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrorMessage('Konfirmasi kata sandi tidak cocok dengan kata sandi baru.');
      setPasswordSaving(false);
      return;
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('varena_token') : null;
      const res = await fetch('/api/v1/member/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          memberCode,
          currentPassword: isInitialPasswordSetup ? undefined : currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memperbarui kata sandi.');
      }

      setPasswordSuccessMessage(data.message || 'Kata sandi berhasil disimpan!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsInitialPasswordSetup(false);
      setTimeout(() => setPasswordSuccessMessage(''), 6000);
    } catch (err: any) {
      setPasswordErrorMessage(err.message);
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-sm text-varena-taupe">
        Memuat profil akun...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href="/member"
          className="inline-flex items-center gap-2 text-xs font-semibold text-varena-taupe-dark hover:text-varena-espresso transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Dashboard Member</span>
        </Link>
      </div>

      {/* Header banner */}
      <div className="bg-white border border-varena-taupe/20 rounded-2xl p-6 sm:p-8 shadow-xs mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-varena-espresso text-varena-gold flex items-center justify-center font-serif text-2xl font-bold shadow-sm">
              {displayName ? displayName.charAt(0).toUpperCase() : 'V'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-serif text-2xl font-bold text-varena-espresso">
                  {displayName || 'Pengaturan Akun'}
                </h1>
                <span className="font-mono text-xs font-bold bg-varena-gold/15 text-varena-espresso border border-varena-gold/40 px-2.5 py-0.5 rounded-full">
                  {memberCode}
                </span>
                {memberStatus === 'ACTIVE' && (
                  <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Mitra Aktif</span>
                  </span>
                )}
                {memberStatus === 'PENDING' && (
                  <span className="text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-600" />
                    <span>Menunggu Aktivasi</span>
                  </span>
                )}
                {memberStatus === 'SUSPENDED_WITHDRAWAL' && (
                  <span className="text-[11px] font-semibold bg-orange-50 text-orange-800 border border-orange-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Lock className="w-3 h-3 text-orange-600" />
                    <span>WD Dinonaktifkan</span>
                  </span>
                )}
                {(memberStatus === 'SUSPENDED_LOGIN' || memberStatus === 'SUSPENDED') && (
                  <span className="text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldOff className="w-3 h-3 text-rose-600" />
                    <span>Akun Ditangguhkan</span>
                  </span>
                )}
                {memberStatus === 'TERMINATED' && (
                  <span className="text-[11px] font-semibold bg-stone-100 text-stone-700 border border-stone-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Ban className="w-3 h-3 text-stone-500" />
                    <span>Nonaktif</span>
                  </span>
                )}
                <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>KYC Terverifikasi</span>
                </span>
              </div>
              <p className="text-xs text-varena-taupe mt-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-stone-400" />
                <span>{email}</span>
                <span className="text-stone-300">·</span>
                <span className="text-emerald-700 font-medium">Akun Gmail Terhubung</span>
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="sm:text-right bg-varena-ivory-light sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-varena-taupe/20">
            <div className="text-xs text-varena-taupe mb-1 font-medium">
              Kelengkapan Profil: <strong className="text-varena-espresso">{completionPercent}%</strong>
            </div>
            <div className="w-44 h-2.5 bg-stone-200 rounded-full overflow-hidden mx-auto sm:ml-auto">
              <div
                className="h-full bg-gradient-to-r from-varena-gold to-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${completionPercent}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Status Notices */}
      {memberStatus === 'PENDING' && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <div className="font-bold">Status Kemitraan: Menunggu Aktivasi</div>
              <div className="text-[11px] text-amber-800 mt-0.5">
                Kemitraan Anda akan aktif otomatis setelah pembelian Paket Perdana lunas.
              </div>
            </div>
          </div>
          <Link
            href={`/checkout?ref=${memberCode}&type=FIRST_PACK`}
            className="shrink-0 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-xs whitespace-nowrap"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Belanja Sekarang</span>
          </Link>
        </div>
      )}

      {memberStatus === 'SUSPENDED_WITHDRAWAL' && (
        <div className="mb-6 p-4 rounded-xl bg-orange-50 border border-orange-300 text-xs text-orange-900 flex items-start gap-3 shadow-xs">
          <Lock className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Fasilitas Tarik Dana Dinonaktifkan Sementara</div>
            <div className="text-[11px] text-orange-800 mt-0.5">
              Anda tetap dapat berbelanja dan menerima komisi. Penarikan dana ditangguhkan sementara oleh sistem. Hubungi admin VARENA untuk bantuan.
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {saveSuccess && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 flex items-center gap-3 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <div className="font-bold">Perubahan Berhasil Disimpan!</div>
            <div className="text-[11px] text-emerald-800">
              Data profil, nomor WhatsApp, alamat pengiriman, dan rekening bank Anda telah diperbarui dengan aman.
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Identitas Pribadi */}
        <div className="bg-white border border-varena-taupe/20 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-varena-taupe/15 pb-3">
            <User className="w-5 h-5 text-varena-gold" />
            <h2 className="font-serif text-base font-bold text-varena-espresso">
              1. Identitas Pribadi & Kontak
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-varena-espresso mb-1">
                Alamat Gmail Resmi (Terkunci)
              </label>
              <input
                type="email"
                disabled
                value={email}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-100 text-stone-500 cursor-not-allowed font-medium"
              />
              <p className="text-[10px] text-stone-400 mt-1">
                * Terverifikasi via Google OAuth untuk pengiriman faktur dan notifikasi resmi
              </p>
            </div>

            <div>
              <label className="block font-semibold text-varena-espresso mb-1">
                Nama Panggilan / Toko Mitra *
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ahmad Fauzi"
                className="w-full px-3.5 py-2.5 rounded-xl border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
              />
            </div>

            <div>
              <label className="block font-semibold text-varena-espresso mb-1">
                Nama Lengkap Sesuai KTP (KYC) *
              </label>
              <input
                type="text"
                required
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="Nama lengkap sesuai e-KTP resmi"
                className="w-full px-3.5 py-2.5 rounded-xl border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
              />
              <p className="text-[10px] text-stone-400 mt-1">
                * Wajib sesuai identitas KTP untuk validasi transfer komisi dan legalitas Permendag
              </p>
            </div>

            <div>
              <label className="block font-semibold text-varena-espresso mb-1">
                Nomor Induk Kependudukan (NIK KTP)
              </label>
              <input
                type="text"
                maxLength={16}
                value={nik}
                onChange={(e) => setNik(e.target.value.replace(/\D/g, ''))}
                placeholder="16 digit nomor e-KTP"
                className="w-full px-3.5 py-2.5 rounded-xl border border-varena-taupe/30 font-mono focus:outline-none focus:border-varena-gold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-varena-espresso mb-1">
                Nomor WhatsApp Aktif *
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="081234567890"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-varena-taupe/30 font-mono text-xs focus:outline-none focus:border-varena-gold"
                />
                <Phone className="w-4 h-4 text-emerald-600 absolute left-3 top-3" />
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 mt-1.5 text-[11px] text-emerald-800 leading-relaxed">
                💬 <strong>Catatan Penting:</strong> Pastikan nomor di atas terhubung dengan{' '}
                <strong>WhatsApp aktif</strong> untuk menerima konfirmasi status pesanan, pembaruan nomor resi kurir, dan pemberitahuan saldo komisi.
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Rekening Bank Penarikan Komisi */}
        <div className="bg-white border border-varena-taupe/20 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-varena-taupe/15 pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-varena-gold" />
              <h2 className="font-serif text-base font-bold text-varena-espresso">
                2. Rekening Bank Penarikan Komisi (Bound Bank)
              </h2>
            </div>
            {isBankLocked ? (
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-700" />
                <span>Rekening Terkunci</span>
              </span>
            ) : (
              <span className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Unlock className="w-3 h-3 text-amber-600" />
                <span>Belum Dikunci</span>
              </span>
            )}
          </div>

          <p className="text-xs text-stone-500 leading-relaxed">
            Rekening ini digunakan saat Anda mengajukan penarikan saldo komisi (*withdrawal*) dari dompet VARENA.
            Setelah dikunci, rekening tidak dapat diubah sembarangan demi melindungi saldo Anda dari akses tidak sah.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-varena-espresso mb-1">Nama Bank *</label>
              <select
                disabled={isBankLocked}
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-varena-taupe/30 focus:outline-none focus:border-varena-gold disabled:bg-stone-100 disabled:text-stone-500"
              >
                {INDONESIA_BANKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-varena-espresso mb-1">
                Nomor Rekening *
              </label>
              <input
                type="text"
                disabled={isBankLocked}
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="1234567890"
                className="w-full px-3.5 py-2.5 rounded-xl border border-varena-taupe/30 font-mono focus:outline-none focus:border-varena-gold disabled:bg-stone-100 disabled:text-stone-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-varena-espresso mb-1">
                Nama Pemilik Rekening *
              </label>
              <input
                type="text"
                disabled={isBankLocked}
                value={bankAccountHolder}
                onChange={(e) => setBankAccountHolder(e.target.value.toUpperCase())}
                placeholder="AHMAD FAUZI"
                className="w-full px-3.5 py-2.5 rounded-xl border border-varena-taupe/30 uppercase focus:outline-none focus:border-varena-gold disabled:bg-stone-100 disabled:text-stone-500"
              />
            </div>
          </div>

          {!isBankLocked ? (
            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-xs text-amber-900">
                <input
                  type="checkbox"
                  checked={lockBankCheckbox}
                  onChange={(e) => setLockBankCheckbox(e.target.checked)}
                  className="w-4 h-4 text-varena-espresso focus:ring-varena-gold rounded mt-0.5"
                />
                <div>
                  <span className="font-bold">Kunci Rekening Ini Saat Menyimpan</span>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Centang untuk mengunci rekening bank Anda. Rekening yang terkunci menjamin komisi hanya dapat cair ke rekening pribadi Anda.
                  </p>
                </div>
              </label>
            </div>
          ) : (
            <div className="text-[11px] text-stone-500 italic bg-stone-50 p-2.5 rounded-lg border border-stone-200">
              🔒 Rekening telah dikunci demi keamanan aset Anda. Jika ingin mengganti nomor rekening, silakan hubungi tim Administrator Resmi Pusat VARENA dengan melampirkan foto buku tabungan/m-banking.
            </div>
          )}
        </div>

        {/* Section 3: Alamat Pengiriman Utama */}
        <div className="bg-white border border-varena-taupe/20 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-varena-taupe/15 pb-3">
            <MapPin className="w-5 h-5 text-varena-gold" />
            <h2 className="font-serif text-base font-bold text-varena-espresso">
              3. Alamat Pengiriman Utama (Tersimpan Otomatis saat Checkout)
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-varena-espresso mb-1">
                  Nama Penerima Paket
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder={displayName || 'Nama penerima'}
                  className="w-full px-3.5 py-2 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
                />
              </div>

              <div>
                <label className="block font-semibold text-varena-espresso mb-1">
                  Nomor HP Penerima (WhatsApp)
                </label>
                <input
                  type="tel"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder={phone || '081234567890'}
                  className="w-full px-3.5 py-2 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-varena-espresso mb-1">Provinsi</label>
                <input
                  type="text"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  placeholder="DKI Jakarta / Jawa Timur"
                  className="w-full px-3.5 py-2 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
                />
              </div>

              <div>
                <label className="block font-semibold text-varena-espresso mb-1">Kota / Kabupaten</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Jakarta Selatan / Surabaya"
                  className="w-full px-3.5 py-2 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-varena-espresso mb-1">Kecamatan</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="Kebayoran Baru"
                  className="w-full px-3.5 py-2 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
                />
              </div>

              <div>
                <label className="block font-semibold text-varena-espresso mb-1">Kode Pos</label>
                <input
                  type="text"
                  maxLength={5}
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="12160"
                  className="w-full px-3.5 py-2 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-varena-espresso mb-1">
                Detail Alamat / Jalan / Patokan
              </label>
              <textarea
                rows={2}
                value={addressDetail}
                onChange={(e) => setAddressDetail(e.target.value)}
                placeholder="Jl. Mawar No. 12, RT 01/RW 02 (Pagar Hitam samping Masjid)..."
                className="w-full px-3.5 py-2 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
              ></textarea>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <Link
            href="/member"
            className="w-full sm:w-auto text-center py-3 px-5 rounded-xl border border-varena-taupe/30 text-xs font-semibold text-varena-espresso hover:bg-varena-ivory transition"
          >
            ← Kembali ke Dashboard
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto py-3 px-8 rounded-xl bg-varena-gold text-varena-espresso font-semibold text-xs sm:text-sm hover:bg-varena-gold-hover transition flex items-center justify-center gap-2 shadow disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Menyimpan Perubahan...' : 'Simpan Semua Pengaturan'}</span>
          </button>
        </div>
      </form>

      {/* ── Section 4: Keamanan & Kata Sandi Akun ── */}
      <form onSubmit={handlePasswordSubmit} className="mt-8 bg-white border border-varena-taupe/20 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-varena-taupe/15 pb-3">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-varena-gold" />
            <div>
              <h2 className="font-serif text-base font-bold text-varena-espresso">
                4. Keamanan & Kata Sandi Akun
              </h2>
              <p className="text-[11px] text-varena-taupe">
                {isInitialPasswordSetup
                  ? 'Akun terhubung via Google. Buat kata sandi agar dapat login mandiri menggunakan email & kata sandi.'
                  : 'Perbarui kata sandi Anda secara berkala untuk menjaga keamanan akun kemitraan.'}
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>Enkripsi Bcrypt 12-Rounds</span>
          </span>
        </div>

        {/* Password Messages */}
        {passwordSuccessMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 flex items-center gap-2.5 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{passwordSuccessMessage}</span>
          </div>
        )}

        {passwordErrorMessage && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{passwordErrorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {!isInitialPasswordSetup && (
            <div className="sm:col-span-2">
              <label className="block font-semibold text-varena-espresso mb-1">
                Kata Sandi Saat Ini *
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Masukkan kata sandi saat ini"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  tabIndex={-1}
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-varena-espresso mb-1">
              {isInitialPasswordSetup ? 'Buat Kata Sandi Baru *' : 'Kata Sandi Baru *'}
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 8 karakter (huruf & angka)"
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                tabIndex={-1}
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-varena-espresso mb-1">
              Konfirmasi Kata Sandi Baru *
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi kata sandi baru"
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Live Security Checklist */}
        {newPassword && (
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-[11px] space-y-1.5">
            <div className="font-semibold text-stone-700 mb-1">Kriteria Keamanan Sandi:</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className={`flex items-center gap-1.5 ${newPassword.length >= 8 ? 'text-emerald-700 font-medium' : 'text-stone-400'}`}>
                <Check className={`w-3.5 h-3.5 ${newPassword.length >= 8 ? 'text-emerald-600' : 'text-stone-300'}`} />
                <span>Minimal 8 karakter ({newPassword.length}/8)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${(/[a-zA-Z]/.test(newPassword) && /\d/.test(newPassword)) ? 'text-emerald-700 font-medium' : 'text-stone-400'}`}>
                <Check className={`w-3.5 h-3.5 ${(/[a-zA-Z]/.test(newPassword) && /\d/.test(newPassword)) ? 'text-emerald-600' : 'text-stone-300'}`} />
                <span>Kombinasi huruf & angka</span>
              </div>
              <div className={`flex items-center gap-1.5 ${confirmPassword && newPassword === confirmPassword ? 'text-emerald-700 font-medium' : 'text-stone-400'}`}>
                <Check className={`w-3.5 h-3.5 ${confirmPassword && newPassword === confirmPassword ? 'text-emerald-600' : 'text-stone-300'}`} />
                <span>Konfirmasi cocok</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={passwordSaving || !newPassword || !confirmPassword}
            className="py-2.5 px-6 rounded-xl bg-varena-espresso text-varena-gold font-semibold text-xs hover:bg-varena-espresso-dark transition flex items-center gap-2 shadow-xs disabled:opacity-50"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{passwordSaving ? 'Menyimpan Sandi...' : isInitialPasswordSetup ? 'Buat Kata Sandi Akun' : 'Perbarui Kata Sandi'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
