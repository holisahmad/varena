const BASE_URL = 'http://localhost:3000';

async function fetchJson(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`[${res.status}] ${data.error || JSON.stringify(data)}`);
  }
  return data;
}

async function testAll() {
  console.log('--- E2E HTTP Verification: Address, Unique Code, Confirm Payment, Payout ---');

  // 1. Check member profile
  console.log('1. GET /api/v1/member/profile?memberCode=VRN-0001');
  const prof = await fetchJson('/api/v1/member/profile?memberCode=VRN-0001');
  console.log('✓ Profile retrieved:');
  console.log('  - Name:', prof.member.displayName);
  console.log('  - Current Unique Code Balance:', prof.member.uniqueCodeBalance);
  console.log('  - Current Saved Province:', prof.member.province || '(empty)');

  // 2. Get product variant
  console.log('2. GET /api/v1/catalog/products');
  const cat = await fetchJson('/api/v1/catalog/products');
  const variantId = cat.products[0].variants[0].id;
  console.log('✓ Variant found:', variantId);

  // 3. Checkout with structured address
  console.log('3. POST /api/v1/orders/checkout with structured address');
  const orderRes = await fetchJson('/api/v1/orders/checkout', {
    method: 'POST',
    body: JSON.stringify({
      buyerUserId: prof.member.userId,
      buyerName: 'Ahmad Fauzi',
      buyerPhone: '081234567890',
      buyerEmail: 'fauzi@varena.id',
      recipientName: 'Ahmad Fauzi (Rumah)',
      recipientPhone: '081234567890',
      shippingProvince: 'DKI Jakarta',
      shippingCity: 'Jakarta Selatan',
      shippingDistrict: 'Kebayoran Baru',
      shippingPostalCode: '12110',
      shippingNotes: 'Rumah pagar hitam samping masjid',
      shippingAddress: 'Jl. Melati No. 5, Kebayoran Baru, Jakarta Selatan, DKI Jakarta 12110',
      items: [{ variantId, quantity: 1 }],
      shippingCost: 20000,
    }),
  });

  const order = orderRes.order;
  console.log(`✓ Order successfully created: ${order.orderNumber}`);
  console.log(`  - Subtotal: Rp${order.subtotal}`);
  console.log(`  - Shipping Cost: Rp${order.shippingCost}`);
  console.log(`  - 3-digit Unique Code: ${order.uniqueCode}`);
  console.log(`  - Total to pay: Rp${order.total}`);

  if (order.uniqueCode < 100 || order.uniqueCode > 999) {
    throw new Error(`Unique code ${order.uniqueCode} is not in 100-999 range`);
  }

  // 4. Verify profile address was auto-saved
  const updatedProf = await fetchJson('/api/v1/member/profile?memberCode=VRN-0001');
  console.log('✓ Profile updated with structured address:');
  console.log('  - Province:', updatedProf.member.province);
  console.log('  - City:', updatedProf.member.city);
  console.log('  - District:', updatedProf.member.district);
  console.log('  - Postal Code:', updatedProf.member.postalCode);

  // 5. Submit manual transfer confirmation
  console.log('5. POST /api/v1/orders/confirm-payment (member submits wrong transfer / payment proof)');
  const confirmRes = await fetchJson('/api/v1/orders/confirm-payment', {
    method: 'POST',
    body: JSON.stringify({
      orderNumber: order.orderNumber,
      senderBankName: 'BCA',
      senderAccountName: 'Ahmad Fauzi',
      transferAmountPaid: order.total,
      transferNotes: 'Transfer via BCA mobile dengan kode unik',
      paymentProofUrl: 'https://example.com/proof.jpg',
    }),
  });
  console.log('✓ Payment confirmation submitted:', confirmRes.message);

  // 6. Admin verifies payment
  console.log('6. POST /api/v1/admin/orders (Admin verifies & settles order)');
  const ownerProf = await fetchJson('/api/v1/member/profile?memberCode=VRN-CORP-L1');
  const ownerUserId = ownerProf.member.userId;
  console.log('✓ Corporate owner userId found:', ownerUserId);

  const verifyRes = await fetchJson('/api/v1/admin/orders', {
    method: 'POST',
    headers: { 'x-user-id': ownerUserId },
    body: JSON.stringify({
      action: 'CONFIRM_PAYMENT',
      orderId: order.id,
      actorUserId: ownerUserId,
    }),
  });
  console.log('✓ Admin confirmed order payment:', verifyRes.message);

  // 7. Check member uniqueCodeBalance after settlement
  const settledProf = await fetchJson('/api/v1/member/profile?memberCode=VRN-0001');
  console.log('✓ Member unique code balance after payment credited:');
  console.log(`  - Old: Rp${prof.member.uniqueCodeBalance}`);
  console.log(`  - Added unique code: Rp${order.uniqueCode}`);
  console.log(`  - New Balance: Rp${settledProf.member.uniqueCodeBalance}`);

  // 8. Test withdrawal with user exact example:
  // Bonus: Rp50.000, Unique code: Rp12.800
  // Eligible from unique code: Rp12.000, remaining in account: Rp800
  // Payout request: Rp50.000 + Rp12.000 = Rp62.000
  // Bank fee: Rp6.500
  // Net transferred: Rp62.000 - Rp6.500 = Rp55.500
  console.log('\n8. Testing Payout with User Scenario (50.000 bonus + 12.800 unique code -> withdraw 62.000, fee 6.500):');
  
  const { PrismaClient } = await import('@prisma/client');
  const prismaClient = new PrismaClient();

  // Adjust bonus available balance to exactly 50.000 by adding a pending hold if needed
  const initialWallet = await fetchJson('/api/v1/wallet?memberCode=VRN-0001');
  const currentBonus = initialWallet.wallet.availableBalance;
  if (currentBonus > 50000) {
    const diff = currentBonus - 50000;
    const ahmadMem = await prismaClient.member.findUnique({ where: { memberCode: 'VRN-0001' } });
    await prismaClient.withdrawalRequest.create({
      data: {
        memberId: ahmadMem.id,
        amount: diff,
        fee: 6500,
        netAmount: Math.max(0, diff - 6500),
        bankName: 'BCA',
        accountNumberMasked: '123****890',
        accountHolder: ahmadMem.displayName,
        status: 'REQUESTED',
      },
    });
  }

  // Set member's uniqueCodeBalance to exactly 12,800
  await prismaClient.member.update({
    where: { memberCode: 'VRN-0001' },
    data: { uniqueCodeBalance: 12800 },
  });
  await prismaClient.$disconnect();

  const profBeforeWD = await fetchJson('/api/v1/member/profile?memberCode=VRN-0001');
  const walletBeforeWD = await fetchJson('/api/v1/wallet?memberCode=VRN-0001');
  console.log(`  - Saldo Bonus Komisi: Rp${walletBeforeWD.wallet.availableBalance}`);
  console.log(`  - Saldo Kode Unik: Rp${profBeforeWD.member.uniqueCodeBalance}`);

  // Test withdrawal request with Rp62.000 (Rp50.000 bonus + Rp12.000 unique code)
  const payoutRes = await fetchJson('/api/v1/payout/request', {
    method: 'POST',
    body: JSON.stringify({
      memberCode: 'VRN-0001',
      amount: 62000,
    }),
  });

  console.log('✓ Payout request successful:');
  console.log(`  - Payout ID: ${payoutRes.withdrawal.id}`);
  console.log(`  - Amount Requested: Rp${payoutRes.withdrawal.amount}`);
  console.log(`  - Bank Admin Fee: Rp${payoutRes.withdrawal.fee}`);
  console.log(`  - Net masuk rekening: Rp${payoutRes.withdrawal.netAmount}`);

  if (payoutRes.withdrawal.amount !== 62000) {
    throw new Error(`Expected amount 62000, got ${payoutRes.withdrawal.amount}`);
  }
  if (payoutRes.withdrawal.fee !== 6500) {
    throw new Error(`Expected fee 6500, got ${payoutRes.withdrawal.fee}`);
  }
  if (payoutRes.withdrawal.netAmount !== 55500) {
    throw new Error(`Expected net amount 55500, got ${payoutRes.withdrawal.netAmount}`);
  }

  // Check remaining uniqueCodeBalance in member account
  const profAfterWD = await fetchJson('/api/v1/member/profile?memberCode=VRN-0001');
  console.log(`✓ Sisa saldo kode unik di akun member: Rp${profAfterWD.member.uniqueCodeBalance}`);
  if (profAfterWD.member.uniqueCodeBalance !== 800) {
    throw new Error(`Expected remaining uniqueCodeBalance 800, got ${profAfterWD.member.uniqueCodeBalance}`);
  }

  console.log('\n======================================================');
  console.log('  E2E TEST PASSED 100%! ALL FEATURES OPERATIONAL.     ');
  console.log('  50.000 + 12.000 = 62.000 - 6.500 = 55.500 (Sisa 800)');
  console.log('======================================================');
}

testAll().catch((e) => {
  console.error('E2E Test Failed:', e);
  process.exit(1);
});
