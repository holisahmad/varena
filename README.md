# VARENA — Platform Direct Selling & Keagenan Resmi Modern

[![Next.js](https://img.shields.io/badge/Next.js-16_Turbopack-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.0-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-336791?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/Compliance-Permendag_70%2F2019-emerald?style=flat)](#kepatuhan-hukum--integritas-bisnis)

VARENA adalah platform teknologi terintegrasi untuk ekosistem **Penjualan Langsung (Direct Selling)**, **Keagenan Wilayah Resmi (Regional Agent Hub)**, dan **E-Commerce Konsumen**. Dirancang dengan standar akuntansi buku besar berpasangan (*double-entry ledger*), kepatuhan regulasi penjualan langsung Indonesia, performa mobile tinggi, dan pengalaman pengguna modern bebas *AI-slop*.

---

## Daftar Isi
- [Kepatuhan Hukum & Integritas Bisnis](#kepatuhan-hukum--integritas-bisnis)
- [Fitur Utama Sistem](#fitur-utama-sistem)
- [Arsitektur & Tech Stack](#arsitektur--tech-stack)
- [Struktur Direktori](#struktur-direktori)
- [Panduan Instalasi & Menjalankan Lokal](#panduan-instalasi--menjalankan-lokal)
- [Variabel Lingkungan (.env)](#variabel-lingkungan-env)
- [Alur Bisnis & Logika Inti](#alur-bisnis--logika-inti)
- [API & Endpoint Utama](#api--endpoint-utama)
- [Perintah Pengembangan (CLI)](#perintah-pengembangan-cli)

---

## Kepatuhan Hukum & Integritas Bisnis

Sistem VARENA dibangun di atas prinsip integritas hukum dan kepatuhan ketat terhadap **Permendag No. 70/2019**:
1. **Bukan Skema Piramida / Money Game**: Tidak ada biaya pendaftaran terselubung. Hak bonus/komisi kemitraan dihitung 100% dari perputaran omzet penjualan produk nyata (*real goods turnover*).
2. **Konsumen Bebas Berbelanja**: Konsumen umum dapat membeli produk langsung tanpa diwajibkan mendaftar sebagai mitra jaringan atau membayar biaya keanggotaan.
3. **Legalitas Produk Riil**: Terhubung dengan data izin edar resmi BPOM RI dan sertifikasi Halal Kemenag pada seluruh varian produk.
4. **Buku Besar Transparan (Anti-Fictitious Accounting)**: Setiap rupiah dana masuk, potongan diskon, kode unik, komisi, dan penarikan tercatat pada tabel pembukuan ganda berpasangan (*balanced debit-credit double-entry ledger*).

---

## Fitur Utama Sistem

### 1. Portal Konsumen & E-Commerce Publik
- **Katalog Produk Dinamis & Multi-Tier Pricing**: Menampilkan produk unggulan (seperti Kopi Matahari Robusta Premium & varian minuman herbal kesehatan) lengkap dengan komposisi, uji mutu, nomor izin edar, serta harga dinamis per varian dari database:
  - **Konsumen Non-Mitra**: Harga ritel normal (`retailPrice`) dengan dukungan **harga coret promo** (`salePrice` saat `isPromoActive = true`, misal ~~Rp55.000~~ → **Rp50.000**/pcs atau ~~Rp550.000~~ → **Rp500.000**/box).
  - **Mitra Resmi**: Harga modal tetap khusus mitra (`memberPrice`, misal **Rp50.000**/pcs atau **Rp500.000**/box) tanpa bergantung periode promo.
- **Pemesanan Instan & Checkout Adaptif**:
  - Validasi alamat kurir fleksibel (Nama, No. WhatsApp, Jalan, Kota, Provinsi). Kecamatan dan Kode Pos opsional sehingga tidak memblokir pembeli.
  - Alamat pengiriman tersimpan di profil terintegrasi otomatis dengan sistem fallback identitas.
  - Integrasi kode referral mitra sponsor dengan validasi instan.
- **Lacak Resi & Logistik Pengiriman (`/track`)**: Pelacakan paket kurir transparan (JNE, J&T, SiCepat) dengan timeline status pengiriman riil.

### 2. Portal Kemitraan & Member Dashboard (`/member`)
- **Dashboard Ringkasan Bisnis**: Memantau komisi sponsor langsung, bonus pengembangan jaringan, riwayat pesanan pribadi, dan tautan referral mitra.
- **Pohon Jaringan Dual-Structure (`/member/network`)**:
  - Visualisasi interaktif struktur **Penempatan Jaringan (Placement Tree)**.
  - Daftar mitra rujukan langsung **Sponsor Relationship**.
- **Dompet Digital & Rekening Koran (`/member/wallet`)**:
  - Saldo Dompet Tunai, Saldo Kode Unik Terkumpul, dan Saldo Deposit Belanja.
  - Rekening Koran Buku Besar (Mutasi Mutlak) dengan mekanisme *silent background update* (SWR) bebas kedip (*anti-flicker*).
  - Penguncian Rekening Bank Penarikan (*Bound Bank Account*) untuk perlindungan dana anti-pembobolan.
  - Pengajuan Penarikan Dana (Withdrawal) ke bank mitra (BCA, Mandiri, BRI, BNI, dll.).
- **Pengaturan Profil & KYC (`/member/profile`)**:
  - Nama KTP resmi, NIK, alamat pengiriman default, nomor WhatsApp aktif, dan indikator persentase kelengkapan profil.

### 3. Keagenan Resmi Regional (`/agent`)
- **Pusat Pasokan Grosir**: Pengambilan stok per box dengan diskon berjenjang resmi (Persentase / Potongan Tetap per Box).
- **Manajemen Deposit Kas Agen**: Top-up saldo deposit belanja/agen dengan verifikasi bukti transfer otomatis.
- **Alur Order Routing & Dropship Pusat**: Hak melayani pesanan mitra/konsumen di wilayah kota/provinsi agen atau mengajukan *central dispatch* jika stok habis.
- **Mutasi Stok Fisik Box**: Catatan masuk/keluar inventaris fisik di gudang agen.

### 4. Pusat Kendali Bisnis / Admin Console (`/admin`)
- **Maker-Checker Financial Approval**: Persetujuan penarikan dana bertahap untuk mencegah salah transfer atau penarikan ganda.
- **Filter Khusus Verifikasi Transfer**: Tab khusus untuk memproses bukti bayar manual yang diunggah konsumen/mitra dalam 1-klik.
- **Manajemen Produk Dinamis**: Tambah/edit produk, unggah foto WebP otomatis, skema harga grosir, dan pengaturan tayang produk.
- **Pengiriman Massal (Bulk Shipping)**: Input resi kurir massal berbasis format baris cepat.
- **Audit Log Terenkripsi 60 Hari**: Rekam jejak seluruh perubahan data, IP Address, dan aksi administratif untuk kebutuhan audit internal.
- **Pengaturan Sistem Global (System Settings)**: Konfigurasi rekening bank penampung utama, batas minimal WD, MOQ agen, dan biaya layanan.

### 5. Notifikasi Realtime Lintas Peran
- Poling aktif latar belakang (4 detik saat tab aktif) dengan pengenalan otomatis untuk:
  - **Mitra**: Downline baru mendaftar, downline melakukan order, bonus komisi baru masuk dompet, status pencairan dana, paket sedang dikirim, status verifikasi deposit, dan status agen.
  - **Admin**: Bukti bayar disubmit, pengajuan agen baru, top-up deposit masuk, pendaftaran member baru, dan pesanan lunas siap kemas.
- Badge counter otomatis pada navbar desktop dan navigasi bawah mobile (*Mobile Bottom Nav*).

### 6. Mesin Kompresi Gambar WebP Otomatis
- Mengonversi otomatis foto bukti transfer berukuran 3–8 MB dari kamera ponsel menjadi file WebP ringan berukuran **~40–60 KB** dalam waktu ~0.1 detik di sisi klien sebelum diunggah ke server. Menghemat bandwidth hingga 95% dan mempercepat pemrosesan.

---

## Arsitektur & Tech Stack

```mermaid
graph TD
    Client["Client Browser / PWA (Next.js 16 + React 19)"]
    API["API Layer (Next.js Route Handlers + Edge Runtime)"]
    DB[(PostgreSQL 17 Database)]
    Prisma["Prisma ORM Client (Strict Schema)"]
    Upload["WebP Storage (/public/uploads)"]
    GIS["Google Identity Services (GIS Singleton)"]

    Client -->|REST API / JSON| API
    Client -->|OAuth Credential| GIS
    GIS -->|JWT Verification| API
    API -->|Transactions & Queries| Prisma
    Prisma -->|ACID Persistence| DB
    Client -->|Compressed WebP Upload| API
    API -->|Save Proof/Images| Upload
```

| Lapisan | Teknologi | Deskripsi |
|---|---|---|
| **Framework** | Next.js 16.5 (Turbopack) | App Router, Server Components, dan Route Handlers dinamis |
| **Bahasa** | TypeScript 5.9 | Pengetikan tipe ketat (*strict mode*), 0 compile error |
| **Database** | PostgreSQL 17 | Relational database dengan ACID transaction isolation |
| **ORM** | Prisma 6.0 | Manajemen skema, migrasi aman, dan relasi data berantai |
| **Autentikasi** | JWT + Google GIS | Dual session: Bearer Token Http-safe + Google One-Tap Singleton |
| **Styling** | Tailwind CSS 3.4 | Luxury Earth Tone (Espresso, Gold, Ivory, Taupe) & Responsive UI |
| **Ikon** | Lucide React | Ikon modern, intuitif, dan ringan |

---

## Struktur Direktori

```text
varena/
├── prisma/
│   ├── schema.prisma              # Skema lengkap database PostgreSQL (User, Member, Order, Ledger, dll.)
├── public/
│   ├── brand/                     # Aset identitas merek (logo, favicon, foto produk)
│   └── uploads/                   # Folder upload bukti transfer & produk terkompresi WebP
│       └── proof/                 # Bukti transfer pembayaran terisolasi
├── scripts/
│   └── seed.mjs                   # Seeder data awal (admin korporat, produk, mitra, jaringan)
├── src/
│   ├── app/
│   │   ├── (public)/              # Beranda (page.tsx), Produk (/products), Lacak (/track)
│   │   ├── admin/                 # Business Panel Corporate Console (/admin)
│   │   ├── agent/                 # Portal Agen Resmi & Checkout Grosir (/agent)
│   │   ├── checkout/              # Halaman Checkout Konsumen & Mitra (/checkout)
│   │   ├── confirm-payment/       # Upload Bukti Bayar Mandiri (/confirm-payment)
│   │   ├── login/ & register/     # Autentikasi Pengguna & Pendaftaran Downline
│   │   ├── member/                # Dashboard Mitra, Jaringan, Dompet, Profil
│   │   └── api/v1/                # Endpoint Backend RESTful (Auth, Orders, Admin, Notifications, Webhooks)
│   ├── components/
│   │   ├── admin/                 # Tab Produk, Tab Pengaturan, Panel Keagenan
│   │   ├── auth/                  # GoogleSignInButton (Singleton GIS)
│   │   ├── catalog/               # PriceTag (Komponen harga dinamis & harga coret promo)
│   │   ├── layout/                # Navbar, MobileBottomNav, NotificationDropdown
│   │   └── ui/                    # Dialog Konfirmasi, Toast, Pagination
│   ├── config/                    # Konfigurasi perbankan & rekening penampung resmi
│   ├── contexts/                  # NotificationContext (Real-time polling & stable ACK ref)
│   ├── lib/                       # Utilitas Inti (prisma.ts, pricing.ts, order.ts, ledger.ts, commission.ts, jwt.ts, image-compression.ts)
│   └── types/                     # Definisi TypeScript global
├── .env.production.example        # Template konfigurasi variabel lingkungan
├── next.config.mjs                # Konfigurasi Next.js (Allowed dev origins, format gambar WebP/AVIF)
├── package.json                   # Dependensi & skrip proyek
└── tsconfig.json                  # Konfigurasi kompiler TypeScript
```

---

## Panduan Instalasi & Menjalankan Lokal

### 1. Prasyarat Sistem
- **Node.js**: Versi `20.x` atau lebih baru
- **NPM**: Versi `10.x` atau lebih baru
- **PostgreSQL**: Versi `16` atau `17` (berjalan lokal atau cloud)

### 2. Klon Repositori
```bash
git clone https://github.com/holisahmad/varena.git
cd varena
```

### 3. Instal Dependensi
```bash
npm install
```

### 4. Konfigurasi Database & Environment
Salin file konfigurasi contoh:
```bash
cp .env.production.example .env
```
Buka file `.env` dan sesuaikan koneksi database PostgreSQL Anda:
```env
DATABASE_URL="postgresql://postgres:password_anda@localhost:5433/varena_db?schema=public"
DIRECT_DATABASE_URL="postgresql://postgres:password_anda@localhost:5433/varena_db?schema=public"
JWT_SECRET="ganti_dengan_kunci_rahasia_acak_minimal_32_karakter"
NEXT_PUBLIC_GOOGLE_CLIENT_ID="your-google-oauth-client-id.apps.googleusercontent.com"
```

### 5. Sinkronisasi Skema Database & Seeding Data
Jalankan migrasi skema Prisma ke database:
```bash
npx prisma db push
```
Isi database dengan data inisial lengkap (Admin, Leader, Mitra, Produk, dan Sistem):
```bash
node scripts/seed.mjs
```

### 6. Jalankan Server Pengembangan
```bash
npm run dev
```
Aplikasi akan aktif di **`http://localhost:3000`** (atau via IP LAN laptop pada port 3000 untuk pengujian HP).

---

## Akun Demo & Akses Awal (Hasil Seeding)

| Peran | Email | Kata Sandi | Deskripsi Akses |
|---|---|---|---|
| **Owner / Corporate** | `owner@varena.id` | `Admin123!` | Akses penuh konsol `/admin` & Maker-Checker |
| **Operasional / Logistik** | `ops@varena.id` | `Admin123!` | Akses kelola stok produk & pengiriman resi |
| **Mitra Leader 1** | `bambang@varena.id` | `Mitra123!` | Dashboard `/member` (`VRN-LDR-01`) |
| **Mitra Aktif** | `ahmad.fauzi@varena.id` | `Mitra123!` | Dashboard `/member` (`VRN-0001`) |

---

## Alur Bisnis & Logika Inti

### 1. Pembukuan Ganda (*Double-Entry Ledger*)
Setiap transaksi keuangan diverifikasi secara berpasangan:
- **Order Lunas**: Debit Kas Perusahaan (`VARENA_MAIN_BANK`) vs. Kredit Pendapatan Penjualan Produk (`PRODUCT_SALES_REVENUE`).
- **Komisi Terkredit**: Debit Beban Komisi (`COMMISSION_EXPENSE`) vs. Kredit Kewajiban Saldo Mitra (`MEMBER_WALLET_LIABILITY`).
- **Pencairan Dana (WD)**: Debit Kewajiban Saldo Mitra vs. Kredit Kas Perusahaan.

### 2. Proteksi Pengeluaran Dana (*Maker-Checker Withdrawal*)
1. Mitra mengajukan penarikan dana di menu Dompet (rekening bank wajib telah dikunci).
2. Status tercatat `REQUESTED` dan masuk ke notifikasi Admin Finance.
3. Admin meninjau keabsahan mutasi buku besar sebelum menyetujui (`APPROVED`).
4. Setelah dana ditransfer via internet banking, admin memasukkan nomor referensi bank untuk mengubah status menjadi `PAID`.

### 3. Pemrosesan Bukti Bayar Manual (Transfer Bank)
1. Pembeli transfer nominal tepat hingga 3 digit kode unik.
2. Pembeli mengunggah bukti bayar (gambar dikompres WebP secara otomatis).
3. Pesanan berstatus biru `Menunggu Verifikasi Admin`.
4. Admin memverifikasi di tab **Verifikasi Transfer (X)**; pesanan otomatis berubah `PAID` dan bonus langsung dialokasikan ke dompet sponsor.

### 4. Mesin Harga Dinamis Multi-Tier (`src/lib/pricing.ts`)
Seluruh harga dikelola secara dinamis di database per varian (`ProductVariant`) tanpa hardcode:
- **`resolveVariantPrice(variant, isMitra)`** menentukan harga satuan (`unitPrice`), harga asli coret (`originalPrice`), nominal & persentase diskon, serta label badge secara konsisten untuk UI (`PriceTag`) maupun kalkulasi order di server (`src/lib/order.ts`).
- **Otoritas Harga Server-Side**: Total tagihan checkout selalu dihitung ulang di server berdasarkan status kemitraan pembeli untuk mencegah manipulasi harga dari sisi klien.

---

## API & Endpoint Utama

| Method | Endpoint | Kegunaan |
|---|---|---|
| `GET` | `/api/v1/catalog/products` | Mengambil daftar produk & varian aktif |
| `POST` | `/api/v1/orders/checkout` | Pembuatan pesanan konsumen/mitra |
| `POST` | `/api/v1/orders/payment` | Konfirmasi pembayaran lunas |
| `GET` | `/api/v1/wallet` | Rincian saldo & mutasi buku besar mitra |
| `POST` | `/api/v1/payout/request` | Pengajuan penarikan dana mitra |
| `GET` | `/api/v1/notifications/badge` | Sinkronisasi notifikasi & counter badge realtime |
| `POST` | `/api/v1/upload` | Upload & kompresi file gambar/bukti bayar ke WebP |
| `GET` | `/api/v1/network/tree` | Struktur pohon penempatan jaringan mitra |
| `POST` | `/api/v1/admin/orders/bulk-ship` | Input nomor resi pengiriman massal |

---

## Perintah Pengembangan (CLI)

```bash
# Menjalankan server lokal (Turbopack)
npm run dev

# Memeriksa kepatuhan tipe TypeScript (Zero Error Standard)
npx tsc --noEmit

# Menjalankan seluruh unit test (termasuk Pricing Engine)
npm test

# Membuat bundle produksi
npm run build

# Menjalankan bundle produksi lokal
npm run start

# Menjalankan ulang seed database
node scripts/seed.mjs
```

---

## Hak Cipta & Pengembang
Dikembangkan untuk ekosistem resmi **VARENA Direct Selling**.  
Seluruh hak cipta dan kepemilikan merek dagang dilindungi undang-undang.
