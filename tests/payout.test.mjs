import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePayoutFees } from '../src/config/payout.ts';

test('Payout Fees - Default Manual Scheme (10% admin + Rp6.500 bank fee)', () => {
  const result = calculatePayoutFees(100000);
  // 10% of 100.000 = 10.000
  assert.equal(result.adminFee, 10000);
  // Bank fee = 6.500
  assert.equal(result.bankFee, 6500);
  assert.equal(result.totalFee, 16500);
  // Net amount = 100.000 - 16.500 = 83.500
  assert.equal(result.netAmount, 83500);
  assert.equal(result.adminFeePercent, 10);
});

test('Payout Fees - Custom Admin Fee % and Bank Fee', () => {
  const result = calculatePayoutFees(500000, {
    adminFeePercent: 5,
    bankFeeFlat: 5000,
  });
  // 5% of 500.000 = 25.000
  assert.equal(result.adminFee, 25000);
  assert.equal(result.bankFee, 5000);
  assert.equal(result.totalFee, 30000);
  // Net = 500.000 - 30.000 = 470.000
  assert.equal(result.netAmount, 470000);
});

test('Payout Fees - Zero amount handles cleanly', () => {
  const result = calculatePayoutFees(0);
  assert.equal(result.adminFee, 0);
  assert.equal(result.bankFee, 0);
  assert.equal(result.totalFee, 0);
  assert.equal(result.netAmount, 0);
});
