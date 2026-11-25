# DOKUMENTASI SISTEM BISNIS, FINANSIAL & HAK AKSES VARENA
**Sistem Distribusi Penjualan Langsung & Keagenan Resmi Berbasis Kepatuhan Permendag No. 70/2019**

---

## DAFTAR ISI
1. [Prinsip Dasar & Legalitas Penjualan Langsung](#1-prinsip-dasar--legalitas-penjualan-langsung)
2. [Skema Dana Pendaftaran & Aktivasi Kemitraan](#2-skema-dana-pendaftaran--aktivasi-kemitraan)
3. [Arsitektur Komisi & Distribusi Bonus Jaringan](#3-arsitektur-komisi--distribusi-bonus-jaringan)
4. [Mekanisme Dana Cadangan Unallocated (Perlindungan Arus Kas)](#4-mekanisme-dana-cadangan-unallocated-perlindungan-arus-kas)
5. [Sistem Buku Besar Ganda (Double-Entry ACID Ledger) & Payout](#5-sistem-buku-besar-ganda-double-entry-acid-ledger--payout)
6. [Sistem Pasokan Grosir & Keagenan Wilayah](#6-sistem-pasokan-grosir--keagenan-wilayah)
7. [Matriks Peran & Hak Akses Pengguna (Role-Based Access Control)](#7-matriks-peran--hak-akses-pengguna-role-based-access-control)
8. [Daftar Akun Referensi (Hierarki Upline 10 Level & Tim Manajemen)](#8-daftar-akun-referensi-hierarki-upline-10-level--tim-manajemen)
9. [Panduan Konfigurasi Go-Live & Google OAuth Sign-In](#9-panduan-konfigurasi-go-live--google-oauth-sign-in)

---

## 1. Prinsip Dasar & Legalitas Penjualan Langsung

Sistem VARENA dirancang dengan mengacu secara ketat pada **Peraturan Menteri Perdagangan (Permendag) RI No. 70/2019** tentang Distribusi Barang Secara Langsung.

> **Larangan Skema Piramida & Money Game (Anti-Piramide Rule):**
> - **Tidak ada biaya pendaftaran cuma-cuma:** Calon mitra tidak dipungut uang pendaftaran tanpa barang (*no recruitment fee*).
> - **Berbasis produk bernilai riil:** Setiap rupiah komisi yang tercipta bersumber murni dari pergerakan barang fisik (*product movement*) dengan mutu teruji, izin edar resmi (P-IRT / BPOM), dan sertifikasi Halal.
> - **Hak pengembalian & perlindungan konsumen:** Setiap transaksi tercatat secara legal dan transparan pada sistem akuntansi buku besar permanen (*append-only*).

---

## 2. Skema Dana Pendaftaran & Aktivasi Kemitraan

### A. Mekanisme Aktivasi "First Pack Purchase"
Pendaftaran kemitraan VARENA mengadopsi skema **Belanja Perdana Paket Aktivasi** (*First Pack Activation*).

```
[Calon Mitra Daftar via Link Referral]
                │
                ▼
[Checkout Paket Perdana (First Pack) e.g. KM-BOX10 (Rp500.000)]
                │
                ▼
[Transfer Pembayaran / Saldo Deposit]
                │
                ▼
[Verifikasi Lunas (Status: PAID)]
        ├── 1. Akun Mitra Aktif (Status: ACTIVE) & Member Code Terbit (e.g. VRN-xxxx)
        ├── 2. Bonus Sponsor (Rp50.000) & Pembinaan 10 Level (@Rp10.000) Cair Otomatis
        └── 3. Notifikasi WhatsApp & Faktur Resmi Terkirim Otomatis
```

### B. Nilai & Spesifikasi Produk Aktivasi (Contoh Paket KM-BOX10)
| Komponen | Nilai / Nominal | Keterangan |
| :--- | :--- | :--- |
| **Harga Produk (Konsumen/Mitra)** | **Rp500.000** | 1 Box Kopi Matahari (10 Sachet Fermentasi Premium) |
| **Harga Pokok Penjualan (HPP)** | **Rp250.000** | Biaya produksi, bahan baku, kemasan, dan margin dasar pabrik |
| **Alokasi Bonus Sponsor Langsung** | **Rp50.000** | Diberikan 100% ke sponsor pengundang langsung |
| **Alokasi Bonus Pembinaan 10 Level**| **Rp100.000** | @Rp10.000 per level upline penempatan (Level 1 s/d Level 10) |
| **Margin Operasional & Laba Kantor**| **Rp100.000** | Biaya operasional, riset & pengembangan, pajak, dan laba korporasi |

### C. Skema Harga Dinamis Multi-Tier (Non-Mitra vs Mitra)
Seluruh harga produk di VARENA dikelola per varian (`ProductVariant`) di database (tidak *hardcoded*) agar mendukung ekspansi banyak produk di masa depan melalui kolom:
- `retailPrice`: Harga ritel dasar untuk konsumen umum (Non-Mitra).
- `salePrice` & `isPromoActive`: Harga promo dan status promo aktif untuk menampilkan **harga coret** ke konsumen umum.
- `memberPrice`: Harga tetap khusus Mitra resmi sepanjang waktu.
- `price`: Harga kompatibilitas/fallback untuk perhitungan order & komisi.

| Kategori Pembeli | Varian Kopi Matahari | Harga Dasar (`retailPrice`) | Promo / Harga Coret (`salePrice`) | Harga Bayar Akhir |
| :--- | :--- | :--- | :--- | :--- |
| **Non-Mitra (Normal)** | Satuan (`KM-SCH01`) | Rp55.000 | — | **Rp55.000** |
| **Non-Mitra (Normal)** | Box 10 Sachet (`KM-BOX10`) | Rp550.000 | — | **Rp550.000** |
| **Non-Mitra (Promo Aktif)** | Satuan (`KM-SCH01`) | ~~Rp55.000~~ | Diskon Rp5.000 (`isPromoActive=true`) | **Rp50.000** |
| **Non-Mitra (Promo Aktif)** | Box 10 Sachet (`KM-BOX10`) | ~~Rp550.000~~ | Diskon Rp50.000 (`isPromoActive=true`) | **Rp500.000** |
| **Mitra Resmi** | Satuan (`KM-SCH01`) | — | Harga Tetap Mitra (`memberPrice`) | **Rp50.000** |
| **Mitra Resmi** | Box 10 Sachet (`KM-BOX10`) | — | Harga Tetap Mitra (`memberPrice`) | **Rp500.000** |

---

## 3. Arsitektur Komisi & Distribusi Bonus Jaringan

Sistem komisi VARENA membedakan dengan tegas antara **Pembelian Perdana (Aktivasi)** dan **Pembelian Ulang (Repeat Order)**.

### A. Rincian Tiga Pilar Bonus VARENA

#### 1. Bonus Sponsor Langsung (*Direct Sponsor Reward*)
* **Nominal:** **Rp50.000** per paket perdana (*Box 10 Sachet*).
* **Penerima:** Mitra yang tautan referral-nya digunakan untuk mendaftar (*Sponsor Langsung*), tanpa memandang di mana posisi penempatan jaringan (*placement*) mitra baru tersebut berada.
* **Waktu Cair:** Seketika (*real-time*) saat pesanan aktivasi diverifikasi lunas.

#### 2. Bonus Pembinaan Penempatan (*Placement Development Reward - First Pack*)
* **Nominal:** **Rp10.000 per level** x **10 Level Upline Penempatan** = Total **Rp100.000**.
* **Penerima:** 10 level upline garis penempatan di atas mitra pembeli yang berstatus `ACTIVE`.
* **Karakteristik:** Berbasis struktur pohon penempatan (*Placement Tree*), mendorong kerja sama tim dan limpahan (*spillover*).

#### 3. Bonus Generasi Repeat Order (*Repeat Order Development Reward*)
* **Nominal:** **Rp2.000 per box/unit** x **10 Level Upline Penempatan** = Total **Rp20.000 per box**.
* **Penerima:** 10 level upline penempatan untuk setiap transaksi repeat order produk yang dilakukan oleh jaringan di bawahnya.
* **Potensi Pasif:** Memastikan para mitra dan leader memperoleh *recurring income* jangka panjang yang stabil seiring dengan konsumsi rutin produk oleh konsumen.

---

## 4. Mekanisme Dana Cadangan Unallocated (Perlindungan Arus Kas)

### A. Mengapa Dana Unallocated Muncul?
Dalam struktur penempatan jaringan 10 level, sering kali terjadi kondisi di mana:
1. Kedalaman jaringan belum mencapai 10 level (misalnya jaringan baru tumbuh hingga level 3, sehingga level 4 s/d 10 belum ada anggotanya / *empty node*).
2. Terdapat upline pada level tertentu yang status akunnya non-aktif atau ditangguhkan (`SUSPENDED` / `PENDING`).

### B. Perlakuan Akuntansi Dana Unallocated
Pada sistem MLM konvensional, dana ini kerap menjadi sumber ketidakseimbangan pembukuan. Di VARENA, dana tersebut dikelola dengan prinsip akuntansi ketat:

> **Prinsip Beban Penuh & Cadangan Terbuku (Zero Leakage):**
> - Perusahaan selalu mencadangkan beban komisi secara **penuh 10 level** di awal perhitungan.
> - Alokasi untuk level yang kosong atau tidak memenuhi syarat **TIDAK HANGUS**, melainkan secara otomatis dibukukan ke rekening kewajiban cadangan:
>   `ACC-COMP-UNALLOC` (Company Unallocated Reserve)
> - **Keseimbangan Double-Entry:**
>   `Total DEBIT (Beban Ops) = Total KREDIT (Dompet Mitra) + Total KREDIT (Cadangan Unallocated)`

### C. Pemanfaatan Dana Unallocated
Dana yang terakumulasi di `ACC-COMP-UNALLOC` adalah aset cadangan korporasi yang dialokasikan resmi oleh Direksi untuk:
1. **Reward Performa Tahunan:** Pendanaan hadiah aset fisik agen/leader (sepeda motor, mobil niaga, emas batangan, wisata).
2. **Subsidi Ongkos Kirim Keagenan:** Menjamin program gratis ongkir 100% pasokan kantor ke seluruh agen wilayah tetap berjalan sehat tanpa membebani arus kas operasional.
3. **Pengembangan Riset Produk:** Peningkatan formulasi, riset klinis, dan diversifikasi lini produk baru.

---

## 5. Sistem Buku Besar Ganda (Double-Entry ACID Ledger) & Payout

Setiap perpindahan dana di VARENA diproses melalui transaksi atomik berkekuatan hukum perbankan (*ACID compliant*) menggunakan format jurnal umum berpasangan.

### A. Bagan Akun Standar (Chart of Accounts)
```
[ASSET / AKTIVA]
├── ACC-COMP-CASH             : Kas Utama Operasional Kantor (Penerimaan Transfer Bank)
├── ACC-COMP-PAYOUT           : Akun Kliring Antara Penarikan Dana Mitra (Disbursement)

[LIABILITY / KEWAJIBAN]
├── ACC-MBR-[KODE_MITRA]      : Saldo Dompet Digital Mitra (Kewajiban Perusahaan ke Mitra)
├── ACC-LIAB-DEPOSIT-AGENT    : Saldo Kas Deposit Keagenan Wilayah
├── ACC-LIAB-DEPOSIT-SHOPPING : Saldo Deposit Belanja Khusus Pemesanan Produk
├── ACC-COMP-UNALLOC          : Cadangan Komisi Belum Teralokasi (Unallocated Reserve)

[REVENUE & EXPENSE / LABA-RUGI]
├── ACC-COMP-OPS              : Beban Komisi Jaringan & Operasional Korporasi
```

### B. Simulasi Penjurnal Jaringan (Contoh 1 Box Rp500.000)
Ketika pesanan aktivasi Rp500.000 dibayar lunas:
1. **Penerimaan Kas Penjualan:**
   - `DEBIT ACC-COMP-CASH`: Rp500.000
   - `CREDIT ACC-COMP-OPS` (Pendapatan): Rp500.000
2. **Alokasi Beban Komisi (Misal: 3 Upline Aktif, 7 Level Kosong):**
   - `DEBIT ACC-COMP-OPS` (Beban): Rp150.000 *(Sponsor 50rb + 10 Level @10rb)*
   - `CREDIT ACC-MBR-SPONSOR`: Rp50.000 *(Bonus Sponsor)*
   - `CREDIT ACC-MBR-UPLINE1`: Rp10.000 *(Level 1)*
   - `CREDIT ACC-MBR-UPLINE2`: Rp10.000 *(Level 2)*
   - `CREDIT ACC-MBR-UPLINE3`: Rp10.000 *(Level 3)*
   - `CREDIT ACC-COMP-UNALLOC`: Rp70.000 *(7 Level Cadangan Perusahaan)*

### C. Skema Penarikan Saldo Dompet (Payout / Withdrawal)
Mitra dapat mencairkan saldo komisi ke rekening bank mereka kapan saja dengan parameter berikut:
* **Batas Minimal Penarikan:** **Rp50.000**
* **Dual Scheme Biaya Penarikan:**
  1. **Skema Manual (Aktif Saat Ini):**
     - Biaya transfer bank flat: **Rp6.500** per transaksi.
     - Diproses manual/batch oleh finance perusahaan.
  2. **Skema Gateway Otomatis (Siap Pakai untuk Xendit / Pihak Ketiga):**
     - Biaya Administrasi Perusahaan: **10%** dari nominal penarikan.
     - Biaya Transfer Gateway: **Rp5.000** flat.
     - Formula: `Diterima Bersih = Nominal - (Nominal * 10%) - Rp5.000`.
     - Transfer seketika (*instant disbursement*) via callback webhook.

---

## 6. Sistem Pasokan Grosir & Keagenan Wilayah

Keagenan Resmi VARENA bertindak sebagai hub distribusi regional (*mini-warehouse*) untuk mempercepat pengiriman produk ke konsumen akhir tanpa kendala geografis.

```
[Kantor Pusat VARENA] ────(Pasokan Grosir: Diskon Agen + Bebas Ongkir 100%)────> [Agen Wilayah]
                                                                                     │
[Pesanan Konsumen via Web] ──> [Sistem Routing] ──(Alihkan ke Agen Terdekat)────────┘
                                                                                     │
                                                      [Konsumen Menerima Produk Cepat & Segar]
```

### A. Kebijakan Diskon Grosir Keagenan
Admin dapat mengatur diskon pasokan melalui dua metode yang telah disinkronkan penuh:
1. **Kebijakan Global:** Menetapkan diskon default (persentase atau nominal per box) dengan fasilitas tombol **"Terapkan ke Semua Agen Aktif"**.
2. **Kebijakan Khusus Per-Agen:** Menetapkan diskon khusus pada profil agen tertentu melalui tombol **"Diskon"** di menu daftar agen atau pemantau progres.
   - Pilihan Tipe Diskon:
     - `PERCENTAGE` : Contoh `15%`, `20%`.
     - `NOMINAL` : Contoh `Rp50.000/box`, `Rp75.000/box`.

### B. Fasilitas Keagenan
* **Subsidi Ongkir Pasokan 100%:** Beban ongkos kirim dari pabrik/kantor pusat ke alamat gudang agen disubsidi penuh oleh kantor.
* **Kas Deposit Belanja:** Agen dapat melakukan top-up saldo deposit belanja kas agen yang otomatis memotong tagihan saat memesan pasokan tanpa perlu transfer manual berulang kali.
* **Apresiasi & Reward Performa:** Manajemen secara berkala menerbitkan reward resmi (bonus tunai ke saldo deposit atau barang fisik seperti kendaraan bermotor) yang tercatat dalam audit log korporasi.

---

## 7. Matriks Peran & Hak Akses Pengguna (Role-Based Access Control)

Berikut adalah struktur matriks hak akses resmi sistem dari tingkat tertinggi (*Root / Owner*) hingga konsumen umum:

| Peran (Role) | Kode Role | Lingkup Tanggung Jawab & Hak Akses Fitur |
| :--- | :--- | :--- |
| **Owner / Direksi Utama** | `OWNER` | **Akses Tertinggi (Root Full Access):**<br>• Pengawasan komprehensif seluruh buku besar & neraca keuangan.<br>• Persetujuan akhir (*approval*) penarikan dana massal (*batch payout*).<br>• Otoritas pengubahan parameter bisnis master (MOQ, rekening bank, biaya admin).<br>• Akses jejak audit forensik 60 hari seluruh aksi sistem. |
| **Koperasi Kemitraan** | `KOPERASI` | **Pengawasan Dana Anggota:**<br>• Akses baca buku besar cadangan dan saldo simpanan deposit.<br>• Rekonsiliasi transaksi kemitraan anggota koperasi.<br>• Pengawasan kepatuhan pembagian hasil usaha kemitraan. |
| **Operasional Kantor** | `OPERATIONS` | **Tata Kelola Bisnis Harian:**<br>• Verifikasi konfirmasi pembayaran transfer bank dari konsumen & mitra.<br>• Penunjukan dan evaluasi keagenan resmi wilayah.<br>• Pengalihan pesanan (*order routing*) ke agen terdekat.<br>• Penerbitan reward prestasi dan verifikasi top-up deposit. |
| **Admin Logistik & Katalog** | `ADMIN_1` | **Operasional Fisik & Pergudangan:**<br>• Manajemen master katalog produk, SKU, varian, dan inventori fisik.<br>• Pemrosesan pesanan masuk gudang pusat.<br>• **Pencetakan Resi & Label Thermal (Airway Bill)** 100x150mm barcode.<br>• Penginputan nomor resi ekspedisi dan pengiriman barang massal. |
| **Admin Verifikasi & Support** | `ADMIN_2` | **Layanan Mitra & Administrasi:**<br>• Verifikasi data KYC (KTP, nama rekening bank pencairan).<br>• Pemantauan antrean pengiriman pesan WhatsApp Gateway (*Outbox*).<br>• Bantuan teknis penempatan jaringan (*placement helpdesk*). |
| **Leader Nasional / Regional** | `LEADER_1` s/d `LEADER_3` | **Kepemimpinan Jaringan:**<br>• Monitoring volume penjualan dan pertumbuhan pohon jaringan grup.<br>• Root node penempatan struktur mitra baru.<br>• Hak penerimaan komisi pembinaan dan reward kepemimpinan. |
| **Agen Resmi Wilayah** | `isAgent = true` | **Distribusi Regional (Portal `/agent`):**<br>• Akses pemesanan pasokan grosir dengan diskon khusus agen.<br>• Penerimaan penugasan distribusi pesanan konsumen sekitar.<br>• Pengelolaan stok fisik gudang agen dan saldo kas deposit agen. |
| **Mitra Usaha VARENA** | `MITRA` | **Distributor Mandiri (Portal `/member`):**<br>• Pembelian produk harga kemitraan.<br>• Akses tautan referral dan pendaftaran anggota baru.<br>• Rekening koran buku besar komisi transparan (*real-time*).<br>• Pengajuan pencairan saldo (*withdrawal*) ke rekening bank pribadi. |
| **Auditor Keuangan** | `AUDITOR` | **Audit Kepatuhan Hukum:**<br>• Hak baca (*read-only*) seluruh jurnal buku besar berpasangan.<br>• Rekonsiliasi transaksi pembayaran dan kesesuaian pajak/regulasi. |

---

## 8. Daftar Akun Referensi (Hierarki Upline 10 Level & Tim Manajemen)

* **Password Default Akun Sistem:** `Varena2026!` *(Bila login via email/password)*
* **Format Akun Google:** Login menggunakan akun Google terkait.

### A. Aliran 10 Level Upline (Contoh Titik Belanja: `VRN-0006`)
Ketika pesanan dibuat oleh anggota di bawah jaringan (misal: `VRN-0006`), komisi dialokasikan ke 10 tingkat hierarki di atasnya secara berurutan:

| Urutan Upline | Kode Member | Nama Akun | Email Login | Jabatan / Status |
| :---: | :--- | :--- | :--- | :--- |
| **Level 1** | `VRN-0004` | Rina Anggraini | `mitra4@varena.id` | Mitra Usaha Aktif |
| **Level 2** | `VRN-0002` | Siti Nurhaliza | `mitra2@varena.id` | **Master Agent Resmi** |
| **Level 3** | `VRN-0001` | Ahmad Fauzi | `mitra1@varena.id` | **Regional Agent Resmi** |
| **Level 4** | `VRN-LDR-03` | Raden Wijaya | `leader3@varena.id` | Leader Area (Root Jaringan) |
| **Level 5** | `VRN-LDR-02` | Dewi Kartika | `leader2@varena.id` | Leader Regional 2 |
| **Level 6** | `VRN-LDR-01` | Bambang Pratama | `leader1@varena.id` | Leader Nasional 1 |
| **Level 7** | `VRN-CORP-L5` | Admin Support | `admin2@varena.id` | Admin Verifikasi & Support |
| **Level 8** | `VRN-CORP-L4` | Admin Logistik | `admin1@varena.id` | Admin Logistik & Katalog |
| **Level 9** | `VRN-CORP-L3` | Operasional | `operasional@varena.id` | Divisi Operasional Korporasi |
| **Level 10**| `VRN-CORP-L2` | Koperasi Mandiri | `koperasi@varena.id` | Koperasi Kemitraan VARENA |
| *Puncak* | `VRN-CORP-L1` | Hendrawan | `owner@varena.id` | **Owner / Direksi Utama (Root)** |

### B. Akun Administrator Korporasi (Akses Panel `/admin`)
1. **Owner / Direksi (Root Access):** `owner@varena.id` / `Varena2026!`
2. **Admin Logistik & Katalog Produk:** `admin1@varena.id` / `Varena2026!`
3. **Admin Verifikasi & Layanan Operasional:** `admin2@varena.id` / `Varena2026!`

---

## 9. Panduan Konfigurasi Go-Live & Google OAuth Sign-In

Saat aplikasi dideploy ke server produksi (live server), fitur **Google One-Tap / Login Google** memerlukan pendaftaran domain pada Google Cloud Console agar tidak mengalami error `403 Forbidden` (`[GSI_LOGGER]: The given origin is not allowed for the given client ID`).

### Langkah-Langkah Konfigurasi di Google Cloud Console:
1. Buka [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials).
2. Pastikan proyek yang aktif adalah proyek Google Cloud aplikasi VARENA.
3. Di tabel **OAuth 2.0 Client IDs**, klik nama Web Client ID yang digunakan (misal: `827044072858-...apps.googleusercontent.com`).
4. **Authorized JavaScript origins (Asal JavaScript yang Diotorisasi):**
   Klik **+ ADD URI** dan daftarkan semua URL basis yang digunakan untuk mengakses aplikasi:
   - `http://localhost:3000` *(lingkungan development lokal)*
   - `http://127.0.0.1:3000` *(lingkungan loopback lokal)*
   - `https://app.varena.id` *(domain produksi utama — ganti sesuai domain resmi)*
   - `https://varena.id` *(domain root alternatif bila ada)*
   - *(PENTING: Jangan menyertakan trailing slash `/` di akhir URL origin)*
5. **Authorized redirect URIs (URI Pengalihan yang Diotorisasi):**
   Klik **+ ADD URI** dan daftarkan URL callback:
   - `http://localhost:3000/api/auth/callback/google`
   - `http://localhost:3000/login`
   - `https://app.varena.id/api/auth/callback/google`
   - `https://app.varena.id/login`
6. Klik tombol **SAVE / SIMPAN** di bagian bawah halaman.
7. **Waktu Propagasi:** Pengaturan baru dari Google memerlukan waktu propagasi sekitar **2–5 menit**. Setelah jeda waktu tersebut, refresh browser (*Ctrl + F5*) untuk memuat tombol Google Sign-In.

---
*Dokumen ini diterbitkan oleh Komite Bisnis & Legal VARENA sebagai pedoman resmi tata kelola operasional, arsitektur teknis, dan kepatuhan sistem.*
