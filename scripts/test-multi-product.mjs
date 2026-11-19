import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== TEST MULTI-PRODUK & SKEMA PENJUALAN DINAMIS ===\n');

  // 1. Verifikasi Master Produk di Database
  const products = await prisma.product.findMany({
    include: { variants: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`1. Total Master Produk Aktif: ${products.length} Produk`);
  products.forEach((p) => {
    console.log(`   - [${p.status}] ${p.name} (Kategori: ${p.category})`);
    console.log(`     Tagline: "${p.tagline || '-'}"`);
    console.log(`     Izin Edar: ${p.bpomNumber} | Halal: ${p.halalNumber}`);
    p.variants.forEach((v) => {
      const margin = v.price - v.hpp;
      const marginPct = ((margin / v.price) * 100).toFixed(1);
      console.log(
        `     * Varian: ${v.sku} - ${v.name} | Jual: Rp${v.price.toLocaleString('id-ID')} | HPP: Rp${v.hpp.toLocaleString('id-ID')} (Laba: Rp${margin.toLocaleString('id-ID')} / ${marginPct}%)`
      );
      console.log(
        `       Skema Komisi: Sponsor = Rp${v.sponsorReward.toLocaleString('id-ID')} | Upline = Rp${v.uplineRewardPerLevel.toLocaleString('id-ID')}/level (s/d L${v.maxCommissionLevels})`
      );
    });
  });

  // 2. Verifikasi Konfigurasi Pengaturan Sistem (Master Settings)
  const settings = await prisma.systemSetting.findMany({ orderBy: { key: 'asc' } });
  const agentConfig = await prisma.agentConfig.findUnique({ where: { id: 'default' } });

  console.log(`\n2. Pengaturan Sistem Operasional Terpusat: ${settings.length} Keys`);
  settings.forEach((s) => {
    console.log(`   - ${s.key.padEnd(28)} : ${s.value} [${s.group}]`);
  });
  if (agentConfig) {
    console.log(`   - DEFAULT AGENT CONFIG         : MOQ ${agentConfig.minimumRestockBox} Box, Diskon ${agentConfig.defaultDiscountValue}%`);
  }

  // 3. Validasi Komparasi Skema Margin Produk Kopi vs Produk Teh
  console.log('\n3. Validasi Keamanan Margin & Anti-Defisit Sistem (Zero-Deficit Guarantee):');
  for (const p of products) {
    const pack = p.variants.find((v) => v.variantType === 'PACK');
    if (pack) {
      const grossMargin = pack.price - pack.hpp;
      const maxAllocatedCommission = pack.sponsorReward + (pack.uplineRewardPerLevel * pack.maxCommissionLevels);
      const corporateRetainedNet = grossMargin - maxAllocatedCommission;
      const retainedPct = ((corporateRetainedNet / pack.price) * 100).toFixed(1);

      console.log(`   - Produk "${p.name}" (Pack):`);
      console.log(`     * Harga Jual          : Rp${pack.price.toLocaleString('id-ID')}`);
      console.log(`     * HPP Pokok           : Rp${pack.hpp.toLocaleString('id-ID')}`);
      console.log(`     * Margin Kotor Total  : Rp${grossMargin.toLocaleString('id-ID')}`);
      console.log(`     * Max Komisi 10 Level : Rp${maxAllocatedCommission.toLocaleString('id-ID')}`);
      console.log(`     * Laba Bersih Kantor  : Rp${corporateRetainedNet.toLocaleString('id-ID')} (${retainedPct}% dari omzet)`);

      if (corporateRetainedNet <= 0) {
        throw new Error(`PERINGATAN DEFISIT: Produk ${p.name} mengalami overpaying komisi!`);
      }
      console.log(`     ✓ AMAN: Korporasi tetap surplus Rp${corporateRetainedNet.toLocaleString('id-ID')} per box.`);
    }
  }

  console.log('\n=== SELURUH PENGUJIAN MASTER PRODUK & SKEMA DINAMIS SUKSES (100% VALID) ===');
}

main()
  .catch((e) => {
    console.error('Test failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
