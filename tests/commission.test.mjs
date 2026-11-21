import test from 'node:test';
import assert from 'node:assert/strict';
import prismaModule, { prisma as namedPrisma } from '../src/lib/prisma';
import { calculateOrderCommissions } from '../src/lib/commission';

const prisma = namedPrisma || prismaModule?.default || prismaModule;

test('Commission Engine - Deterministic First Pack Calculation and Idempotency', async (t) => {
  let variant = await prisma.productVariant.findFirst({
    where: {
      OR: [
        { sku: 'KM-BOX10' },
        { sku: 'VRN-KOP-BOX10' },
      ],
    },
  });
  if (!variant) {
    variant = await prisma.productVariant.findFirst();
  }
  assert.ok(variant, 'First pack variant must exist');

  const referralMember = await prisma.member.findUnique({
    where: { memberCode: 'VRN-0001' },
  });
  assert.ok(referralMember, 'Referral member VRN-0001 must exist');

  // 1. Create a mock paid order
  const orderNumber = `TEST-ORD-${Date.now()}`;
  const testOrder = await prisma.order.create({
    data: {
      orderNumber,
      buyerName: 'Test Consumer',
      buyerPhone: '0811111111',
      shippingAddress: 'Jl. Test No. 1',
      referralMemberId: referralMember.id,
      orderStatus: 'PAID',
      orderType: 'FIRST_PACK',
      subtotal: variant.price,
      total: variant.price,
      paidAt: new Date(),
      items: {
        create: {
          productVariantId: variant.id,
          skuSnapshot: variant.sku,
          nameSnapshot: variant.name,
          unitPrice: variant.price,
          hppSnapshot: variant.hpp,
          quantity: 1,
          lineTotal: variant.price,
        },
      },
    },
  });

  // 2. Run commission calculation
  const result1 = await calculateOrderCommissions(testOrder.id);
  assert.ok(result1.runId, 'Commission run ID must be returned');
  assert.equal(result1.totalDistributed + result1.unallocatedAmount, 150000, 'Total direct (50k) + dev cap (100k) must equal 150.000 IDR');

  // Direct sponsor item
  const directItem = result1.items.find((i) => i.rewardType === 'DIRECT_SPONSOR');
  assert.ok(directItem, 'Direct sponsor reward must be generated');
  assert.equal(directItem.amount, 50000, 'Direct sponsor amount must be 50.000');

  // 3. Test Idempotency: Re-running on same order must NOT duplicate items
  const result2 = await calculateOrderCommissions(testOrder.id);
  assert.equal(result2.runId, result1.runId, 'Idempotent run must return identical run ID');
  assert.equal(result2.totalDistributed, result1.totalDistributed, 'Distributed amount must match');

  // Clean up test order
  await prisma.commissionItem.deleteMany({ where: { commissionRunId: result1.runId } });
  await prisma.ledgerTransaction.deleteMany({ where: { referenceId: result1.runId } });
  await prisma.commissionRun.delete({ where: { id: result1.runId } });
  await prisma.orderItem.deleteMany({ where: { orderId: testOrder.id } });
  await prisma.order.delete({ where: { id: testOrder.id } });
});

test.after(async () => {
  await prisma.$disconnect();
  process.exit(0);
});
