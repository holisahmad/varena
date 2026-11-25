'use client';

import React from 'react';
import { resolveVariantPrice, formatRupiah, VariantPricingInput } from '@/lib/pricing';

interface PriceTagProps {
  variant: VariantPricingInput & { unit?: string };
  isMitra?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showBadge?: boolean;
  className?: string;
}

export default function PriceTag({
  variant,
  isMitra = false,
  size = 'md',
  showBadge = true,
  className = '',
}: PriceTagProps) {
  if (!variant) return null;

  const priceInfo = resolveVariantPrice(variant, isMitra);

  const sizeClasses = {
    sm: {
      final: 'text-sm font-bold',
      original: 'text-xs line-through text-varena-taupe',
      badge: 'text-[9px] px-1.5 py-0.5',
      unit: 'text-[11px] font-normal text-varena-taupe',
    },
    md: {
      final: 'text-lg sm:text-xl font-bold font-serif',
      original: 'text-xs sm:text-sm line-through text-varena-taupe',
      badge: 'text-[10px] px-2 py-0.5',
      unit: 'text-xs font-normal text-varena-taupe',
    },
    lg: {
      final: 'text-2xl sm:text-3xl font-bold font-serif',
      original: 'text-sm sm:text-base line-through text-varena-taupe',
      badge: 'text-xs px-2.5 py-1',
      unit: 'text-sm font-normal text-varena-taupe',
    },
  }[size];

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Badge Promo / Diskon / Mitra */}
      {showBadge && priceInfo.badgeLabel && (
        <div className="mb-1">
          <span
            className={`inline-flex items-center font-semibold rounded-full ${
              priceInfo.isMitraPrice
                ? 'bg-varena-gold/20 text-varena-gold-dark border border-varena-gold/40'
                : 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/30'
            } ${sizeClasses.badge}`}
          >
            {priceInfo.badgeLabel}
          </span>
        </div>
      )}

      {/* Baris Harga */}
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className={`text-varena-espresso ${sizeClasses.final}`}>
          {formatRupiah(priceInfo.unitPrice)}
        </span>

        {/* Harga Coret */}
        {priceInfo.isDiscounted && priceInfo.originalPrice && (
          <span className={sizeClasses.original}>
            {formatRupiah(priceInfo.originalPrice)}
          </span>
        )}

        {/* Satuan Unit */}
        {variant.unit && (
          <span className={sizeClasses.unit}>/ {variant.unit}</span>
        )}
      </div>
    </div>
  );
}
