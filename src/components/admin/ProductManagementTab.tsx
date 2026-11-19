'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Package,
  Plus,
  Search,
  Edit3,
  Archive,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  DollarSign,
  TrendingUp,
  Tag,
  ShieldCheck,
  Eye,
  EyeOff,
  X,
  Save,
  Coffee,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { formatProductCategory } from '@/lib/formatters';

interface ProductManagementTabProps {
  authHeaders: Record<string, string>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  showConfirm: (config: any) => void;
}

interface VariantForm {
  id?: string;
  sku: string;
  name: string;
  variantType: 'PACK' | 'SINGLE';
  packSize: number;
  unit: string;
  price: number;
  hpp: number;
  stockQuantity: number;
  status: string;
  allowFirstPack: boolean;
  allowRepeatOrder: boolean;
  allowAgentStock: boolean;
  sponsorReward: number;
  uplineRewardPerLevel: number;
  maxCommissionLevels: number;
}

interface ProductForm {
  id?: string;
  name: string;
  slug: string;
  category: string;
  tagline: string;
  description: string;
  servingSuggestion: string;
  bpomNumber: string;
  halalNumber: string;
  imageUrl: string;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  isFeatured: boolean;
  variants: VariantForm[];
}

const CATEGORY_OPTIONS = [
  { value: 'PREMIUM_COFFEE', label: 'Kopi Robusta Premium' },
  { value: 'COFFEE_BEVERAGE', label: 'Minuman Kopi' },
  { value: 'HERBAL_BEVERAGE', label: 'Minuman Herbal Alami' },
  { value: 'SUPPLEMENT', label: 'Suplemen Kesehatan' },
  { value: 'FOOD_BEVERAGE', label: 'Makanan & Minuman Sehat' },
  { value: 'COSMETIC', label: 'Perawatan & Kosmetik' },
];

export default function ProductManagementTab({
  authHeaders,
  showToast,
  showConfirm,
}: ProductManagementTabProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({
    totalProducts: 0,
    activeProducts: 0,
    draftProducts: 0,
    totalVariants: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DRAFT' | 'ARCHIVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'GENERAL' | 'PACK' | 'SINGLE' | 'COMMISSION'>('GENERAL');
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [form, setForm] = useState<ProductForm>({
    name: '',
    slug: '',
    category: 'PREMIUM_COFFEE',
    tagline: '',
    description: '',
    servingSuggestion: '',
    bpomNumber: '',
    halalNumber: '',
    imageUrl: '/brand/kopi-matahari.jpeg',
    status: 'ACTIVE',
    isFeatured: false,
    variants: [],
  });

  const loadProducts = () => {
    setLoading(true);
    const url = `/api/v1/admin/products?status=${statusFilter}&q=${encodeURIComponent(searchQuery)}`;
    fetch(url, { headers: authHeaders })
      .then((res) => res.json())
      .then((data) => {
        if (data.products) {
          setProducts(data.products);
          if (data.metrics) setMetrics(data.metrics);
        }
      })
      .catch((err) => {
        console.error('Error loading products:', err);
        showToast('Gagal memuat katalog master produk', 'error');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProducts();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadProducts();
  };

  const openCreateModal = () => {
    setForm({
      name: '',
      slug: '',
      category: 'PREMIUM_COFFEE',
      tagline: '',
      description: '',
      servingSuggestion: '',
      bpomNumber: '',
      halalNumber: 'ID00110000234560124',
      imageUrl: '/brand/kopi-matahari.jpeg',
      status: 'ACTIVE',
      isFeatured: false,
      variants: [
        {
          sku: `VRN-${Date.now().toString().slice(-4)}-BOX10`,
          name: 'Paket Box (10 Sachet)',
          variantType: 'PACK',
          packSize: 10,
          unit: 'box',
          price: 500000,
          hpp: 250000,
          stockQuantity: 1000,
          status: 'ACTIVE',
          allowFirstPack: true,
          allowRepeatOrder: true,
          allowAgentStock: true,
          sponsorReward: 50000,
          uplineRewardPerLevel: 10000,
          maxCommissionLevels: 10,
        },
        {
          sku: `VRN-${Date.now().toString().slice(-4)}-SCH01`,
          name: 'Eceran Sachet Satuan',
          variantType: 'SINGLE',
          packSize: 1,
          unit: 'sachet',
          price: 45000,
          hpp: 25000,
          stockQuantity: 5000,
          status: 'ACTIVE',
          allowFirstPack: false,
          allowRepeatOrder: true,
          allowAgentStock: true,
          sponsorReward: 0,
          uplineRewardPerLevel: 2000,
          maxCommissionLevels: 10,
        },
      ],
    });
    setActiveModalTab('GENERAL');
    setIsModalOpen(true);
  };

  const openEditModal = (p: any) => {
    const existingVariants: VariantForm[] = (p.variants || []).map((v: any) => ({
      id: v.id,
      sku: v.sku,
      name: v.name,
      variantType: v.variantType || (v.packSize > 1 ? 'PACK' : 'SINGLE'),
      packSize: v.packSize,
      unit: v.unit,
      price: v.price,
      hpp: v.hpp,
      stockQuantity: v.stockQuantity,
      status: v.status,
      allowFirstPack: v.allowFirstPack !== false,
      allowRepeatOrder: v.allowRepeatOrder !== false,
      allowAgentStock: v.allowAgentStock !== false,
      sponsorReward: v.sponsorReward || 0,
      uplineRewardPerLevel: v.uplineRewardPerLevel || 0,
      maxCommissionLevels: v.maxCommissionLevels || 10,
    }));

    setForm({
      id: p.id,
      name: p.name,
      slug: p.slug,
      category: p.category,
      tagline: p.tagline || '',
      description: p.description || '',
      servingSuggestion: p.servingSuggestion || '',
      bpomNumber: p.bpomNumber || '',
      halalNumber: p.halalNumber || '',
      imageUrl: p.imageUrl || '/brand/kopi-matahari.jpeg',
      status: p.status,
      isFeatured: Boolean(p.isFeatured),
      variants: existingVariants,
    });
    setActiveModalTab('GENERAL');
    setIsModalOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!form.name.trim()) {
      showToast('Nama produk wajib diisi', 'error');
      return;
    }
    if (!form.description.trim()) {
      showToast('Deskripsi produk wajib diisi', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const isEditing = Boolean(form.id);
      const url = isEditing ? `/api/v1/admin/products/${form.id}` : '/api/v1/admin/products';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan produk');
      }

      showToast(isEditing ? 'Produk berhasil diperbarui!' : 'Produk baru berhasil ditambahkan!', 'success');
      setIsModalOpen(false);
      loadProducts();
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan sistem', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = (p: any) => {
    const nextStatus = p.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE';
    const actionLabel = nextStatus === 'ACTIVE' ? 'Meluncurkan (Publish)' : 'Menjadikan Draf (Unpublish)';

    showConfirm({
      title: `${actionLabel} Produk`,
      message: `Apakah Anda yakin ingin mengubah status "${p.name}" menjadi ${nextStatus === 'ACTIVE' ? 'AKTIF (dapat dibeli mitra)' : 'DRAF (hanya terlihat admin)'}?`,
      confirmText: nextStatus === 'ACTIVE' ? 'Luncurkan Sekarang' : 'Jadikan Draf',
      variant: nextStatus === 'ACTIVE' ? 'emerald' : 'amber',
      icon: nextStatus === 'ACTIVE' ? 'check' : 'warning',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/v1/admin/products/${p.id}`, {
            method: 'PUT',
            headers: {
              ...authHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: nextStatus }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          showToast(`Status produk berhasil diubah menjadi ${nextStatus}`, 'success');
          loadProducts();
        } catch (e: any) {
          showToast(e.message || 'Gagal mengubah status produk', 'error');
        }
      },
    });
  };

  const handleArchive = (p: any) => {
    showConfirm({
      title: 'Arsipkan Produk',
      message: `Produk "${p.name}" akan disembunyikan dari katalog mitra dan pendaftaran. Riwayat order masa lalu tetap tersimpan utuh. Lanjutkan?`,
      confirmText: 'Ya, Arsipkan',
      variant: 'rose',
      icon: 'warning',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/v1/admin/products/${p.id}`, {
            method: 'DELETE',
            headers: authHeaders,
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          showToast('Produk berhasil diarsipkan', 'success');
          loadProducts();
        } catch (e: any) {
          showToast(e.message || 'Gagal mengarsipkan produk', 'error');
        }
      },
    });
  };

  // Helper update form variant
  const updateVariantField = (index: number, field: keyof VariantForm, value: any) => {
    const updated = [...form.variants];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, variants: updated });
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-varena-taupe/20 bg-white shadow-sm">
          <div className="flex items-center justify-between text-xs text-varena-taupe">
            <span>Total Produk</span>
            <Package className="w-4 h-4 text-varena-espresso" />
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-varena-espresso">
            {metrics.totalProducts}
          </div>
          <div className="mt-1 text-[11px] text-varena-taupe">Katalog Master Bisnis</div>
        </div>

        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 shadow-sm">
          <div className="flex items-center justify-between text-xs text-emerald-800">
            <span>Produk Tayang (Aktif)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-emerald-900">
            {metrics.activeProducts}
          </div>
          <div className="mt-1 text-[11px] text-emerald-700">Tersedia untuk Mitra</div>
        </div>

        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 shadow-sm">
          <div className="flex items-center justify-between text-xs text-amber-800">
            <span>Produk Draf</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-amber-900">
            {metrics.draftProducts}
          </div>
          <div className="mt-1 text-[11px] text-amber-700">Persiapan Rilis</div>
        </div>

        <div className="p-4 rounded-xl border border-varena-gold/30 bg-varena-ivory-light shadow-sm">
          <div className="flex items-center justify-between text-xs text-varena-espresso">
            <span>Total Varian SKU</span>
            <Layers className="w-4 h-4 text-varena-gold" />
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-varena-espresso">
            {metrics.totalVariants}
          </div>
          <div className="mt-1 text-[11px] text-varena-taupe">Pack & Satuan Eceran</div>
        </div>
      </div>

      {/* 2. Controls & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-varena-taupe/20 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs w-full sm:w-auto overflow-x-auto">
          {(['ALL', 'ACTIVE', 'DRAFT', 'ARCHIVED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md font-semibold transition whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-varena-espresso text-varena-ivory shadow-sm'
                  : 'text-slate-600 hover:text-varena-espresso'
              }`}
            >
              {st === 'ALL'
                ? 'Semua'
                : st === 'ACTIVE'
                ? 'Tayang Aktif'
                : st === 'DRAFT'
                ? 'Draf'
                : 'Diarsipkan'}
            </button>
          ))}
        </div>

        {/* Search & Add Action */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-64">
            <input
              type="text"
              placeholder="Cari nama, SKU, izin..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
            />
            <Search className="w-3.5 h-3.5 text-varena-taupe absolute left-2.5 top-2.5" />
          </form>

          <button
            onClick={openCreateModal}
            className="px-4 py-2 rounded-lg bg-varena-gold text-varena-espresso font-semibold text-xs hover:bg-varena-gold-hover transition flex items-center gap-1.5 shadow-sm whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Produk Baru</span>
          </button>
        </div>
      </div>

      {/* 3. Products List Grid */}
      {loading ? (
        <div className="text-center py-20 text-xs text-varena-taupe bg-white rounded-xl border border-varena-taupe/20">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-varena-gold mb-2" />
          Memuat data master produk...
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-xs text-varena-taupe bg-white rounded-xl border border-dashed border-varena-taupe/30">
          Tidak ada produk yang sesuai dengan filter atau kata kunci pencarian.
        </div>
      ) : (
        <div className="space-y-4">
          {products.map((p) => {
            const packVar = p.variants?.find((v: any) => v.variantType === 'PACK' || v.packSize > 1);
            const singleVar = p.variants?.find((v: any) => v.variantType === 'SINGLE' || v.packSize === 1);
            const isTayang = p.status === 'ACTIVE';

            return (
              <div
                key={p.id}
                className="bg-white rounded-xl border border-varena-taupe/20 p-5 shadow-sm hover:border-varena-gold/40 transition"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left: Thumbnail & Badges */}
                  <div className="lg:col-span-3 flex sm:flex-col gap-4 items-center sm:items-start">
                    <div className="relative w-28 h-28 sm:w-full sm:h-44 rounded-xl overflow-hidden border border-varena-gold/30 bg-stone-100 flex-shrink-0">
                      <Image
                        src={p.imageUrl || '/brand/kopi-matahari.jpeg'}
                        alt={p.name}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute top-2 left-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase shadow ${
                            isTayang
                              ? 'bg-emerald-600 text-white'
                              : p.status === 'DRAFT'
                              ? 'bg-amber-500 text-white'
                              : 'bg-stone-500 text-white'
                          }`}
                        >
                          {isTayang ? 'Tayang di Katalog' : p.status === 'DRAFT' ? 'Draf Internal' : 'Diarsipkan'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="inline-block px-2 py-0.5 rounded bg-varena-ivory text-varena-taupe-dark text-[10px] font-semibold border border-varena-taupe/30">
                        {formatProductCategory(p.category)}
                      </div>
                      <div className="text-[11px] text-varena-taupe flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-varena-gold" />
                        <span>{p.bpomNumber || 'Izin Belum Terdaftar'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Details & Varian Breakdown */}
                  <div className="lg:col-span-6 space-y-4">
                    <div>
                      <h3 className="font-serif text-xl font-bold text-varena-espresso">{p.name}</h3>
                      {p.tagline && (
                        <p className="text-xs text-varena-gold font-medium italic mt-0.5">"{p.tagline}"</p>
                      )}
                      <p className="text-xs text-varena-taupe-dark mt-2 line-clamp-2 leading-relaxed">
                        {p.description}
                      </p>
                    </div>

                    {/* Varian & Skema Table */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50">
                      <div className="px-3 py-2 bg-slate-100 text-[11px] font-semibold text-slate-700 flex justify-between">
                        <span>Konfigurasi Varian &amp; Skema Komisi</span>
                        <span>Stok &amp; Margin</span>
                      </div>

                      <div className="divide-y divide-slate-200 text-xs">
                        {/* Pack Variant */}
                        {packVar && (
                          <div className="p-3 flex flex-col sm:flex-row justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 font-semibold text-varena-espresso">
                                <span className="px-1.5 py-0.5 rounded text-[9px] bg-indigo-100 text-indigo-800 font-mono">
                                  PACK
                                </span>
                                <span>{packVar.name}</span>
                                <span className="text-[10px] text-varena-taupe font-mono">({packVar.sku})</span>
                              </div>
                              <div className="text-[11px] text-slate-600 mt-1">
                                Harga Jual: <span className="font-semibold text-varena-espresso">Rp{packVar.price.toLocaleString('id-ID')}</span> ·
                                HPP: <span className="text-slate-500">Rp{packVar.hpp.toLocaleString('id-ID')}</span> ·
                                Laba Kotor: <span className="text-emerald-700 font-semibold">Rp{(packVar.price - packVar.hpp).toLocaleString('id-ID')}</span>
                              </div>
                              <div className="text-[10px] text-varena-gold-hover mt-0.5">
                                Bonus Sponsor: Rp{packVar.sponsorReward.toLocaleString('id-ID')} · Upline: Rp{packVar.uplineRewardPerLevel.toLocaleString('id-ID')}/level (s/d L{packVar.maxCommissionLevels})
                              </div>
                            </div>
                            <div className="sm:text-right text-[11px] flex-shrink-0">
                              <span className="font-bold text-varena-espresso">{packVar.stockQuantity}</span> {packVar.unit}
                              <div className="text-[10px] text-emerald-700 font-medium">
                                {packVar.allowFirstPack ? '✓ Paket Perdana Sah' : '✗ Non-Perdana'}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Single Variant */}
                        {singleVar && (
                          <div className="p-3 flex flex-col sm:flex-row justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 font-semibold text-varena-espresso">
                                <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-100 text-emerald-800 font-mono">
                                  SATUAN
                                </span>
                                <span>{singleVar.name}</span>
                                <span className="text-[10px] text-varena-taupe font-mono">({singleVar.sku})</span>
                              </div>
                              <div className="text-[11px] text-slate-600 mt-1">
                                Harga Jual: <span className="font-semibold text-varena-espresso">Rp{singleVar.price.toLocaleString('id-ID')}</span> ·
                                HPP: <span className="text-slate-500">Rp{singleVar.hpp.toLocaleString('id-ID')}</span> ·
                                Laba Kotor: <span className="text-emerald-700 font-semibold">Rp{(singleVar.price - singleVar.hpp).toLocaleString('id-ID')}</span>
                              </div>
                              <div className="text-[10px] text-varena-gold-hover mt-0.5">
                                Skema Repeat Dev: Rp{singleVar.uplineRewardPerLevel.toLocaleString('id-ID')}/level
                              </div>
                            </div>
                            <div className="sm:text-right text-[11px] flex-shrink-0">
                              <span className="font-bold text-varena-espresso">{singleVar.stockQuantity}</span> {singleVar.unit}
                              <div className="text-[10px] text-blue-700 font-medium">
                                {singleVar.allowRepeatOrder ? '✓ Belanja Ulang Sah' : '✗ Non-RO'}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="lg:col-span-3 flex flex-row lg:flex-col gap-2 justify-end lg:justify-start">
                    <button
                      onClick={() => openEditModal(p)}
                      className="px-3 py-2 rounded-lg bg-varena-espresso text-varena-ivory text-xs font-semibold hover:bg-varena-espresso-dark transition flex items-center justify-center gap-1.5 flex-1 lg:flex-none shadow-sm"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Produk &amp; Harga</span>
                    </button>

                    <button
                      onClick={() => handleToggleStatus(p)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 flex-1 lg:flex-none border ${
                        isTayang
                          ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                          : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                      }`}
                    >
                      {isTayang ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{isTayang ? 'Jadikan Draf' : 'Luncurkan Sekarang'}</span>
                    </button>

                    {p.status !== 'ARCHIVED' && (
                      <button
                        onClick={() => handleArchive(p)}
                        className="px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition flex items-center justify-center gap-1.5 flex-1 lg:flex-none"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span>Arsipkan</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Luxury Modal Form: Tambah / Edit Produk */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl border border-varena-taupe/30 shadow-2xl w-full max-w-3xl overflow-hidden my-8 animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-varena-espresso text-varena-ivory flex items-center justify-between border-b border-[#4A3B30]">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-varena-gold" />
                <h3 className="font-serif text-lg font-bold text-varena-gold-light">
                  {form.id ? `Edit Produk: ${form.name}` : 'Tambah Produk Baru ke Katalog'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-varena-ivory/70 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Sub-Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-2 text-xs font-semibold overflow-x-auto">
              <button
                onClick={() => setActiveModalTab('GENERAL')}
                className={`py-3 px-3 border-b-2 transition whitespace-nowrap ${
                  activeModalTab === 'GENERAL'
                    ? 'border-varena-espresso text-varena-espresso bg-white font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                1. Identitas &amp; Legalitas
              </button>
              <button
                onClick={() => setActiveModalTab('PACK')}
                className={`py-3 px-3 border-b-2 transition whitespace-nowrap ${
                  activeModalTab === 'PACK'
                    ? 'border-varena-espresso text-varena-espresso bg-white font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                2. Varian Pack / Box
              </button>
              <button
                onClick={() => setActiveModalTab('SINGLE')}
                className={`py-3 px-3 border-b-2 transition whitespace-nowrap ${
                  activeModalTab === 'SINGLE'
                    ? 'border-varena-espresso text-varena-espresso bg-white font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                3. Varian Satuan Eceran
              </button>
              <button
                onClick={() => setActiveModalTab('COMMISSION')}
                className={`py-3 px-3 border-b-2 transition whitespace-nowrap ${
                  activeModalTab === 'COMMISSION'
                    ? 'border-varena-espresso text-varena-espresso bg-white font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                4. Skema Komisi &amp; Launching
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
              {/* TAB 1: IDENTITAS */}
              {activeModalTab === 'GENERAL' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-varena-espresso mb-1">
                        Nama Produk <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Contoh: Kopi Matahari, Teh Celup Herbal"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-varena-gold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-varena-espresso mb-1">
                        Kategori Produk
                      </label>
                      <select
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-varena-gold bg-white"
                      >
                        {CATEGORY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-varena-espresso mb-1">
                      Tagline / Slogan Kemasan
                    </label>
                    <input
                      type="text"
                      value={form.tagline}
                      onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                      placeholder="Contoh: Energi Pagi, Sehat Seharian"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-varena-gold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-varena-espresso mb-1">
                      Deskripsi Produk Lengkap <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Jelaskan kualitas bahan, proses fermentasi/pengolahan, dan keunggulan rasa..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-varena-gold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-varena-espresso mb-1">
                      Saran Penyajian / Aturan Pakai (Belakang Kemasan)
                    </label>
                    <textarea
                      rows={2}
                      value={form.servingSuggestion}
                      onChange={(e) => setForm({ ...form, servingSuggestion: e.target.value })}
                      placeholder="Contoh: Tuangkan 10gr kopi ke dalam 150cc air mendidih, aduk rata dan diamkan 5-7 menit..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-varena-gold"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-varena-espresso mb-1">
                        Izin Edar Resmi (P-IRT / BPOM)
                      </label>
                      <input
                        type="text"
                        value={form.bpomNumber}
                        onChange={(e) => setForm({ ...form, bpomNumber: e.target.value })}
                        placeholder="Contoh: P-IRT 2083404061840-31"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-varena-gold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-varena-espresso mb-1">
                        Sertifikat Halal Indonesia
                      </label>
                      <input
                        type="text"
                        value={form.halalNumber}
                        onChange={(e) => setForm({ ...form, halalNumber: e.target.value })}
                        placeholder="Contoh: ID00110000234560124"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-varena-gold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-varena-espresso mb-1">
                      URL / Jalur Gambar Kemasan
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={form.imageUrl}
                        onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                        placeholder="/brand/kopi-matahari.jpeg"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-varena-gold font-mono"
                      />
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-300 flex-shrink-0 relative">
                        <Image
                          src={form.imageUrl || '/brand/kopi-matahari.jpeg'}
                          alt="Preview"
                          fill
                          className="object-cover"
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Pastikan file gambar telah tersimpan di direktori public atau gunakan URL gambar valid.
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 2: VARIAN PACK (BOX) */}
              {activeModalTab === 'PACK' && (
                <div className="space-y-4">
                  {form.variants.filter((v) => v.variantType === 'PACK').map((v, idx) => {
                    const realIdx = form.variants.findIndex((item) => item === v);
                    const grossProfit = v.price - v.hpp;
                    const marginPercent = v.price > 0 ? ((grossProfit / v.price) * 100).toFixed(1) : 0;

                    return (
                      <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-varena-espresso">
                            Varian Pack / Box (Kemasan Utama Kemitraan)
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-800">
                            Isi {v.packSize} {v.unit}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nama Varian</label>
                            <input
                              type="text"
                              value={v.name}
                              onChange={(e) => updateVariantField(realIdx, 'name', e.target.value)}
                              placeholder="Kopi Matahari Box (10 Sachet)"
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">SKU Produk</label>
                            <input
                              type="text"
                              value={v.sku}
                              onChange={(e) => updateVariantField(realIdx, 'sku', e.target.value)}
                              placeholder="KM-BOX10"
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Harga Pokok (HPP)
                            </label>
                            <input
                              type="number"
                              value={v.hpp}
                              onChange={(e) => updateVariantField(realIdx, 'hpp', Number(e.target.value))}
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Harga Jual Mitra (Rp)
                            </label>
                            <input
                              type="number"
                              value={v.price}
                              onChange={(e) => updateVariantField(realIdx, 'price', Number(e.target.value))}
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Stok Awal Fisik
                            </label>
                            <input
                              type="number"
                              value={v.stockQuantity}
                              onChange={(e) => updateVariantField(realIdx, 'stockQuantity', Number(e.target.value))}
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-mono"
                            />
                          </div>
                        </div>

                        {/* Calculated Margin Info */}
                        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex justify-between items-center">
                          <span>Laba Kotor Korporasi per Box:</span>
                          <span className="font-bold">
                            Rp{grossProfit.toLocaleString('id-ID')} ({marginPercent}%)
                          </span>
                        </div>

                        <div className="pt-2 flex items-center gap-4 text-xs">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={v.allowFirstPack}
                              onChange={(e) => updateVariantField(realIdx, 'allowFirstPack', e.target.checked)}
                              className="rounded text-varena-espresso focus:ring-0"
                            />
                            <span>Bisa untuk Pendaftaran Paket Perdana Mitra</span>
                          </label>

                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={v.allowRepeatOrder}
                              onChange={(e) => updateVariantField(realIdx, 'allowRepeatOrder', e.target.checked)}
                              className="rounded text-varena-espresso focus:ring-0"
                            />
                            <span>Bisa untuk Belanja Ulang (Repeat Purchase)</span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 3: VARIAN SATUAN (SINGLE / SACHET) */}
              {activeModalTab === 'SINGLE' && (
                <div className="space-y-4">
                  {form.variants.filter((v) => v.variantType === 'SINGLE').map((v, idx) => {
                    const realIdx = form.variants.findIndex((item) => item === v);
                    const grossProfit = v.price - v.hpp;

                    return (
                      <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-varena-espresso">
                            Varian Eceran / Satuan Sachet
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                            Satuan 1 {v.unit}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nama Varian</label>
                            <input
                              type="text"
                              value={v.name}
                              onChange={(e) => updateVariantField(realIdx, 'name', e.target.value)}
                              placeholder="Kopi Matahari Sachet Satuan"
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">SKU Produk</label>
                            <input
                              type="text"
                              value={v.sku}
                              onChange={(e) => updateVariantField(realIdx, 'sku', e.target.value)}
                              placeholder="KM-SCH01"
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Harga Pokok (HPP)
                            </label>
                            <input
                              type="number"
                              value={v.hpp}
                              onChange={(e) => updateVariantField(realIdx, 'hpp', Number(e.target.value))}
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Harga Jual Eceran (Rp)
                            </label>
                            <input
                              type="number"
                              value={v.price}
                              onChange={(e) => updateVariantField(realIdx, 'price', Number(e.target.value))}
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Stok Awal Satuan
                            </label>
                            <input
                              type="number"
                              value={v.stockQuantity}
                              onChange={(e) => updateVariantField(realIdx, 'stockQuantity', Number(e.target.value))}
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-mono"
                            />
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex justify-between items-center">
                          <span>Laba Kotor per Sachet:</span>
                          <span className="font-bold">Rp{grossProfit.toLocaleString('id-ID')}</span>
                        </div>

                        <div className="pt-2 flex items-center gap-4 text-xs">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={v.allowRepeatOrder}
                              onChange={(e) => updateVariantField(realIdx, 'allowRepeatOrder', e.target.checked)}
                              className="rounded text-varena-espresso focus:ring-0"
                            />
                            <span>Bisa untuk Belanja Ulang Konsumen &amp; Mitra</span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 4: SKEMA KOMISI & STATUS */}
              {activeModalTab === 'COMMISSION' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-varena-gold/40 bg-amber-50/50 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-varena-espresso">
                      <Sparkles className="w-4 h-4 text-varena-gold" />
                      <span>Alokasi Bagi Hasil Komisi Jaringan Mitra</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Sistem menghitung komisi secara dinamis sesuai margin produk ini. Tetap patuh pada Permendag 70/2019 dengan batas kedalaman maksimal 10 level.
                    </p>

                    {form.variants.map((v, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-white border border-slate-200 space-y-2">
                        <div className="font-semibold text-xs text-varena-espresso">
                          Skema untuk Varian: <span className="text-varena-gold-hover font-mono">{v.name}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-700 mb-1">
                              Bonus Sponsor Langsung (Rp)
                            </label>
                            <input
                              type="number"
                              value={v.sponsorReward}
                              onChange={(e) => updateVariantField(idx, 'sponsorReward', Number(e.target.value))}
                              className="w-full px-2.5 py-1 text-xs rounded border border-slate-300 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-slate-700 mb-1">
                              Bonus Upline per Level (Rp)
                            </label>
                            <input
                              type="number"
                              value={v.uplineRewardPerLevel}
                              onChange={(e) => updateVariantField(idx, 'uplineRewardPerLevel', Number(e.target.value))}
                              className="w-full px-2.5 py-1 text-xs rounded border border-slate-300 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-slate-700 mb-1">
                              Kedalaman Level (Maks 10)
                            </label>
                            <input
                              type="number"
                              max={10}
                              min={1}
                              value={v.maxCommissionLevels}
                              onChange={(e) => updateVariantField(idx, 'maxCommissionLevels', Number(e.target.value))}
                              className="w-full px-2.5 py-1 text-xs rounded border border-slate-300 font-mono"
                            />
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-500">
                          Total komisi maksimal yang dicadangkan jika 10 level penuh:{' '}
                          <span className="font-semibold text-varena-espresso">
                            Rp{(v.sponsorReward + v.uplineRewardPerLevel * v.maxCommissionLevels).toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Status Peluncuran */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                    <label className="block text-xs font-semibold text-varena-espresso">
                      Status Peluncuran Produk ke Publik
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, status: 'ACTIVE' })}
                        className={`p-3 rounded-lg border text-left transition ${
                          form.status === 'ACTIVE'
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <div className="text-xs">Tayang di Katalog (Aktif)</div>
                        <div className="text-[10px] font-normal text-slate-500 mt-0.5">
                          Mitra dan konsumen dapat langsung membeli produk ini.
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setForm({ ...form, status: 'DRAFT' })}
                        className={`p-3 rounded-lg border text-left transition ${
                          form.status === 'DRAFT'
                            ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <div className="text-xs">Simpan Sebagai Draf Internal</div>
                        <div className="text-[10px] font-normal text-slate-500 mt-0.5">
                          Hanya tampil di panel admin untuk persiapan rilis.
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition"
              >
                Batal
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveProduct}
                  className="px-6 py-2 rounded-lg bg-varena-espresso text-varena-ivory text-xs font-semibold hover:bg-varena-espresso-dark transition flex items-center gap-2 shadow"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Menyimpan...' : form.id ? 'Perbarui Produk' : 'Simpan & Rilis Produk'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
