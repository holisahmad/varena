'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, GitFork, Wallet, User as UserIcon } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const { memberOrdersBadge, memberWalletBadge, memberNetworkBadge } = useNotifications();

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

  const navItems = [
    { label: 'Beranda', href: '/', icon: Home, active: pathname === '/', badge: 0 },
    { label: 'Toko', href: '/products', icon: ShoppingBag, active: pathname.startsWith('/products'), badge: 0 },
    {
      label: 'Jaringan',
      href: user ? '/member/network' : '/login',
      icon: GitFork,
      active: pathname.startsWith('/member/network'),
      badge: user ? memberNetworkBadge : 0,
    },
    {
      label: 'Dompet',
      href: user ? '/member/wallet' : '/login',
      icon: Wallet,
      active: pathname.startsWith('/member/wallet'),
      badge: user ? memberWalletBadge : 0,
    },
    {
      label: user ? 'Profil' : 'Masuk',
      href: user ? '/member' : '/login',
      icon: UserIcon,
      active: pathname === '/member' || pathname === '/login',
      badge: user ? memberOrdersBadge : 0,
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-varena-espresso-dark/95 backdrop-blur-md border-t border-[#4A3B30] pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`relative flex flex-col items-center justify-center min-h-[44px] transition-colors ${
                item.active ? 'text-varena-gold-light font-semibold' : 'text-varena-taupe-light hover:text-varena-ivory'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 mb-0.5 ${item.active ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[14px] h-3.5 px-0.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
