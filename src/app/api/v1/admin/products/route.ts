import { NextResponse } from 'next/server';
import { resolveCorporateAdmin } from '@/lib/api-auth';
import prisma from '@/lib/prisma';
import { verifyCorporateAdmin } from '@/lib/auth';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/**
 * GET /api/v1/admin/products
 * Mengambil daftar produk lengkap beserta seluruh varian dan ringkasan penjualan
 */
export async function GET(req: Request) {
  try {
    const authUser = await resolveCorporateAdmin(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'ALL';
    const q = searchParams.get('q')?.trim() || '';

    const whereClause: any = {};
    if (status !== 'ALL') {
      whereClause.status = status;
    }
    if (q) {
      whereClause.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { bpomNumber: { contains: q, mode: 'insensitive' } },
      ];
    }

    let products: any[] = [];
    try {
      products = await prisma.product.findMany({
        where: whereClause,
        include: {
          variants: {
            orderBy: { price: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (queryErr: any) {
      // Jika error karena schema mismatch (kolom baru belum ada di DB produksi),
      // coba query minimal tanpa field-field baru
      console.warn('Full query failed, trying minimal query:', queryErr.message);
      products = await prisma.$queryRawUnsafe<any[]>(
        `SELECT p.id, p.name, p.slug, p.description, p."bpomNumber", p.status, p."isFeatured",
                p."imageUrl", p."createdAt", p."updatedAt",
                json_agg(json_build_object(
                  'id', pv.id, 'sku', pv.sku, 'name', pv.name,
                  'variantType', pv."variantType", 'packSize', pv."packSize",
                  'unit', pv.unit, 'price', pv.price, 'status', pv.status,
                  'retailPrice', COALESCE(pv."retailPrice", 0),
                  'salePrice', pv."salePrice",
                  'isPromoActive', COALESCE(pv."isPromoActive", false),
                  'memberPrice', COALESCE(pv."memberPrice", 0)
                ) ORDER BY pv.price DESC) AS variants
         FROM products p
         LEFT JOIN product_variants pv ON pv."productId" = p.id
         ${status !== 'ALL' ? `WHERE p.status = '${status}'` : ''}
         GROUP BY p.id
         ORDER BY p."createdAt" DESC`
      ).catch(() => []);
    }

    // Ringkasan metrik produk
    const totalProducts = await prisma.product.count().catch(() => 0);
    const activeProducts = await prisma.product.count({ where: { status: 'ACTIVE' } }).catch(() => 0);
    const draftProducts = await prisma.product.count({ where: { status: 'DRAFT' } }).catch(() => 0);
    const totalVariants = await prisma.productVariant.count().catch(() => 0);

    return NextResponse.json({
      success: true,
      metrics: {
        totalProducts,
        activeProducts,
        draftProducts,
        totalVariants,
      },
      products,
    });
  } catch (err: any) {
    console.error('Error fetching admin products:', err);
    return NextResponse.json({ error: err.message || 'Gagal memuat master produk' }, { status: 500 });
  }
}

/**
 * POST /api/v1/admin/products
 * Menambah produk baru lengkap dengan varian Pack dan Satuan serta skema komisi
 */
export async function POST(req: Request) {
  try {
    const authUser = await resolveCorporateAdmin(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      slug: customSlug,
      description,
      tagline,
      servingSuggestion,
      category = 'PREMIUM_COFFEE',
      status = 'ACTIVE',
      bpomNumber,
      halalNumber,
      imageUrl,
      isFeatured = false,
      variants = [],
    } = body;

    if (!name || !description) {
      return NextResponse.json(
        { error: 'Nama produk dan deskripsi wajib diisi.' },
        { status: 400 }
      );
    }

    let finalSlug = customSlug ? generateSlug(customSlug) : generateSlug(name);
    // Cek keunikan slug
    const existing = await prisma.product.findUnique({ where: { slug: finalSlug } });
    if (existing) {
      finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
    }

    // Buat produk dalam transaksi
    const createdProduct = await prisma.$transaction(async (tx) => {
      const prod = await tx.product.create({
        data: {
          name,
          slug: finalSlug,
          description,
          tagline: tagline || null,
          servingSuggestion: servingSuggestion || null,
          category,
          status,
          bpomNumber: bpomNumber || null,
          halalNumber: halalNumber || null,
          imageUrl: imageUrl || '/brand/kopi-matahari.jpeg',
          isFeatured: Boolean(isFeatured),
          launchedAt: status === 'ACTIVE' ? new Date() : null,
        },
      });

      // Tambahkan varian default jika disediakan
      if (Array.isArray(variants) && variants.length > 0) {
        for (const v of variants) {
          await tx.productVariant.create({
            data: {
              productId: prod.id,
              sku: v.sku || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              name: v.name || `${prod.name} Varian`,
              variantType: v.variantType || (v.packSize > 1 ? 'PACK' : 'SINGLE'),
              packSize: Number(v.packSize) || 1,
              unit: v.unit || (v.packSize > 1 ? 'box' : 'sachet'),
              price: Number(v.price) || 0,
              hpp: Number(v.hpp) || 0,
              stockQuantity: Number(v.stockQuantity) || 100,
              status: v.status || 'ACTIVE',
              allowFirstPack: v.allowFirstPack !== false,
              allowRepeatOrder: v.allowRepeatOrder !== false,
              allowAgentStock: v.allowAgentStock !== false,
              sponsorReward: Number(v.sponsorReward) || 0,
              uplineRewardPerLevel: Number(v.uplineRewardPerLevel) || 0,
              maxCommissionLevels: Number(v.maxCommissionLevels) || 10,
            },
          });
        }
      }

      // Catat ke Audit Log
      await tx.auditLog.create({
        data: {
          actorUserId: authUser.userId || null,
          action: 'PRODUCT_CREATED',
          entityType: 'PRODUCT',
          entityId: prod.id,
          afterJson: JSON.stringify({ name: prod.name, slug: prod.slug, status: prod.status }),
          reason: `Admin membuat produk baru: ${prod.name}`,
        },
      });

      return prod;
    });

    const fullProduct = await prisma.product.findUnique({
      where: { id: createdProduct.id },
      include: { variants: true },
    });

    return NextResponse.json({
      success: true,
      message: `Produk "${createdProduct.name}" berhasil ditambahkan.`,
      product: fullProduct,
    });
  } catch (err: any) {
    console.error('Error creating product:', err);
    return NextResponse.json({ error: err.message || 'Gagal menambahkan produk' }, { status: 500 });
  }
}
