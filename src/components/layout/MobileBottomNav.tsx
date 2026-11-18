'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Home, ShoppingBag, GitFork, Wallet, User as UserIcon } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import NotifBadge from '@/components/ui/NotifBadge';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const { memberOrdersBadge, memberWalletBadge, ackOrders, ackWallet } = useNotifications();

  useEffect(() => {
    const stored = localStorage.getItem('varena_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {}
    }
  }, [pathname]);

  // Hide on admin routes
  if (pathname.startsWith('/admin')) return null;

  const handlePesanan = () => {
    ackOrders();
    router.push(user ? (memberOrdersBadge > 0 ? '/member#pesanan' : '/member') : '/login');
  };

  const handleDompet = () => {
    ackWallet();
    router.push(user ? '/member/wallet' : '/login');
  };

  const isOrdersActive = pathname === '/member';
  const isWalletActive = pathname.startsWith('/member/wallet');

  const staticItems = [
    { label: 'Beranda', href: '/', icon: Home, active: pathname === '/' },
    { label: 'Toko', href: '/products', icon: ShoppingBag, active: pathname.startsWith('/products') },
    { label: 'Jaringan', href: user ? '/member/network' : '/login', icon: GitFork, active: pathname.startsWith('/member/network') },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-varena-espresso-dark/95 backdrop-blur-md border-t border-[#4A3B30] pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5 h-16">
        {/* Static items */}
        {staticItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center min-h-[44px] transition-colors ${
                item.active ? 'text-varena-gold-light font-semibold' : 'text-varena-taupe-light hover:text-varena-ivory'
              }`}
            >
              <Icon className={`w-5 h-5 mb-1 ${item.active ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
              <span className="text-[11px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}

        {/* Dompet — with wallet badge */}
        <button
          onClick={handleDompet}
          className={`flex flex-col items-center justify-center min-h-[44px] transition-colors relative ${
            isWalletActive ? 'text-varena-gold-light font-semibold' : 'text-varena-taupe-light hover:text-varena-ivory'
          }`}
        >
          <div className="relative">
            <Wallet className={`w-5 h-5 mb-1 ${isWalletActive ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
            <NotifBadge count={memberWalletBadge} />
          </div>
          <span className="text-[11px] tracking-tight">Dompet</span>
        </button>

        {/* Profil / Pesanan — with orders badge */}
        <button
          onClick={handlePesanan}
          className={`flex flex-col items-center justify-center min-h-[44px] transition-colors relative ${
            isOrdersActive || pathname === '/login' ? 'text-varena-gold-light font-semibold' : 'text-varena-taupe-light hover:text-varena-ivory'
          }`}
        >
          <div className="relative">
            <UserIcon className={`w-5 h-5 mb-1 ${isOrdersActive ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
            <NotifBadge count={memberOrdersBadge} />
          </div>
          <span className="text-[11px] tracking-tight">{user ? 'Profil' : 'Masuk'}</span>
        </button>
      </div>
    </nav>
  );
}
