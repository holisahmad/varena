'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, MoreVertical, Share2, PlusSquare, CheckCircle2, Monitor } from 'lucide-react';

export default function PwaInstallPrompt() {
  const [mounted, setMounted] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios'>('android');

  useEffect(() => {
    setMounted(true);

    // Deteksi jika user sudah menjalankan PWA / standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
      return;
    }

    // Deteksi default OS untuk panduan instalasi
    const ua = navigator.userAgent || '';
    const isIosDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIosDevice) {
      setActiveTab('ios');
    } else {
      setActiveTab('android');
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    // 1. Jika browser mendukung event otomatis (biasanya Chrome di Android / Chromium Desktop)
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
          return;
        }
      } catch (e) {
        // Fallback jika event prompt kadaluarsa
      }
    }

    // 2. Jika deferredPrompt belum siap atau di Safari/iOS, tampilkan modal panduan interaktif
    setShowGuideModal(true);
  };

  if (!mounted || isStandalone || isDismissed) {
    return null;
  }

  return (
    <>
      <aside
        aria-label="Instal Aplikasi"
        className="bg-gradient-to-r from-varena-espresso-dark via-[#3A2C23] to-varena-espresso border-b border-varena-gold/30 text-varena-ivory py-2.5 px-4 text-xs"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-full bg-varena-gold/20 text-varena-gold-light shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-varena-gold-light">Pasang Aplikasi VARENA</span>
              <span className="hidden sm:inline text-varena-ivory/70 ml-1.5">
                Akses cepat tanpa browser &amp; terima pembaruan bonus instan.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-varena-gold text-varena-espresso font-semibold text-xs hover:bg-varena-gold-hover transition shadow"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Instal Aplikasi</span>
            </button>
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-1 text-varena-taupe-light hover:text-varena-ivory transition"
              aria-label="Tutup Banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Modal Panduan Instalasi Pintar (Android & iOS) */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-varena-gold/30 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Header Modal */}
            <div className="bg-varena-espresso px-5 py-4 text-varena-ivory flex items-center justify-between border-b border-[#4A3B30]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-varena-gold/20 border border-varena-gold/40 flex items-center justify-center text-varena-gold">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm text-white">Panduan Pasang Aplikasi VARENA</h3>
                  <p className="text-[11px] text-varena-ivory/70">Langsung di layar utama HP tanpa unduh file APK</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1 rounded-lg text-varena-taupe-light hover:text-white hover:bg-white/10 transition"
                aria-label="Tutup Panduan"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Perangkat */}
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('android')}
                  className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
                    activeTab === 'android'
                      ? 'bg-white text-varena-espresso shadow-sm font-bold'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Android (Chrome)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('ios')}
                  className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
                    activeTab === 'ios'
                      ? 'bg-white text-varena-espresso shadow-sm font-bold'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5 text-sky-600" />
                  <span>iPhone / iPad (Safari)</span>
                </button>
              </div>

              {/* Konten Panduan Android */}
              {activeTab === 'android' && (
                <div className="space-y-3 text-xs text-stone-700">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="w-6 h-6 rounded-full bg-varena-gold text-varena-espresso font-bold text-xs flex items-center justify-center shrink-0">
                      1
                    </span>
                    <div className="flex-1">
                      <div className="font-semibold text-stone-800 flex items-center gap-1">
                        Buka Menu Chrome <MoreVertical className="w-3.5 h-3.5 text-stone-500 inline" />
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Tekan ikon <strong>titik tiga (⋮)</strong> di pojok kanan atas browser Google Chrome Anda.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="w-6 h-6 rounded-full bg-varena-gold text-varena-espresso font-bold text-xs flex items-center justify-center shrink-0">
                      2
                    </span>
                    <div className="flex-1">
                      <div className="font-semibold text-stone-800 flex items-center gap-1">
                        Pilih &quot;Instal aplikasi&quot; / &quot;Tambahkan ke Layar Utama&quot;
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Cari dan pilih opsi <strong>Instal aplikasi</strong> atau <strong>Add to Home screen</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="w-6 h-6 rounded-full bg-varena-gold text-varena-espresso font-bold text-xs flex items-center justify-center shrink-0">
                      3
                    </span>
                    <div className="flex-1">
                      <div className="font-semibold text-stone-800 flex items-center gap-1">
                        Konfirmasi &quot;Instal&quot;
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Aplikasi VARENA akan otomatis terpasang di beranda HP Anda dalam beberapa detik.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Konten Panduan iOS */}
              {activeTab === 'ios' && (
                <div className="space-y-3 text-xs text-stone-700">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="w-6 h-6 rounded-full bg-varena-gold text-varena-espresso font-bold text-xs flex items-center justify-center shrink-0">
                      1
                    </span>
                    <div className="flex-1">
                      <div className="font-semibold text-stone-800">
                        Buka di Browser Safari
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Pastikan situs dibuka menggunakan browser bawaan Apple (<strong>Safari</strong>).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="w-6 h-6 rounded-full bg-varena-gold text-varena-espresso font-bold text-xs flex items-center justify-center shrink-0">
                      2
                    </span>
                    <div className="flex-1">
                      <div className="font-semibold text-stone-800 flex items-center gap-1">
                        Tekan Tombol Bagikan <Share2 className="w-3.5 h-3.5 text-sky-600 inline" />
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Tekan ikon <strong>Bagikan / Share</strong> (kotak panah ke atas) di bilah bawah Safari.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="w-6 h-6 rounded-full bg-varena-gold text-varena-espresso font-bold text-xs flex items-center justify-center shrink-0">
                      3
                    </span>
                    <div className="flex-1">
                      <div className="font-semibold text-stone-800 flex items-center gap-1">
                        Pilih &quot;Tambah ke Layar Utama&quot; <PlusSquare className="w-3.5 h-3.5 text-stone-600 inline" />
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Gulir ke bawah, pilih <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong>, lalu tekan <strong>Tambah (Add)</strong> di kanan atas.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Info Keunggulan */}
              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Ringan &amp; Selalu Terupdate:</strong> Aplikasi ini hanya berukuran beberapa kilobyte dan otomatis terupdate setiap kali Anda membukanya.
                </p>
              </div>

              {/* Tombol Aksi */}
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="w-full py-2.5 rounded-xl bg-varena-espresso text-varena-gold font-bold text-xs hover:bg-varena-espresso-dark transition shadow"
              >
                Saya Mengerti, Tutup Panduan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
