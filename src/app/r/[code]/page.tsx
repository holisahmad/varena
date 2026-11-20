'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, Users, CheckCircle2, ArrowRight } from 'lucide-react';

export default function ReferralLandingPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params?.code as string)?.toUpperCase();
  const [sponsorInfo, setSponsorInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (code) {
      fetch(`/api/v1/catalog/referral-check?code=${code}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.valid) {
            setSponsorInfo(data.sponsor);
            localStorage.setItem('varena_referral_code', data.sponsor.code);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [code]);

  return (
    <div className="max-w-xl mx-auto px-4 py-12 text-center">
      <div className="relative w-20 h-20 mx-auto rounded-full overflow-hidden border-2 border-varena-gold p-1 bg-varena-espresso-dark mb-6 shadow-md">
        <Image
          src="/brand/varena-connected-v-symbol.png"
          alt="VARENA Logo"
          fill
          sizes="80px"
          className="object-contain p-2"
        />
      </div>

      {loading ? (
        <div className="text-sm text-varena-taupe py-10">Memvalidasi tautan rujukan...</div>
      ) : sponsorInfo ? (
        <div className="bg-white border border-varena-taupe/20 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold mb-4">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tautan Rujukan Terverifikasi</span>
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-varena-espresso">
            Selamat Datang di VARENA
          </h1>

          <p className="mt-2 text-sm text-varena-taupe-dark">
            Anda diundang oleh Mitra Resmi kami:
          </p>

          <div className="my-6 p-4 rounded-xl bg-varena-ivory-light border border-varena-gold/40 max-w-sm mx-auto">
            <div className="text-lg font-serif font-bold text-varena-espresso">{sponsorInfo.name}</div>
            <div className="text-xs font-mono font-semibold text-varena-gold mt-0.5">Kode: {sponsorInfo.code}</div>
          </div>

          <p className="text-xs text-varena-taupe mb-8 max-w-md mx-auto leading-relaxed">
            Anda dapat langsung berbelanja produk resmi tanpa kewajiban bergabung, atau mendaftar menjadi mitra usaha untuk membangun jaringan dan komisi bersama.
          </p>

          <div className="flex flex-col gap-3">
            <Link
              href={`/checkout?ref=${sponsorInfo.code}`}
              className="w-full py-3.5 px-4 rounded-xl bg-varena-espresso text-varena-ivory font-semibold text-sm hover:bg-varena-espresso-dark transition flex items-center justify-center gap-2 shadow"
            >
              <ShoppingBag className="w-4 h-4 text-varena-gold-light" />
              <span>Beli Produk Sekarang (Retail)</span>
            </Link>

            <Link
              href={`/register?ref=${sponsorInfo.code}`}
              className="w-full py-3.5 px-4 rounded-xl border border-varena-gold text-varena-gold-hover hover:bg-varena-ivory font-semibold text-sm transition flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4" />
              <span>Daftar Menjadi Mitra Usaha</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-red-200 rounded-2xl p-8 shadow-sm">
          <h2 className="text-lg font-bold text-red-700">Kode Referral Tidak Valid</h2>
          <p className="text-xs text-varena-taupe mt-2">
            Kode rujukan &apos;{code}&apos; tidak ditemukan atau telah non-aktif. Anda tetap dapat berbelanja secara normal.
          </p>
          <Link
            href="/checkout"
            className="mt-6 inline-block py-2.5 px-6 rounded-lg bg-varena-espresso text-white text-xs font-semibold"
          >
            Lanjut ke Belanja
          </Link>
        </div>
      )}
    </div>
  );
}

