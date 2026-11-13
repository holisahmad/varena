import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { status: 'ACTIVE' },
      include: {
        variants: {
          where: { status: 'ACTIVE' },
          orderBy: { price: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      products,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

