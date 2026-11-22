# RENCANA & STRATEGI UPGRADE INFRASTRUKTUR VARENA
## Panduan Skalabilitas Sistem, Manajemen Kuota Cloud, dan Efisiensi Anggaran (Lean Bootstrapping)

**Dokumen Rujukan:** Manajemen Kuota Server & Database (Production Cost-Optimization)  
**Versi:** 2.0 (Diperbarui pasca-audit beban sistem & metrik live)  
**Tanggal Pembaruan:** 22 November 2026  
**Status Target:** Berjalan Aktif di Produksi (Free Tier Safe Mode)

---

## 1. Ringkasan Eksekutif & Status Metrik Live Saat Ini

Berdasarkan pembacaan metrik langsung (*realtime telemetry*) di lingkungan produksi:
* **Prisma Postgres**: 
  - Konsumsi Operasi: **26.8K / 200K operasi** ($0.00 — Kuota tersisa 173.200 operasi).
  - Storage: **0.0 GiB / 2.0 GiB**.
  - Compute Requests: **0 / 1 Juta**.
* **Vercel Hosting**: 
  - Function Invocations: **597 eksekusi / 6 jam** ($\approx$ 100/jam, proyeksi bulanan $\sim$72K dari batas 1 Juta).
  - CDN Requests: **2.2K** (disajikan cepat dari Edge CDN).
  - Error Rate: **0%** (*Zero Error / Rock Solid*).

### Kesimpulan Fundamental:
1. **Paket Free Tier Vercel + Prisma Postgres saat ini 100% AMAN & LAYAK** untuk pertumbuhan mitra awal.
2. Keputusan mematikan *background polling* otomatis (`ENABLE_BACKGROUND_POLLING = false`) dan menggantinya dengan *Smart On-Demand Notification* berhasil memangkas konsumsi query hingga **95%**, mencegah lonjakan habisnya kuota 200K di awal bulan.
3. **Vercel dan Prisma adalah dua entitas yang berbeda.** Meng-upgrade Vercel Pro ($20/bulan) **TIDAK AKAN** menaikkan kuota database Prisma.

---

## 2. Klarifikasi Billing: Vercel vs Prisma Postgres

Banyak founder/developer keliru mengira bahwa meng-upgrade akun Vercel akan otomatis menyelesaikan masalah kuota database. Tabel berikut menjelaskan pemisahannya:

| Komponen | Penyedia Layanan | Batas Paket Gratis (*Free Tier*) | Jika Kuota Habis | Solusi Upgrade yang Tepat |
|---|---|---|---|---|
| **Hosting & Frontend/API** | **Vercel** (Hobby) | • 1.000.000 Function Invocations/bln<br>• 100 GB Bandwidth CDN/bln | Request dibatasi / diberi peringatan | Upgrade ke **Vercel Pro ($20/bln)** *(Hanya jika eksekusi fungsi tembus 1 juta/bln)* |
| **Database Mesin SQL** | **Prisma** (Prisma Data Platform / Postgres) | • **200.000** Operasi Query/bln<br>• 2 GB Storage Penyimpanan<br>• 1.000.000 Compute Requests | Query database di-*pause* sementara hingga tgl 1 | Upgrade ke **Prisma Starter ($10/bln)** via `console.prisma.io` |

> ⚠️ **PERINGATAN ANGGARAN:**  
> Jika suatu saat operasi database Anda menyentuh 180K–200K, **JANGAN upgrade Vercel Pro ($20/bln)**. Yang wajib Anda upgrade **HANYA PRISMA STARTER ($10/bln)**. Akun Vercel Anda tetap biarkan di paket **FREE ($0.00)** karena kapasitas Vercel masih sangat longgar (baru terpakai <8%).

---

## 3. Simulasi Matematis Beban Pertumbuhan Mitra

Dengan arsitektur *Smart On-Demand* (query hanya berjalan saat buka halaman, klik lonceng notifikasi, atau transaksi belanja/pencairan), berikut adalah proyeksi beban nyata:

### Skenario A: 300 Mitra (Bulan ke-1)
* **Kunjungan Pengguna**: 300 mitra $\times$ rata-rata 15 sesi/bulan = $4.500\text{ kunjungan}$.
* **Beban Query Baca**: $4.500 \times 12\text{ query/sesi} = \mathbf{54.000\text{ operasi}}$.
* **Transaksi Belanja & Mutasi**: $\sim 20.000\text{ operasi}$ (pendaftaran perdana, pesanan, pembukuan komisi).
* **Total Pemakaian Database**: **$\sim 74.000\text{ operasi / bulan}$**.
* **Persentase Kuota Prisma**: **37%** dari 200.000 limit (*Sisa 126.000 operasi*).
* **Pemakaian Vercel Invocations**: $\sim 60.000$ (hanya 6% dari 1 juta).
* 🟢 **Status Anggaran: 100% GRATIS ($0.00)**.

---

### Skenario B: 500 Mitra (Bulan ke-2)
* **Kunjungan Pengguna**: 500 mitra $\times$ 15 sesi/bulan = $7.500\text{ kunjungan}$.
* **Beban Query Baca**: $7.500 \times 12\text{ query/sesi} = \mathbf{90.000\text{ operasi}}$.
* **Transaksi Belanja & Mutasi**: $\sim 35.000\text{ operasi}$ (repeat order, bonus payout, registrasi baru).
* **Total Pemakaian Database**: **$\sim 125.000\text{ operasi / bulan}$**.
* **Persentase Kuota Prisma**: **62.5%** dari 200.000 limit (*Sisa 75.000 operasi*).
* **Pemakaian Vercel Invocations**: $\sim 110.000$ (hanya 11% dari 1 juta).
* 🟢 **Status Anggaran: 100% GRATIS ($0.00)**.

---

### Skenario C: 800 s/d 1.000 Mitra (Titik Transisi / Ambang Batas)
* **Total Pemakaian Database**: **$\sim 180.000 - 220.000\text{ operasi / bulan}$**.
* **Kondisi**: Mendekati atau menyentuh ambang batas 200.000 operasi Prisma.
* 🟡 **Tindakan**: **Lakukan upgrade ke Prisma Starter ($10/bulan $\approx$ Rp160.000)**.
* **Hasil Pasca-Upgrade**:
  - Kuota operasi langsung melonjak **5x lipat** menjadi **1.000.000 operasi/bulan**.
  - Kapasitas penyimpanan naik dari **2 GB $\rightarrow$ 10 GB**.
  - Fitur **Daily Backup otomatis** aktif.
  - Vercel tetap di paket **Free ($0.00)**.
  - **Total Biaya Bulanan:** **Hanya Rp160.000 / bulan** (sangat kecil dibanding omzet ratusan mitra).

---

## 4. Matriks Ringkasan Roadmap & Biaya

| Tahapan | Jumlah Mitra | Status Vercel | Status Database | Biaya Bulanan |
|---|:---:|:---:|:---:|:---:|
| **Fase 1 (Peluncuran)** | 0 – 300 Mitra | **Free Tier** | **Prisma Free (200K Ops)** | **Rp0 / bln** *(Hanya domain Rp230rb/thn)* |
| **Fase 2 (Validasi)** | 300 – 500 Mitra | **Free Tier** | **Prisma Free (200K Ops)** | **Rp0 / bln** |
| **Fase 3 (Skalabilitas)** | 800 – 2.000 Mitra | **Free Tier** | **Prisma Starter ($10/bln)** | **$\approx$ Rp160.000 / bln** |
| **Fase 4 (Enterprise)** | > 2.000 Mitra | **Free Tier / Custom** | **VPS Dedicated Mandiri** | **$\approx$ Rp120.000 – Rp200.000 / bln** |

---

## 5. Panduan Taktis Melakukan Upgrade Prisma ($10/bln)

Lakukan prosedur ini **hanya ketika** konsumsi operasi di console Prisma sudah menyentuh **$\ge 170.000$ operasi** (85% kuota):

1. Buka halaman pengaturan tagihan Prisma Anda:
   [https://console.prisma.io/.../settings/billing](https://console.prisma.io/v69nzupp8ilfufftxdrvjdui/settings/billing)  
   *(Atau lewat Vercel Dashboard $\rightarrow$ tab Integrations $\rightarrow$ Prisma $\rightarrow$ Settings)*.
2. Klik tombol **Upgrade** di samping keterangan *Free Plan*.
3. Pilih paket **Starter ($10/month)**.
4. Masukkan metode pembayaran kartu debit/kredit/virtual card.
5. **Konfirmasi Selesai**: Kuota operasi seketika bertambah menjadi 1.000.000 operasi **tanpa ada *downtime*** (web dan data transaksi mitra tidak terganggu sama sekali).

---

## 6. Checklist Pemantauan Rutin (Admin / Tech Lead)

- [ ] **Setiap Tanggal 20 Setiap Bulan**: Buka [console.prisma.io](https://console.prisma.io) dan periksa baris `Postgres Operations`.
  - Jika $< 160\text{K}$: Biarkan tetap berjalan di paket Gratis.
  - Jika $\ge 170\text{K}$: Lakukan upgrade Starter ($10/bln).
- [ ] **Setiap Awal Bulan (Tanggal 1)**: Kuota operasi Prisma otomatis me-reset kembali ke `0 / 200K`.
- [ ] **Pastikan Kompresi WebP Tetap Berjalan**: Foto bukti transfer yang diunggah mitra/agen harus selalu dalam format WebP (<80 KB) agar tidak membebani kuota Vercel Blob (1 GB).

---
*Dokumen ini merupakan standar operasional teknologi resmi platform VARENA untuk menjamin efisiensi modal bisnis tanpa mengorbankan kecepatan dan kestabilan sistem.*
