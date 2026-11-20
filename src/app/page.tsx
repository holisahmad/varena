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
          {/* Card Penegasan Resmi & Anti-Ponzi */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-varena-gold/50 bg-black/40 backdrop-blur-sm text-varena-gold-light text-xs tracking-wide mb-6 font-semibold shadow-inner">
            <ShieldCheck className="w-4 h-4 text-varena-gold flex-shrink-0" />
            <span>Distribusi Penjualan Langsung Resmi · Komisi Berbasis Omzet Produk Nyata</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-varena-ivory-light max-w-4xl mx-auto leading-tight">
            Bisnis Riil. Produk Nyata. <br className="hidden sm:inline" />
            <span className="text-varena-gold-light italic">Komisi Transparan & Adil.</span>
          </h1>

          <p className="mt-5 text-sm sm:text-base text-varena-ivory/85 max-w-2xl mx-auto leading-relaxed">
            Distribusi resmi produk kopi fermentasi dan herbal berizin. Beli eceran tanpa syarat anggota, atau bangun jaringan kemitraan dengan pembagian hasil transparan sesuai Permendag RI No. 70/2019.
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

          {/* 4 Pilar Integritas Bisnis Anti-AI-Slop */}
          <div className="mt-12 pt-8 border-t border-[#4A3B30] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-left max-w-4xl mx-auto">
            <div className="p-3.5 rounded-xl bg-varena-espresso-dark/60 border border-varena-gold/25 flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-varena-gold flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-varena-ivory">Taat Permendag 70/2019</div>
                <div className="text-[10px] text-varena-ivory/65 mt-0.5 leading-snug">Komisi dari selisih margin penjualan, Rp0 biaya pendaftaran</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-varena-espresso-dark/60 border border-varena-gold/25 flex items-start gap-3">
              <Award className="w-4 h-4 text-varena-gold flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-varena-ivory">Izin P-IRT & Sertifikasi Halal</div>
                <div className="text-[10px] text-varena-ivory/65 mt-0.5 leading-snug">Produk fisik teruji higienis & layak konsumsi resmi</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-varena-espresso-dark/60 border border-varena-gold/25 flex items-start gap-3">
              <ShoppingBag className="w-4 h-4 text-varena-gold flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-varena-ivory">Konsumen Bebas Belanja</div>
                <div className="text-[10px] text-varena-ivory/65 mt-0.5 leading-snug">Beli eceran tanpa syarat & tanpa paksaan jadi member</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-varena-espresso-dark/60 border border-varena-gold/25 flex items-start gap-3">
              <Building2 className="w-4 h-4 text-varena-gold flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-varena-ivory">Buku Besar Transparan</div>
                <div className="text-[10px] text-varena-ivory/65 mt-0.5 leading-snug">Mutasi komisi real-time & cair langsung ke rekening bank</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Branded House Architecture Section */}
      <section className="py-16 bg-varena-ivory-surface/40 border-b border-varena-taupe/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-serif text-3xl font-bold text-varena-espresso tracking-tight">
              Layanan & Akses Sistem VARENA
            </h2>
            <p className="mt-3 text-sm text-varena-taupe-dark">
              Portal terpadu untuk belanja konsumen langsung, manajemen jaringan kemitraan, edukasi bisnis, dan tata kelola operasional resmi.
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
                  Katalog resmi dan pembelian produk Kopi Matahari — Kopi Robusta Fermentasi Premium bagi konsumen langsung maupun mitra.
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
                <span>Portal Eksekutif (Login Admin)</span>
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
                Kopi Matahari
              </h2>
              <p className="text-xs text-varena-gold font-semibold tracking-wide mt-1 italic">
                "Energi Pagi, Sehat Seharian · Nikmatnya Kopi, Baiknya untuk Tubuh"
              </p>
              <p className="text-sm text-varena-taupe-dark mt-4 leading-relaxed">
                Kopi Robusta fermentasi premium pilihan, diproses dengan metode fermentasi terkontrol untuk menghasilkan cita rasa yang kaya, aroma yang kuat, dan kenikmatan setiap pagi yang tak terlupakan. Cocok dinikmati sebagai bagian dari rutinitas harian yang produktif.
              </p>

              <div className="mt-6 space-y-2 text-xs text-varena-espresso font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-varena-gold"></span>
                  <span>Izin Edar Resmi P-IRT 2083404061840-31 & Sertifikasi Halal</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-varena-gold"></span>
                  <span>Tersedia Paket Box (10 Sachet @ Rp500.000)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-varena-gold"></span>
                  <span>Tersedia Sachet Satuan (Rp45.000 / sachet)</span>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4">
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
              <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-2xl overflow-hidden shadow-xl border border-varena-gold/30">
                <Image
                  src="/brand/kopi-matahari.jpeg"
                  alt="Kopi Matahari — Robusta Fermentasi Premium"
                  fill
                  sizes="(max-width: 640px) 256px, 320px"
                  className="object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-varena-espresso-dark/90 to-transparent px-4 py-4 text-center">
                  <span className="font-serif text-lg font-bold text-varena-gold-light block">Kopi Matahari</span>
                  <span className="text-xs text-varena-ivory/80 tracking-widest uppercase">Kopi Robusta Premium</span>
                  <div className="mt-2 inline-block px-3 py-1 rounded bg-varena-gold/20 text-varena-gold-light text-xs font-semibold">
                    Box 10 Sachet · Rp500.000
                  </div>
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
            <p className="mt-2 text-varena-gold-light/90 font-medium">
              Bisnis Riil. Produk Nyata. Komisi Adil.
            </p>
            <p className="mt-3 text-[11px] leading-relaxed text-varena-ivory/70">
              Distribusi produk herbal & kopi fermentasi resmi. Mengutamakan mutu produk fisik, perlindungan konsumen, dan transparansi bagi hasil kemitraan.
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

