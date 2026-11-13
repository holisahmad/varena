'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, CheckCircle, Shield, Award } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/catalog/products')
      .then((res) => res.json())
      .then((data) => {
        if (data.products) setProducts(data.products);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="text-xs font-semibold uppercase tracking-wider text-varena-gold">VARENA Market</span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-varena-espresso mt-1">
          Katalog Produk Resmi
        </h1>
        <p className="text-sm text-varena-taupe-dark mt-2">
          Produk herbal berkhasiat dengan izin BPOM dan jaminan keaslian mutu 100%.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-sm text-varena-taupe">Memuat katalog produk...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-sm text-varena-taupe">Belum ada produk aktif.</div>
      ) : (
        <div className="space-y-12">
          {products.map((p) => (
            <div
              key={p.id}
              className="bg-white border border-varena-taupe/20 rounded-2xl p-6 sm:p-8 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-8 items-center"
            >
              <div className="md:col-span-4 flex justify-center">
                <div className="w-56 h-56 rounded-xl bg-varena-espresso-dark p-6 flex flex-col items-center justify-center text-center relative border border-varena-gold/30">
                  <div className="w-20 h-20 relative mb-3">
                    <Image
                      src={p.imageUrl || '/brand/varena-connected-v-symbol.png'}
                      alt={p.name}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <span className="font-serif text-xl font-bold text-varena-gold-light">{p.name}</span>
                  <span className="text-[10px] text-varena-ivory/70 uppercase mt-1">BPOM {p.bpomNumber}</span>
                </div>
              </div>

              <div className="md:col-span-8 space-y-4">
                <div>
                  <div className="inline-block px-2.5 py-0.5 rounded text-[10px] font-semibold bg-varena-ivory text-varena-taupe-dark border border-varena-taupe/30 mb-2">
                    {p.category}
                  </div>
                  <h2 className="font-serif text-2xl font-bold text-varena-espresso">{p.name}</h2>
                  <p className="text-xs sm:text-sm text-varena-taupe-dark mt-2 leading-relaxed">
                    {p.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-varena-taupe/20">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-varena-espresso mb-3">
                    Pilihan Paket & Eceran:
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {p.variants?.map((v: any) => (
                      <div
                        key={v.id}
                        className="p-4 rounded-xl border border-varena-gold/30 bg-varena-ivory-light flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm text-varena-espresso">{v.name}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 bg-varena-espresso text-varena-gold-light rounded">
                              {v.sku}
                            </span>
                          </div>
                          <div className="mt-2 text-lg font-serif font-bold text-varena-espresso">
                            Rp{v.price.toLocaleString('id-ID')}
                            <span className="text-xs font-normal text-varena-taupe ml-1">/ {v.unit}</span>
                          </div>
                          <div className="text-[11px] text-varena-taupe mt-1">
                            Isi: {v.packSize} sachet · Stok: {v.stockQuantity} {v.unit}
                          </div>
                        </div>

                        <Link
                          href={`/checkout?variantId=${v.id}`}
                          className="mt-4 w-full py-2 px-3 rounded-lg bg-varena-gold text-varena-espresso text-xs font-semibold hover:bg-varena-gold-hover transition text-center flex items-center justify-center gap-1.5 shadow"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Pesan Varian Ini</span>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-4 text-[11px] text-varena-taupe">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-varena-gold" />
                    <span>Halal Indonesia: {p.halalNumber}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-varena-gold" />
                    <span>Garansi Keaslian Pabrik</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

