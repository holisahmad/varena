import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('================================================================');
  console.log('   VARENA PLATFORM — CLEAN PRODUCTION DATABASE INITIALIZATION   ');
  console.log('================================================================');
  console.log('Membersihkan seluruh data simulasi, transaksi, dan order lama...');

  // 1. Bersihkan seluruh transaksi lama
  await prisma.auditLog.deleteMany();
  await prisma.withdrawalRequest.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.ledgerTransaction.deleteMany();
  await prisma.commissionItem.deleteMany();
  await prisma.commissionRun.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.placementRelationship.deleteMany();
  await prisma.sponsorRelationship.deleteMany();
  await prisma.ledgerAccount.deleteMany();
  await prisma.member.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.user.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.agentReward.deleteMany();
  await prisma.agentStockMutation.deleteMany();
  await prisma.agentDepositTransaction.deleteMany();
  await prisma.agentApplication.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.marketingPlan.deleteMany();
  await prisma.role.deleteMany();

  console.log('✓ Seluruh data transaksi, mutasi, dan order simulasi telah dibersihkan.');

  // 2. Roles Resmi
  const roles = [
    { code: 'OWNER', name: 'Owner / Direksi', description: 'Pengawasan bisnis, laporan, approval tertinggi' },
    { code: 'KOPERASI', name: 'Koperasi Kemitraan', description: 'Akses perwakilan koperasi' },
    { code: 'OPERATIONS', name: 'Operasional Perusahaan', description: 'Pengelolaan operasional & akun persediaan' },
    { code: 'ADMIN_1', name: 'Admin Logistik & Katalog', description: 'Pengelolaan produk, stok, pesanan' },
    { code: 'ADMIN_2', name: 'Admin Verifikasi & Support', description: 'Verifikasi KYC, placement, member support' },
    { code: 'LEADER_1', name: 'Leader Nasional 1', description: 'Kepemimpinan jaringan level 1' },
    { code: 'LEADER_2', name: 'Leader Regional 2', description: 'Kepemimpinan jaringan level 2' },
    { code: 'LEADER_3', name: 'Leader Area 3 (Root Jaringan)', description: 'Root node penempatan mitra jaringan perdana' },
    { code: 'MITRA', name: 'Mitra Usaha VARENA', description: 'Distributor/reseller dengan hak referral dan komisi' },
    { code: 'CONSUMER', name: 'Konsumen Umum', description: 'Pelanggan retail non-mitra' },
    { code: 'AUDITOR', name: 'Auditor Keuangan', description: 'Hak baca audit trail dan rekonsiliasi' },
  ];

  for (const r of roles) {
    await prisma.role.create({ data: r });
  }
  console.log('✓ 11 Hak Akses Role Resmi berhasil dibuat.');

  const defaultPassword = await bcrypt.hash('Varena2026!', 10);

  // 3. Akun Buku Besar Korporasi (Double-Entry Zero Balance)
  const companyAccounts = [
    { code: 'ACC-COMP-OPS', type: 'REVENUE', ownerType: 'COMPANY_OPERATIONS' },
    { code: 'ACC-COMP-UNALLOC', type: 'LIABILITY', ownerType: 'COMPANY_UNALLOCATED_RESERVE' },
    { code: 'ACC-COMP-PAYOUT', type: 'ASSET', ownerType: 'COMPANY_PAYOUT_CLEARING' },
    { code: 'ACC-COMP-CASH', type: 'ASSET', ownerType: 'COMPANY_CASH_ACCOUNT' },
    { code: 'ACC-LIAB-DEPOSIT-AGENT', type: 'LIABILITY', ownerType: 'AGENT_DEPOSIT_LIABILITY' },
    { code: 'ACC-LIAB-DEPOSIT-SHOPPING', type: 'LIABILITY', ownerType: 'SHOPPING_DEPOSIT_LIABILITY' },
  ];

  for (const ca of companyAccounts) {
    await prisma.ledgerAccount.create({
      data: {
        ownerType: ca.ownerType,
        accountCode: ca.code,
        accountType: ca.type,
        currency: 'IDR',
        balance: 0,
        status: 'ACTIVE',
      },
    });
  }
  console.log('✓ 6 Rekening Akuntansi Buku Besar Korporasi berhasil dibuat (Saldo awal: Rp0).');

  // 4. Struktur Korporasi & Leader Inti (L1 s/d L8 Root)
  const corporateUsers = [
    { id: 'usr-corp-owner-001', memberId: 'mbr-corp-owner-001', email: 'owner@varena.id', name: 'Hendrawan (Owner)', role: 'OWNER', memberCode: 'VRN-CORP-L1' },
    { id: 'usr-corp-kop-002', memberId: 'mbr-corp-kop-002', email: 'koperasi@varena.id', name: 'Koperasi Mandiri VARENA', role: 'KOPERASI', memberCode: 'VRN-CORP-L2' },
    { id: 'usr-corp-ops-003', memberId: 'mbr-corp-ops-003', email: 'operasional@varena.id', name: 'Divisi Operasional', role: 'OPERATIONS', memberCode: 'VRN-CORP-L3' },
    { id: 'usr-corp-adm1-004', memberId: 'mbr-corp-adm1-004', email: 'admin1@varena.id', name: 'Admin Katalog & Stok', role: 'ADMIN_1', memberCode: 'VRN-CORP-L4' },
    { id: 'usr-corp-adm2-005', memberId: 'mbr-corp-adm2-005', email: 'admin2@varena.id', name: 'Admin Verifikasi & Support', role: 'ADMIN_2', memberCode: 'VRN-CORP-L5' },
    { id: 'usr-corp-ldr1-006', memberId: 'mbr-corp-ldr1-006', email: 'leader1@varena.id', name: 'Bambang Pratama (Leader 1)', role: 'LEADER_1', memberCode: 'VRN-LDR-01' },
    { id: 'usr-corp-ldr2-007', memberId: 'mbr-corp-ldr2-007', email: 'leader2@varena.id', name: 'Dewi Kartika (Leader 2)', role: 'LEADER_2', memberCode: 'VRN-LDR-02' },
    { id: 'usr-corp-ldr3-008', memberId: 'mbr-corp-ldr3-008', email: 'leader3@varena.id', name: 'Raden Wijaya (Leader 3 Root)', role: 'LEADER_3', memberCode: 'VRN-LDR-03' },
  ];

  const createdMembers = {};

  for (const u of corporateUsers) {
    const user = await prisma.user.create({
      data: {
        id: u.id,
        email: u.email,
        displayName: u.name,
        passwordHash: defaultPassword,
        status: 'ACTIVE',
      },
    });

    const role = await prisma.role.findUnique({ where: { code: u.role } });
    await prisma.userRole.create({
      data: { userId: user.id, roleId: role.id },
    });

    const member = await prisma.member.create({
      data: {
        id: u.memberId,
        userId: user.id,
        memberCode: u.memberCode,
        displayName: u.name,
        legalName: u.name,
        memberStatus: 'ACTIVE',
        kycStatus: 'VERIFIED',
        activatedAt: new Date(),
      },
    });

    createdMembers[u.memberCode] = member;

    // Member Ledger Wallet (Saldo awal Rp0)
    await prisma.ledgerAccount.create({
      data: {
        ownerType: 'MEMBER',
        ownerId: member.id,
        accountCode: `ACC-MBR-${member.memberCode}`,
        accountType: 'LIABILITY',
        currency: 'IDR',
        balance: 0,
        status: 'ACTIVE',
      },
    });
  }

  // Rantai Penempatan Hierarki Korporasi L1 -> L2 -> L3 -> L4 -> L5 -> LDR-01 -> LDR-02 -> LDR-03
  const corporateChain = [
    'VRN-CORP-L1',
    'VRN-CORP-L2',
    'VRN-CORP-L3',
    'VRN-CORP-L4',
    'VRN-CORP-L5',
    'VRN-LDR-01',
    'VRN-LDR-02',
    'VRN-LDR-03',
  ];

  for (let i = 1; i < corporateChain.length; i++) {
    const child = createdMembers[corporateChain[i]];
    const parent = createdMembers[corporateChain[i - 1]];

    await prisma.sponsorRelationship.create({
      data: {
        memberId: child.id,
        sponsorMemberId: parent.id,
        reason: 'CORPORATE_HIERARCHY_INITIAL',
      },
    });

    await prisma.placementRelationship.create({
      data: {
        memberId: child.id,
        parentMemberId: parent.id,
        status: 'ACTIVE',
      },
    });
  }
  console.log('✓ 8 Akun Inti (Owner s/d Leader 3 Root Jaringan) berhasil dibuat.');

  // 5. Produk & Varian Resmi (Kopi Matahari & Teh Herbal)
  const product = await prisma.product.create({
    data: {
      name: 'Kopi Matahari',
      slug: 'kopi-matahari',
      description:
        'Kopi Matahari adalah kopi Robusta fermentasi premium pilihan, diproses dengan metode fermentasi terkontrol untuk menghasilkan cita rasa yang kaya, aroma yang kuat, dan kenikmatan setiap pagi yang tak terlupakan.',
      tagline: 'Energi Pagi, Sehat Seharian · Nikmatnya Kopi, Baiknya untuk Tubuh',
      servingSuggestion: 'Tuangkan 10gr (1 sendok makan muncung) kopi ke dalam gelas, tambahkan air mendidih ±150cc, aduk rata dan diamkan 5–7 menit, lalu nikmati selagi hangat di pagi hari.',
      category: 'PREMIUM_COFFEE',
      status: 'ACTIVE',
      isFeatured: true,
      bpomNumber: 'P-IRT 2083404061840-31',
      halalNumber: 'ID00110000234560124',
      imageUrl: '/brand/kopi-matahari.jpeg',
      launchedAt: new Date(),
    },
  });

  // Varian Box 10 Sachet (Paket Aktivasi Perdana & RO)
  await prisma.productVariant.create({
    data: {
      productId: product.id,
      sku: 'KM-BOX10',
      name: 'Kopi Matahari Box (10 Sachet)',
      variantType: 'PACK',
      packSize: 10,
      unit: 'box',
      price: 500000,
      hpp: 250000,
      stockQuantity: 1000,
      status: 'ACTIVE',
      allowFirstPack: true,
      allowRepeatOrder: true,
      allowAgentStock: true,
      sponsorReward: 50000,
      uplineRewardPerLevel: 10000,
      maxCommissionLevels: 10,
    },
  });

  // Varian Sachet Satuan (RO & Konsumen)
  await prisma.productVariant.create({
    data: {
      productId: product.id,
      sku: 'KM-SCH01',
      name: 'Kopi Matahari Sachet Satuan',
      variantType: 'SINGLE',
      packSize: 1,
      unit: 'sachet',
      price: 45000,
      hpp: 25000,
      stockQuantity: 5000,
      status: 'ACTIVE',
      allowFirstPack: false,
      allowRepeatOrder: true,
      allowAgentStock: true,
      sponsorReward: 0,
      uplineRewardPerLevel: 2000,
      maxCommissionLevels: 10,
    },
  });

  // Produk Kedua: Teh Celup Herbal Nusantara
  const productTea = await prisma.product.create({
    data: {
      name: 'Teh Celup Herbal Nusantara',
      slug: 'teh-herbal-nusantara',
      description:
        'Racikan daun teh pilihan berpadu dengan jahe merah, serai wangi, dan kayu manis alami khas Nusantara. Memberikan kehangatan alami, rasa nyaman di lambung, dan kesegaran tubuh.',
      tagline: 'Kehangatan Alami, Menyehatkan Tubuh Setiap Hari',
      servingSuggestion: 'Seduh 1 kantong teh dalam 200ml air panas mendidih selama 3–5 menit. Nikmati hangat.',
      category: 'HERBAL_BEVERAGE',
      status: 'ACTIVE',
      isFeatured: false,
      bpomNumber: 'P-IRT 2083404061841-32',
      halalNumber: 'ID00110000234560125',
      imageUrl: '/brand/produk-teh.jpg',
      launchedAt: new Date(),
    },
  });

  await prisma.productVariant.create({
    data: {
      productId: productTea.id,
      sku: 'THN-BOX20',
      name: 'Teh Herbal Box (20 Kantong Celup)',
      variantType: 'PACK',
      packSize: 20,
      unit: 'box',
      price: 350000,
      hpp: 175000,
      stockQuantity: 800,
      status: 'ACTIVE',
      allowFirstPack: true,
      allowRepeatOrder: true,
      allowAgentStock: true,
      sponsorReward: 35000,
      uplineRewardPerLevel: 7000,
      maxCommissionLevels: 10,
    },
  });
  console.log('✓ Katalog Produk Resmi & Varian Aktif (KM-BOX10, KM-SCH01, THN-BOX20) berhasil dibuat.');

  // 6. Pengaturan Sistem Default (Bank Operasional & Parameter Bisnis)
  const defaultSettings = [
    { key: 'PRIMARY_BANK_NAME', value: 'BRI', group: 'FINANCIAL', description: 'Bank operasional penerima utama' },
    { key: 'PRIMARY_BANK_ACCOUNT', value: '3065 0102 4471 539', group: 'FINANCIAL', description: 'Nomor rekening operasional resmi' },
    { key: 'PRIMARY_BANK_HOLDER', value: 'Sunariyo', group: 'FINANCIAL', description: 'Atas nama rekening operasional resmi' },
    { key: 'MIN_PAYOUT_AMOUNT', value: '50000', group: 'FINANCIAL', description: 'Batas minimal penarikan saldo dompet mitra' },
    { key: 'DEFAULT_AGENT_MOQ', value: '10', group: 'AGENT', description: 'Minimal pembelian pasokan stokis/agen (box)' },
    { key: 'DEFAULT_AGENT_DISCOUNT', value: '15.0', group: 'AGENT', description: 'Persentase diskon pembelian grosir agen' },
    { key: 'FREE_SHIPPING_SUBSIDY_AGENT', value: 'true', group: 'LOGISTICS', description: 'Ongkos kirim dari kantor ke agen ditanggung kantor' },
  ];

  for (const s of defaultSettings) {
    await prisma.systemSetting.create({ data: s });
  }
  console.log('✓ Pengaturan Sistem Keuangan & Keagenan berhasil dibuat.');

  // 7. Marketing Plan v1.0 Sesuai Permendag 70/2019
  await prisma.marketingPlan.create({
    data: {
      planCode: 'MP-2026-V1',
      version: 1,
      name: 'Marketing Plan Baseline Permendag 70/2019',
      status: 'ACTIVE',
      firstPackDirectReward: 50000,
      firstPackDevReward: 10000,
      firstPackDevMaxLevels: 10,
      repeatDevReward: 2000,
      repeatDevMaxLevels: 10,
      createdBy: 'Legal & Business Committee',
      approvedBy: 'Direksi Utama',
      approvalReference: 'DIR-VARENA-SK-2026/001',
    },
  });
  console.log('✓ Marketing Plan Resmi (Komisi First Pack & Repeat Order 10 Level) berhasil diaktifkan.');

  console.log('================================================================');
  console.log('✓ SUKSES! Basis data produksi bersih.');
  console.log('✓ Root Leader: Raden Wijaya (VRN-LDR-03 / leader3@varena.id)');
  console.log('✓ Referral link perdana: https://varena.id/r/VRN-LDR-03');
  console.log('✓ Total Transaksi Dummy / Demo: 0 (Bersih, siap menerima transaksi riil)');
  console.log('================================================================');
}

main()
  .catch((e) => {
    console.error('Error seeding clean production database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
