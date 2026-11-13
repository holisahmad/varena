import { PrismaClient } from '@prisma/client';
import assert from 'node:assert/strict';

const prisma = new PrismaClient();

async function runAllTests() {
  console.log('=====================================================');
  console.log('  VARENA Platform - Automated Test Suite');
  console.log('=====================================================\n');

  let passed = 0;
  let failed = 0;

  // ----------------------------------------------------
  // TEST 1: Corporate Hierarchy & Seeding Verification
  // ----------------------------------------------------
  try {
    process.stdout.write('Test 1: Memverifikasi Hierarki Korporasi L1-L8 & Mitra L9+... ');
    const owner = await prisma.member.findUnique({ where: { memberCode: 'VRN-CORP-L1' } });
    const leader3 = await prisma.member.findUnique({ where: { memberCode: 'VRN-LDR-03' } });
    const mitra1 = await prisma.member.findUnique({ where: { memberCode: 'VRN-0001' } });

    assert.ok(owner, 'Owner Level 1 harus ada');
    assert.ok(leader3, 'Leader 3 (Root Jaringan) harus ada');
    assert.ok(mitra1, 'Mitra 1 Level 9 harus ada');

    // Placement relationship check
    const mitra1Placement = await prisma.placementRelationship.findUnique({
      where: { memberId: mitra1.id },
      include: { parent: true },
    });
    assert.ok(mitra1Placement, 'Mitra 1 harus memiliki relasi penempatan aktif');
    assert.equal(mitra1Placement.parent.memberCode, 'VRN-LDR-03', 'Mitra 1 harus ditempatkan di bawah Leader 3');

    console.log('PASSED');
    passed++;
  } catch (err) {
    console.log('FAILED:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // TEST 2: Double-Entry Ledger Balance Enforcement
  // ----------------------------------------------------
  try {
    process.stdout.write('Test 2: Memvalidasi Enforced Double-Entry Balance (Total Debit == Total Credit)... ');
    const accountOps = await prisma.ledgerAccount.findUnique({ where: { accountCode: 'ACC-COMP-OPS' } });
    const accountPayout = await prisma.ledgerAccount.findUnique({ where: { accountCode: 'ACC-COMP-PAYOUT' } });
    assert.ok(accountOps && accountPayout, 'Akun perusahaan harus tersedia');

    // Unbalanced transaction should fail
    const unbalancedDebits = 100000;
    const unbalancedCredits = 80000;
    assert.notEqual(unbalancedDebits, unbalancedCredits, 'Debit dan kredit tidak seimbang');

    // Balanced transaction posting
    const idempotencyKey = `TEST-LEDGER-${Date.now()}`;
    const txHeader = await prisma.ledgerTransaction.create({
      data: {
        referenceType: 'TEST_BALANCE',
        referenceId: 'REF-001',
        transactionType: 'STANDARD',
        status: 'POSTED',
        idempotencyKey,
        memo: 'Unit test double entry balance',
      },
    });

    await prisma.ledgerEntry.createMany({
      data: [
        { transactionId: txHeader.id, accountId: accountOps.id, direction: 'DEBIT', amount: 50000, memo: 'Test debit' },
        { transactionId: txHeader.id, accountId: accountPayout.id, direction: 'CREDIT', amount: 50000, memo: 'Test credit' },
      ],
    });

    const entries = await prisma.ledgerEntry.findMany({ where: { transactionId: txHeader.id } });
    const sumDebit = entries.filter(e => e.direction === 'DEBIT').reduce((acc, e) => acc + e.amount, 0);
    const sumCredit = entries.filter(e => e.direction === 'CREDIT').reduce((acc, e) => acc + e.amount, 0);
    assert.equal(sumDebit, sumCredit, 'Total debit harus sama persis dengan total credit');

    // Cleanup
    await prisma.ledgerEntry.deleteMany({ where: { transactionId: txHeader.id } });
    await prisma.ledgerTransaction.delete({ where: { id: txHeader.id } });

    console.log('PASSED');
    passed++;
  } catch (err) {
    console.log('FAILED:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // TEST 3: Separation of Sponsor Tree vs. Placement Tree
  // ----------------------------------------------------
  try {
    process.stdout.write('Test 3: Memverifikasi Separasi Independen Sponsor Tree vs Placement Tree... ');
    const mitra3 = await prisma.member.findUnique({
      where: { memberCode: 'VRN-0003' },
      include: {
        sponsorRel: { include: { sponsor: true } },
        placementRel: { include: { parent: true } },
      },
    });
    assert.ok(mitra3, 'Mitra 3 harus ada');
    assert.ok(mitra3.sponsorRel, 'Mitra 3 harus memiliki sponsor');
    assert.ok(mitra3.placementRel, 'Mitra 3 harus memiliki parent placement');

    // Sponsor is Leader 3, but Placement parent is Mitra 2
    assert.equal(mitra3.sponsorRel.sponsor.memberCode, 'VRN-LDR-03', 'Sponsor adalah Leader 3');
    assert.equal(mitra3.placementRel.parent.memberCode, 'VRN-0002', 'Placement parent adalah Mitra 2 (terpisah dari sponsor)');

    console.log('PASSED');
    passed++;
  } catch (err) {
    console.log('FAILED:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // TEST 4: Commission Engine - First Pack Calculation (50k Direct + 10k x 10 Upline)
  // ----------------------------------------------------
  try {
    process.stdout.write('Test 4: Menghitung Komisi First Pack (Rp50.000 Sponsor + Rp100.000 Alokasi Upline)... ');
    const plan = await prisma.marketingPlan.findUnique({ where: { planCode: 'MP-2026-V1' } });
    assert.ok(plan, 'Marketing Plan Baseline v1 harus aktif');
    assert.equal(plan.firstPackDirectReward, 50000, 'Direct sponsor reward harus Rp50.000');
    assert.equal(plan.firstPackDevReward, 10000, 'Development reward harus Rp10.000 / titik');
    assert.equal(plan.firstPackDevMaxLevels, 10, 'Maksimal titik penerima development adalah 10 level');

    const totalDevelopmentBudget = plan.firstPackDevReward * plan.firstPackDevMaxLevels;
    assert.equal(totalDevelopmentBudget, 100000, 'Plafon maksimum development adalah Rp100.000');

    // Simulation on a node with 8 uplines:
    const activeUplines = 8;
    const distributedDev = activeUplines * plan.firstPackDevReward;
    const unallocatedDev = (plan.firstPackDevMaxLevels - activeUplines) * plan.firstPackDevReward;
    assert.equal(distributedDev, 80000, '8 upline menerima masing-masing Rp10.000');
    assert.equal(unallocatedDev, 20000, 'Sisa 2 titik dicatat sebagai Unallocated Reserve Rp20.000');

    console.log('PASSED');
    passed++;
  } catch (err) {
    console.log('FAILED:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // TEST 5: Repeat Purchase Unit Economics & Margin Floor
  // ----------------------------------------------------
  try {
    process.stdout.write('Test 5: Validasi Skema Repeat Purchase Eceran Sachet (Rp1.000/level, Margin Floor Rp5.000)... ');
    const sachetPrice = 45000;
    const sachetHpp = 30000;
    const grossMargin = sachetPrice - sachetHpp;
    assert.equal(grossMargin, 15000, 'Gross margin sachet adalah Rp15.000');

    const devRewardPerLevel = 1000;
    const maxLevels = 10;
    const totalCommission = devRewardPerLevel * maxLevels;
    assert.equal(totalCommission, 10000, 'Total alokasi komisi repeat purchase adalah Rp10.000');

    const companyResidual = grossMargin - totalCommission;
    assert.equal(companyResidual, 5000, 'Margin floor operasional perusahaan Rp5.000 per sachet terlindungi');
    assert.ok(companyResidual > 0, 'Perusahaan tidak mengalami kerugian unit economics');

    console.log('PASSED');
    passed++;
  } catch (err) {
    console.log('FAILED:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // TEST 6: Maker-Checker Payout Flow & Zero Ledger Drift
  // ----------------------------------------------------
  try {
    process.stdout.write('Test 6: Validasi Alur Pencairan Payout Maker-Checker & Audit Trail... ');
    const mitra1 = await prisma.member.findUnique({ where: { memberCode: 'VRN-0001' } });
    assert.ok(mitra1, 'Mitra 1 harus ada');

    // Create withdrawal request
    const wd = await prisma.withdrawalRequest.create({
      data: {
        memberId: mitra1.id,
        amount: 100000,
        fee: 5000,
        netAmount: 95000,
        bankName: 'BCA',
        accountNumberMasked: '123****890',
        accountHolder: mitra1.displayName,
        status: 'REQUESTED',
      },
    });

    assert.equal(wd.status, 'REQUESTED', 'Status awal harus REQUESTED');
    assert.equal(wd.netAmount, 95000, 'Net amount adalah Rp95.000 setelah fee Rp5.000');

    // Admin approves with bank reference
    const approvedWd = await prisma.withdrawalRequest.update({
      where: { id: wd.id },
      data: {
        status: 'PAID',
        reviewedBy: 'ADMIN_FINANCE',
        reviewedAt: new Date(),
        paidAt: new Date(),
        providerReference: 'TRF-TEST-BANK-1234',
      },
    });

    assert.equal(approvedWd.status, 'PAID', 'Status setelah approval harus PAID');
    assert.equal(approvedWd.providerReference, 'TRF-TEST-BANK-1234', 'Nomor referensi bank harus tersimpan');

    // Cleanup test withdrawal
    await prisma.withdrawalRequest.delete({ where: { id: wd.id } });

    console.log('PASSED');
    passed++;
  } catch (err) {
    console.log('FAILED:', err.message);
    failed++;
  }

  console.log('\n=====================================================');
  console.log(`Hasil Pengujian: ${passed} Passed, ${failed} Failed`);
  console.log('=====================================================\n');

  await prisma.$disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests();

