import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const DEFAULT_PRODUCTS = [
  {
    id: 'kopi-matahari-default',
    name: 'Kopi Matahari',
    slug: 'kopi-matahari',
    tagline: 'Energi Pagi, Sehat Seharian · Nikmatnya Kopi, Baiknya untuk Tubuh',
    description:
      'Kopi Robusta fermentasi premium pilihan, diproses dengan metode fermentasi terkontrol untuk menghasilkan cita rasa yang kaya, aroma yang kuat, dan kenikmatan setiap pagi yang tak terlupakan. Cocok dinikmati sebagai bagian dari rutinitas harian yang produktif.',
    category: 'PREMIUM_COFFEE',
    status: 'ACTIVE',
    bpomNumber: 'P-IRT 2083404061840-31',
    halalNumber: 'ID00110000234560124',
    imageUrl: '/brand/kopi-matahari.jpeg',
    variants: [
      {
        id: 'km-box10',
        sku: 'KM-BOX10',
        name: 'Kopi Matahari Box (10 Sachet)',
        variantType: 'PACK',
        packSize: 10,
        unit: 'box',
        price: 500000,
        retailPrice: 550000,
        salePrice: 500000,
        isPromoActive: true,
        memberPrice: 500000,
        stockQuantity: 1000,
        allowFirstPack: true,
      },
      {
        id: 'km-sch01',
        sku: 'KM-SCH01',
        name: 'Kopi Matahari Sachet Satuan',
        variantType: 'SINGLE',
        packSize: 1,
        unit: 'sachet',
        price: 50000,
        retailPrice: 55000,
        salePrice: 50000,
        isPromoActive: true,
        memberPrice: 50000,
        stockQuantity: 5000,
        allowFirstPack: false,
      },
    ],
  },
];

export async function GET() {
  try {
    let products: any[] = [];
    let shippingSetting: any = null;

    try {
      [products, shippingSetting] = await Promise.all([
        prisma.product.findMany({
          where: { status: 'ACTIVE' },
          include: {
            variants: {
              where: { status: 'ACTIVE' },
              orderBy: { price: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.systemSetting.findUnique({
          where: { key: 'DEFAULT_SHIPPING_FEE' },
        }).catch(() => null),
      ]);
    } catch (dbErr) {
      console.warn('Database catalog query failed, using default catalog fallback:', dbErr);
    }

    if (!products || products.length === 0) {
      products = DEFAULT_PRODUCTS;
    }

    const shippingFee = shippingSetting ? Number(shippingSetting.value) || 20000 : 20000;

    return NextResponse.json(
      {
        success: true,
        products,
        shippingFee,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ success: true, products: DEFAULT_PRODUCTS, shippingFee: 20000 });
  }
}
