'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already running as PWA / standalone
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
      return;
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
    if (!deferredPrompt) {
      alert('Untuk memasang di iPhone/iPad: Tekan ikon Bagikan (Share) di Safari lalu pilih "Tambahkan ke Layar Utama" (Add to Home Screen).');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  if (isStandalone || isDismissed) {
    return null;
  }

  return (
    <aside aria-label="Instal Aplikasi" className="bg-gradient-to-r from-varena-espresso-dark via-[#3A2C23] to-varena-espresso border-b border-varena-gold/30 text-varena-ivory py-2.5 px-4 text-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-full bg-varena-gold/20 text-varena-gold-light">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-varena-gold-light">Pasang Aplikasi VARENA</span>
            <span className="hidden sm:inline text-varena-ivory/70 ml-1.5">
              Akses cepat tanpa browser & terima notifikasi bonus instan.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-varena-gold text-varena-espresso font-semibold text-xs hover:bg-varena-gold-hover transition shadow"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Instal Aplikasi</span>
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 text-varena-taupe-light hover:text-varena-ivory"
            aria-label="Tutup Banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
