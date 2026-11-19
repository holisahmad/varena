/**
 * VARENA Direct Selling - Human-Friendly UI/UX Formatters & Terminology Dictionaries
 * Translates internal database enums and machine codes into elegant, professional Indonesian terminology.
 */

// 1. Status Pesanan (Order Status)
export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: 'Menunggu Pembayaran',
  PAID: 'Sudah Dibayar (Perlu Dikemas)',
  PROCESSING: 'Sedang Dikemas Gudang',
  SHIPPED: 'Dalam Pengiriman Kurir',
  COMPLETED: 'Pesanan Selesai',
  CANCELLED: 'Pesanan Dibatalkan',
  REFUNDED: 'Dana Dikembalikan (Refund)',
};

export const ORDER_STATUS_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  PENDING_PAYMENT: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  PAID: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  PROCESSING: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
  SHIPPED: { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200' },
  COMPLETED: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
  CANCELLED: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200' },
  REFUNDED: { bg: 'bg-stone-50', text: 'text-stone-700', border: 'border-stone-200' },
};

export function formatOrderStatus(status?: string | null): string {
  if (!status) return '-';
  return ORDER_STATUS_LABELS[status] || status.replace(/_/g, ' ');
}

// 2. Tipe Pesanan (Order Type)
export const ORDER_TYPE_LABELS: Record<string, string> = {
  FIRST_PACK: 'Paket Perdana (Kemitraan)',
  REPEAT_PURCHASE: 'Belanja Ulang (Repeat Purchase)',
  STOCKIST_SUPPLY: 'Pasokan Agen Wilayah',
};

export function formatOrderType(type?: string | null): string {
  if (!type) return '-';
  return ORDER_TYPE_LABELS[type] || type.replace(/_/g, ' ');
}

// 3. Kategori Produk (Product Category)
export const PRODUCT_CATEGORY_LABELS: Record<string, string> = {
  HERBAL_BEVERAGE: 'Minuman Herbal Alami',
  SUPPLEMENT: 'Suplemen Kesehatan',
  COSMETIC: 'Perawatan & Kosmetik',
  FOOD_BEVERAGE: 'Makanan & Minuman Sehat',
};

export function formatProductCategory(category?: string | null): string {
  if (!category) return '-';
  return PRODUCT_CATEGORY_LABELS[category] || category.replace(/_/g, ' ');
}

// 4. Aksi Audit Sistem (Audit Trail Actions)
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: 'Login Berhasil',
  LOGIN_FAILED: 'Login Gagal',
  PAYOUT_BATCH_APPROVED: 'Persetujuan Pencairan Dana (Payout)',
  ORDER_PAYMENT_CONFIRMED: 'Konfirmasi Pembayaran Pesanan',
  ORDER_SHIPPED: 'Pesanan Dikirim ke Ekspedisi',
  ORDER_COMPLETED: 'Pesanan Selesai Diterima',
  COMMISSION_DISTRIBUTION: 'Distribusi Komisi Jaringan',
  COMMISSION_CREDIT: 'Kredit Saldo Komisi Mitra',
  LEDGER_POSTED: 'Pembukuan Jurnal Buku Besar',
  MEMBER_ACTIVATED: 'Aktivasi Kemitraan Baru',
  AGENT_APPLICATION_SUBMITTED: 'Pengajuan Keagenan Masuk',
  AGENT_APPROVED: 'Persetujuan Pengajuan Agen',
  AGENT_REJECTED: 'Penolakan Pengajuan Agen',
  AGENT_DIRECT_APPOINTED: 'Penunjukan Langsung Agen Resmi',
  AGENT_ORDER_ASSIGNED: 'Pengalihan Pesanan ke Agen',
  AGENT_REWARD_AWARDED: 'Pemberian Reward Prestasi Agen',
  AGENT_REWARD_ISSUED: 'Pemberian Reward Prestasi Agen',
  AGENT_CONFIG_UPDATED: 'Pembaruan Konfigurasi Agen',
  AGENT_TOPUP_APPROVED: 'Persetujuan Topup Saldo Agen',
  PLACEMENT_TRANSFER: 'Pemindahan Titik Jaringan',
};

export function formatAuditAction(action?: string | null): string {
  if (!action) return '-';
  if (AUDIT_ACTION_LABELS[action]) return AUDIT_ACTION_LABELS[action];
  // Auto prettify unknown actions: e.g. "SOME_UNKNOWN_ACTION" -> "Some Unknown Action"
  return action
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// 5. Entitas Audit (Entity Types)
export const ENTITY_TYPE_LABELS: Record<string, string> = {
  WITHDRAWAL: 'Pencairan Dana (Withdrawal)',
  ORDER: 'Pesanan Penjualan (Order)',
  PLACEMENT: 'Penempatan Jaringan',
  MEMBER: 'Profil Mitra / Member',
  MARKETING_PLAN: 'Marketing Plan',
  AGENT: 'Keagenan Resmi Wilayah',
  PAYMENT: 'Transaksi Pembayaran',
  INVENTORY: 'Stok Produk Fisik',
};

export function formatEntityType(entity?: string | null): string {
  if (!entity) return '-';
  return ENTITY_TYPE_LABELS[entity] || entity.replace(/_/g, ' ');
}

// 6. Referensi Transaksi Buku Besar (Double-Entry Ledger & Mutations)
export const REFERENCE_TYPE_LABELS: Record<string, string> = {
  ORDER_PAYMENT: 'Pembayaran Pesanan Penjualan',
  COMMISSION_DISTRIBUTION: 'Alokasi Distribusi Komisi Jaringan',
  COMMISSION_CREDIT: 'Kredit Saldo Dompet Mitra',
  PAYOUT_EXECUTION: 'Pencairan Dana Mitra (Payout)',
  DEPOSIT_TOPUP: 'Topup Saldo Deposit Agen',
  DEPOSIT_PURCHASE: 'Pembelian Produk via Saldo Deposit',
  AGENT_REWARD_CASH: 'Reward Bonus Tunai Agen',
  AGENT_REWARD_ITEM: 'Reward Apresiasi Fisik Agen',
  ORDER_CANCEL: 'Pembatalan Pesanan',
  ORDER_REFUND: 'Pengembalian Dana Pembeli',
};

export function formatReferenceType(refType?: string | null): string {
  if (!refType) return '-';
  return REFERENCE_TYPE_LABELS[refType] || refType.replace(/_/g, ' ');
}

// 7. Sumber Pemenuhan Logistik (Fulfillment Source / Mode)
export const FULFILLMENT_SOURCE_LABELS: Record<string, string> = {
  CENTRAL_WAREHOUSE: 'Gudang Pusat VARENA',
  REGIONAL_STOCKIST: 'Gudang Stokis Wilayah',
  REGIONAL_AGENT: 'Gudang Agen Resmi Wilayah',
  CENTRAL: 'Gudang Pusat VARENA',
  ASSIGNED_AGENT: 'Dialihkan ke Agen Wilayah',
  AGENT_DROPSHIP_REQUEST: 'Permintaan Dropship oleh Agen',
};

export function formatFulfillmentSource(source?: string | null): string {
  if (!source) return 'Gudang Pusat VARENA';
  return FULFILLMENT_SOURCE_LABELS[source] || source.replace(/_/g, ' ');
}

// 8. Status Konfirmasi Transfer Bukti Bayar
export const PAYMENT_CONFIRMATION_STATUS_LABELS: Record<string, string> = {
  NONE: 'Belum Konfirmasi',
  SUBMITTED: 'Menunggu Verifikasi Admin',
  VERIFIED: 'Terverifikasi Lunas',
  REJECTED: 'Ditolak (Perlu Upload Ulang)',
};

export function formatPaymentConfirmationStatus(status?: string | null): string {
  if (!status) return 'Belum Konfirmasi';
  return PAYMENT_CONFIRMATION_STATUS_LABELS[status] || status.replace(/_/g, ' ');
}

// 9. Status Pencairan Payout (Withdrawal Status)
export const PAYOUT_STATUS_LABELS: Record<string, string> = {
  REQUESTED: 'Menunggu Persetujuan',
  APPROVED: 'Disetujui (Siap Kirim)',
  REJECTED: 'Ditolak',
  COMPLETED: 'Berhasil Ditransfer',
};

export function formatPayoutStatus(status?: string | null): string {
  if (!status) return '-';
  return PAYOUT_STATUS_LABELS[status] || status.replace(/_/g, ' ');
}

// 10. Status Mitra (Member Status)
export const MEMBER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Mitra Aktif',
  PENDING: 'Menunggu Pembelian Perdana',
  SUSPENDED: 'Akun Ditangguhkan',
  TERMINATED: 'Akun Nonaktif',
};

export function formatMemberStatus(status?: string | null): string {
  if (!status) return '-';
  return MEMBER_STATUS_LABELS[status] || status.replace(/_/g, ' ');
}

// 11. Status & Tipe Keagenan
export const AGENT_STATUS_LABELS: Record<string, string> = {
  NONE: 'Bukan Agen',
  APPLIED: 'Menunggu Verifikasi',
  ACTIVE: 'Agen Resmi Aktif',
  SUSPENDED: 'Keagenan Dinonaktifkan',
};

export function formatAgentStatus(status?: string | null): string {
  if (!status) return 'Bukan Agen';
  return AGENT_STATUS_LABELS[status] || status.replace(/_/g, ' ');
}

export const AGENT_TYPE_LABELS: Record<string, string> = {
  NONE: 'Mitra Reguler',
  REGIONAL_AGENT: 'Agen Resmi Wilayah',
  MASTER_AGENT: 'Master Agen',
};

export function formatAgentType(type?: string | null): string {
  if (!type) return 'Mitra Reguler';
  return AGENT_TYPE_LABELS[type] || type.replace(/_/g, ' ');
}
