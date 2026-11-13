import type { Metadata, Viewport } from 'next';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import PwaInstallPrompt from '@/components/layout/PwaInstallPrompt';

export const metadata: Metadata = {
  title: 'VARENA — Grow Together. Build Value.',
  description: 'Platform Penjualan Produk & Jaringan Kemitraan VARENA Direct Selling.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'VARENA',
  },
};

export const viewport: Viewport = {
  themeColor: '#30241D',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,400&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="min-h-full flex flex-col bg-varena-ivory text-varena-espresso pb-16 md:pb-0">
        <PwaInstallPrompt />
        <Navbar />
        <main className="flex-1 flex flex-col">{children}</main>
        <MobileBottomNav />
      </body>
    </html>
  );
}

