'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { LogIn, Key, Users, Shield, ArrowRight } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

        <form onSubmit={handleLogin} className="space-y-4 text-xs" suppressHydrationWarning>
          <div>
            <label className="block font-semibold text-varena-espresso mb-1">Email Terdaftar</label>
            <input
              type="email"
              required
              suppressHydrationWarning
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@varena.id"
              className="w-full px-3.5 py-2.5 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
            />
          </div>

          <div>
            <label className="block font-semibold text-varena-espresso mb-1">Kata Sandi</label>
            <input
              type="password"
              required
              suppressHydrationWarning
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
            />
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

        {/* Quick Demo Switcher */}
        <div className="mt-8 pt-6 border-t border-varena-taupe/20">
          <div className="text-[11px] font-semibold text-varena-taupe uppercase tracking-wider mb-2">
            Akses Cepat Pengujian Role (Demo):
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => handleLogin(undefined, 'mitra1@varena.id')}
              className="p-2 rounded bg-varena-ivory hover:bg-varena-gold/20 text-varena-espresso text-left border border-varena-taupe/20 transition"
            >
              <div className="font-semibold">Mitra 1 (Ahmad)</div>
              <div className="text-[9px] text-varena-taupe font-mono">VRN-0001 (Role Mitra)</div>
            </button>
            <button
              type="button"
              onClick={() => handleLogin(undefined, 'leader3@varena.id')}
              className="p-2 rounded bg-varena-ivory hover:bg-varena-gold/20 text-varena-espresso text-left border border-varena-taupe/20 transition"
            >
              <div className="font-semibold">Leader 3 (L8)</div>
              <div className="text-[9px] text-varena-taupe font-mono">VRN-LDR-03 (Role Leader)</div>
            </button>
            <button
              type="button"
              onClick={() => handleLogin(undefined, 'operasional@varena.id')}
              className="p-2 rounded bg-varena-ivory hover:bg-varena-gold/20 text-varena-espresso text-left border border-varena-taupe/20 transition"
            >
              <div className="font-semibold">Admin Operasional</div>
              <div className="text-[9px] text-varena-taupe font-mono">OPERATIONS (Admin)</div>
            </button>
            <button
              type="button"
              onClick={() => handleLogin(undefined, 'owner@varena.id')}
              className="p-2 rounded bg-varena-ivory hover:bg-varena-gold/20 text-varena-espresso text-left border border-varena-taupe/20 transition"
            >
              <div className="font-semibold">Owner / Direksi</div>
              <div className="text-[9px] text-varena-taupe font-mono">OWNER (Level 1)</div>
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-varena-taupe">
          Belum menjadi mitra?{' '}
          <Link href="/register" className="font-semibold text-varena-gold hover:underline">
            Daftar Mitra Baru
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-sm text-varena-taupe">Memuat formulir masuk...</div>}>
      <LoginForm />
    </Suspense>
  );
}
