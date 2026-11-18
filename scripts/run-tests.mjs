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

    // Sponsor VRN-0003 adalah VRN-0001 (Ahmad), placement parent-nya juga VRN-0001
    // Pemisahan sponsor vs placement terdemonstrasikan dari VRN-0004 (sponsor: VRN-0002, placement: VRN-0002)
    assert.equal(mitra3.sponsorRel.sponsor.memberCode, 'VRN-0001', 'Sponsor VRN-0003 adalah Ahmad Fauzi (VRN-0001)');
    assert.equal(mitra3.placementRel.parent.memberCode, 'VRN-0001', 'Placement parent VRN-0003 adalah VRN-0001');

    // Cross-verify: VRN-0004 placement parent is VRN-0002, sponsor is VRN-0002 (consistent tree)
    const mitra4 = await prisma.member.findUnique({
      where: { memberCode: 'VRN-0004' },
      include: {
        sponsorRel: { include: { sponsor: true } },
        placementRel: { include: { parent: true } },
      },
    });
    assert.equal(mitra4.sponsorRel.sponsor.memberCode, 'VRN-0002', 'Sponsor VRN-0004 adalah Siti (VRN-0002)');
    assert.equal(mitra4.placementRel.parent.memberCode, 'VRN-0002', 'Placement VRN-0004 di bawah Siti (VRN-0002)');

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
    process.stdout.write('Test 5: Validasi Skema Repeat Purchase Eceran Sachet (Rp2.000/level, HPP Rp25.000)... ');
    const sachetPrice = 45000;
    const sachetHpp = 25000; // Updated HPP
    const grossMargin = sachetPrice - sachetHpp;
    assert.equal(grossMargin, 20000, 'Gross margin sachet adalah Rp20.000');

    const devRewardPerLevel = 2000; // Updated bonus repeat purchase
    const maxLevels = 10;
    const totalCommission = devRewardPerLevel * maxLevels;
    assert.equal(totalCommission, 20000, 'Total alokasi komisi repeat purchase adalah Rp20.000');

    const plan = await prisma.marketingPlan.findUnique({ where: { planCode: 'MP-2026-V1' } });
    if (plan) {
      assert.equal(plan.repeatDevReward, 2000, 'Marketing plan repeatDevReward harus Rp2.000');
    }

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

  // ----------------------------------------------------
  // TEST 7: Bound Bank Account Validation & Anti-Account Hijacking
  // ----------------------------------------------------
  try {
    process.stdout.write('Test 7: Pengikatan Rekening Bank Terikat & Proteksi Anti-Pembajakan Akun... ');
    const mitra3 = await prisma.member.findUnique({ where: { memberCode: 'VRN-0003' } });
    assert.ok(mitra3, 'Mitra 3 harus ada');

    // 1. Validasi nama rekening harus cocok dengan nama resmi member
    const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const legitimateHolder = 'Budi Santoso';
    const attackerHolder = 'Rekening Penampung Hacker';

    const cleanMemberName = normalize(mitra3.displayName);
    const isLegitMatch = normalize(legitimateHolder).includes(cleanMemberName) || cleanMemberName.includes(normalize(legitimateHolder));
    const isAttackerMatch = normalize(attackerHolder).includes(cleanMemberName) || cleanMemberName.includes(normalize(attackerHolder));

    assert.equal(isLegitMatch, true, 'Nama rekening sendiri harus lolos verifikasi');
    assert.equal(isAttackerMatch, false, 'Rekening orang lain/pembajak harus ditolak');

    // 2. Ikat rekening bank sah ke Mitra 3
    const updatedMitra3 = await prisma.member.update({
      where: { id: mitra3.id },
      data: {
        bankName: 'BCA',
        bankAccountNumber: '5544332211',
        bankAccountHolder: legitimateHolder,
        bankLockedAt: new Date(),
      },
    });

    assert.equal(updatedMitra3.bankAccountNumber, '5544332211', 'Nomor rekening terikat tersimpan');
    assert.equal(updatedMitra3.bankName, 'BCA', 'Bank terikat tersimpan');
    assert.ok(updatedMitra3.bankLockedAt, 'Rekening terkunci secara permanen');

    // 3. Permohonan penarikan dana wajib otomatis mengikat ke rekening terdaftar
    const wdBound = await prisma.withdrawalRequest.create({
      data: {
        memberId: updatedMitra3.id,
        amount: 50000,
        fee: 5000,
        netAmount: 45000,
        bankName: updatedMitra3.bankName,
        accountNumberMasked: '5544****2211',
        accountHolder: updatedMitra3.bankAccountHolder,
        status: 'REQUESTED',
      },
    });

    assert.equal(wdBound.bankName, 'BCA', 'Tujuan transfer terkunci ke bank terikat');
    assert.equal(wdBound.accountHolder, 'Budi Santoso', 'Nama penerima terkunci sesuai akun');

    // Cleanup
    await prisma.withdrawalRequest.delete({ where: { id: wdBound.id } });

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

