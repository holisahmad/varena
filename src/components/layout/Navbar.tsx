'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ShoppingBag, Users, Wallet, Shield, Menu, X, LogIn, LogOut } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('varena_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {}
    }
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('varena_user');
    setUser(null);
    window.location.href = '/';
  };

  return (
    <header className="sticky top-0 z-40 bg-varena-espresso text-varena-ivory-light border-b border-[#4A3B30] shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Brand */}
          <Link href="/" className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-full overflow-hidden border border-varena-gold/60 p-0.5 bg-varena-espresso-dark">
              <Image
                src="/brand/varena-connected-v-symbol.png"
                alt="VARENA Logo"
                width={36}
                height={36}
                className="object-contain"
              />
            </div>
            <div>
              <span className="font-serif text-xl tracking-widest font-semibold text-varena-gold-light uppercase">
                VARENA
              </span>
              <span className="hidden sm:inline-block text-[10px] text-varena-taupe-light ml-2 uppercase tracking-wider">
                Direct Selling
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <Link
              href="/products"
              className={`transition hover:text-varena-gold-light ${
                pathname.startsWith('/products') ? 'text-varena-gold-light font-semibold' : 'text-varena-ivory/80'
              }`}
            >
              Katalog Market
            </Link>

            {user && (
              <>
                <Link
                  href="/member"
                  className={`transition hover:text-varena-gold-light ${
                    pathname === '/member' ? 'text-varena-gold-light font-semibold' : 'text-varena-ivory/80'
                  }`}
                >
                  Partner Portal
                </Link>
                <Link
                  href="/member/network"
                  className={`transition hover:text-varena-gold-light ${
                    pathname.startsWith('/member/network') ? 'text-varena-gold-light font-semibold' : 'text-varena-ivory/80'
                  }`}
                >
                  Pohon Jaringan
                </Link>
                <Link
                  href="/member/wallet"
                  className={`transition hover:text-varena-gold-light ${
                    pathname.startsWith('/member/wallet') ? 'text-varena-gold-light font-semibold' : 'text-varena-ivory/80'
                  }`}
                >
                  Dompet & Komisi
                </Link>
              </>
            )}

            {user?.roles?.some((r: string) => ['OWNER', 'OPERATIONS', 'ADMIN_1', 'ADMIN_2'].includes(r)) && (
              <Link
                href="/admin"
                className={`transition px-2.5 py-1 rounded text-xs tracking-wider uppercase font-semibold ${
                  pathname.startsWith('/admin')
                    ? 'bg-varena-gold text-varena-espresso-dark'
                    : 'bg-varena-espresso-light text-varena-gold-light border border-varena-gold/40'
                }`}
              >
                Business Panel
              </Link>
            )}
          </nav>

          {/* User profile & Actions */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs font-semibold text-varena-ivory">{user.displayName}</div>
                  <div className="text-[10px] text-varena-gold-light font-mono">{user.memberCode || user.roles[0]}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg bg-varena-espresso-light/60 hover:bg-varena-espresso-light text-varena-ivory/80 hover:text-varena-gold-light transition"
                  title="Keluar"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-xs font-medium px-4 py-2 rounded border border-varena-gold/60 text-varena-gold-light hover:bg-varena-gold hover:text-varena-espresso transition"
                >
                  Masuk Mitra
                </Link>
                <Link
                  href="/checkout"
                  className="text-xs font-semibold px-4 py-2 rounded bg-varena-gold text-varena-espresso hover:bg-varena-gold-hover transition shadow"
                >
                  Belanja
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu trigger */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/checkout"
              className="p-2 text-varena-gold-light"
              aria-label="Keranjang"
            >
              <ShoppingBag className="w-5 h-5" />
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-varena-ivory hover:text-varena-gold-light focus:outline-none"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-varena-espresso-dark border-t border-[#4A3B30] px-4 pt-3 pb-6 space-y-3">
          <Link
            href="/products"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm text-varena-ivory hover:text-varena-gold-light"
          >
            Katalog Produk
          </Link>
          <Link
            href="/checkout"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm text-varena-ivory hover:text-varena-gold-light"
          >
            Checkout Konsumen
          </Link>

          {user ? (
            <>
              <div className="pt-2 border-t border-varena-espresso-light">
                <div className="text-xs text-varena-gold-light font-mono font-semibold">{user.displayName} ({user.memberCode})</div>
              </div>
              <Link
                href="/member"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm text-varena-ivory hover:text-varena-gold-light"
              >
                Dashboard Mitra
              </Link>
              <Link
                href="/member/network"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm text-varena-ivory hover:text-varena-gold-light"
              >
                Pohon Jaringan (Downline)
              </Link>
              <Link
                href="/member/wallet"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm text-varena-ivory hover:text-varena-gold-light"
              >
                Dompet & Komisi
              </Link>
              {user.roles.some((r: string) => ['OWNER', 'ADMIN_1', 'ADMIN_2'].includes(r)) && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-sm text-varena-gold font-semibold"
                >
                  Admin Panel Bisnis
                </Link>
              )}
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left py-2 text-sm text-red-400 hover:text-red-300"
              >
                Keluar
              </button>
            </>
          ) : (
            <div className="pt-3 border-t border-varena-espresso-light flex flex-col gap-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 text-sm font-semibold rounded border border-varena-gold/60 text-varena-gold-light"
              >
                Masuk Mitra
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 text-sm font-semibold rounded bg-varena-gold text-varena-espresso"
              >
                Daftar Kemitraan
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

