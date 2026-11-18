'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Users, CheckCircle, ArrowRight, ShieldCheck } from 'lucide-react';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mounted, setMounted] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [sponsorCode, setSponsorCode] = useState('');
  const [sponsorInfo, setSponsorInfo] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successResult, setSuccessResult] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    const paramRef = searchParams?.get('ref');
    const storedRef = typeof window !== 'undefined' ? localStorage.getItem('varena_referral_code') : null;
    const initialRef = (paramRef || storedRef || 'VRN-0001').toUpperCase();
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

    try {
      const res = await fetch('/api/v1/auth/register-mitra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          legalName: legalName || displayName,
          email,
          phone,
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
              {sponsorInfo && (
                <div className="mt-2 text-[11px] text-emerald-800 font-medium flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Sponsor: {sponsorInfo.name} ({sponsorInfo.code})</span>
                </div>
              )}
            </div>

            <div>
              <label className="block font-semibold text-varena-espresso mb-1">Nama Tampilan / Toko *</label>
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
                placeholder="Nama lengkap sesuai identitas resmi"
                className="w-full px-3 py-2 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-varena-espresso mb-1">Email *</label>
                <input
                  type="email"
                  required
                  suppressHydrationWarning
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@domain.com"
                  className="w-full px-3 py-2 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
                />
              </div>
              <div>
                <label className="block font-semibold text-varena-espresso mb-1">No. WhatsApp *</label>
                <input
                  type="tel"
                  required
                  suppressHydrationWarning
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="08123456789"
                  className="w-full px-3 py-2 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-varena-espresso mb-1">Kata Sandi Akun *</label>
              <input
                type="password"
                required
                suppressHydrationWarning
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                className="w-full px-3 py-2 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
              />
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
        ) : (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
              <CheckCircle className="w-7 h-7" />
            </div>
            <h2 className="font-serif text-xl font-bold text-varena-espresso">Pendaftaran Berhasil!</h2>
            <div className="p-4 rounded-xl bg-varena-ivory-light border border-varena-gold/40 max-w-xs mx-auto">
              <div className="text-xs text-varena-taupe">Kode Kemitraan Anda:</div>
              <div className="text-xl font-mono font-bold text-varena-espresso mt-1">{successResult.code}</div>
            </div>
            <p className="text-xs text-varena-taupe leading-relaxed">
              Akun Anda telah aktif dan siap digunakan. Silakan masuk untuk mengakses portal dan mulai membagikan tautan referral Anda.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-1.5 w-full py-3 rounded-lg bg-varena-espresso text-varena-ivory text-xs font-semibold hover:bg-varena-espresso-dark transition"
            >
              <span>Masuk ke Akun Sekarang</span>
              <ArrowRight className="w-4 h-4 text-varena-gold-light" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-sm text-varena-taupe">Memuat formulir pendaftaran...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
