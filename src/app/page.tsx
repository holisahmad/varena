import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ShieldCheck, Sparkles, ShoppingBag, Users, Award, BookOpen, Building2 } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex flex-col flex-1">
      {/* Hero Section */}
      <section className="relative bg-varena-espresso text-varena-ivory overflow-hidden py-16 sm:py-24 border-b border-[#4A3B30]">
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#B18A55_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-varena-gold/40 bg-varena-espresso-dark/60 text-varena-gold-light text-xs tracking-widest uppercase mb-6 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-varena-gold" />
            <span>Platform Direct Selling & Kemitraan Modern</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-varena-ivory-light max-w-4xl mx-auto leading-tight">
            Grow Together. <br className="hidden sm:inline" />
            <span className="text-varena-gold-light italic">Build Value.</span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-varena-ivory/80 max-w-2xl mx-auto leading-relaxed">
            Membangun nilai melalui produk herbal premium berkhasiat nyata, transparansi kemitraan, dan ekosistem bisnis berkeadilan sesuai regulasi resmi.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/checkout"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg bg-varena-gold text-varena-espresso font-semibold text-sm hover:bg-varena-gold-hover transition shadow-lg shadow-black/20"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Beli Produk Sekarang</span>
            </Link>
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg border border-varena-gold/60 text-varena-gold-light hover:bg-varena-espresso-light font-semibold text-sm transition"
            >
              <Users className="w-4 h-4" />
              <span>Daftar Jadi Mitra</span>
            </Link>
          </div>

          {/* Trust badges */}
          <div className="mt-14 pt-8 border-t border-[#4A3B30] grid grid-cols-2 md:grid-cols-4 gap-4 text-left max-w-4xl mx-auto text-xs text-varena-ivory/70">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-varena-gold-light flex-shrink-0" />
              <span>Kepatuhan Permendag 70/2019</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Award className="w-5 h-5 text-varena-gold-light flex-shrink-0" />
              <span>BPOM & Halal Resmi</span>
            </div>
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-5 h-5 text-varena-gold-light flex-shrink-0" />
              <span>Konsumen Bebas Beli Tanpa Syarat</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-varena-gold-light flex-shrink-0" />
              <span>Buku Besar Transparan & Akurat</span>
            </div>
          </div>
        </div>
      </section>

      {/* Branded House Architecture Section */}
      <section className="py-16 bg-varena-ivory-surface/40 border-b border-varena-taupe/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-serif text-3xl font-bold text-varena-espresso tracking-tight">
              Ekosistem Terintegrasi VARENA
            </h2>
            <p className="mt-3 text-sm text-varena-taupe-dark">
              Model branded house yang kokoh menyatukan perdagangan riil, kemitraan berjenjang, edukasi, dan tata kelola perusahaan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* VARENA Market */}
            <div className="bg-white p-6 rounded-xl border border-varena-taupe/20 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-varena-espresso/10 text-varena-espresso flex items-center justify-center mb-4">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <h3 className="font-serif text-xl font-bold text-varena-espresso">VARENA Market</h3>
                <p className="text-xs text-varena-taupe mt-2 leading-relaxed">
                  Katalog resmi dan pembelian produk retail kopi herbal bagi konsumen langsung maupun mitra.
                </p>
              </div>
              <Link href="/products" className="mt-6 text-xs font-semibold text-varena-gold hover:text-varena-gold-hover inline-flex items-center gap-1">
                <span>Lihat Produk</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* VARENA Partner */}
            <div className="bg-white p-6 rounded-xl border border-varena-taupe/20 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-varena-gold/15 text-varena-gold-hover flex items-center justify-center mb-4">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="font-serif text-xl font-bold text-varena-espresso">VARENA Partner</h3>
                <p className="text-xs text-varena-taupe mt-2 leading-relaxed">
                  Portal dashboard mitra untuk memantau pohon jaringan downline, komisi 10 level, dan penarikan saldo.
                </p>
              </div>
              <Link href="/member" className="mt-6 text-xs font-semibold text-varena-gold hover:text-varena-gold-hover inline-flex items-center gap-1">
                <span>Akses Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* VARENA Academy */}
            <div className="bg-white p-6 rounded-xl border border-varena-taupe/20 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-varena-espresso/10 text-varena-espresso flex items-center justify-center mb-4">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="font-serif text-xl font-bold text-varena-espresso">VARENA Academy</h3>
                <p className="text-xs text-varena-taupe mt-2 leading-relaxed">
                  Kurikulum pelatihan soft-skill penjualan, etika direct selling, dan panduan produk herbal berizin.
                </p>
              </div>
              <span className="mt-6 text-xs text-varena-taupe-light">Tersedia untuk Mitra</span>
            </div>

            {/* VARENA Business */}
            <div className="bg-white p-6 rounded-xl border border-varena-taupe/20 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-varena-espresso-dark text-varena-gold-light flex items-center justify-center mb-4">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="font-serif text-xl font-bold text-varena-espresso">VARENA Business</h3>
                <p className="text-xs text-varena-taupe mt-2 leading-relaxed">
                  Sistem administrasi korporasi, verifikasi KYC, maker-checker pencairan dana, dan audit buku besar.
                </p>
              </div>
              <Link href="/admin" className="mt-6 text-xs font-semibold text-varena-gold hover:text-varena-gold-hover inline-flex items-center gap-1">
                <span>Panel Admin</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Flagship Product Showcase */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-varena-ivory-light border border-varena-taupe/20 rounded-2xl p-6 sm:p-12 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <span className="text-xs font-semibold tracking-wider text-varena-gold uppercase">Produk Unggulan</span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-varena-espresso mt-2">
                VARENA Kopi Sehat Premium Herbal
              </h2>
              <p className="text-sm text-varena-taupe-dark mt-4 leading-relaxed">
                Diformulasikan secara ilmiah dari biji kopi arabika pilihan dengan paduan ekstrak purwoceng, ginseng, dan herba Nusantara. Memberikan stamina tahan lama tanpa debar jantung berlebih.
              </p>

              <div className="mt-6 space-y-2 text-xs text-varena-espresso font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-varena-gold"></span>
                  <span>Legalitas BPOM RI MD 867028001234 & Sertifikasi Halal Resmi</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-varena-gold"></span>
                  <span>Tersedia Paket Perdana Box (10 Sachet @ Rp500.000)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-varena-gold"></span>
                  <span>Tersedia Eceran Repeat Purchase Satuan (Rp45.000 / sachet)</span>
                </div>
              </div>

              <div className="mt-8 flex items-center gap-4">
                <Link
                  href="/checkout"
                  className="px-6 py-3 rounded-lg bg-varena-espresso text-varena-ivory font-semibold text-sm hover:bg-varena-espresso-dark transition"
                >
                  Beli Sekarang
                </Link>
                <Link
                  href="/products"
                  className="px-6 py-3 rounded-lg border border-varena-taupe/40 text-varena-espresso font-semibold text-sm hover:bg-varena-ivory transition"
                >
                  Detail Varian
                </Link>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-2xl bg-gradient-to-br from-varena-espresso-dark to-varena-espresso p-6 flex flex-col items-center justify-center text-center shadow-xl border border-varena-gold/30">
                <div className="w-24 h-24 relative mb-4">
                  <Image
                    src="/brand/varena-connected-v-symbol.png"
                    alt="VARENA Coffee Box"
                    fill
                    className="object-contain"
                  />
                </div>
                <span className="font-serif text-2xl font-bold text-varena-gold-light">VARENA</span>
                <span className="text-xs text-varena-ivory/80 tracking-widest uppercase mt-1">Kopi Sehat Herbal</span>
                <div className="mt-4 px-3 py-1 rounded bg-varena-gold/20 text-varena-gold-light text-xs font-semibold">
                  Box 10 Sachet · Rp500.000
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-varena-espresso-dark text-varena-ivory py-12 border-t border-[#4A3B30] mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:text-left grid grid-cols-1 sm:grid-cols-3 gap-8 text-xs text-varena-taupe-light">
          <div>
            <div className="font-serif text-xl font-bold text-varena-gold-light uppercase tracking-wider">
              VARENA
            </div>
            <p className="mt-2 text-varena-ivory/70">
              Grow Together. Build Value.
            </p>
            <p className="mt-4 text-[11px] leading-relaxed">
              Platform direct selling beretika dan terpercaya di Indonesia. Berfokus pada keaslian produk dan kepatuhan regulasi.
            </p>
          </div>
          <div>
            <div className="font-semibold text-varena-ivory mb-2 uppercase tracking-wider">Tautan Cepat</div>
            <ul className="space-y-1.5">
              <li><Link href="/products" className="hover:text-varena-gold-light">Katalog Produk</Link></li>
              <li><Link href="/checkout" className="hover:text-varena-gold-light">Pemesanan Retail</Link></li>
              <li><Link href="/register" className="hover:text-varena-gold-light">Kemitraan Mitra</Link></li>
              <li><Link href="/member" className="hover:text-varena-gold-light">Portal Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-varena-ivory mb-2 uppercase tracking-wider">Legalitas & Kepatuhan</div>
            <p className="text-[11px] leading-relaxed">
              Sesuai Permendag RI No. 70/2019 tentang Distribusi Langsung. Seluruh komisi bersumber dari selisih margin penjualan produk nyata, bukan dari biaya pendaftaran anggota.
            </p>
            <div className="mt-4 text-[10px] text-varena-taupe">
              &copy; {new Date().getFullYear()} VARENA. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
