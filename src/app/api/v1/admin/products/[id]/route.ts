import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveCorporateAdmin } from '@/lib/api-auth';

/**
 * GET /api/v1/admin/products/[id]
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: {
          orderBy: { price: 'desc' },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Produk tidak ditemukan.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, product });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/v1/admin/products/[id]
 * Memperbarui data produk, menaikkan/menurunkan harga, merubah status launching, atau mengelola varian
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await resolveCorporateAdmin(req);

    if (!authUser) {
      return NextResponse.json(
        { error: 'Akses ditolak: Hanya pengelola korporasi yang berhak mengubah produk.' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: 'Produk tidak ditemukan.' }, { status: 404 });
    }

    const {
      name,
      description,
      tagline,
      servingSuggestion,
      category,
      status,
      bpomNumber,
      halalNumber,
      imageUrl,
      isFeatured,
      variants = [],
    } = body;

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update data pokok produk
      const prod = await tx.product.update({
        where: { id },
        data: {
          ...(name ? { name } : {}),
          ...(description ? { description } : {}),
          ...(tagline !== undefined ? { tagline } : {}),
          ...(servingSuggestion !== undefined ? { servingSuggestion } : {}),
          ...(category ? { category } : {}),
          ...(status ? { status } : {}),
          ...(bpomNumber !== undefined ? { bpomNumber } : {}),
          ...(halalNumber !== undefined ? { halalNumber } : {}),
          ...(imageUrl ? { imageUrl } : {}),
          ...(isFeatured !== undefined ? { isFeatured: Boolean(isFeatured) } : {}),
          ...(status === 'ACTIVE' && !existingProduct.launchedAt ? { launchedAt: new Date() } : {}),
        },
      });

      // 2. Sinkronkan varian (jika disertakan)
      if (Array.isArray(variants) && variants.length > 0) {
        for (const v of variants) {
          if (v.id) {
            // Update existing variant
            await tx.productVariant.update({
              where: { id: v.id },
              data: {
                ...(v.name ? { name: v.name } : {}),
                ...(v.sku ? { sku: v.sku } : {}),
                ...(v.variantType ? { variantType: v.variantType } : {}),
                ...(v.packSize !== undefined ? { packSize: Number(v.packSize) } : {}),
                ...(v.unit ? { unit: v.unit } : {}),
                ...(v.price !== undefined ? { price: Number(v.price) } : {}),
                ...(v.hpp !== undefined ? { hpp: Number(v.hpp) } : {}),
                ...(v.stockQuantity !== undefined ? { stockQuantity: Number(v.stockQuantity) } : {}),
                ...(v.status ? { status: v.status } : {}),
                ...(v.allowFirstPack !== undefined ? { allowFirstPack: Boolean(v.allowFirstPack) } : {}),
                ...(v.allowRepeatOrder !== undefined ? { allowRepeatOrder: Boolean(v.allowRepeatOrder) } : {}),
                ...(v.allowAgentStock !== undefined ? { allowAgentStock: Boolean(v.allowAgentStock) } : {}),
                ...(v.sponsorReward !== undefined ? { sponsorReward: Number(v.sponsorReward) } : {}),
                ...(v.uplineRewardPerLevel !== undefined ? { uplineRewardPerLevel: Number(v.uplineRewardPerLevel) } : {}),
                ...(v.maxCommissionLevels !== undefined ? { maxCommissionLevels: Number(v.maxCommissionLevels) } : {}),
              },
            });
          } else {
            // Insert new variant
            await tx.productVariant.create({
              data: {
                productId: id,
                sku: v.sku || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                name: v.name || `${prod.name} Varian`,
                variantType: v.variantType || 'PACK',
                packSize: Number(v.packSize) || 1,
                unit: v.unit || 'box',
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
      }

      // 3. Audit Log
      await tx.auditLog.create({
        data: {
          actorUserId: authUser.userId || null,
          action: 'PRODUCT_UPDATED',
          entityType: 'PRODUCT',
          entityId: prod.id,
          beforeJson: JSON.stringify({ name: existingProduct.name, status: existingProduct.status }),
          afterJson: JSON.stringify({ name: prod.name, status: prod.status }),
          reason: `Admin memperbarui produk: ${prod.name}`,
        },
      });

      return prod;
    });

    const refreshed = await prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    });

    return NextResponse.json({
      success: true,
      message: `Produk "${updated.name}" berhasil diperbarui.`,
      product: refreshed,
    });
  } catch (err: any) {
    console.error('Error updating product:', err);
    return NextResponse.json({ error: err.message || 'Gagal memperbarui produk' }, { status: 500 });
  }
}

/**
 * DELETE /api/v1/admin/products/[id]
 * Soft archive produk agar riwayat order dan komisi masa lalu tetap utuh
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await resolveCorporateAdmin(req);

    if (!authUser) {
      return NextResponse.json(
        { error: 'Akses ditolak: Hanya pengelola korporasi yang berhak mengarsipkan produk.' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      return NextResponse.json({ error: 'Produk tidak ditemukan.' }, { status: 404 });
    }

    await prisma.product.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: authUser.userId || null,
        action: 'PRODUCT_ARCHIVED',
        entityType: 'PRODUCT',
        entityId: id,
        beforeJson: JSON.stringify({ status: product.status }),
        afterJson: JSON.stringify({ status: 'ARCHIVED' }),
        reason: `Admin mengarsipkan produk ${product.name}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Produk "${product.name}" berhasil diarsipkan dari katalog aktif.`,
    });
  } catch (err: any) {
    console.error('Error archiving product:', err);
    return NextResponse.json({ error: err.message || 'Gagal mengarsipkan produk' }, { status: 500 });
  }
}
