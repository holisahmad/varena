import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Mengupdate data varian produk di database...');
  
  await prisma.productVariant.updateMany({
    where: { sku: 'KM-BOX10' },
    data: {
      retailPrice: 550000,
      salePrice: 500000,
      isPromoActive: true,
      memberPrice: 500000,
      price: 500000,
    },
  });

  await prisma.productVariant.updateMany({
    where: { sku: 'KM-SCH01' },
    data: {
      retailPrice: 55000,
      salePrice: 50000,
      isPromoActive: true,
      memberPrice: 50000,
      price: 50000,
    },
  });

  await prisma.productVariant.updateMany({
    where: { sku: 'THN-BOX20' },
    data: {
      retailPrice: 385000,
      salePrice: 350000,
      isPromoActive: true,
      memberPrice: 350000,
      price: 350000,
    },
  });

  const variants = await prisma.productVariant.findMany({
    select: {
      sku: true,
      name: true,
      retailPrice: true,
      salePrice: true,
      isPromoActive: true,
      memberPrice: true,
      price: true,
    },
  });

  console.log('Hasil Varian di Database:');
  console.table(variants);
}

main()
  .catch((err) => {
    console.error('Error updating variants:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
