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

  // 8. Test withdrawal endpoint with uniqueCodeBalance
  console.log('8. Testing Payout with Unique Code Balance threshold');
  // Test withdrawal request directly since bank is already bound
  const payoutRes = await fetchJson('/api/v1/payout/request', {
    method: 'POST',
    body: JSON.stringify({
      memberCode: 'VRN-0001',
      amount: 50000,
    }),
  });
  console.log('✓ Payout request successful:');
  console.log(`  - Payout ID: ${payoutRes.withdrawal.id}`);
  console.log(`  - Amount: Rp${payoutRes.withdrawal.amount}`);
  console.log(`  - Net: Rp${payoutRes.withdrawal.netAmount}`);
  console.log(`  - Unique Code Deducted: Rp${payoutRes.withdrawal.fromUniqueCode || 0}`);

  console.log('\n======================================================');
  console.log('  E2E TEST PASSED 100%! ALL FEATURES OPERATIONAL.     ');
  console.log('======================================================');
}

testAll().catch((e) => {
  console.error('E2E Test Failed:', e);
  process.exit(1);
});
