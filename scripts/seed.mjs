import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helper to post double-entry transactions
async function postLedger(tx, { referenceType, referenceId, idempotencyKey, memo, entries }) {
  let totalDebit = 0;
  let totalCredit = 0;

  for (const entry of entries) {
    if (entry.direction === 'DEBIT') totalDebit += entry.amount;
    else if (entry.direction === 'CREDIT') totalCredit += entry.amount;
  }

  if (totalDebit !== totalCredit) {
    throw new Error(`Ledger unbalanced: Debit ${totalDebit} != Credit ${totalCredit}`);
  }

  const existing = await tx.ledgerTransaction.findUnique({
    where: { idempotencyKey },
  });
  if (existing) return existing;

  const transaction = await tx.ledgerTransaction.create({
    data: {
      referenceType,
      referenceId,
      transactionType: 'STANDARD',
      idempotencyKey,
      memo,
    },
  });

  for (const e of entries) {
    const acc = await tx.ledgerAccount.findUnique({ where: { accountCode: e.accountCode } });
    if (!acc) throw new Error(`Account not found: ${e.accountCode}`);

    await tx.ledgerEntry.create({
      data: {
        transactionId: transaction.id,
        accountId: acc.id,
        direction: e.direction,
        amount: e.amount,
        memo: e.memo || memo,
      },
    });

    let balanceDelta = 0;
    if (acc.accountType === 'ASSET' || acc.accountType === 'EXPENSE') {
      balanceDelta = e.direction === 'DEBIT' ? e.amount : -e.amount;
    } else {
      // LIABILITY, EQUITY, REVENUE
      balanceDelta = e.direction === 'CREDIT' ? e.amount : -e.amount;
    }

    await tx.ledgerAccount.update({
      where: { id: acc.id },
      data: { balance: { increment: balanceDelta } },
    });
  }

  return transaction;
}

async function main() {
  console.log('--- Cleaning and Seeding Complete VARENA Platform Simulation ---');

  // Clear existing transactional records to allow clean, idempotent re-seeding
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
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.marketingPlan.deleteMany();
  await prisma.role.deleteMany();

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
    await prisma.role.create({ data: r });
  }

  const defaultPassword = await bcrypt.hash('Varena2026!', 10);

  // 2. Corporate Ledger Accounts
  const companyAccounts = [
    { code: 'ACC-COMP-OPS', type: 'REVENUE', ownerType: 'COMPANY_OPERATIONS' },
    { code: 'ACC-COMP-UNALLOC', type: 'LIABILITY', ownerType: 'COMPANY_UNALLOCATED_RESERVE' },
    { code: 'ACC-COMP-PAYOUT', type: 'ASSET', ownerType: 'COMPANY_PAYOUT_CLEARING' },
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

  // 3. Corporate Hierarchy Users (L1 to L8)
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
    const user = await prisma.user.create({
      data: {
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

    // Member Ledger Wallet
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

  // Chain corporate placement L1 -> L2 -> L3 -> L4 -> L5 -> L6 -> L7 -> L8
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

  // 4. Extended Mitra Network (Multi-tier Downlines under VRN-0001)
  const rootLeader = createdMembers['VRN-LDR-03'];

  const mitrasData = [
    {
      email: 'mitra1@varena.id',
      name: 'Ahmad Fauzi',
      code: 'VRN-0001',
      phone: '081234567891',
      sponsorCode: 'VRN-LDR-03',
      placementParentCode: 'VRN-LDR-03',
    },
    {
      email: 'mitra2@varena.id',
      name: 'Siti Nurhaliza',
      code: 'VRN-0002',
      phone: '081234567892',
      sponsorCode: 'VRN-0001',
      placementParentCode: 'VRN-0001',
    },
    {
      email: 'mitra3@varena.id',
      name: 'Budi Santoso',
      code: 'VRN-0003',
      phone: '081234567893',
      sponsorCode: 'VRN-0001',
      placementParentCode: 'VRN-0001',
    },
    {
      email: 'mitra4@varena.id',
      name: 'Rina Anggraini',
      code: 'VRN-0004',
      phone: '081234567894',
      sponsorCode: 'VRN-0002',
      placementParentCode: 'VRN-0002',
    },
    {
      email: 'mitra5@varena.id',
      name: 'Dedi Kurniawan',
      code: 'VRN-0005',
      phone: '081234567895',
      sponsorCode: 'VRN-0003',
      placementParentCode: 'VRN-0003',
    },
    {
      email: 'mitra6@varena.id',
      name: 'Eka Prasetya',
      code: 'VRN-0006',
      phone: '081234567896',
      sponsorCode: 'VRN-0004',
      placementParentCode: 'VRN-0004',
    },
  ];

  const mitraRole = await prisma.role.findUnique({ where: { code: 'MITRA' } });

  for (const m of mitrasData) {
    const user = await prisma.user.create({
      data: {
        email: m.email,
        phone: m.phone,
        displayName: m.name,
        passwordHash: defaultPassword,
        status: 'ACTIVE',
      },
    });

    await prisma.userRole.create({
      data: { userId: user.id, roleId: mitraRole.id },
    });

    const member = await prisma.member.create({
      data: {
        userId: user.id,
        memberCode: m.code,
        displayName: m.name,
        legalName: m.name,
        memberStatus: 'ACTIVE',
        kycStatus: 'VERIFIED',
        bankName: m.code === 'VRN-0001' ? 'BCA' : m.code === 'VRN-0002' ? 'MANDIRI' : null,
        bankAccountNumber: m.code === 'VRN-0001' ? '1234567890' : m.code === 'VRN-0002' ? '9876543210' : null,
        bankAccountHolder: m.code === 'VRN-0001' ? 'Ahmad Fauzi' : m.code === 'VRN-0002' ? 'Siti Nurhaliza' : null,
        bankLockedAt: m.code === 'VRN-0001' || m.code === 'VRN-0002' ? new Date() : null,
        stockistType: m.code === 'VRN-0002' ? 'MASTER' : m.code === 'VRN-0003' ? 'MOBILE' : 'NONE',
        stockistCity: m.code === 'VRN-0002' ? 'Surabaya, Jawa Timur' : m.code === 'VRN-0003' ? 'Bandung, Jawa Barat' : null,
        stockistInventory: m.code === 'VRN-0002' ? 200 : m.code === 'VRN-0003' ? 50 : 0,
        activatedAt: new Date(),
      },
    });

    createdMembers[m.code] = member;

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

  // Establish relationships
  for (const m of mitrasData) {
    const child = createdMembers[m.code];
    const sponsor = createdMembers[m.sponsorCode];
    const parent = createdMembers[m.placementParentCode];

    await prisma.sponsorRelationship.create({
      data: {
        memberId: child.id,
        sponsorMemberId: sponsor.id,
        reason: 'REFERRAL_ONBOARDING',
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

  // 5. Products & Product Variants (Updated HPP values: Rp25.000 / sachet, Rp250.000 / box)
  const product = await prisma.product.create({
    data: {
      name: 'VARENA Kopi Sehat Premium Herbal',
      slug: 'varena-kopi-sehat',
      description: 'Minuman kopi herbal premium racikan biji kopi pilihan dengan ekstrak herba alami untuk stamina, vitalitas prima, dan daya tahan tubuh.',
      category: 'HERBAL_BEVERAGE',
      status: 'ACTIVE',
      bpomNumber: 'MD 867028001234',
      halalNumber: 'ID00110000234560124',
      imageUrl: '/brand/logo-square.png',
    },
  });

  // Variant 1: First Pack Box (10 sachet @ Rp500.000, HPP Rp250.000)
  const boxVariant = await prisma.productVariant.create({
    data: {
      productId: product.id,
      sku: 'VRN-KOP-BOX10',
      name: 'Paket Perdana Box (10 Sachet)',
      packSize: 10,
      unit: 'box',
      price: 500000,
      hpp: 250000, // Updated HPP
      stockQuantity: 1000,
      status: 'ACTIVE',
    },
  });

  // Variant 2: Repeat Purchase Sachet (1 sachet @ Rp45.000, HPP Rp25.000)
  const sachetVariant = await prisma.productVariant.create({
    data: {
      productId: product.id,
      sku: 'VRN-KOP-SCH01',
      name: 'Eceran Sachet Satuan',
      packSize: 1,
      unit: 'sachet',
      price: 45000,
      hpp: 25000, // Updated HPP
      stockQuantity: 5000,
      status: 'ACTIVE',
    },
  });

  // 6. Marketing Plan v1.0 (Updated repeatDevReward: Rp2.000 / level)
  const plan = await prisma.marketingPlan.create({
    data: {
      planCode: 'MP-2026-V1',
      version: 1,
      name: 'Marketing Plan Baseline Permendag 70/2019',
      status: 'ACTIVE',
      firstPackDirectReward: 50000,
      firstPackDevReward: 10000,
      firstPackDevMaxLevels: 10,
      repeatDevReward: 2000, // Updated from 1000 to 2000
      repeatDevMaxLevels: 10,
      createdBy: 'Legal & Business Committee',
      approvedBy: 'Direksi Utama',
      approvalReference: 'DIR-VARENA-SK-2026/001',
    },
  });

  console.log('✓ Master Data, Hierarki Jaringan, dan Marketing Plan Berhasil Dibuat');

  // Helper to fetch placement uplines up to 10 levels
  async function getUplines(startMemberId, maxLevels = 10) {
    const list = [];
    let currentId = startMemberId;

    for (let lvl = 1; lvl <= maxLevels; lvl++) {
      const rel = await prisma.placementRelationship.findUnique({
        where: { memberId: currentId },
        include: { parent: true },
      });

      if (!rel || !rel.parent) break;
      list.push({ level: lvl, member: rel.parent });
      currentId = rel.parent.id;
    }
    return list;
  }

  // Helper to simulate an order with automatic payment settlement, commissions, and ledger posting
  async function processSimulationOrder({
    orderNumber,
    buyerMember,
    buyerName,
    buyerPhone,
    buyerEmail,
    shippingAddress,
    referralMember,
    items,
    isStockistOrder = false,
  }) {
    const orderItemsData = [];
    let subtotal = 0;
    let hasFirstPack = false;
    let totalSachets = 0;

    for (const it of items) {
      const lineTotal = it.variant.price * it.quantity;
      subtotal += lineTotal;
      if (it.variant.packSize >= 10) hasFirstPack = true;
      if (it.variant.packSize === 1) totalSachets += it.quantity;

      orderItemsData.push({
        productVariantId: it.variant.id,
        skuSnapshot: it.variant.sku,
        nameSnapshot: it.variant.name,
        unitPrice: it.variant.price,
        hppSnapshot: it.variant.hpp,
        quantity: it.quantity,
        lineTotal,
      });
    }

    // Shipping Policy:
    // Member dibebankan ongkir Rp20.000.
    // Untuk pasokan stokis: gratis ongkir bagi stokis (shippingCost = 0), ditanggung kantor pusat sebagai beban operasional (shippingExpense = Rp35.000).
    const shippingCost = isStockistOrder ? 0 : 20000;
    const shippingExpense = isStockistOrder ? 35000 : 0;
    const total = subtotal + shippingCost;

    return prisma.$transaction(async (tx) => {
      // 1. Create Order
      const order = await tx.order.create({
        data: {
          orderNumber,
          buyerUserId: buyerMember ? buyerMember.userId : null,
          buyerName: buyerName || buyerMember?.displayName,
          buyerPhone: buyerPhone || '081234567890',
          buyerEmail: buyerEmail || (buyerMember ? `${buyerMember.memberCode.toLowerCase()}@varena.id` : null),
          shippingAddress: shippingAddress || 'Jl. Jenderal Sudirman No. 45, Jakarta Pusat',
          referralMemberId: referralMember ? referralMember.id : null,
          orderStatus: 'PAID',
          orderType: hasFirstPack ? 'FIRST_PACK' : 'REPEAT_PURCHASE',
          subtotal,
          discount: 0,
          shippingCost,
          shippingExpense,
          total,
          fulfillmentSource: isStockistOrder ? 'REGIONAL_STOCKIST' : 'CENTRAL_WAREHOUSE',
          stockistMemberId: isStockistOrder ? buyerMember?.id : null,
          paidAt: new Date(),
        },
      });

      for (const oi of orderItemsData) {
        await tx.orderItem.create({
          data: { orderId: order.id, ...oi },
        });
        await tx.productVariant.update({
          where: { id: oi.productVariantId },
          data: { stockQuantity: { decrement: oi.quantity } },
        });
      }

      // 2. Create Payment Record
      await tx.payment.create({
        data: {
          orderId: order.id,
          amount: total,
          status: 'SUCCESS',
          provider: 'SIMULATED_BCA_VA',
          providerReference: `PAY-${orderNumber}`,
          paidAt: new Date(),
        },
      });

      // 3. Post Payment to General Ledger:
      // DEBIT: Payout Clearing (`ACC-COMP-PAYOUT`) - total cash received
      // CREDIT: Company Operations Revenue (`ACC-COMP-OPS`) - product sales
      // CREDIT: Company Shipping Fee (`ACC-COMP-OPS`) - member shipping cost
      const orderLedgerEntries = [
        { accountCode: 'ACC-COMP-PAYOUT', direction: 'DEBIT', amount: total },
        { accountCode: 'ACC-COMP-OPS', direction: 'CREDIT', amount: subtotal },
      ];

      if (shippingCost > 0) {
        orderLedgerEntries.push({
          accountCode: 'ACC-COMP-OPS',
          direction: 'CREDIT',
          amount: shippingCost,
        });
      }

      // If stockist order, kantor menanggung beban ongkir sebagai biaya operasional kantor
      if (shippingExpense > 0) {
        orderLedgerEntries.push({
          accountCode: 'ACC-COMP-OPS',
          direction: 'DEBIT',
          amount: shippingExpense,
        });
        orderLedgerEntries.push({
          accountCode: 'ACC-COMP-PAYOUT',
          direction: 'CREDIT',
          amount: shippingExpense,
        });
      }

      await postLedger(tx, {
        referenceType: 'ORDER_PAYMENT',
        referenceId: order.id,
        idempotencyKey: `LEDGER-PAY-${order.id}`,
        memo: `Pembayaran Pesanan ${order.orderNumber} (${buyerName || buyerMember?.displayName})`,
        entries: orderLedgerEntries,
      });

      // 4. Calculate Commissions
      const commissionItemsToCreate = [];
      let totalDistributed = 0;
      let unallocatedTotal = 0;

      // Direct Sponsor Bonus (First Pack)
      if (hasFirstPack && referralMember) {
        // Find direct sponsor of referral or referral itself
        const sponsorRel = await tx.sponsorRelationship.findUnique({
          where: { memberId: referralMember.id },
          include: { sponsor: true },
        });
        const directSponsor = sponsorRel?.sponsor || referralMember;

        commissionItemsToCreate.push({
          beneficiaryId: directSponsor.id,
          rewardType: 'DIRECT_SPONSOR',
          levelNumber: 0,
          amount: plan.firstPackDirectReward, // Rp50.000
          reasonCode: `DIRECT_SPONSOR_BONUS_${order.orderNumber}`,
        });
        totalDistributed += plan.firstPackDirectReward;
      }

      // Development Placement Bonus (10 levels upline)
      const uplines = await getUplines(referralMember ? referralMember.id : (buyerMember ? buyerMember.id : null));

      if (hasFirstPack) {
        for (let lvl = 1; lvl <= plan.firstPackDevMaxLevels; lvl++) {
          const u = uplines.find((x) => x.level === lvl);
          if (u && u.member.memberStatus === 'ACTIVE') {
            commissionItemsToCreate.push({
              beneficiaryId: u.member.id,
              rewardType: 'DEVELOPMENT_PLACEMENT',
              levelNumber: lvl,
              amount: plan.firstPackDevReward, // Rp10.000
              reasonCode: `DEV_UPLINE_L${lvl}_${order.orderNumber}`,
            });
            totalDistributed += plan.firstPackDevReward;
          } else {
            commissionItemsToCreate.push({
              beneficiaryId: null,
              rewardType: 'UNALLOCATED_DEV_RESERVE',
              levelNumber: lvl,
              amount: plan.firstPackDevReward,
              reasonCode: `DEV_L${lvl}_UNALLOCATED_${order.orderNumber}`,
            });
            unallocatedTotal += plan.firstPackDevReward;
          }
        }
      }

      // Repeat Purchase Development Bonus (Rp2.000 * totalSachets per level)
      if (totalSachets > 0) {
        const repeatBonusPerLevel = plan.repeatDevReward * totalSachets;
        for (let lvl = 1; lvl <= plan.repeatDevMaxLevels; lvl++) {
          const u = uplines.find((x) => x.level === lvl);
          if (u && u.member.memberStatus === 'ACTIVE') {
            commissionItemsToCreate.push({
              beneficiaryId: u.member.id,
              rewardType: 'DEVELOPMENT_PLACEMENT',
              levelNumber: lvl,
              amount: repeatBonusPerLevel,
              reasonCode: `REPEAT_DEV_L${lvl}_${totalSachets}SCH_${order.orderNumber}`,
            });
            totalDistributed += repeatBonusPerLevel;
          } else {
            commissionItemsToCreate.push({
              beneficiaryId: null,
              rewardType: 'UNALLOCATED_DEV_RESERVE',
              levelNumber: lvl,
              amount: repeatBonusPerLevel,
              reasonCode: `REPEAT_DEV_L${lvl}_UNALLOCATED_${order.orderNumber}`,
            });
            unallocatedTotal += repeatBonusPerLevel;
          }
        }
      }

      // 5. Create Commission Run
      const commissionRun = await tx.commissionRun.create({
        data: {
          sourceOrderId: order.id,
          planVersionId: plan.id,
          calculationStatus: 'COMPLETED',
          idempotencyKey: `COMM-RUN-${order.id}`,
          totalCommission: totalDistributed,
          unallocatedAmount: unallocatedTotal,
          inputSnapshot: JSON.stringify({
            orderNumber: order.orderNumber,
            total: order.total,
            hasFirstPack,
            totalSachets,
          }),
        },
      });

      for (const item of commissionItemsToCreate) {
        await tx.commissionItem.create({
          data: {
            commissionRunId: commissionRun.id,
            beneficiaryMemberId: item.beneficiaryId,
            rewardType: item.rewardType,
            levelNumber: item.levelNumber,
            amount: item.amount,
            reasonCode: item.reasonCode,
          },
        });
      }

      // 6. Post Commission Distribution to General Ledger
      const ledgerEntries = [];
      const totalExpense = totalDistributed + unallocatedTotal;

      if (totalExpense > 0) {
        ledgerEntries.push({
          accountCode: 'ACC-COMP-OPS',
          direction: 'DEBIT',
          amount: totalExpense,
          memo: `Beban Komisi & Alokasi Cadangan Penjualan ${order.orderNumber}`,
        });

        // Group distributed amounts by beneficiary account
        const beneficiaryMap = new Map();
        for (const item of commissionItemsToCreate) {
          if (item.beneficiaryId) {
            const current = beneficiaryMap.get(item.beneficiaryId) || 0;
            beneficiaryMap.set(item.beneficiaryId, current + item.amount);
          }
        }

        for (const [memberId, amount] of beneficiaryMap.entries()) {
          const mb = await tx.member.findUnique({ where: { id: memberId } });
          ledgerEntries.push({
            accountCode: `ACC-MBR-${mb.memberCode}`,
            direction: 'CREDIT',
            amount,
            memo: `Kredit Komisi Mitra ${mb.memberCode} dari ${order.orderNumber}`,
          });
        }

        if (unallocatedTotal > 0) {
          ledgerEntries.push({
            accountCode: 'ACC-COMP-UNALLOC',
            direction: 'CREDIT',
            amount: unallocatedTotal,
            memo: `Cadangan Liabilitas Titik Kosong dari ${order.orderNumber}`,
          });
        }

        await postLedger(tx, {
          referenceType: 'COMMISSION_DISTRIBUTION',
          referenceId: commissionRun.id,
          idempotencyKey: `LEDGER-COMM-${commissionRun.id}`,
          memo: `Distribusi Komisi Penjualan ${order.orderNumber}`,
          entries: ledgerEntries,
        });
      }

      // 7. Audit Log
      await tx.auditLog.create({
        data: {
          actorUserId: null,
          action: 'ORDER_SETTLED_AND_COMMISSIONED',
          entityType: 'ORDER',
          entityId: order.id,
          beforeJson: null,
          afterJson: JSON.stringify({
            orderNumber: order.orderNumber,
            total: order.total,
            totalDistributed,
            unallocatedTotal,
          }),
        },
      });

      return order;
    });
  }

  // --------------------------------------------------------------------------
  // 7. Execute 6 Simulated Orders Across the Network
  // --------------------------------------------------------------------------
  console.log('--- Memproses Skenario Transaksi Penjualan Riil Terpadu ---');

  // Order 0: Ahmad Fauzi (VRN-0001) beli Paket Perdana Box (Rp500.000)
  // Sponsor: VRN-LDR-03 (Raden Wijaya)
  await processSimulationOrder({
    orderNumber: 'VRN-ORD-2026-0000',
    buyerMember: createdMembers['VRN-0001'],
    referralMember: createdMembers['VRN-0001'],
    items: [{ variant: boxVariant, quantity: 1 }],
  });
  console.log('✓ Order 0: Pembelian Box Perdana oleh Ahmad Fauzi (VRN-0001) -> Komisi ke Leader 3 (VRN-LDR-03) & Korporasi');

  // Order 1: Pasokan Box ke Siti Nurhaliza (VRN-0002) - Master Stokis Surabaya
  // Bebas ongkir bagi stokis, biaya ongkir Rp35.000 ditanggung kantor sebagai biaya operasional
  // Sponsor: VRN-0001 (Ahmad Fauzi)
  await processSimulationOrder({
    orderNumber: 'VRN-ORD-2026-0001',
    buyerMember: createdMembers['VRN-0002'],
    referralMember: createdMembers['VRN-0002'],
    items: [{ variant: boxVariant, quantity: 1 }],
    isStockistOrder: true,
  });
  console.log('✓ Order 1: Pasokan ke Master Stokis Siti Nurhaliza (VRN-0002) -> Bebas Ongkir Stokis (Beban Operasional Kantor Rp35.000), Komisi Rp60.000 untuk Ahmad Fauzi (VRN-0001)');

  // Order 2: Budi Santoso (VRN-0003) beli Paket Perdana Box (Rp500.000)
  // Sponsor: VRN-0001 (Ahmad Fauzi)
  await processSimulationOrder({
    orderNumber: 'VRN-ORD-2026-0002',
    buyerMember: createdMembers['VRN-0003'],
    referralMember: createdMembers['VRN-0003'],
    items: [{ variant: boxVariant, quantity: 1 }],
  });
  console.log('✓ Order 2: Pembelian Box Perdana oleh Budi Santoso (VRN-0003) -> Komisi Rp60.000 untuk Ahmad Fauzi (VRN-0001)');

  // Order 3: Rina Anggraini (VRN-0004) beli Paket Perdana Box (Rp500.000)
  // Placement di bawah VRN-0002 (L1 Siti, L2 Ahmad VRN-0001)
  await processSimulationOrder({
    orderNumber: 'VRN-ORD-2026-0003',
    buyerMember: createdMembers['VRN-0004'],
    referralMember: createdMembers['VRN-0004'],
    items: [{ variant: boxVariant, quantity: 1 }],
  });
  console.log('✓ Order 3: Pembelian Box Perdana oleh Rina Anggraini (VRN-0004) -> Komisi Titik Rp10.000 untuk Ahmad Fauzi (VRN-0001)');

  // Order 4: Konsumen Retail belanja 10 sachet eceran (Rp450.000) via referral VRN-0003 (Budi)
  // Bonus Repeat Dev: 10 * Rp2.000 = Rp20.000 per level upline (L1 Budi, L2 Ahmad VRN-0001)
  await processSimulationOrder({
    orderNumber: 'VRN-ORD-2026-0004',
    buyerMember: null,
    buyerName: 'Dewi Lestari (Konsumen)',
    buyerPhone: '081399887766',
    buyerEmail: 'dewilestari@gmail.com',
    referralMember: createdMembers['VRN-0003'],
    items: [{ variant: sachetVariant, quantity: 10 }],
  });
  console.log('✓ Order 4: Pembelian 10 Sachet Satuan Konsumen -> Repeat Dev Bonus Rp20.000 untuk Ahmad Fauzi (VRN-0001)');

  // Order 5: Eka Prasetya (VRN-0006) repeat purchase 5 sachet eceran (Rp225.000)
  // Bonus Repeat Dev: 5 * Rp2.000 = Rp10.000 per level upline (L1 Rina, L2 Siti, L3 Ahmad VRN-0001)
  await processSimulationOrder({
    orderNumber: 'VRN-ORD-2026-0005',
    buyerMember: createdMembers['VRN-0006'],
    referralMember: createdMembers['VRN-0006'],
    items: [{ variant: sachetVariant, quantity: 5 }],
  });
  console.log('✓ Order 5: Pembelian 5 Sachet Satuan oleh Eka Prasetya -> Repeat Dev Bonus Rp10.000 untuk Ahmad Fauzi (VRN-0001)');

  // --------------------------------------------------------------------------
  // 8. Payout Simulation (Maker-Checker Flow)
  // --------------------------------------------------------------------------
  console.log('--- Memproses Alur Penarikan Saldo (Maker-Checker Payout) ---');

  const ahmadMember = createdMembers['VRN-0001'];
  const ahmadWalletAcc = await prisma.ledgerAccount.findUnique({
    where: { accountCode: `ACC-MBR-${ahmadMember.memberCode}` },
  });

  console.log(`Saldo Akumulasi Ahmad Fauzi (VRN-0001) Sebelum Penarikan: Rp${ahmadWalletAcc.balance.toLocaleString('id-ID')}`);

  // Penarikan 1: Rp50.000 - SUDAH DISETUJUI ADMIN (Maker: Ahmad, Checker: Operasional)
  const withdrawal1 = await prisma.withdrawalRequest.create({
    data: {
      memberId: ahmadMember.id,
      amount: 50000,
      fee: 5000,
      netAmount: 45000,
      bankName: 'BCA',
      accountNumberMasked: '123****890',
      accountHolder: 'Ahmad Fauzi',
      status: 'APPROVED',
      reviewedBy: 'Divisi Operasional (operasional@varena.id)',
      reviewedAt: new Date(Date.now() - 3600000 * 2), // 2 jam yang lalu
      providerReference: 'TRF-BCA-20261118-001',
      requestedAt: new Date(Date.now() - 3600000 * 5), // 5 jam yang lalu
    },
  });

  // Mutasi buku besar untuk pencairan penarikan 1:
  // DEBIT: Member Liability (`ACC-MBR-VRN-0001`) - saldo dompet berkurang Rp50.000
  // CREDIT: Company Bank Payout Clearing (`ACC-COMP-PAYOUT`)
  await prisma.$transaction(async (tx) => {
    await postLedger(tx, {
      referenceType: 'WITHDRAWAL_PAYOUT',
      referenceId: withdrawal1.id,
      idempotencyKey: `LEDGER-WD-${withdrawal1.id}`,
      memo: `Pencairan Saldo Payout Disetujui Rp50.000 ke BCA 123****890 (${ahmadMember.memberCode})`,
      entries: [
        { accountCode: `ACC-MBR-${ahmadMember.memberCode}`, direction: 'DEBIT', amount: 50000 },
        { accountCode: 'ACC-COMP-PAYOUT', direction: 'CREDIT', amount: 50000 },
      ],
    });

    // Penarikan 1: Rp50.000 oleh Ahmad Fauzi
    const opUser = await prisma.user.findUnique({ where: { email: 'operasional@varena.id' } });
    await tx.auditLog.create({
      data: {
        actorUserId: opUser ? opUser.id : null,
        action: 'PAYOUT_APPROVED',
        entityType: 'WITHDRAWAL',
        entityId: withdrawal1.id,
        beforeJson: JSON.stringify({ status: 'REQUESTED' }),
        afterJson: JSON.stringify({
          status: 'APPROVED',
          bankRef: 'TRF-BCA-20261118-001',
          approvedBy: 'operasional@varena.id',
        }),
        reason: 'Verifikasi slip pencairan dana bank BCA transfer',
        createdAt: new Date(Date.now() - 3600000 * 2),
      },
    });
  });
  console.log('✓ Penarikan 1: Rp50.000 oleh Ahmad Fauzi Berhasil DISETUJUI & Buku Besar Diposting');

  // Penarikan 2: Rp50.000 - SEDANG MENUNGGU PERSETUJUAN ADMIN (Antrean Maker-Checker)
  const withdrawal2 = await prisma.withdrawalRequest.create({
    data: {
      memberId: ahmadMember.id,
      amount: 50000,
      fee: 5000,
      netAmount: 45000,
      bankName: 'Bank Mandiri',
      accountNumberMasked: '987****321',
      accountHolder: 'Ahmad Fauzi',
      status: 'REQUESTED', // Menunggu persetujuan di Panel Admin
      requestedAt: new Date(Date.now() - 1800000), // 30 menit yang lalu
    },
  });
  console.log('✓ Penarikan 2: Rp50.000 oleh Ahmad Fauzi Diajukan (Status: REQUESTED / Menunggu Maker-Checker di Panel Admin)');

  // --------------------------------------------------------------------------
  // 9. Update Shipping Lifecycle for Orders (Buat -> Bayar -> Kirim -> Selesai)
  // --------------------------------------------------------------------------
  console.log('--- Mensimulasikan Siklus Pengiriman & Logistik Pesanan ---');

  // Order 0: Pembelian Perdana Ahmad Fauzi Sudah SELESAI (COMPLETED) via JNE
  await prisma.order.update({
    where: { orderNumber: 'VRN-ORD-2026-0000' },
    data: {
      orderStatus: 'COMPLETED',
      courierName: 'JNE Express (YES)',
      trackingNumber: 'JNE-88190281-ID',
      shippedAt: new Date(Date.now() - 3600000 * 72), // 3 hari lalu
      completedAt: new Date(Date.now() - 3600000 * 24), // 1 hari lalu
    },
  });

  // Order 1: Sudah SELESAI (COMPLETED) via JNE
  await prisma.order.update({
    where: { orderNumber: 'VRN-ORD-2026-0001' },
    data: {
      orderStatus: 'COMPLETED',
      courierName: 'JNE Express (REG)',
      trackingNumber: 'JNE-882019482-ID',
      shippedAt: new Date(Date.now() - 3600000 * 48), // 2 hari lalu
      completedAt: new Date(Date.now() - 3600000 * 12), // 12 jam lalu
    },
  });

  // Order 2: Sedang DALAM PENGIRIMAN (SHIPPED) via SiCepat
  await prisma.order.update({
    where: { orderNumber: 'VRN-ORD-2026-0002' },
    data: {
      orderStatus: 'SHIPPED',
      courierName: 'SiCepat Ekspres (GOKIL)',
      trackingNumber: 'SCP-992104819-ID',
      shippedAt: new Date(Date.now() - 3600000 * 18), // 18 jam lalu
    },
  });

  // Order 6: Pesanan BELUM BAYAR (PENDING_PAYMENT) senilai Rp500.000 + Ongkir Rp20.000 = Rp520.000
  // Calon Pembeli: Hendra Gunawan via Referral Budi Santoso (VRN-0003)
  const pendingOrder = await prisma.order.create({
    data: {
      orderNumber: 'VRN-ORD-2026-0006',
      buyerName: 'Hendra Gunawan (Prospek Mitra)',
      buyerPhone: '081288776655',
      buyerEmail: 'hendragunawan@gmail.com',
      shippingAddress: 'Komp. Graha Asri Blok C4 No. 12, Bekasi Timur',
      referralMemberId: createdMembers['VRN-0003'].id,
      orderStatus: 'PENDING_PAYMENT',
      orderType: 'FIRST_PACK',
      subtotal: 500000,
      discount: 0,
      shippingCost: 20000,
      shippingExpense: 0,
      total: 520000,
    },
  });

  await prisma.orderItem.create({
    data: {
      orderId: pendingOrder.id,
      productVariantId: boxVariant.id,
      skuSnapshot: boxVariant.sku,
      nameSnapshot: boxVariant.name,
      unitPrice: boxVariant.price,
      hppSnapshot: boxVariant.hpp,
      quantity: 1,
      lineTotal: 500000,
    },
  });

  await prisma.payment.create({
    data: {
      orderId: pendingOrder.id,
      amount: 500000,
      status: 'PENDING',
      provider: 'MANUAL_TRANSFER_BCA',
      providerReference: 'INV-VRN-ORD-2026-0006',
    },
  });
  console.log('✓ Order 6: Pesanan Menunggu Pembayaran (PENDING_PAYMENT Rp500.000) terdaftar.');

  // --------------------------------------------------------------------------
  // 10. Tambah Member Baru Status "Belum Belanja Perdana / Inactive"
  // --------------------------------------------------------------------------
  console.log('--- Mendaftarkan Member Baru Belum Belanja Pertama (Target Push Leader) ---');
  
  const inactiveMitras = [
    {
      email: 'mitra7@varena.id',
      name: 'Ilham Pratama',
      code: 'VRN-0007',
      phone: '081277665544',
      sponsorCode: 'VRN-0001', // Sponsor: Ahmad Fauzi
      placementParentCode: 'VRN-0003',
      joinedDaysAgo: 3,
    },
    {
      email: 'mitra8@varena.id',
      name: 'Fitri Handayani',
      code: 'VRN-0008',
      phone: '081366554433',
      sponsorCode: 'VRN-0002', // Sponsor: Siti Nurhaliza
      placementParentCode: 'VRN-0004',
      joinedDaysAgo: 5,
    },
  ];

  for (const im of inactiveMitras) {
    const user = await prisma.user.create({
      data: {
        email: im.email,
        phone: im.phone,
        displayName: im.name,
        passwordHash: defaultPassword,
        status: 'ACTIVE',
        createdAt: new Date(Date.now() - 3600000 * 24 * im.joinedDaysAgo),
      },
    });

    await prisma.userRole.create({
      data: { userId: user.id, roleId: mitraRole.id },
    });

    const member = await prisma.member.create({
      data: {
        userId: user.id,
        memberCode: im.code,
        displayName: im.name,
        legalName: im.name,
        memberStatus: 'PENDING',
        kycStatus: 'VERIFIED',
        activatedAt: null,
        joinedAt: new Date(Date.now() - 3600000 * 24 * im.joinedDaysAgo),
      },
    });

    createdMembers[im.code] = member;

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

    const sponsor = createdMembers[im.sponsorCode];
    const parent = createdMembers[im.placementParentCode];

    await prisma.sponsorRelationship.create({
      data: {
        memberId: member.id,
        sponsorMemberId: sponsor.id,
        reason: 'REFERRAL_REGISTRATION_ONLINE',
        createdAt: new Date(Date.now() - 3600000 * 24 * im.joinedDaysAgo),
      },
    });

    await prisma.placementRelationship.create({
      data: {
        memberId: member.id,
        parentMemberId: parent.id,
        status: 'ACTIVE',
        createdAt: new Date(Date.now() - 3600000 * 24 * im.joinedDaysAgo),
      },
    });
  }
  console.log('✓ 2 Mitra Baru (VRN-0007 & VRN-0008) berhasil didaftarkan (Belum Belanja Perdana).');

  // --------------------------------------------------------------------------
  // 11. Tambah Riwayat Audit Logs Selama 60 Hari
  // --------------------------------------------------------------------------
  const ownerUser = await prisma.user.findUnique({ where: { email: 'owner@varena.id' } });
  const admin1User = await prisma.user.findUnique({ where: { email: 'admin1@varena.id' } });
  const admin2User = await prisma.user.findUnique({ where: { email: 'admin2@varena.id' } });

  const auditHistory = [
    {
      actorUserId: ownerUser?.id,
      action: 'MARKETING_PLAN_ACTIVATED',
      entityType: 'MARKETING_PLAN',
      entityId: plan.id,
      beforeJson: null,
      afterJson: JSON.stringify({ planCode: 'MP-2026-V1', repeatDevReward: 2000, firstPackDirectReward: 50000 }),
      reason: 'Pemberlakuan SK Direksi DIR-VARENA-SK-2026/001 kepatuhan Permendag 70/2019',
      daysAgo: 45,
    },
    {
      actorUserId: admin1User?.id,
      action: 'PRODUCT_HPP_UPDATED',
      entityType: 'PRODUCT',
      entityId: product.id,
      beforeJson: JSON.stringify({ hppBox: 300000, hppSachet: 30000 }),
      afterJson: JSON.stringify({ hppBox: 250000, hppSachet: 25000 }),
      reason: 'Penyesuaian efisiensi batch produksi kopi herbal pabrikasi',
      daysAgo: 30,
    },
    {
      actorUserId: admin2User?.id,
      action: 'MEMBER_KYC_VERIFIED',
      entityType: 'MEMBER',
      entityId: createdMembers['VRN-0001'].id,
      beforeJson: JSON.stringify({ kycStatus: 'PENDING' }),
      afterJson: JSON.stringify({ kycStatus: 'VERIFIED', nik: '3171029182910001' }),
      reason: 'Validasi KTP dan rekening buku tabungan BCA mitra Ahmad Fauzi',
      daysAgo: 14,
    },
    {
      actorUserId: admin1User?.id,
      action: 'ORDER_SHIPPED',
      entityType: 'ORDER',
      entityId: 'VRN-ORD-2026-0001',
      beforeJson: JSON.stringify({ orderStatus: 'PAID' }),
      afterJson: JSON.stringify({ orderStatus: 'SHIPPED', courier: 'JNE Express', resi: 'JNE-882019482-ID' }),
      reason: 'Paket box perdana telah diserahkan ke kurir JNE',
      daysAgo: 2,
    },
    {
      actorUserId: admin1User?.id,
      action: 'ORDER_SHIPPED',
      entityType: 'ORDER',
      entityId: 'VRN-ORD-2026-0002',
      beforeJson: JSON.stringify({ orderStatus: 'PAID' }),
      afterJson: JSON.stringify({ orderStatus: 'SHIPPED', courier: 'SiCepat Ekspres', resi: 'SCP-992104819-ID' }),
      reason: 'Paket box perdana Budi Santoso diserahkan ke drop point SiCepat',
      daysAgo: 1,
    },
  ];

  for (const ah of auditHistory) {
    await prisma.auditLog.create({
      data: {
        actorUserId: ah.actorUserId || null,
        action: ah.action,
        entityType: ah.entityType,
        entityId: ah.entityId,
        beforeJson: ah.beforeJson,
        afterJson: ah.afterJson,
        reason: ah.reason,
        createdAt: new Date(Date.now() - 3600000 * 24 * ah.daysAgo),
      },
    });
  }
  console.log('✓ Riwayat Audit Log Sistem (60 hari) berhasil diinjeksi.');

  // --------------------------------------------------------------------------
  // 9. Status Akhir Dompet & Eksekutif
  // --------------------------------------------------------------------------
  const finalWallet = await prisma.ledgerAccount.findUnique({
    where: { accountCode: `ACC-MBR-${ahmadMember.memberCode}` },
  });

  const totalPenjualan = await prisma.order.aggregate({ _sum: { total: true } });
  const totalKomisi = await prisma.commissionRun.aggregate({ _sum: { totalCommission: true } });
  const totalCadangan = await prisma.commissionRun.aggregate({ _sum: { unallocatedAmount: true } });

  console.log('\n======================================================');
  console.log('  VARENA SIMULASI LENGKAP SELESAI');
  console.log('======================================================');
  console.log(`Total Penjualan Kotor Korporasi : Rp${totalPenjualan._sum.total?.toLocaleString('id-ID')}`);
  console.log(`Total Komisi Didistribusikan    : Rp${totalKomisi._sum.totalCommission?.toLocaleString('id-ID')}`);
  console.log(`Total Cadangan Belum Teralokasi : Rp${totalCadangan._sum.unallocatedAmount?.toLocaleString('id-ID')}`);
  console.log('------------------------------------------------------');
  console.log(`Saldo Dompet Ahmad Fauzi (VRN-0001):`);
  console.log(`- Saldo Buku Besar Bersih       : Rp${finalWallet.balance.toLocaleString('id-ID')}`);
  console.log(`- Dana Sedang Ditahan (Pending) : Rp50.000`);
  console.log(`- Saldo Tersedia Ditarik        : Rp${(finalWallet.balance - 50000).toLocaleString('id-ID')}`);
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
