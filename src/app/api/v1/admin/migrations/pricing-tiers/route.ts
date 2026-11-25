import { NextResponse } from 'next/server';
import { resolveCorporateAdmin } from '@/lib/api-auth';
import prisma from '@/lib/prisma';

/**
 * POST /api/v1/admin/migrations/pricing-tiers
 * Menambahkan kolom harga baru ke tabel product_variants (idempotent).
 * Hanya bisa dijalankan oleh admin korporat.
 *
 * Jalankan SEKALI di production setelah deploy schema baru.
 */
export async function POST(req: Request) {
  try {
    const authUser = await resolveCorporateAdmin(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 401 });
    }

    const results: string[] = [];

    // Jalankan satu per satu agar tidak error "multiple commands in prepared statement"
    const statements = [
      `ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS "retailPrice" INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS "salePrice" INTEGER`,
      `ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS "isPromoActive" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS "memberPrice" INTEGER NOT NULL DEFAULT 0`,
    ];

    for (const sql of statements) {
      await prisma.$executeRawUnsafe(sql);
      results.push(`OK: ${sql.substring(0, 60)}...`);
    }

    // Seed harga ke varian existing berdasarkan SKU
    const seedData = [
      {
        sku: 'KM-BOX10',
        retailPrice: 550000,
        salePrice: 500000,
        isPromoActive: true,
        memberPrice: 500000,
        price: 500000,
      },
      {
        sku: 'KM-SCH01',
        retailPrice: 55000,
        salePrice: 50000,
        isPromoActive: true,
        memberPrice: 50000,
        price: 50000,
      },
      {
        sku: 'THN-BOX20',
        retailPrice: 385000,
        salePrice: 350000,
        isPromoActive: true,
        memberPrice: 350000,
        price: 350000,
      },
    ];

    for (const item of seedData) {
      const updated = await prisma.$executeRawUnsafe(
        `UPDATE product_variants
         SET "retailPrice" = $1,
             "salePrice"   = $2,
             "isPromoActive" = $3,
             "memberPrice" = $4,
             price         = $5
         WHERE sku = $6`,
        item.retailPrice,
        item.salePrice,
        item.isPromoActive,
        item.memberPrice,
        item.price,
        item.sku
      );
      results.push(`Seeded ${item.sku}: ${updated} row(s) updated`);
    }

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    console.error('Migration error:', err);
    return NextResponse.json(
      { error: err.message || 'Migration gagal' },
      { status: 500 }
    );
  }
}
