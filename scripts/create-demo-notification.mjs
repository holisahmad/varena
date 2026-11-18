import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const member = await prisma.member.findUnique({
    where: { memberCode: 'VRN-0001' },
    include: { user: true },
  });

  if (!member) {
    console.error('Member VRN-0001 not found');
    process.exit(1);
  }

  console.log(`Setting up demo notifications for: ${member.displayName} (${member.memberCode})`);

  // 1. Create a Shipped Order (Waiting delivery confirmation)
  const orderShipped = await prisma.order.create({
    data: {
      orderNumber: `ORD-${Date.now().toString().slice(-6)}-SHP`,
      buyerUserId: member.userId,
      buyerName: member.displayName,
      buyerPhone: member.user.phone || '081234567890',
      buyerEmail: member.user.email,
      shippingAddress: 'Jl. Merdeka Barat No. 45, Gambir, Jakarta Pusat',
      shippingProvince: 'DKI Jakarta',
      shippingCity: 'Jakarta Pusat',
      orderStatus: 'SHIPPED',
      orderType: 'REPEAT_PURCHASE',
      subtotal: 90000,
      discount: 0,
      shippingCost: 15000,
      uniqueCode: 125,
      total: 105125,
      courierName: 'JNE Express (Reguler)',
      trackingNumber: `JNE-${Date.now().toString().slice(-8)}-ID`,
      paidAt: new Date(Date.now() - 3600 * 1000 * 4), // 4 hours ago
      shippedAt: new Date(),
      items: {
        create: [
          {
            productVariantId: 'b140e71d-34c4-4294-922f-c67a6290bd91',
            skuSnapshot: 'VRN-SACHET-1',
            nameSnapshot: 'VARENA Kopi Sehat (Eceran Sachet)',
            quantity: 2,
            unitPrice: 45000,
            hppSnapshot: 25000,
            lineTotal: 90000,
          },
        ],
      },
    },
  });

  console.log(`[Created] Shipped Order: ${orderShipped.orderNumber} (Resi: ${orderShipped.trackingNumber})`);

  // 2. Create a Pending Payment Order
  const orderPending = await prisma.order.create({
    data: {
      orderNumber: `ORD-${Date.now().toString().slice(-6)}-PND`,
      buyerUserId: member.userId,
      buyerName: member.displayName,
      buyerPhone: member.user.phone || '081234567890',
      buyerEmail: member.user.email,
      shippingAddress: 'Jl. Merdeka Barat No. 45, Gambir, Jakarta Pusat',
      shippingProvince: 'DKI Jakarta',
      shippingCity: 'Jakarta Pusat',
      orderStatus: 'PENDING_PAYMENT',
      orderType: 'REPEAT_PURCHASE',
      subtotal: 45000,
      discount: 0,
      shippingCost: 12000,
      uniqueCode: 382,
      total: 57382,
      items: {
        create: [
          {
            productVariantId: 'b140e71d-34c4-4294-922f-c67a6290bd91',
            skuSnapshot: 'VRN-SACHET-1',
            nameSnapshot: 'VARENA Kopi Sehat (Eceran Sachet)',
            quantity: 1,
            unitPrice: 45000,
            hppSnapshot: 25000,
            lineTotal: 45000,
          },
        ],
      },
    },
  });

  console.log(`[Created] Pending Payment Order: ${orderPending.orderNumber} (Total: Rp${orderPending.total.toLocaleString('id-ID')})`);

  // 3. Create a new Commission Item (Bonus Sponsor Rp50.000)
  const existingRun = await prisma.commissionRun.findFirst();
  if (existingRun) {
    const commissionItem = await prisma.commissionItem.create({
      data: {
        commissionRunId: existingRun.id,
        beneficiaryMemberId: member.id,
        rewardType: 'DIRECT_SPONSOR',
        levelNumber: 1,
        amount: 50000,
        status: 'ELIGIBLE',
        reasonCode: 'DIRECT_SPONSOR_BONUS',
        formulaSnapshot: 'Rp50.000 direct sponsor referral bonus',
      },
    });
    console.log(`[Created] Bonus Komisi Sponsor Rp50.000 (ID: ${commissionItem.id})`);
  }

  console.log('\nBerhasil membuat contoh notifikasi untuk mitra Ahmad Fauzi (mitra1@varena.id)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
