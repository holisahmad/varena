# PANDUAN PROGRAMMER & DEVOPS — VARENA PLATFORM

Panduan teknis lengkap untuk programmer yang mengelola siklus pengembangan, deployment (**GitHub → Vercel**), dan manajemen database (**PostgreSQL + Prisma ORM**) pada proyek **VARENA**.

---

## Daftar Isi
1. [Arsitektur Pipeline (GitHub → Vercel → Prisma)](#1-arsitektur-pipeline-github--vercel--prisma)
2. [Alur Update Kode & Deploy ke Vercel](#2-alur-update-kode--deploy-ke-vercel)
3. [Setting Environment Variables di Vercel](#3-setting-environment-variables-di-vercel)
4. [Menjalankan & Mengelola Database Lokal (Port 5433)](#4-menjalankan--mengelola-database-lokal-port-5433)
5. [Update Skema Database ke Prisma (Lokal & Produksi)](#5-update-skema-database-ke-prisma-lokal--produksi)
6. [Masuk ke Prisma & Melihat Data (Show / Select)](#6-masuk-ke-prisma--melihat-data-show--select)
7. [Update, Insert & Ubah Data di Prisma](#7-update-insert--ubah-data-di-prisma)
8. [Troubleshooting Umum](#8-troubleshooting-umum)

---

## 1. Arsitektur Pipeline (GitHub → Vercel → Prisma)

```text
[Kode Lokal] ──(git push origin master)──▶ [GitHub Repo]
                                                │
                                      (Auto-Trigger Webhook)
                                                ▼
                                         [Vercel Build]
                                   1. npm install
                                   2. postinstall: prisma generate
                                   3. npm run build (next build)
                                                │
                                                ▼
                                    [Vercel Serverless / Live]
                                                │
                                  (DATABASE_URL / pooled.db.prisma.io)
                                                ▼
                                    [Prisma Postgres Produksi]
```

> **Hal Penting yang Wajib Dipahami:**
> Vercel menjalankan `prisma generate` saat build, **TIDAK** menjalankan `prisma db push` secara otomatis.
> Artinya: setiap kali Anda menambah/mengubah kolom atau tabel di `prisma/schema.prisma`, Anda **wajib** menyinkronkan skema ke database produksi secara terpisah sebelum atau segera setelah deploy.

---

## 2. Alur Update Kode & Deploy ke Vercel

### A. Checklist Wajib Sebelum Push
Jalankan pemeriksaan berikut di root proyek (gunakan `;` di PowerShell, bukan `&&`):

```powershell
# 1. Cek error TypeScript (harus 0 error)
npx tsc --noEmit

# 2. Jalankan seluruh unit test
npm test

# 3. Pastikan production build sukses
npm run build
```

### B. Push ke GitHub (Auto-Deploy ke Vercel)
```powershell
git status
git add .
git commit -m "feat: deskripsi perubahan yang jelas"
git push origin master
```
Setelah `git push origin master`, Vercel akan otomatis mem-build dan men-deploy branch `master` dalam ±1–2 menit.

### C. Menggunakan Vercel CLI (Opsional)
```powershell
# Login ke akun Vercel (membuka browser untuk otorisasi)
npx vercel login

# Tarik environment variables dari Vercel ke file lokal (.env.production.local)
npx vercel env pull .env.production.local

# Melihat daftar deployment & status build
npx vercel ls

# Melihat log runtime produksi secara real-time
npx vercel logs <deployment-url>
```
> ⚠️ **Jangan pernah commit** file `.env` atau `.env.production.local` ke GitHub!

---

## 3. Setting Environment Variables di Vercel

Masuk ke **Vercel Dashboard → Project VARENA → Settings → Environment Variables**. Pastikan variabel berikut terisi untuk environment **Production** (dan Preview jika diperlukan):

| Variabel | Fungsi & Nilai |
|---|---|
| `DATABASE_URL` | Connection string **Pooled** Prisma Postgres (`postgres://...@pooled.db.prisma.io:5432/postgres?sslmode=require`). Dipakai aplikasi saat runtime agar koneksi serverless efisien. |
| `DIRECT_DATABASE_URL` | Connection string **Direct** Prisma Postgres (`postgres://...@db.prisma.io:5432/postgres?sslmode=require`). Wajib ada karena dideklarasikan di `prisma/schema.prisma` (`directUrl`). |
| `JWT_SECRET` | String acak rahasia minimal 32–64 karakter untuk signing token login (`varena_session`). |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Client ID OAuth dari Google Cloud Console untuk tombol Google Sign-In. |
| `BLOB_READ_WRITE_TOKEN` | Token Vercel Blob Storage untuk penyimpanan file/gambar upload di produksi. |
| `NEXT_PUBLIC_APP_NAME` | `"VARENA"` |
| `NEXT_PUBLIC_APP_URL` | URL domain produksi (misal `https://varena.vercel.app`). |

> Setelah mengubah Environment Variable di Vercel Dashboard, lakukan **Redeploy** pada deployment terbaru agar nilai baru terbaca oleh server.

---

## 4. Menjalankan & Mengelola Database Lokal (Port 5433)

Proyek ini memiliki cluster PostgreSQL lokal tersendiri di folder `.postgres_data/` pada port **5433** (bukan port default 5432).

```powershell
# Cek apakah Postgres lokal sedang berjalan di port 5433
netstat -ano | findstr ":5433"

# Jika belum berjalan (dan port 5433 kosong), start sebagai daemon dengan pg_ctl:
& "D:\apps\PostgreSQL\17\bin\pg_ctl.exe" start -D "C:\project\varena\.postgres_data" -l "C:\project\varena\.postgres_data\pg_start.log" -o "-p 5433" -w
```

> ⚠️ **Catatan Penting:** Jangan pernah menghapus `postmaster.pid` saat PostgreSQL sedang berjalan karena akan memicu *immediate shutdown*. Hapus `postmaster.pid` **hanya** jika `netstat -ano | findstr ":5433"` kosong tetapi server gagal start karena sisa PID lama.

Isi `.env` lokal untuk development:
```env
DATABASE_URL="postgresql://postgres@127.0.0.1:5433/varena_db?schema=public"
DIRECT_DATABASE_URL="postgresql://postgres@127.0.0.1:5433/varena_db?schema=public"
```

---

## 5. Update Skema Database ke Prisma (Lokal & Produksi)

### A. Update ke Database Lokal
```powershell
# 1. Edit prisma/schema.prisma
# 2. Push perubahan skema ke DB lokal
npx prisma db push

# 3. Regenerate Prisma Client agar TypeScript mengenal kolom baru
npx prisma generate
```

### B. Update ke Database Produksi (Prisma Postgres)
**Jangan ubah file `.env` lokal** secara permanen agar tidak tidak sengaja merusak data produksi saat testing. Set variabel environment hanya untuk sesi terminal saat ini di PowerShell:

```powershell
# Set URL produksi sementara di sesi PowerShell ini saja
$env:DATABASE_URL="postgres://<USER>:<API_KEY>@pooled.db.prisma.io:5432/postgres?sslmode=require"
$env:DIRECT_DATABASE_URL="postgres://<USER>:<API_KEY>@db.prisma.io:5432/postgres?sslmode=require"

# Push skema ke database produksi
npx prisma db push --skip-generate
```

> **Catatan:** Jika `npx prisma db push` dari jaringan lokal terkena timeout ke `db.prisma.io`, Anda dapat menjalankan query `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...` langsung lewat `PrismaClient.$executeRawUnsafe()` (satu statement per pemanggilan) menggunakan koneksi `directUrl` dengan `?sslmode=require&connect_timeout=30`.

---

## 6. Masuk ke Prisma & Melihat Data (Show / Select)

### Cara 1: Prisma Studio via Terminal (Lokal & Produksi)
Prisma Studio membuka antarmuka web di `http://localhost:5555` untuk melihat, mencari, mengedit, dan menghapus data di seluruh tabel secara visual.

- **Untuk Database Lokal:**
  ```powershell
  npx prisma studio
  ```
- **Untuk Database Produksi** *(sementara di sesi PowerShell baru)*:
  Jika Prisma Studio lokal sedang aktif di port `5555`, gunakan `--port 5556` agar keduanya bisa dibuka bersamaan:
  ```powershell
  $env:DATABASE_URL="postgres://<USER>:<API_KEY>@db.prisma.io:5432/postgres?sslmode=require"
  $env:DIRECT_DATABASE_URL="postgres://<USER>:<API_KEY>@db.prisma.io:5432/postgres?sslmode=require"
  npx prisma studio --port 5556
  ```
  - `http://localhost:5556` → **Database Produksi (Online)**
  - `http://localhost:5555` → **Database Lokal**
  - *(Tekan `Ctrl + C` dan tutup terminal setelah selesai agar variabel sesi produksi hilang).*

### Cara 2: Prisma Studio Online di Browser (Tanpa Terminal)
Anda juga dapat membuka dashboard **Prisma Data Platform** (`https://console.prisma.io`), pilih project database produksi VARENA, lalu buka tab **Studio** langsung di browser — tanpa perlu koneksi atau terminal lokal.

### Cara 3: Query `SELECT` via Script Node.js (Prisma Client)
Buat file sementara atau jalankan via `node` untuk membaca data:

```javascript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 1. Select semua produk aktif beserta variannya
const products = await prisma.product.findMany({
  where: { status: 'ACTIVE' },
  include: { variants: true },
  orderBy: { createdAt: 'desc' },
});
console.log(products);

// 2. Select 1 data spesifik (berdasarkan unique field)
const variant = await prisma.productVariant.findUnique({
  where: { sku: 'KM-SCH01' },
});
console.log(variant);

// 3. Hitung jumlah baris (COUNT)
const totalUsers = await prisma.user.count();
console.log('Total user:', totalUsers);

// 4. Raw SQL SELECT (jika butuh query SQL bebas)
const rows = await prisma.$queryRawUnsafe(`
  SELECT sku, name, price, "retailPrice", "salePrice", "memberPrice"
  FROM product_variants
  ORDER BY price DESC
`);
console.table(rows);

await prisma.$disconnect();
```

---

## 7. Update, Insert & Ubah Data di Prisma

### A. Update Data Varian Produk (Contoh: Ubah Harga / Promo)
```javascript
// Update 1 varian berdasarkan SKU
await prisma.productVariant.update({
  where: { sku: 'KM-SCH01' },
  data: {
    retailPrice: 55000,
    salePrice: 50000,
    isPromoActive: true,
    memberPrice: 50000,
    price: 50000,
  },
});
```

### B. Insert / Upsert Produk Baru
Gunakan `upsert` agar aman dijalankan berulang kali (tidak error duplikat):

```javascript
await prisma.product.upsert({
  where: { slug: 'kopi-matahari' },
  update: { status: 'ACTIVE' },
  create: {
    name: 'Kopi Matahari',
    slug: 'kopi-matahari',
    description: 'Kopi Robusta fermentasi premium...',
    status: 'ACTIVE',
    isFeatured: true,
    variants: {
      create: [
        {
          sku: 'KM-BOX10',
          name: 'Kopi Matahari Box (10 Sachet)',
          variantType: 'PACK',
          packSize: 10,
          unit: 'box',
          price: 500000,
          retailPrice: 550000,
          salePrice: 500000,
          isPromoActive: true,
          memberPrice: 500000,
          hpp: 250000,
        },
      ],
    },
  },
});
```

### C. Menjalankan Seeder Bawaan Proyek
```powershell
# Seed data lengkap (admin, leader, mitra, jaringan, produk)
npm run db:seed

# Reset/seed bersih (data inti saja)
npm run db:seed:clean
```

### D. Aturan Penting Manipulasi Data di VARENA
1. **Produk & Harga**: Selalu isi seluruh field harga (`retailPrice`, `salePrice`, `isPromoActive`, `memberPrice`, dan `price`) pada `ProductVariant`, serta pastikan `hpp` dan alokasi komisi (`sponsorReward`, `uplineRewardPerLevel * maxCommissionLevels`) tidak melebihi harga jual agar tidak terjadi defisit.
2. **Keuangan & Saldo Mitra (Ledger)**: **JANGAN** mengubah saldo wallet atau status transaksi secara manual di database! Seluruh pencatatan keuangan menggunakan sistem *double-entry ledger* (`LedgerAccount` & `LedgerEntry`). Gunakan alur resmi melalui UI Admin (`/admin`) atau API agar buku besar tetap seimbang (*balanced*).

---

## 8. Troubleshooting Umum

| Masalah / Error | Penyebab | Solusi |
|---|---|---|
| Produk hilang / error 500 di live setelah deploy | Skema baru sudah di-push ke GitHub, tapi kolom baru belum ada di DB produksi | Jalankan `prisma db push` (atau `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`) ke DB produksi, lalu `npm run build` / refresh. |
| `P1012: Environment variable not found: DIRECT_DATABASE_URL` | File `.env` atau Vercel Env belum memiliki `DIRECT_DATABASE_URL` | Tambahkan `DIRECT_DATABASE_URL` di `.env` lokal dan di Vercel Environment Variables. |
| `cannot insert multiple commands into a prepared statement` | Menjalankan lebih dari satu perintah SQL dalam satu `prisma.$executeRawUnsafe(...)` | Pisahkan setiap perintah SQL menjadi satu pemanggilan `$executeRawUnsafe` di dalam loop. |
| `npx prisma studio` menampilkan data lokal padahal ingin cek produksi | `.env` lokal mengarah ke `127.0.0.1:5433` | Override `$env:DATABASE_URL` dan `$env:DIRECT_DATABASE_URL` di sesi PowerShell sebelum menjalankan `npx prisma studio`. |
| Perintah `cmd1 && cmd2` error di PowerShell | PowerShell versi bawaan Windows menggunakan `;` untuk memisahkan perintah | Gunakan titik koma (`;`) sebagai pemisah perintah di PowerShell. |
