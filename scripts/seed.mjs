import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding VARENA platform database...');

  // 1. Roles
  const roles = [
    { code: 'OWNER', name: 'Owner / Direksi', description: 'Pengawasan bisnis, laporan, approval tertinggi' },
    { code: 'KOPERASI', name: 'Koperasi Kemitraan', description: 'Akses perwakilan koperasi' },
    { code: 'OPERATIONS', name: 'Operasional Perusahaan', description: 'Pengelolaan operasional & akun persediaan' },
    { code: 'ADMIN_1', name: 'Admin Logistik & Katalog', description: 'Pengelolaan produk, stok, pesanan' },
    { code: 'ADMIN_2', name: 'Admin Verifikasi & Support', description: 'Verifikasi KYC, placement, member support' },
    { code: 'LEADER_1', name: 'Leader Nasional 1', description: 'Kepemimpinan jaringan level 1' },
    { code: 'LEADER_2', name: 'Leader Regional 2', description: 'Kepemimpinan jaringan level 2' },
    { code: 'LEADER_3', name: 'Leader Area 3 (Root Jaringan)', description: 'Root node penempatan mitra jaringan' },
    { code: 'MITRA', name: 'Mitra Usaha VARENA', description: 'Distributor/reseller dengan hak referral dan komisi' },
    { code: 'CONSUMER', name: 'Konsumen Umum', description: 'Pelanggan retail non-mitra' },
    { code: 'AUDITOR', name: 'Auditor Keuangan', description: 'Hak baca audit trail dan rekonsiliasi' },
  ];

  for (const r of roles) {
    await prisma.role.upsert({
      where: { code: r.code },
      update: { name: r.name, description: r.description },
      create: r,
    });
  }

  const defaultPassword = await bcrypt.hash('Varena2026!', 10);

  // 2. Corporate & Internal Hierarchy Users (Level 1 to 8)
  const corporateUsers = [
    { email: 'owner@varena.id', name: 'Hendrawan (Owner)', role: 'OWNER', memberCode: 'VRN-CORP-L1' },
    { email: 'koperasi@varena.id', name: 'Koperasi Mandiri VARENA', role: 'KOPERASI', memberCode: 'VRN-CORP-L2' },
    { email: 'operasional@varena.id', name: 'Divisi Operasional', role: 'OPERATIONS', memberCode: 'VRN-CORP-L3' },
    { email: 'admin1@varena.id', name: 'Admin Katalog & Stok', role: 'ADMIN_1', memberCode: 'VRN-CORP-L4' },
    { email: 'admin2@varena.id', name: 'Admin Verifikasi & Support', role: 'ADMIN_2', memberCode: 'VRN-CORP-L5' },
    { email: 'leader1@varena.id', name: 'Bambang Pratama (Leader 1)', role: 'LEADER_1', memberCode: 'VRN-LDR-01' },
    { email: 'leader2@varena.id', name: 'Dewi Kartika (Leader 2)', role: 'LEADER_2', memberCode: 'VRN-LDR-02' },
    { email: 'leader3@varena.id', name: 'Raden Wijaya (Leader 3 Root)', role: 'LEADER_3', memberCode: 'VRN-LDR-03' },
  ];

  const createdMembers = {};

  for (const u of corporateUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { displayName: u.name },
      create: {
        email: u.email,
        displayName: u.name,
        passwordHash: defaultPassword,
        status: 'ACTIVE',
      },
    });

    const role = await prisma.role.findUnique({ where: { code: u.role } });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });

    const member = await prisma.member.upsert({
      where: { memberCode: u.memberCode },
      update: { displayName: u.name, legalName: u.name },
      create: {
        userId: user.id,
        memberCode: u.memberCode,
        displayName: u.name,
        legalName: u.name,
        memberStatus: 'ACTIVE',
        kycStatus: 'VERIFIED',
      },
    });

    createdMembers[u.memberCode] = member;

    // Create Ledger Wallet for member
    await prisma.ledgerAccount.upsert({
      where: { accountCode: `ACC-MBR-${member.memberCode}` },
      update: {},
      create: {
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

  // Set Corporate Placement Hierarchy: Level 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8
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
    const childCode = corporateChain[i];
    const parentCode = corporateChain[i - 1];
    const child = createdMembers[childCode];
    const parent = createdMembers[parentCode];

    await prisma.sponsorRelationship.upsert({
      where: { memberId: child.id },
      update: { sponsorMemberId: parent.id },
      create: {
        memberId: child.id,
        sponsorMemberId: parent.id,
        reason: 'CORPORATE_HIERARCHY_INITIAL',
      },
    });

    await prisma.placementRelationship.upsert({
      where: { memberId: child.id },
      update: { parentMemberId: parent.id },
      create: {
        memberId: child.id,
        parentMemberId: parent.id,
        status: 'ACTIVE',
      },
    });
  }

  // 3. Mitra Network (Level 9+) placed below Leader 3 (VRN-LDR-03)
  const rootLeader = createdMembers['VRN-LDR-03'];

  const initialMitras = [
    { email: 'mitra1@varena.id', name: 'Ahmad Fauzi', code: 'VRN-0001', phone: '081234567891' },
    { email: 'mitra2@varena.id', name: 'Siti Nurhaliza', code: 'VRN-0002', phone: '081234567892' },
    { email: 'mitra3@varena.id', name: 'Budi Santoso', code: 'VRN-0003', phone: '081234567893' },
  ];

  let currentParent = rootLeader;
  for (const m of initialMitras) {
    const user = await prisma.user.upsert({
      where: { email: m.email },
      update: { displayName: m.name, phone: m.phone },
      create: {
        email: m.email,
        phone: m.phone,
        displayName: m.name,
        passwordHash: defaultPassword,
        status: 'ACTIVE',
      },
    });

    const role = await prisma.role.findUnique({ where: { code: 'MITRA' } });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });

    const member = await prisma.member.upsert({
      where: { memberCode: m.code },
      update: { displayName: m.name, legalName: m.name },
      create: {
        userId: user.id,
        memberCode: m.code,
        displayName: m.name,
        legalName: m.name,
        memberStatus: 'ACTIVE',
        kycStatus: 'VERIFIED',
      },
    });

    createdMembers[m.code] = member;

    // Sponsor is Leader 3
    await prisma.sponsorRelationship.upsert({
      where: { memberId: member.id },
      update: { sponsorMemberId: rootLeader.id },
      create: {
        memberId: member.id,
        sponsorMemberId: rootLeader.id,
        reason: 'REFERRAL_ONBOARDING',
      },
    });

    // Placement in sequence under previous node
    await prisma.placementRelationship.upsert({
      where: { memberId: member.id },
      update: { parentMemberId: currentParent.id },
      create: {
        memberId: member.id,
        parentMemberId: currentParent.id,
        status: 'ACTIVE',
      },
    });

    // Create Wallet Account
    await prisma.ledgerAccount.upsert({
      where: { accountCode: `ACC-MBR-${member.memberCode}` },
      update: {},
      create: {
        ownerType: 'MEMBER',
        ownerId: member.id,
        accountCode: `ACC-MBR-${member.memberCode}`,
        accountType: 'LIABILITY',
        currency: 'IDR',
        balance: 0,
        status: 'ACTIVE',
      },
    });

    currentParent = member;
  }

  // 4. Company Ledger Accounts
  const companyAccounts = [
    { code: 'ACC-COMP-OPS', type: 'REVENUE', ownerType: 'COMPANY_OPERATIONS' },
    { code: 'ACC-COMP-UNALLOC', type: 'LIABILITY', ownerType: 'COMPANY_UNALLOCATED_RESERVE' },
    { code: 'ACC-COMP-PAYOUT', type: 'ASSET', ownerType: 'COMPANY_PAYOUT_CLEARING' },
  ];

  for (const ca of companyAccounts) {
    await prisma.ledgerAccount.upsert({
      where: { accountCode: ca.code },
      update: {},
      create: {
        ownerType: ca.ownerType,
        accountCode: ca.code,
        accountType: ca.type,
        currency: 'IDR',
        balance: 0,
        status: 'ACTIVE',
      },
    });
  }

  // 5. Products & Product Variants
  const product = await prisma.product.upsert({
    where: { slug: 'varena-kopi-sehat' },
    update: {},
    create: {
      name: 'VARENA Kopi Sehat Premium Herbal',
      slug: 'varena-kopi-sehat',
      description: 'Minuman kopi herbal premium racikan biji kopi pilihan dengan ekstrak herba alami untuk stamina, vitalitas prima, dan daya tahan tubuh.',
      category: 'HERBAL_BEVERAGE',
      status: 'ACTIVE',
      bpomNumber: 'MD 867028001234',
      halalNumber: 'ID00110000234560124',
      imageUrl: '/brand/varena-connected-v-symbol.png',
    },
  });

  // Variant 1: First Pack Box (10 sachet @ Rp500.000, HPP Rp300.000)
  await prisma.productVariant.upsert({
    where: { sku: 'VRN-KOP-BOX10' },
    update: { price: 500000, hpp: 300000 },
    create: {
      productId: product.id,
      sku: 'VRN-KOP-BOX10',
      name: 'Paket Perdana Box (10 Sachet)',
      packSize: 10,
      unit: 'box',
      price: 500000,
      hpp: 300000,
      stockQuantity: 500,
      status: 'ACTIVE',
    },
  });

  // Variant 2: Repeat Purchase Sachet (1 sachet @ Rp45.000, HPP Rp30.000)
  await prisma.productVariant.upsert({
    where: { sku: 'VRN-KOP-SCH01' },
    update: { price: 45000, hpp: 30000 },
    create: {
      productId: product.id,
      sku: 'VRN-KOP-SCH01',
      name: 'Eceran Sachet Satuan',
      packSize: 1,
      unit: 'sachet',
      price: 45000,
      hpp: 30000,
      stockQuantity: 2500,
      status: 'ACTIVE',
    },
  });

  // 6. Marketing Plan v1.0 (Baseline Approved)
  await prisma.marketingPlan.upsert({
    where: { planCode: 'MP-2026-V1' },
    update: {},
    create: {
      planCode: 'MP-2026-V1',
      version: 1,
      name: 'Marketing Plan Baseline Permendag 70/2019',
      status: 'ACTIVE',
      firstPackDirectReward: 50000,
      firstPackDevReward: 10000,
      firstPackDevMaxLevels: 10,
      repeatDevReward: 1000,
      repeatDevMaxLevels: 10,
      createdBy: 'Legal & Business Committee',
      approvedBy: 'Direksi Utama',
      approvalReference: 'DIR-VARENA-SK-2026/001',
    },
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

