'use client';

/**
 * GoogleSignInButton — Real Google Identity Services (GIS) OAuth
 *
 * Flow:
 *  1. Script https://accounts.google.com/gsi/client loads once.
 *  2. google.accounts.id.initialize() is called with NEXT_PUBLIC_GOOGLE_CLIENT_ID.
 *  3. google.accounts.id.renderButton() renders Google's styled button in-place.
 *  4. User clicks → Google shows native account picker popup.
 *  5. User selects/confirms → Google calls handleCredentialResponse(response).
 *  6. response.credential (signed JWT) is sent to /api/v1/auth/google.
 *  7. Backend verifies via Google tokeninfo API, creates/logs-in user, returns JWT.
 *
 * No manual email input. No custom modal. Pure real OAuth.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface GoogleSignInButtonProps {
  label?: string;
  sponsorCode?: string;
  redirectUrl?: string;
  onSuccess?: (userData: unknown) => void;
  className?: string;
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const GIS_SCRIPT_ID = 'gis-client-script';

// Singleton tracker & proxy dispatcher agar google.accounts.id.initialize() HANYA dipanggil 1 kali
let globalGisInitialized = false;
let activeCredentialCallback: ((response: { credential: string }) => void) | null = null;

export default function GoogleSignInButton({
  sponsorCode,
  redirectUrl = '/member',
  onSuccess,
  className = '',
}: GoogleSignInButtonProps) {
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [missingConfig, setMissingConfig] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID || CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com') {
      setMissingConfig(true);
      return;
    }

    // Resolve sponsor code from prop or localStorage
    const resolvedSponsor =
      sponsorCode ||
      (typeof window !== 'undefined' ? localStorage.getItem('varena_referral_code') || '' : '');

    const handleCredentialResponse = async (response: { credential: string }) => {
      setLoading(true);
      setError('');

      try {
        const res = await fetch('/api/v1/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            credential: response.credential,
            sponsorCode: resolvedSponsor || undefined,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Gagal masuk dengan Google. Silakan coba lagi.');
        }

        // Store session
        if (typeof window !== 'undefined') {
          localStorage.setItem('varena_user', JSON.stringify(data.user));
          if (data.token) {
            localStorage.setItem('varena_token', data.token);
          }
        }

        if (onSuccess) {
          onSuccess(data);
        } else {
          router.push(redirectUrl);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan. Silakan coba lagi.');
      } finally {
        setLoading(false);
      }
    };

    activeCredentialCallback = handleCredentialResponse;

    const setupGIS = () => {
      if (!window.google?.accounts?.id) return;

      // Inisialisasi HANYA sekali di browser window
      if (!globalGisInitialized) {
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response: { credential: string }) => {
            if (activeCredentialCallback) {
              activeCredentialCallback(response);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          context: 'signup',
        });
        globalGisInitialized = true;
      }

      // Render tombol Google ke ref kontainer yang aktif
      if (buttonRef.current) {
        buttonRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: buttonRef.current.offsetWidth || 320,
        });
      }
    };

    // Load GIS script jika belum ada di document.head
    if (document.getElementById(GIS_SCRIPT_ID)) {
      if (window.google?.accounts?.id) {
        setupGIS();
      }
      return () => {
        if (activeCredentialCallback === handleCredentialResponse) {
          activeCredentialCallback = null;
        }
      };
    }

    const script = document.createElement('script');
    script.id = GIS_SCRIPT_ID;
    script.src = GIS_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = setupGIS;
    script.onerror = () => {
      setError('Gagal memuat layanan Google. Periksa koneksi internet Anda.');
    };
    document.head.appendChild(script);

    return () => {
      if (activeCredentialCallback === handleCredentialResponse) {
        activeCredentialCallback = null;
      }
      if (window.google?.accounts?.id) {
        window.google.accounts.id.cancel?.();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Unconfigured state ── */
  if (missingConfig) {
    return (
      <div className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <p className="font-semibold">Google Sign-In belum dikonfigurasi</p>
        <p className="mt-0.5 text-xs text-amber-700">
          Tambahkan{' '}
          <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">
            NEXT_PUBLIC_GOOGLE_CLIENT_ID
          </code>{' '}
          ke file <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">.env</code>.
          Daftarkan di{' '}
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Google Cloud Console
          </a>
          .
        </p>
      </div>
    );
  }

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="flex w-full items-center justify-center gap-3 rounded-xl border border-stone-200 bg-white py-3 px-4 text-sm text-stone-500 shadow-xs">
        <svg
          className="h-5 w-5 animate-spin text-stone-400"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <span>Memproses akun Google…</span>
      </div>
    );
  }

  /* ── Normal state: GIS renders the button into this div ── */
  return (
    <div className={`w-full ${className}`}>
      {/* GIS will inject a <div><iframe>…</iframe></div> inside this ref */}
      <div
        ref={buttonRef}
        className="gis-button-container w-full overflow-hidden rounded-xl"
        style={{ minHeight: 44 }}
      />

      {/* Error message */}
      {error && (
        <p className="mt-2 text-center text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
