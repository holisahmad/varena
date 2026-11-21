# RENCANA & STRATEGI UPGRADE INFRASTRUKTUR VARENA
## Panduan Efisiensi Biaya, Skalabilitas Sistem, dan Manajemen Kuota Cloud

**Dokumen Rujukan:** Efisiensi Anggaran & Roadmap Server (Lean Infrastructure Strategy)  
**Versi:** 1.0  
**Tanggal Penerbitan:** 21 November 2026  
**Status Target:** Siap Diterapkan (Production Cost-Optimization)

---

## 1. Ringkasan Eksekutif (Executive Summary)

Dalam peluncuran awal platform bisnis berbasis kemitraan langsung seperti **VARENA**, prinsip **efisiensi biaya (*lean bootstrapping*)** adalah kunci utama keberlanjutan bisnis. Alokasi modal perusahaan harus diprioritaskan pada pergerakan barang riil (stok produk kopi/teh, kemasan, izin edar, promosi kemitraan) daripada membayar biaya sewa server bulanan yang kapasitasnya belum terpakai penuh.

Berdasarkan audit komparasi teknis:
* **Paket Gratis Vercel + Prisma Postgres + Vercel Blob** saat ini sudah mampu menampung aktivitas operasional **hingga 500 member aktif**.
* Fitur pemasangan **Custom Domain (`varena.id`) di Vercel adalah 100% GRATIS** (tidak perlu membayar Vercel Pro sebesar $20/bulan).
* **Investasi wajib saat ini hanyalah Domain `.id`** seharga **Rp230.000 per tahun** (hanya sekitar Rp19.000/bulan).

---

## 2. Analisis Kapasitas Paket Gratis (0 – 500 Member)

| Komponen Cloud | Batas Kuota Paket Gratis (*Free Tier*) | Estimasi Pemakaian (200 Member) | Status Kapasitas |
|---|---|---|:---:|
| **Database (Prisma Postgres Free)** | • **200.000** Operasi Database / bulan<br>• **1.000.000** Compute Requests / bulan<br>• **2 GB (2.048 MB)** Penyimpanan Storage | • $\approx$ 65.000 Operasi / bulan<br>• $\approx$ 10 MB Data Teks & Ledger | **SANGAT AMAN**<br>*(Baru terpakai $\approx$ 32% operasi & 0,5% storage)* |
| **Aplikasi Web (Vercel Hobby Free)** | • **100 GB** Bandwidth CDN / bulan<br>• **1.000.000** Eksekusi Serverless / bulan<br>• Custom Domain + SSL Otomatis: **Tersedia** | • $\approx$ 5 – 10 GB Bandwidth / bulan<br>• $\approx$ 50.000 Eksekusi API / bulan | **SANGAT AMAN**<br>*(Baru terpakai $\approx$ 8% kuota)* |
| **Foto Bukti Transfer (Vercel Blob Free)** | • **1 GB** Penyimpanan Storage<br>• **5 GB** Bandwidth Unduhan / bulan | • $\approx$ 200 – 400 Foto Bukti Kompresi WebP ($\approx$ 60 – 120 MB) | **SANGAT AMAN**<br>*(Baru terpakai $\approx$ 10% storage)* |

> **Catatan Teknis Perhitungan:**  
> Satu transaksi pemesanan lengkap (Order + Bukti Upload + Konfirmasi Admin + Jurnal Buku Besar 10 Level + Notifikasi) hanya memakan rata-rata 12–15 operasi database baris teks. Ruang 2 GB di Prisma dapat menampung hingga lebih dari **100.000 baris transaksi pembukuan**.

---

## 3. Audit Rencana Biaya: Apakah Upgrade $30/bulan Mahal?

Rencana upgrade awal:
1. Domain `.id` di IDwebhost: **Rp230.000 / tahun** ($\approx$ Rp19.000/bln).
2. Database Prisma Starter: **$10 / bulan** ($\approx$ Rp160.000/bln).
3. Vercel Pro: **$20 / bulan** ($\approx$ Rp320.000/bln).
* **Total Biaya Rencana Awal:** $\approx \mathbf{Rp500.000\text{ per bulan}}$ (**Rp6.000.000 per tahun**).

### Temuan Audit:
1. **Vercel Pro ($20/bulan) = Pemborosan:**  
   Banyak pengembang mengira bahwa untuk menggunakan nama domain sendiri (`varena.id`) wajib berlangganan Vercel Pro. Ini keliru. Vercel paket Free mengizinkan custom domain tanpa batas biaya. Biaya $20/bulan di Vercel sebenarnya ditujukan untuk tim dengan banyak akun developer (*multi-seat collaboration*).
2. **Prisma Starter ($10/bulan) = Belum Dibutuhkan:**  
   Kecuali traffic transaksi bulanan telah melampaui 180.000 operasi (sekitar 80% kuota gratis), upgrade $10 belum memberikan dampak performa apapun selain menambah kuota storage menjadi 10 GB (sementara pemakaian saat ini baru 10 MB).

---

## 4. Roadmap Infrastruktur 3 Fase Pertumbuhan

```
[FASE 1: 0 - 500 Member]      ───►  [FASE 2: 500 - 2.000 Member]  ───►  [FASE 3: > 2.000 Member]
• Vercel Free (Custom Domain)       • Vercel Free                      • VPS Cloud Indonesia
• Prisma Postgres Free              • Prisma Starter ($10/bln)         • PostgreSQL Mandiri (Dedicated)
• Biaya: Rp230rb / TAHUN             • Biaya: ~Rp180rb / BULAN           • Biaya: ~Rp120rb / BULAN
```

### Fase 1: Go-Live & Validasi Pasar (1 s/d 500 Member)
* **Tujuan:** Peluncuran resmi, aktivasi leader, rekrutmen mitra awal.
* **Infrastruktur:**
  * Domain Resmi: `varena.id` via IDwebhost (Rp230.000/tahun).
  * Web & API: Vercel Free Tier (Tersambung ke `varena.id`).
  * Database: Prisma Postgres Free Tier (2 GB).
  * Media Bukti: Vercel Blob Storage Free Tier (1 GB).
* **Total Biaya Operasional:** **Hanya Rp230.000 per TAHUN** (Rp19.100/bulan).

---

### Fase 2: Pertumbuhan Jaringan (500 s/d 2.000 Member)
* **Tujuan:** Arus transaksi harian stabil, ekspansi agen wilayah di beberapa kota.
* **Infrastruktur:**
  * Tetap gunakan Vercel Free Tier untuk frontend/backend.
  * Upgrade Prisma Postgres ke **Starter ($10/bulan)** ketika dasbor Prisma menunjukkan pemakaian operasi telah mencapai $\ge 80\%$.
  * Keuntungan Starter: Kuota 1.000.000 operasi/bulan dan pencadangan harian otomatis (*Daily Backups 7 hari*).
* **Total Biaya Operasional:** $\approx \mathbf{Rp180.000\text{ per BULAN}}$.

---

### Fase 3: Skala Besar & Kemandirian Server (> 2.000 Member)
* **Tujuan:** Efisiensi maksimal pada volume ratusan ribu transaksi per bulan.
* **Infrastruktur Mandiri (Self-Hosted VPS di Data Center Indonesia):**
  * Sewa 1 unit Cloud VPS di penyedia lokal seperti **IDCloudHost / Biznet Gio / Niagahoster** (Data Center Jakarta / Cyber 2):
    * Spesifikasi: 2 vCPU, 4 GB RAM, 60 GB NVMe SSD.
    * Biaya: $\approx$ **Rp80.000 s/d Rp130.000 per bulan**.
  * Di dalam VPS dipasang PostgreSQL mandiri: **Tanpa batasan kuota per operasi (*unlimited operations*)** dan latensi koneksi lokal super instan ($\approx$ 5–15 ms).
* **Total Biaya Operasional:** $\approx \mathbf{Rp100.000 s/d Rp150.000 per BULAN}$.

---

## 5. Panduan Menghubungkan Domain `varena.id` (IDwebhost ke Vercel)

Ketika Anda sudah membeli domain `varena.id` di IDwebhost, ikuti langkah berikut untuk menyambungkannya ke Vercel tanpa biaya:

### Langkah A: Tambahkan Domain di Vercel Dashboard
1. Buka dashboard Vercel $\rightarrow$ Proyek **varena** / **varena-theta**.
2. Masuk ke menu **Settings** $\rightarrow$ pilih **Domains** di sebelah kiri.
3. Ketikkan nama domain Anda: `varena.id`, lalu klik **Add**.
4. Vercel akan memberikan petunjuk record DNS yang perlu dipasang.

### Langkah B: Pasang DNS Record di Member Area IDwebhost
1. Login ke panel **IDwebhost** $\rightarrow$ Kelola Domain $\rightarrow$ **DNS Management**.
2. Tambahkan 2 baris record berikut:

| Type | Name / Host | Target / Value | TTL |
|:---:|:---:|:---:|:---:|
| **A** | `@` *(atau kosongkan)* | `76.76.21.21` | Automatic / 14400 |
| **CNAME** | `www` | `cname.vercel-dns.com` | Automatic / 14400 |

### Langkah C: Perbarui Authorized Origins Google Cloud Console
Setelah domain `varena.id` terverifikasi hijau di Vercel:
1. Buka [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Edit Web Client ID Anda, lalu tambahkan:
   * **Authorized JavaScript origins:**  
     `https://varena.id`  
     `https://www.varena.id`
   * **Authorized redirect URIs:**  
     `https://varena.id/api/auth/callback/google`  
     `https://varena.id/login`
3. Klik **Simpan**.

---

## 6. Indikator Kapan Waktunya Melakukan Upgrade (Checklist)

Lakukan upgrade **hanya jika** salah satu kondisi riil berikut terpenuhi:

- [ ] Dasbor Prisma Postgres menunjukkan konsumsi operasi bulanan melebihi **160.000 operasi** (80% dari kuota 200.000). $\rightarrow$ *Tindakan: Upgrade Prisma Starter $10/bln.*
- [ ] Vercel mengirimkan email peringatan bahwa bandwidth CDN bulanan melebihi **80 GB**. $\rightarrow$ *Tindakan: Kompresi aset gambar atau aktifkan Cloudflare proxy gratis.*
- [ ] Omzet bersih perusahaan sudah menghasilkan keuntungan rutin dan membutuhkan SLA formal serta tim pengembang tambahan. $\rightarrow$ *Tindakan: Evaluasi Vercel Pro atau migrasi VPS mandiri.*

---
*Dokumen ini disusun sebagai panduan resmi penganggaran teknologi VARENA agar pertumbuhan bisnis berjalan sehat, berdaya tahan tinggi, dan terbebas dari beban biaya infrastruktur yang belum diperlukan.*
