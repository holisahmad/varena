# 02 — Product Requirements Document (PRD)

Status: Draft 0.1. Requirements below are baseline; open questions must be resolved before production.

## 1. Problem statement
Penjualan dan referral membutuhkan satu sistem terintegrasi agar atribusi penjualan, pengelolaan jaringan, perhitungan bonus, pencatatan saldo, dan pencairan dapat dilacak serta diaudit.

## 2. Personas and jobs-to-be-done
### Consumer
- Menemukan produk dari link referral.
- Memahami harga, isi, manfaat yang diizinkan, syarat, ongkir, dan kebijakan.
- Checkout sebagai guest atau akun konsumen.
- Melihat status pesanan.

### Member
- Mengakses referral link/code.
- Melihat pesanan yang teratribusi secara sesuai privasi.
- Melihat sponsor dan jaringan yang boleh diakses.
- Melihat komisi per transaksi, status pending/eligible/held/approved/paid/reversed.
- Meminta pencairan dan memantau status.
- Memperbarui profil dan rekening melalui verifikasi.

### Admin/Operations
- Memverifikasi member dan order exceptions.
- Mengelola produk, harga, stok, dan refund.
- Meninjau komisi dan payout.
- Melakukan placement sesuai kewenangan dan approval.
- Melihat laporan operasional.

### Owner/Finance
- Meninjau dashboard dan margin.
- Menyetujui marketing plan baru.
- Menyetujui payout/refund/adjustment sesuai limit.
- Melihat audit dan rekonsiliasi.

## 3. Functional requirements

### FR-001 Public catalog
- Menampilkan produk, varian/pack, harga, isi, deskripsi, foto, ketersediaan, kebijakan.
- Harga final ditentukan server.
- Informasi produk dan klaim wajib melewati content approval.

### FR-002 Referral attribution
- Link referral menggunakan kode unik.
- Sistem menyimpan attribution token/cookie dengan masa berlaku yang ditetapkan.
- Aturan konflik referral harus dikonfigurasi dan ditampilkan di terms.
- Referral attribution dikunci saat order dibuat/paid sesuai kebijakan final.
- Konsumen dapat membeli tanpa mendaftar sebagai mitra.
- Dilarang mengubah referral order lama secara diam-diam.

### FR-003 Member registration
- Member application, consent, verification, terms acceptance.
- Member ID unik.
- Status: pending, active, suspended, terminated, rejected.
- Member activation tidak boleh mensyaratkan pembelian stok pribadi sebagai baseline.

### FR-004 Sponsor relationship
- Satu sponsor langsung untuk setiap member yang direferensikan.
- Sponsor immutable setelah aktivasi kecuali proses koreksi resmi dengan approval dan audit.
- Sponsor berbeda dari placement parent.

### FR-005 Placement relationship
- Satu placement parent aktif untuk member.
- Admin berwenang dapat menempatkan member di bawah node yang valid.
- Perubahan placement melalui workflow request/approval.
- Cegah cycle, self-parent, duplicate active parent, dan perubahan historis.
- Simpan placement history dengan effective_at dan actor.

### FR-006 Orders and payments
- Order menyimpan snapshot nama produk, SKU, harga, HPP snapshot, qty, diskon, pajak/ongkir bila berlaku.
- Status order: draft, pending_payment, paid, processing, shipped, completed, cancelled, refunded, partially_refunded.
- Payment webhook diverifikasi signature dan idempotent.
- Komisi hanya diproses sesuai trigger final, default setelah pembayaran terverifikasi dan order tidak dalam status fraud/cancelled.
- Refund memicu reversal proporsional sesuai policy.

### FR-007 Commission engine
- Memilih marketing plan berdasarkan waktu transaksi dan product eligibility.
- Direct referral reward: Rp50.000 per qualifying first pack order pada baseline, penerima sponsor.
- Development reward: Rp10.000 per eligible placement upline, maksimum 10 titik; jumlah titik aktual yang tersedia dapat kurang dari 10.
- Batas 10 adalah batas titik penerima, bukan kedalaman organisasi.
- Repeat purchase: harga Rp45.000/sachet; nilai bonus per titik belum final. Rp1.000/titik hanya simulasi.
- Setiap commission item mencatat source order/item, beneficiary, basis, formula version, level, amount, status.
- Idempotency key mencegah komisi ganda.
- Komisi yang tidak dapat dialokasikan harus masuk kategori pending/unallocated sesuai policy, bukan otomatis dianggap pendapatan.
- Commission run harus dapat direplay di sandbox, bukan memposting duplikat ke ledger.

### FR-008 Eligibility
- Baseline: tidak ada kewajiban pembelian pribadi untuk mencairkan bonus.
- Kelayakan berdasarkan penjualan produk nyata, status akun, validitas transaksi, dan aturan program yang disetujui.
- Konsumen umum boleh membeli.
- Definisi penjualan qualifying, retail customer, minimum retail sales, refund window, dan bukti transaksi masih harus disahkan.
- Suspend/fraud/terminated memicu hold dan review, bukan otomatis mengalihkan bonus ke operasional.

### FR-009 Wallet and ledger
- Wallet menampilkan available, pending, held, paid/lifetime totals.
- Ledger append-only, double-entry accounting design.
- Saldo berasal dari ledger, bukan field yang dapat diedit.
- Adjustment hanya melalui reversal/adjustment dengan reason, approval, dan audit.
- Rupiah disimpan sebagai integer minor unit (IDR integer) atau numeric(20,0), bukan float.

### FR-010 Withdrawal
- Member mengajukan payout ke rekening terverifikasi.
- Sistem menghitung available balance, minimum payout, fees, tax withholding if applicable.
- Payout otomatis dihitung; admin menyetujui pembayaran.
- Status: requested, under_review, approved, rejected, processing, paid, failed, reversed.
- Approval dan payment execution dipisah (maker-checker).
- Bukti transfer/reference wajib disimpan.

### FR-011 Administration and RBAC
- Role-based access control plus data scope.
- Admin hanya melihat data sesuai tugas.
- Leader hanya melihat jaringan dan data minimum sesuai policy.
- Perubahan role/permission diaudit.
- Privileged actions require MFA/re-authentication.

### FR-012 Reporting
- Sales by product/channel/member.
- First purchase vs repeat purchase.
- Gross margin, commission expense, refunds, payout liabilities.
- Commission by level and status.
- Network growth and placement history.
- Unallocated/held/expired commissions.
- Export with permission and audit.

### FR-013 Notifications
- Email/WhatsApp/in-app for registration, order, payment, commission status, withdrawal.
- No sensitive financial details in unsecured notifications.
- Retry with dead-letter handling.

### FR-014 Audit
- Append-only audit trail for sensitive actions.
- Include actor, action, entity, timestamp, reason, correlation ID, before/after diff with PII masking.
- Audit events are not editable by normal admins.

## 4. Non-functional requirements
- Mobile-first responsive UI.
- Desktop and mobile interaction patterns intentionally differ.
- WCAG 2.2 AA target for key flows.
- API p95 target < 500 ms for common reads under agreed load; payment/commission asynchronous where safe.
- 99.5% monthly MVP availability target, excluding planned maintenance/provider outage.
- Backups daily + point-in-time recovery where supported.
- RPO target 15 minutes; RTO target 4 hours (confirm hosting budget).
- Encrypt in transit and at rest.
- OWASP ASVS-aligned security review.
- Observability: structured logs, metrics, traces, alerts.
- No critical/high vulnerabilities at go-live.

## 5. Core user stories
- As a consumer, I can buy from a referral link without joining.
- As a member, I can share my referral link.
- As a member, I can see attributed orders with customer privacy protected.
- As a leader, I can view authorized network data.
- As an admin, I can request a placement change with a reason.
- As finance, I can review commissions and approve payouts.
- As owner, I can compare sales, HPP, commission expense, and margin.
- As auditor, I can trace a payout to the source order and commission formula.

## 6. Open decisions before production
1. Attribution precedence and cookie duration.
2. Whether a consumer can later convert to member and what happens to their previous orders.
3. Exact qualifying sale definition and retail/customer proof.
4. Repeat purchase bonus amount and margin reserve.
5. Refund/chargeback clawback window and negative wallet policy.
6. Commission release period and payout minimum/fees/tax.
7. Whether unallocated amounts remain liability, expire under lawful terms, or are recognized as income.
8. Whether sponsor changes are ever allowed.
9. Whether placement changes affect only future orders; baseline: yes.
10. Product regulatory status, permitted claims, labeling and advertising approval.
