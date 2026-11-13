# PROJECT RULES — MANDATORY

## Source of truth
1. Baca README dan seluruh dokumen relevan sebelum mengubah kode.
2. `docs/03-BUSINESS-RULES.md` dan versi Marketing Plan yang disetujui adalah sumber kebenaran aturan bisnis.
3. Jika ada konflik, hentikan implementasi dan laporkan konflik. Jangan menebak.
4. Ubah dokumen lebih dahulu ketika keputusan bisnis/arsitektur berubah.

## Anti AI-slop
- Tidak membuat UI generik penuh gradient, glassmorphism, ikon dekoratif, atau kartu berlebihan.
- Hindari placeholder, lorem ipsum, tombol inert, data palsu di production, dan klaim fitur yang belum bekerja.
- Gunakan komponen konsisten, tipografi terukur, ruang putih, hierarki informasi, dan microcopy spesifik.
- Jangan menambah dependency tanpa alasan teknis dan evaluasi maintenance.

## Engineering
- Modular monolith; jangan pecah microservices pada MVP.
- TypeScript strict; validasi input di server.
- Backend adalah otoritas semua harga, status pembayaran, upline, komisi, saldo, dan approval.
- Gunakan decimal/money integer rupiah; jangan gunakan floating point untuk uang.
- Semua operasi uang menggunakan database transaction dan idempotency.
- Ledger append-only; koreksi menggunakan reversal/adjustment, bukan edit/hapus entry.
- Jangan menghitung komisi di browser.
- Jangan mempercayai referral code dari client tanpa validasi server.
- Simpan waktu dalam UTC; tampilkan Asia/Jakarta secara default.

## Workflow
1. Audit repository dan environment.
2. Buat implementation plan per fase.
3. Implementasikan hanya scope fase aktif.
4. Tulis/mutakhirkan tests.
5. Jalankan lint, typecheck, unit, integration, dan build.
6. Laporkan file berubah, keputusan, hasil test, risiko, dan pekerjaan tersisa.

## Security & privacy
- Least privilege, RBAC + scope organisasi/jaringan.
- Rahasiakan PII, token, credential, dan data pembayaran.
- Jangan log password, OTP, token, nomor rekening lengkap, atau data sensitif.
- Admin tidak boleh mengubah saldo secara langsung.
- Semua aksi sensitif membutuhkan audit trail.
- Perubahan marketing plan perlu maker-checker approval.

## Forbidden without explicit approval
- Mengubah nominal komisi, eligibility, formula, periode berlaku, atau akun tujuan.
- Menghapus/mengedit ledger.
- Menyetujui payout, refund, atau transfer uang.
- Mengubah struktur jaringan secara massal.
- Menjalankan migrasi destructive pada production.
- Mengaktifkan live payment/payout.
- Menggunakan data pelanggan nyata pada development/testing.

## Definition of done
- Acceptance criteria terpenuhi.
- Tests relevan lulus.
- Tidak ada critical/high security finding terbuka.
- Dokumentasi dan changelog diperbarui.
- Tidak ada TODO/placeholder untuk alur inti.
