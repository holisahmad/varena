import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== MEMULAI SEEDING DATA NOTIFIKASI VARENA ===\n');

  // 1. Ambil Akun Mitra (VRN-0001 dan VRN-0002)
  const mitra1 = await prisma.member.findUnique({
    where: { memberCode: 'VRN-0001' },
    include: { user: true },
  });

  const mitra2 = await prisma.member.findUnique({
    where: { memberCode: 'VRN-0002' },
    include: { user: true },
  });

  if (!mitra1) {
    console.error('Akun mitra VRN-0001 tidak ditemukan.');
    process.exit(1);
  }

  const targetMembers = [mitra1, ...(mitra2 ? [mitra2] : [])];

  // 2. Ambil Marketing Plan & Commission Run
  const existingRun = await prisma.commissionRun.findFirst();

  // 3. Ambil Varian Produk
  const variants = await prisma.productVariant.findMany({ take: 2 });
  const variant1 = variants[0];
  const variant2 = variants[1] || variants[0];

  for (const m of targetMembers) {
    console.log(`\n-- Menyiapkan Notifikasi untuk: ${m.displayName} (${m.memberCode}) --`);

    // A. Pesanan Baru Menunggu Pembayaran (PENDING_PAYMENT)
    const pndOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-${Date.now().toString().slice(-6)}-PND`,
        buyerUserId: m.userId,
        buyerName: m.displayName,
        buyerPhone: m.user.phone || '081234567890',
        buyerEmail: m.user.email,
        shippingAddress: 'Jl. Sudirman Kav. 21, Karet Semanggi, Setiabudi, Jakarta Selatan',
        shippingProvince: 'DKI Jakarta',
        shippingCity: 'Jakarta Selatan',
        orderStatus: 'PENDING_PAYMENT',
        orderType: 'REPEAT_PURCHASE',
        subtotal: variant2 ? variant2.price : 45000,
        discount: 0,
        shippingCost: 15000,
        uniqueCode: Math.floor(100 + Math.random() * 899),
        total: (variant2 ? variant2.price : 45000) + 15000 + 234,
        createdAt: new Date(),
        items: {
          create: [
            {
              productVariantId: variant2.id,
              skuSnapshot: 'VRN-SACHET-1',
              nameSnapshot: 'VARENA Kopi Sehat Premium (Eceran Sachet)',
              quantity: 1,
              unitPrice: variant2.price,
              hppSnapshot: variant2.hpp || 25000,
              lineTotal: variant2.price,
            },
          ],
        },
      },
    });
    console.log(`[+] Pesanan Menunggu Pembayaran: ${pndOrder.orderNumber} (Rp${pndOrder.total.toLocaleString('id-ID')})`);

    // B. Pesanan Sedang Dikirim Kurir (SHIPPED)
    const trackingCode = `JNE-${Date.now().toString().slice(-8)}-ID`;
    const shpOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-${Date.now().toString().slice(-6)}-SHP`,
        buyerUserId: m.userId,
        buyerName: m.displayName,
        buyerPhone: m.user.phone || '081234567890',
        buyerEmail: m.user.email,
        shippingAddress: 'Jl. Sudirman Kav. 21, Karet Semanggi, Setiabudi, Jakarta Selatan',
        shippingProvince: 'DKI Jakarta',
        shippingCity: 'Jakarta Selatan',
        orderStatus: 'SHIPPED',
        orderType: 'FIRST_PACK',
        subtotal: variant1 ? variant1.price : 500000,
        discount: 0,
        shippingCost: 20000,
        uniqueCode: 150,
        total: (variant1 ? variant1.price : 500000) + 20150,
        courierName: 'JNE Express Reguler',
        trackingNumber: trackingCode,
        paidAt: new Date(Date.now() - 3600 * 1000 * 5),
        shippedAt: new Date(),
        createdAt: new Date(Date.now() - 3600 * 1000 * 6),
        items: {
          create: [
            {
              productVariantId: variant1.id,
              skuSnapshot: 'VRN-BOX-10',
              nameSnapshot: 'VARENA Kopi Sehat Paket Perdana Box (10 Sachet)',
              quantity: 1,
              unitPrice: variant1.price,
              hppSnapshot: variant1.hpp || 250000,
              lineTotal: variant1.price,
            },
          ],
        },
      },
    });
    console.log(`[+] Pesanan Sedang Dikirim: ${shpOrder.orderNumber} (Resi: ${trackingCode})`);

    // C. Bonus Komisi Sponsor Masuk
    if (existingRun) {
      const comm = await prisma.commissionItem.create({
        data: {
          commissionRunId: existingRun.id,
          beneficiaryMemberId: m.id,
          rewardType: 'DIRECT_SPONSOR',
          levelNumber: 1,
          amount: 50000,
          status: 'ELIGIBLE',
          reasonCode: 'DIRECT_SPONSOR_BONUS',
          formulaSnapshot: 'Bonus Sponsor Rp50.000 pendaftaran mitra baru',
          createdAt: new Date(),
        },
      });
      console.log(`[+] Bonus Komisi Masuk: Rp${comm.amount.toLocaleString('id-ID')} (ID: ${comm.id})`);
    }

    // D. Payout Selesai Ditransfer
    const payout = await prisma.withdrawalRequest.create({
      data: {
        memberId: m.id,
        amount: 150000,
        fee: 5000,
        netAmount: 145000,
        bankName: 'BCA',
        accountNumberMasked: '5345 **** **89',
        accountHolder: m.displayName,
        status: 'PAID',
        providerReference: `TRF-BCA-${Date.now().toString().slice(-6)}`,
        requestedAt: new Date(Date.now() - 3600 * 1000 * 24),
        reviewedAt: new Date(Date.now() - 3600 * 1000 * 2),
        paidAt: new Date(),
      },
    });
    console.log(`[+] Penarikan Dana Berhasil: Rp${payout.amount.toLocaleString('id-ID')} status PAID`);
  }

  // 4. Data Notifikasi untuk Admin (Pesanan Belum Konfirmasi & Belum Dikirim)
  console.log('\n-- Menyiapkan Notifikasi untuk Corporate Admin --');
  const adminOrder = await prisma.order.create({
    data: {
      orderNumber: `ORD-${Date.now().toString().slice(-6)}-ADM`,
      buyerName: 'Rudi Hartono (Konsumen Baru)',
      buyerPhone: '081399887766',
      buyerEmail: 'rudi.hartono@gmail.com',
      shippingAddress: 'Jl. Gatot Subroto No. 88, Menteng, Jakarta Pusat',
      orderStatus: 'PENDING_PAYMENT',
      subtotal: 500000,
      shippingCost: 20000,
      total: 520789,
      paymentConfirmationStatus: 'SUBMITTED',
      senderBankName: 'BRI',
      senderAccountName: 'Rudi Hartono',
      transferAmountPaid: 520789,
      transferNotes: 'Sudah transfer lewat BRImo ya min',
      createdAt: new Date(),
      items: {
        create: [
          {
            productVariantId: variant1.id,
            skuSnapshot: 'VRN-BOX-10',
            nameSnapshot: 'VARENA Kopi Sehat Paket Perdana Box (10 Sachet)',
            quantity: 1,
            unitPrice: 500000,
            hppSnapshot: 250000,
            lineTotal: 500000,
          },
        ],
      },
    },
  });
  console.log(`[+] Admin: Pesanan menunggu konfirmasi pembayaran: ${adminOrder.orderNumber}`);

  console.log('\n======================================================');
  console.log('✅ SEEDING NOTIFIKASI BERHASIL DI-GENERATE!');
  console.log('Akun untuk Uji Coba:');
  console.log('1. Mitra: mitra1@varena.id / Password: Varena2026! (Ahmad Fauzi)');
  console.log('2. Mitra: mitra2@varena.id / Password: Varena2026! (Siti Nurhaliza)');
  console.log('3. Admin: owner@varena.id / Password: Varena2026! (Hendrawan)');
  console.log('======================================================');
}

main()
  .catch((e) => {
    console.error('Error seeding notifications:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
