/**
 * VARENA Dynamic Multi-Product Pricing Engine
 * Handles dynamic tier pricing, promotional strike-through pricing, and member-specific pricing.
 * Zero-hardcoding: scales dynamically for any product (coffee, tea, herbal, supplements, etc.).
 */

export interface VariantPricingInput {
  price: number;
  retailPrice?: number | null;
  salePrice?: number | null;
  isPromoActive?: boolean | null;
  memberPrice?: number | null;
}

export interface ResolvedPrice {
  unitPrice: number;            // Final price to be paid
  originalPrice: number | null; // Strikethrough price (retailPrice), or null if no discount
  discountAmount: number;       // Discount amount in Rupiah
  discountPercent: number;      // Discount in percentage
  isDiscounted: boolean;        // Whether strikethrough applies
  isMitraPrice: boolean;        // Whether member price applies
  badgeLabel: string | null;    // e.g. "Hemat 9%", "Harga Mitra", etc.
}

/**
 * Resolves the authoritative unit price and display metadata for a product variant.
 * 
 * @param variant The product variant containing price tiers
 * @param isMitra Whether the purchasing user is a verified registered member/mitra
 */
export function resolveVariantPrice(
  variant: VariantPricingInput,
  isMitra: boolean = false
): ResolvedPrice {
  const baseRetail = (variant.retailPrice && variant.retailPrice > 0) ? variant.retailPrice : variant.price;
  const baseMember = (variant.memberPrice && variant.memberPrice > 0) ? variant.memberPrice : variant.price;

  if (isMitra) {
    const isDiscounted = baseRetail > baseMember;
    const discountAmount = isDiscounted ? baseRetail - baseMember : 0;
    const discountPercent = isDiscounted && baseRetail > 0 ? Math.round((discountAmount / baseRetail) * 100) : 0;
    return {
      unitPrice: baseMember,
      originalPrice: isDiscounted ? baseRetail : null,
      discountAmount,
      discountPercent,
      isDiscounted,
      isMitraPrice: true,
      badgeLabel: isDiscounted ? `Harga Khusus Mitra` : 'Harga Mitra',
    };
  }

  // Non-Mitra (Konsumen Umum)
  const isPromo = Boolean(variant.isPromoActive && variant.salePrice && variant.salePrice > 0 && variant.salePrice < baseRetail);
  if (isPromo) {
    const sale = variant.salePrice!;
    const discountAmount = baseRetail - sale;
    const discountPercent = baseRetail > 0 ? Math.round((discountAmount / baseRetail) * 100) : 0;
    return {
      unitPrice: sale,
      originalPrice: baseRetail,
      discountAmount,
      discountPercent,
      isDiscounted: true,
      isMitraPrice: false,
      badgeLabel: `Hemat Rp${discountAmount.toLocaleString('id-ID')} (${discountPercent}%)`,
    };
  }

  // Normal Non-Mitra
  return {
    unitPrice: baseRetail,
    originalPrice: null,
    discountAmount: 0,
    discountPercent: 0,
    isDiscounted: false,
    isMitraPrice: false,
    badgeLabel: null,
  };
}

/**
 * Format number into standard Rupiah display e.g. Rp50.000
 */
export function formatRupiah(amount: number): string {
  return `Rp${Math.round(amount).toLocaleString('id-ID')}`;
}
