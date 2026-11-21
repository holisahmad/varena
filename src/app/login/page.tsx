'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { LogIn, Key, Users, Shield, ArrowRight, Truck, Eye, EyeOff } from 'lucide-react';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Guard: jika user sudah login, langsung redirect ke dashboard
  useEffect(() => {
    const storedUser = localStorage.getItem('varena_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        const isCorporate = user?.roles?.some((r: string) =>
          ['OWNER', 'OPERATIONS', 'ADMIN_1', 'ADMIN_2', 'KOPERASI', 'AUDITOR'].includes(r)
        );
        if (redirectParam) {
          router.replace(redirectParam);
        } else if (isCorporate) {
          router.replace('/admin');
        } else {
          router.replace('/member');
        }
      } catch {}
    }
  }, [redirectParam, router]);

  const handleLogin = async (e?: React.FormEvent, customEmail?: string) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    const targetEmail = customEmail || email;
    const targetPassword = customEmail ? 'Varena2026!' : password;

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password: targetPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login gagal.');
      }

      localStorage.setItem('varena_user', JSON.stringify(data.user));
      // Simpan JWT token untuk autentikasi API calls
      if (data.token) {
        localStorage.setItem('varena_token', data.token);
      }

      const isCorporate = data.user.roles.some((r: string) =>
        ['OWNER', 'OPERATIONS', 'ADMIN_1', 'ADMIN_2', 'KOPERASI', 'AUDITOR'].includes(r)
      );

      // Handle redirect
      if (redirectParam) {
        router.push(redirectParam);
      } else if (isCorporate) {
        router.push('/admin');
      } else {
        router.push('/member');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 w-full">
      <div className="bg-white border border-varena-taupe/20 rounded-2xl p-6 sm:p-8 shadow-sm">
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
          <h1 className="font-serif text-2xl font-bold text-varena-espresso">Masuk ke Portal VARENA</h1>
          <p className="text-xs text-varena-taupe mt-1">Akses jaringan kemitraan, komisi, dan dompet digital</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200">
            {error}
          </div>
        )}

        {/* 1-Click Google Sign-In */}
        <div className="space-y-4">
          <GoogleSignInButton
            label="Masuk dengan Akun Google"
            redirectUrl={redirectParam || '/member'}
          />

          {/* Centered Divider */}
          <div className="relative flex items-center justify-center my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200"></div>
            </div>
            <div className="relative bg-white px-3 text-center">
              <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider block">
                atau masuk dengan email
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 text-xs" suppressHydrationWarning>
          <div>
            <label className="block font-semibold text-varena-espresso mb-1">Email Terdaftar</label>
            <input
              type="email"
              required
              suppressHydrationWarning
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@gmail.com"
              className="w-full px-3.5 py-2.5 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
            />
          </div>

          <div>
            <label className="block font-semibold text-varena-espresso mb-1">Kata Sandi</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                suppressHydrationWarning
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-3.5 pr-10 py-2.5 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
              />
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-stone-400 hover:text-stone-700 transition"
                title={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Lupa Password */}
          <div className="flex justify-end -mt-1 mb-1">
            <button
              type="button"
              onClick={() => {
                const wa = 'https://wa.me/6281234567890?text=' + encodeURIComponent('Halo Admin VARENA, saya lupa password akun saya. Mohon bantuannya untuk reset password.\n\nNama: \nKode Mitra / Email: ');
                window.open(wa, '_blank');
              }}
              className="text-xs text-varena-gold hover:underline"
            >
              Lupa password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            suppressHydrationWarning
            className="w-full py-3 rounded-lg bg-varena-espresso text-varena-ivory font-semibold text-xs hover:bg-varena-espresso-dark transition flex items-center justify-center gap-2 shadow"
          >
            <LogIn className="w-4 h-4 text-varena-gold-light" />
            <span>{loading ? 'Memverifikasi...' : 'Masuk Akun'}</span>
          </button>
        </form>

        {/* Links to Register & Track */}
        <div className="mt-5 pt-4 border-t border-varena-taupe/15 text-center space-y-2 text-xs">
          <div>
            <span className="text-stone-500">Belum memiliki akun kemitraan? </span>
            <Link href="/register" className="font-semibold text-varena-gold hover:underline">
              Daftar Mitra Sekarang
            </Link>
          </div>
          <div className="pt-1">
            <Link
              href="/track"
              className="inline-flex items-center gap-1.5 text-[11px] text-stone-600 hover:text-varena-espresso font-medium bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200 transition"
            >
              <Truck className="w-3.5 h-3.5 text-varena-gold" />
              <span>Cek Status & Resi Pengiriman (Tanpa Login) →</span>
            </Link>
          </div>
        </div>

        {/* Quick Demo Switcher — Otomatis Dihilangkan di Lingkungan Produksi (Vercel) */}
        {process.env.NODE_ENV !== 'production' && (
          <div className="mt-6 pt-4 border-t border-varena-taupe/20">
            <div className="text-[10px] font-semibold text-varena-taupe uppercase tracking-wider mb-2">
              Akses Cepat Pengujian Role (Demo Lokal):
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => handleLogin(undefined, 'leader3@varena.id')}
                className="p-2 rounded bg-varena-ivory hover:bg-varena-gold/20 text-varena-espresso text-left border border-varena-taupe/20 transition"
              >
                <div className="font-semibold">Leader 3 (L8)</div>
                <div className="text-[9px] text-varena-taupe font-mono">VRN-LDR-03 (Role Leader)</div>
              </button>
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => handleLogin(undefined, 'admin1@varena.id')}
                className="p-2 rounded bg-varena-ivory hover:bg-varena-gold/20 text-varena-espresso text-left border border-varena-taupe/20 transition"
              >
                <div className="font-semibold">Admin Logistik</div>
                <div className="text-[9px] text-varena-taupe font-mono">Staf Pusat</div>
              </button>
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => handleLogin(undefined, 'operasional@varena.id')}
                className="p-2 rounded bg-varena-ivory hover:bg-varena-gold/20 text-varena-espresso text-left border border-varena-taupe/20 transition"
              >
                <div className="font-semibold">Operasional</div>
                <div className="text-[9px] text-varena-taupe font-mono">Staf Pusat</div>
              </button>
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => handleLogin(undefined, 'owner@varena.id')}
                className="p-2 rounded bg-varena-ivory hover:bg-varena-gold/20 text-varena-espresso text-left border border-varena-taupe/20 transition"
              >
                <div className="font-semibold">Owner Pusat</div>
                <div className="text-[9px] text-varena-taupe font-mono">Hak Akses Penuh</div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-sm text-varena-taupe">Memuat halaman login...</div>}>
      <LoginForm />
    </Suspense>
  );
}
