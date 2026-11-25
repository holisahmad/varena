import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveVariantPrice, formatRupiah } from '../src/lib/pricing.ts';

test('Pricing Engine - Non-Mitra Normal (Tanpa Promo)', () => {
  const variant = {
    price: 55000,
    retailPrice: 55000,
    salePrice: 50000,
    isPromoActive: false, // Promo mati
    memberPrice: 50000,
  };

  const resolved = resolveVariantPrice(variant, false);
  assert.equal(resolved.unitPrice, 55000, 'Harga bayar harus 55.000');
  assert.equal(resolved.originalPrice, null, 'Tidak ada harga coret saat promo mati');
  assert.equal(resolved.isDiscounted, false);
  assert.equal(resolved.isMitraPrice, false);
});

test('Pricing Engine - Non-Mitra Promo Satuan (Harga Coret 55.000 -> 50.000)', () => {
  const variant = {
    price: 50000,
    retailPrice: 55000,
    salePrice: 50000,
    isPromoActive: true, // Promo aktif
    memberPrice: 50000,
  };

  const resolved = resolveVariantPrice(variant, false);
  assert.equal(resolved.unitPrice, 50000, 'Harga promo harus 50.000');
  assert.equal(resolved.originalPrice, 55000, 'Harga coret harus 55.000');
  assert.equal(resolved.discountAmount, 5000, 'Diskon harus 5.000');
  assert.equal(resolved.discountPercent, 9, 'Diskon ~9%');
  assert.equal(resolved.isDiscounted, true);
  assert.equal(resolved.isMitraPrice, false);
});

test('Pricing Engine - Non-Mitra Promo Pack (Harga Coret 550.000 -> 500.000)', () => {
  const variant = {
    price: 500000,
    retailPrice: 550000,
    salePrice: 500000,
    isPromoActive: true,
    memberPrice: 500000,
  };

  const resolved = resolveVariantPrice(variant, false);
  assert.equal(resolved.unitPrice, 500000, 'Harga pack promo harus 500.000');
  assert.equal(resolved.originalPrice, 550000, 'Harga coret harus 550.000');
  assert.equal(resolved.discountAmount, 50000, 'Diskon harus 50.000');
  assert.equal(resolved.discountPercent, 9, 'Diskon ~9%');
  assert.equal(resolved.isDiscounted, true);
  assert.equal(resolved.isMitraPrice, false);
});

test('Pricing Engine - Mitra Tetap Satuan (50.000)', () => {
  const variant = {
    price: 50000,
    retailPrice: 55000,
    salePrice: 50000,
    isPromoActive: true,
    memberPrice: 50000,
  };

  const resolved = resolveVariantPrice(variant, true); // isMitra = true
  assert.equal(resolved.unitPrice, 50000, 'Harga mitra harus 50.000');
  assert.equal(resolved.isMitraPrice, true);
  assert.equal(resolved.originalPrice, 55000, 'Dapat referensi harga jual eceran 55.000');
});

test('Pricing Engine - Mitra Tetap Pack (500.000)', () => {
  const variant = {
    price: 500000,
    retailPrice: 550000,
    salePrice: 500000,
    isPromoActive: true,
    memberPrice: 500000,
  };

  const resolved = resolveVariantPrice(variant, true); // isMitra = true
  assert.equal(resolved.unitPrice, 500000, 'Harga mitra pack harus 500.000');
  assert.equal(resolved.isMitraPrice, true);
  assert.equal(resolved.originalPrice, 550000);
});

test('Pricing Engine - Format Rupiah', () => {
  assert.equal(formatRupiah(50000), 'Rp50.000');
  assert.equal(formatRupiah(550000), 'Rp550.000');
});
