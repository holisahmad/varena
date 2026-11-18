'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingBag, Menu, X, LogOut, Bell } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import NotificationDropdown from '@/components/layout/NotificationDropdown';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const { memberOrdersBadge, memberWalletBadge, totalBadgeCount, ackOrders, ackWallet } = useNotifications();

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

  const handlePortalClick = () => {
    ackOrders();
    router.push(memberOrdersBadge > 0 ? '/member#pesanan' : '/member');
  };

  const handleWalletClick = () => {
    ackWallet();
    router.push('/member/wallet');
  };

  return (
    <header className="sticky top-0 z-50 bg-varena-espresso text-varena-ivory-light border-b border-[#4A3B30] shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-9 h-9 rounded-full overflow-hidden border border-varena-gold/60 p-0.5 bg-varena-espresso-dark transition group-hover:border-varena-gold shadow-sm">
              <Image
                src="/brand/logo-circle.png"
                alt="VARENA Luxury Logo"
                width={36}
                height={36}
                className="object-contain"
                priority
              />
            </div>
            <div>
              <span className="font-serif text-xl tracking-widest font-semibold text-varena-gold-light uppercase group-hover:text-varena-gold transition">
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
                {/* Partner Portal with orders badge */}
                <button
                  onClick={handlePortalClick}
                  className={`relative transition hover:text-varena-gold-light ${
                    pathname === '/member' ? 'text-varena-gold-light font-semibold' : 'text-varena-ivory/80'
                  }`}
                >
                  Partner Portal
                  {memberOrdersBadge > 0 && (
                    <span className="absolute -top-2 -right-3 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                      {memberOrdersBadge > 9 ? '9+' : memberOrdersBadge}
                    </span>
                  )}
                </button>

                <Link
                  href="/member/network"
                  className={`transition hover:text-varena-gold-light ${
                    pathname.startsWith('/member/network') ? 'text-varena-gold-light font-semibold' : 'text-varena-ivory/80'
                  }`}
                >
                  Pohon Jaringan
                </Link>

                {/* Dompet & Komisi with wallet badge */}
                <button
                  onClick={handleWalletClick}
                  className={`relative transition hover:text-varena-gold-light ${
                    pathname.startsWith('/member/wallet') ? 'text-varena-gold-light font-semibold' : 'text-varena-ivory/80'
                  }`}
                >
                  Dompet &amp; Komisi
                  {memberWalletBadge > 0 && (
                    <span className="absolute -top-2 -right-3 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                      {memberWalletBadge > 9 ? '9+' : memberWalletBadge}
                    </span>
                  )}
                </button>
              </>
            )}

            {user?.roles?.some((r: string) => ['OWNER', 'OPERATIONS', 'ADMIN_1', 'ADMIN_2', 'KOPERASI', 'AUDITOR'].includes(r)) && (
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

          {/* Desktop User profile & Actions */}
          <div className="hidden md:flex items-center gap-3">
            {/* Desktop Notification Bell (when user logged in) */}
            {user && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                  className="p-2 rounded-lg bg-varena-espresso-light/60 hover:bg-varena-espresso-light text-varena-gold-light hover:text-white transition relative"
                  aria-label="Buka Notifikasi"
                  title="Notifikasi"
                >
                  <Bell className="w-4 h-4" />
                  {totalBadgeCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center shadow">
                      {totalBadgeCount > 9 ? '9+' : totalBadgeCount}
                    </span>
                  )}
                </button>
              </div>
            )}

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

          {/* Mobile Header Actions */}
          <div className="flex md:hidden items-center gap-1">
            {/* Notification Bell (Disamping Checkout) */}
            <button
              type="button"
              onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
              className="p-2 text-varena-gold-light hover:text-white relative rounded-lg focus:outline-none transition"
              aria-label="Notifikasi"
              title="Notifikasi"
            >
              <Bell className="w-5 h-5" />
              {totalBadgeCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center shadow leading-none">
                  {totalBadgeCount > 9 ? '9+' : totalBadgeCount}
                </span>
              )}
            </button>

            {/* Checkout ShoppingBag */}
            <Link
              href="/checkout"
              className="p-2 text-varena-gold-light hover:text-white transition"
              aria-label="Keranjang"
            >
              <ShoppingBag className="w-5 h-5" />
            </Link>

            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-varena-ivory hover:text-varena-gold-light focus:outline-none transition"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Floating Notification Dropdown Popover */}
        <NotificationDropdown
          isOpen={notifDropdownOpen}
          onClose={() => setNotifDropdownOpen(false)}
        />
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
              <button
                onClick={() => { ackOrders(); setMobileMenuOpen(false); router.push(memberOrdersBadge > 0 ? '/member#pesanan' : '/member'); }}
                className="flex items-center justify-between w-full py-2 text-sm text-varena-ivory hover:text-varena-gold-light"
              >
                <span>Dashboard Mitra</span>
                {memberOrdersBadge > 0 && (
                  <span className="bg-red-500 text-white text-[9px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                    {memberOrdersBadge > 9 ? '9+' : memberOrdersBadge}
                  </span>
                )}
              </button>
              <Link
                href="/member/network"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm text-varena-ivory hover:text-varena-gold-light"
              >
                Pohon Jaringan (Downline)
              </Link>
              <button
                onClick={() => { ackWallet(); setMobileMenuOpen(false); router.push('/member/wallet'); }}
                className="flex items-center justify-between w-full py-2 text-sm text-varena-ivory hover:text-varena-gold-light"
              >
                <span>Dompet &amp; Komisi</span>
                {memberWalletBadge > 0 && (
                  <span className="bg-red-500 text-white text-[9px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                    {memberWalletBadge > 9 ? '9+' : memberWalletBadge}
                  </span>
                )}
              </button>
              {user.roles.some((r: string) => ['OWNER', 'OPERATIONS', 'ADMIN_1', 'ADMIN_2', 'KOPERASI', 'AUDITOR'].includes(r)) && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-sm text-varena-gold font-semibold"
                >
                  Admin Panel Bisnis
                </Link>
              )}
              <button
                onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
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
