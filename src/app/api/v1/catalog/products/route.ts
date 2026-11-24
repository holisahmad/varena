import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const [products, shippingSetting] = await Promise.all([
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

    const shippingFee = shippingSetting ? Number(shippingSetting.value) || 20000 : 20000;

    return NextResponse.json(
      {
        success: true,
        products,
        shippingFee,
      },
      {
        headers: {
          // CDN edge cache 60 detik + stale-while-revalidate 5 menit untuk menghemat operasi database Prisma
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

