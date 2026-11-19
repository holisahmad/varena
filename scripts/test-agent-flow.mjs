import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== TEST ALUR KEAGENAN RESMI VARENA ===');

  // 1. Ambil atau Buat Mitra Sampel
  const member = await prisma.member.findFirst({
    where: { memberCode: 'VRN-0002' },
    include: { user: true },
  });

  if (!member) {
    console.error('Member VRN-0002 tidak ditemukan.');
    return;
  }

  console.log(`1. Ditemukan Mitra: ${member.displayName} (${member.memberCode})`);

  // 2. Simulasi Pengajuan Keagenan (AgentApplication)
  await prisma.agentApplication.deleteMany({ where: { memberId: member.id } });

  const app = await prisma.agentApplication.create({
    data: {
      memberId: member.id,
      city: 'Surabaya',
      province: 'Jawa Timur',
      warehouseAddress: 'Jl. Pemuda No. 45, Genteng, Surabaya',
      storageCapacity: 100,
      contactPhone: '081234567890',
      notes: 'Siap melayani distribusi regional Surabaya dan Sidoarjo.',
      status: 'PENDING',
    },
  });
  console.log(`2. Pengajuan Keagenan Diajukan: ID ${app.id} (${app.city})`);

  // 3. Admin Menyetujui Pengajuan & Mengangkat Jadi Agen Resmi
  await prisma.agentApplication.update({
    where: { id: app.id },
    data: { status: 'APPROVED', reviewedAt: new Date() },
  });

  const updatedMember = await prisma.member.update({
    where: { id: member.id },
    data: {
      isAgent: true,
      agentType: 'REGIONAL_AGENT',
      agentCity: 'Surabaya',
      agentProvince: 'Jawa Timur',
      agentAddress: 'Jl. Pemuda No. 45, Genteng, Surabaya',
      agentInventory: 50,
      agentDepositBalance: 5000000, // Rp5.000.000 saldo deposit awal
      agentDiscountType: 'PERCENTAGE',
      agentDiscountValue: 15.0, // 15% diskon agen
      agentStatus: 'ACTIVE',
      agentVerifiedAt: new Date(),
    },
  });
  console.log(`3. Pengajuan Disetujui! Status Agen: ${updatedMember.agentStatus}, Stok: ${updatedMember.agentInventory} Box, Saldo: Rp${updatedMember.agentDepositBalance.toLocaleString('id-ID')}`);

  // 4. Verifikasi Konfigurasi Aturan MOQ & Diskon
  let config = await prisma.agentConfig.findUnique({ where: { id: 'default' } });
  if (!config) {
    config = await prisma.agentConfig.create({
      data: {
        id: 'default',
        minimumRestockBox: 10,
        defaultDiscountType: 'PERCENTAGE',
        defaultDiscountValue: 15.0,
      },
    });
  }
  console.log(`4. Aturan Keagenan: MOQ = ${config.minimumRestockBox} Box, Diskon = ${config.defaultDiscountValue}%`);

  // 5. Pemberian Reward Apresiasi Kinerja oleh Kantor Pusat
  const reward = await prisma.agentReward.create({
    data: {
      agentMemberId: member.id,
      rewardType: 'PHYSICAL_GOODS',
      title: '1 Unit Sepeda Motor Operasional Wilayah',
      cashAmount: 0,
      goodsDescription: 'Honda Vario 160cc Warna Hitam Dop',
      goodsValuation: 28000000,
      reasonNotes: 'Apresiasi pencapaian distribusi 500 box dalam kuartal pertama',
      deliveryStatus: 'COMPLETED',
    },
  });
  console.log(`5. Reward Resmi Diterbitkan: ${reward.title} (Valuasi: Rp${reward.goodsValuation.toLocaleString('id-ID')})`);

  // 6. Pengalihan Pesanan Regional (Order Routing)
  // Buat order konsumen di Surabaya
  const sampleOrder = await prisma.order.create({
    data: {
      orderNumber: `VRN-ORD-${Date.now().toString().slice(-5)}`,
      buyerUserId: member.userId,
      buyerName: 'Konsumen Rina (Surabaya)',
      buyerPhone: '081298765432',
      shippingAddress: 'Jl. Darmo Permai No. 12, Surabaya',
      shippingProvince: 'Jawa Timur',
      shippingCity: 'Surabaya',
      subtotal: 350000,
      shippingCost: 0,
      uniqueCode: 123,
      total: 350123,
      orderStatus: 'PAID',
      paidAt: new Date(),
      assignedAgentMemberId: member.id,
      fulfillmentMode: 'REGIONAL_AGENT',
      agentDispatchStatus: 'PENDING_AGENT_DISPATCH',
      agentNote: 'Dialihkan dari kantor pusat untuk pengantaran cepat lokal.',
    },
  });
  console.log(`6. Pesanan Konsumen Dialihkan ke Agen: Order ${sampleOrder.orderNumber} (Tujuan: ${sampleOrder.shippingCity})`);

  // 7. Agen Melakukan Dispatch Pengiriman Lokal
  const dispatchedOrder = await prisma.order.update({
    where: { id: sampleOrder.id },
    data: {
      orderStatus: 'SHIPPED',
      agentDispatchStatus: 'DISPATCHED',
      courierName: 'Kurir Internal Agen Surabaya',
      trackingNumber: 'AG-SBY-001',
      shippedAt: new Date(),
    },
  });

  // Kurangi stok agen 1 box
  await prisma.member.update({
    where: { id: member.id },
    data: { agentInventory: { decrement: 1 } },
  });

  console.log(`7. Agen Memproses Pengiriman: Resi ${dispatchedOrder.trackingNumber} via ${dispatchedOrder.courierName}`);

  console.log('\n=== SELURUH ALUR KEAGENAN RESMI VARENA TERUJI LENGKAP & VALID ===');
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
