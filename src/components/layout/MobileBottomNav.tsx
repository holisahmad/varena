'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, GitFork, Wallet, User as UserIcon } from 'lucide-react';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem('varena_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {}
    }
  }, [pathname]);

  // Hide on admin routes to give full screen to executive console
  if (pathname.startsWith('/admin')) {
    return null;
  }

  const navItems = [
    { label: 'Beranda', href: '/', icon: Home, active: pathname === '/' },
    { label: 'Toko', href: '/products', icon: ShoppingBag, active: pathname.startsWith('/products') },
    { label: 'Jaringan', href: user ? '/member/network' : '/login', icon: GitFork, active: pathname.startsWith('/member/network') },
    { label: 'Dompet', href: user ? '/member/wallet' : '/login', icon: Wallet, active: pathname.startsWith('/member/wallet') },
    { label: user ? 'Profil' : 'Masuk', href: user ? '/member' : '/login', icon: UserIcon, active: pathname === '/member' || pathname === '/login' },
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
              className={`flex flex-col items-center justify-center min-h-[44px] transition-colors ${
                item.active ? 'text-varena-gold-light font-semibold' : 'text-varena-taupe-light hover:text-varena-ivory'
              }`}
            >
              <Icon className={`w-5 h-5 mb-1 ${item.active ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
              <span className="text-[11px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

