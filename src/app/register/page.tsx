'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Users, CheckCircle, ArrowRight, ShieldCheck, Phone, Mail, Eye, EyeOff } from 'lucide-react';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mounted, setMounted] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [sponsorCode, setSponsorCode] = useState('');
  const [sponsorInfo, setSponsorInfo] = useState<any>(null);

  // Session state: user yang saat ini sudah login (jika ada)
  const [loggedInUser, setLoggedInUser] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successResult, setSuccessResult] = useState<any>(null);

  useEffect(() => {
    setMounted(true);

    // Cek apakah ada user yang sudah login
    const storedUser = localStorage.getItem('varena_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setLoggedInUser(parsedUser);

        // Jika user login adalah mitra, otomatis isi kode sponsor dari kode referral mereka
        const memberCode = parsedUser?.member?.memberCode || parsedUser?.memberCode;
        if (memberCode) {
          setSponsorCode(memberCode.toUpperCase());
          checkSponsor(memberCode.toUpperCase());
          return; // Jangan timpa dengan param URL
        }
      } catch {}
    }

    const paramRef = searchParams?.get('ref');
    const storedRef = typeof window !== 'undefined' ? localStorage.getItem('varena_referral_code') : null;
    const initialRef = (paramRef || storedRef || 'VRN-LDR-03').toUpperCase();
    setSponsorCode(initialRef);
    checkSponsor(initialRef);
  }, [searchParams]);

  const checkSponsor = async (code: string) => {
    if (!code) {
      setSponsorInfo(null);
      return;
    }
    try {
      const res = await fetch(`/api/v1/catalog/referral-check?code=${code.trim()}`);
      const data = await res.json();
      if (data.valid) {
        setSponsorInfo(data.sponsor);
      } else {
        setSponsorInfo(null);
      }
    } catch (e) {
      setSponsorInfo(null);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Strict Gmail validation
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith('@gmail.com')) {
      setError('Pendaftaran hanya menerima alamat Gmail aktif (@gmail.com) agar faktur dan notifikasi resmi dapat terkirim.');
      setLoading(false);
      return;
    }

    // Strict Phone WhatsApp validation
    const cleanPhone = phone.trim().replace(/[\s-]/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      setError('Nomor WhatsApp aktif wajib diisi minimal 9 digit.');
      setLoading(false);
      return;
    }

    // Password validation & match
    if (password.length < 8) {
      setError('Kata sandi minimal 8 karakter demi keamanan akun.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok. Pastikan kedua kolom kata sandi terisi sama persis.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/v1/auth/register-mitra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          legalName: legalName || displayName,
          email: cleanEmail,
          phone: cleanPhone,
          password,
          sponsorCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Pendaftaran gagal.');
      }

      setSuccessResult(data.member);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 w-full">
      <div className="bg-white border border-varena-taupe/20 rounded-2xl p-6 sm:p-8 shadow-sm" suppressHydrationWarning>
        <div className="text-center mb-6">
          <div className="relative w-16 h-16 mx-auto rounded-full overflow-hidden border border-varena-gold p-0.5 bg-varena-espresso-dark mb-3 shadow-md">
            <Image
              src="/brand/logo-circle.png"
              alt="VARENA Luxury Logo"
              fill
              sizes="64px"
              className="object-contain"
              priority
            />
          </div>
          <h1 className="font-serif text-2xl font-bold text-varena-espresso">Pendaftaran Mitra VARENA</h1>
          <p className="text-xs text-varena-taupe mt-1">
            Bergabunglah dalam kemitraan penjualan langsung beretika dan terpercaya
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200">
            {error}
          </div>
        )}

        {!successResult ? (
          <div className="space-y-4">
            {/* Banner Mode Upline Registrasi Downline */}
            {loggedInUser && (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <div>
                    <div className="font-bold">Mode Pendaftaran Mitra Baru</div>
                    <div className="text-[10px] text-blue-700">
                      Otomatis di bawah sponsor: <strong>{loggedInUser?.member?.displayName || loggedInUser?.displayName || loggedInUser?.name}</strong>
                    </div>
                  </div>
                </div>
                <Link href="/member" className="text-[10px] font-semibold text-blue-800 hover:underline ml-2 whitespace-nowrap">
                  Dashboard →
                </Link>
              </div>
            )}

            {/* 1-Click Google Registration - hanya tampil jika user belum login */}
            {!loggedInUser && (
              <div className="space-y-3">
                <GoogleSignInButton
                  label="Daftar Cepat dengan Google"
                  sponsorCode={sponsorCode}
                  redirectUrl="/member"
                />

                {/* Perfectly Centered Divider */}
                <div className="relative flex items-center justify-center my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-stone-200"></div>
                  </div>
                  <div className="relative bg-white px-3 text-center">
                    <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider block">
                      atau daftar manual dengan gmail
                    </span>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-3.5 text-xs" suppressHydrationWarning>
              {/* Sponsor Box */}
              <div className="p-3 rounded-xl bg-varena-ivory-light border border-varena-gold/40">
                <label className="block font-semibold text-varena-espresso mb-1">Kode Sponsor Pengundang *</label>
                <input
                  type="text"
                  required
                  suppressHydrationWarning
                  value={sponsorCode}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setSponsorCode(val);
                    checkSponsor(val);
                  }}
                  placeholder="Contoh: VRN-0001"
                  className="w-full px-3 py-2 rounded-lg border border-varena-taupe/30 uppercase font-mono text-xs focus:outline-none focus:border-varena-gold"
                />
                {sponsorInfo ? (
                  <div className="mt-2 text-[11px] text-emerald-800 font-medium flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Sponsor: {sponsorInfo.name} ({sponsorInfo.code})</span>
                  </div>
                ) : (
                  <div className="mt-1 text-[10px] text-stone-400">
                    * Jika kosong atau tanpa referral, akun otomatis masuk ke naungan resmi perusahaan.
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-varena-espresso mb-1">Nama Panggilan / Toko *</label>
                <input
                  type="text"
                  required
                  suppressHydrationWarning
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Contoh: Ahmad Fauzi"
                  className="w-full px-3 py-2 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
                />
              </div>

              <div>
                <label className="block font-semibold text-varena-espresso mb-1">Nama Sesuai KTP *</label>
                <input
                  type="text"
                  required
                  suppressHydrationWarning
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="Nama lengkap sesuai e-KTP resmi"
                  className="w-full px-3 py-2 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
                />
              </div>

              {/* Gmail only */}
              <div>
                <label className="block font-semibold text-varena-espresso mb-1">Alamat Gmail Aktif *</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    suppressHydrationWarning
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama.anda@gmail.com"
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
                  />
                  <Mail className="w-4 h-4 text-stone-400 absolute left-2.5 top-2.5" />
                </div>
                <p className="text-[10px] text-stone-500 mt-1">
                  * Khusus akun resmi Google (@gmail.com) agar faktur dan notifikasi komisi terkirim pasti.
                </p>
              </div>

              {/* WhatsApp phone with explicit notice */}
              <div>
                <label className="block font-semibold text-varena-espresso mb-1">Nomor WhatsApp Aktif *</label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    suppressHydrationWarning
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="081234567890"
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold font-mono"
                  />
                  <Phone className="w-4 h-4 text-emerald-600 absolute left-2.5 top-2.5" />
                </div>
                <div className="mt-1 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-800 leading-relaxed">
                  💬 <strong>Penting:</strong> Pastikan nomor terhubung dengan <strong>WhatsApp aktif</strong> untuk konfirmasi pesanan, resi pengiriman kurir, dan pemberitahuan saldo komisi.
                </div>
              </div>

              {/* Password with Eye Toggle */}
              <div>
                <label className="block font-semibold text-varena-espresso mb-1">Kata Sandi Akun *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    suppressHydrationWarning
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 8 karakter"
                    className="w-full pl-3 pr-9 py-2 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-700 transition"
                    title={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password with Eye Toggle & Match Indicator */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-varena-espresso">Ulangi Kata Sandi (Verifikasi) *</label>
                  {confirmPassword && (
                    <span
                      className={`text-[10px] font-semibold ${
                        password === confirmPassword ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {password === confirmPassword ? '✓ Kata sandi cocok' : '⚠ Belum sama'}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    suppressHydrationWarning
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ketik ulang kata sandi di atas"
                    className={`w-full pl-3 pr-9 py-2 rounded-lg border focus:outline-none ${
                      confirmPassword && password !== confirmPassword
                        ? 'border-red-400 bg-red-50/30 focus:border-red-500'
                        : confirmPassword && password === confirmPassword
                        ? 'border-emerald-400 bg-emerald-50/20 focus:border-emerald-500'
                        : 'border-varena-taupe/30 focus:border-varena-gold'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-700 transition"
                    title={showConfirmPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  suppressHydrationWarning
                  disabled={loading || !sponsorInfo}
                  className="w-full py-3 rounded-lg bg-varena-gold text-varena-espresso font-semibold text-xs hover:bg-varena-gold-hover transition flex items-center justify-center gap-2 shadow disabled:opacity-50"
                >
                  <Users className="w-4 h-4" />
                  <span>{loading ? 'Mendaftarkan...' : 'Daftar Sebagai Mitra'}</span>
                </button>
              </div>

              <div className="text-[10px] text-varena-taupe text-center mt-2">
                Dengan mendaftar, Anda menyetujui kode etik penjualan langsung VARENA & kepatuhan hukum Permendag 70/2019.
              </div>
            </form>
          </div>
        ) : (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-varena-espresso">Pendaftaran Berhasil!</h2>
              <p className="text-xs text-varena-taupe mt-1">
                Selamat datang di kemitraan resmi VARENA.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-varena-ivory-light border border-varena-taupe/20 font-mono text-sm font-bold text-varena-espresso">
              ID Mitra: {successResult.code}
            </div>
            {loggedInUser ? (
              <div className="space-y-3">
                <p className="text-[11px] text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  Mitra baru berhasil didaftarkan atas nama sponsor <strong>{loggedInUser?.member?.displayName || loggedInUser?.displayName || loggedInUser?.name}</strong>.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Link
                    href="/member"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-varena-espresso text-varena-ivory text-xs font-semibold hover:bg-varena-espresso-dark transition shadow"
                  >
                    <span>Kembali ke Dashboard Saya</span>
                    <ArrowRight className="w-4 h-4 text-varena-gold" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setSuccessResult(null);
                      setDisplayName('');
                      setLegalName('');
                      setEmail('');
                      setPhone('');
                      setPassword('');
                      setConfirmPassword('');
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-varena-gold/60 text-varena-espresso bg-varena-gold/15 hover:bg-varena-gold/30 text-xs font-semibold transition"
                  >
                    <span>+ Daftarkan Mitra Lagi</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-[11px] text-varena-taupe">
                  Silakan masuk ke portal member untuk mengelola jaringan, dompet, dan pesanan Anda.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-varena-espresso text-varena-ivory text-xs font-semibold hover:bg-varena-espresso-dark transition shadow"
                >
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight className="w-4 h-4 text-varena-gold" />
                </Link>
              </>
            )}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-varena-taupe/20 text-center text-xs">
          {loggedInUser ? (
            <>
              <span className="text-varena-taupe">Anda sedang login sebagai </span>
              <span className="font-semibold text-varena-espresso">
                {loggedInUser?.member?.displayName || loggedInUser?.displayName || loggedInUser?.name}
              </span>
              {' · '}
              <Link href="/member" className="font-semibold text-varena-gold hover:underline">
                Kembali ke Dashboard →
              </Link>
            </>
          ) : (
            <>
              <span className="text-varena-taupe">Sudah punya akun mitra? </span>
              <Link href="/login" className="font-semibold text-varena-espresso hover:text-varena-gold">
                Masuk di sini
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-sm text-varena-taupe">Memuat pendaftaran...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
