'use client';

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Building2,
  CreditCard,
  Truck,
  Store,
  ShieldCheck,
  Save,
  RefreshCw,
  Info,
  DollarSign,
  Percent,
} from 'lucide-react';

interface SystemSettingsTabProps {
  authHeaders: Record<string, string>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  showConfirm: (config: any) => void;
}

export default function SystemSettingsTab({
  authHeaders,
  showToast,
  showConfirm,
}: SystemSettingsTabProps) {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Settings state
  const [settings, setSettings] = useState<Record<string, string>>({
    PRIMARY_BANK_NAME: 'BRI',
    PRIMARY_BANK_ACCOUNT: '3065 0102 4471 539',
    PRIMARY_BANK_HOLDER: 'Sunariyo',
    MIN_PAYOUT_AMOUNT: '50000',
    DEFAULT_AGENT_MOQ: '10',
    DEFAULT_AGENT_DISCOUNT: '15.0',
    FREE_SHIPPING_SUBSIDY_AGENT: 'true',
  });

  const [agentConfig, setAgentConfig] = useState({
    minimumRestockBox: 10,
    defaultDiscountType: 'PERCENTAGE',
    defaultDiscountValue: 15.0,
  });

  const loadSettings = () => {
    setLoading(true);
    fetch('/api/v1/admin/settings', { headers: authHeaders })
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          setSettings((prev) => ({ ...prev, ...data.settings }));
        }
        if (data.agentConfig) {
          setAgentConfig({
            minimumRestockBox: data.agentConfig.minimumRestockBox,
            defaultDiscountType: data.agentConfig.defaultDiscountType,
            defaultDiscountValue: data.agentConfig.defaultDiscountValue,
          });
        }
      })
      .catch((err) => {
        console.error('Error loading settings:', err);
        showToast('Gagal memuat pengaturan sistem', 'error');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = () => {
    showConfirm({
      title: 'Simpan Pengaturan Sistem',
      message: 'Perubahan parameter bisnis (rekening bank, MOQ agen, minimum penarikan) akan langsung berlaku pada transaksi baru seluruh mitra. Lanjutkan?',
      confirmText: 'Ya, Terapkan Pengaturan',
      variant: 'emerald',
      icon: 'shield',
      onConfirm: async () => {
        setIsSaving(true);
        try {
          const res = await fetch('/api/v1/admin/settings', {
            method: 'PUT',
            headers: {
              ...authHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              settings: {
                ...settings,
                DEFAULT_AGENT_MOQ: String(agentConfig.minimumRestockBox),
                DEFAULT_AGENT_DISCOUNT: String(agentConfig.defaultDiscountValue),
              },
              agentConfig,
            }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error);

          showToast('Pengaturan sistem berhasil disimpan dan aktif!', 'success');
          loadSettings();
        } catch (err: any) {
          showToast(err.message || 'Gagal menyimpan pengaturan', 'error');
        } finally {
          setIsSaving(false);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="text-center py-20 text-xs text-varena-taupe bg-white rounded-xl border border-varena-taupe/20">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-varena-gold mb-2" />
        Memuat konfigurasi master sistem...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="p-4 rounded-xl border border-varena-gold/30 bg-varena-ivory-light flex items-center justify-between">
        <div>
          <h3 className="font-serif text-lg font-bold text-varena-espresso flex items-center gap-2">
            <Sliders className="w-5 h-5 text-varena-gold" />
            <span>Master Pengaturan &amp; Kebijakan Sistem</span>
          </h3>
          <p className="text-xs text-varena-taupe mt-1">
            Konfigurasi operasional global: rekening penerima, batas penarikan mitra, dan ambang batas keagenan.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2.5 rounded-lg bg-varena-espresso text-varena-ivory text-xs font-semibold hover:bg-varena-espresso-dark transition flex items-center gap-2 shadow"
        >
          <Save className="w-4 h-4 text-varena-gold" />
          <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Rekening Bank Utama Perusahaan */}
        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building2 className="w-4 h-4 text-varena-espresso" />
            <h4 className="font-serif font-bold text-sm text-varena-espresso">
              Rekening Bank Operasional Korporasi
            </h4>
          </div>
          <p className="text-xs text-slate-500">
            Tujuan transfer resmi yang ditampilkan kepada mitra dan konsumen saat checkout.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nama Bank</label>
              <input
                type="text"
                value={settings.PRIMARY_BANK_NAME || ''}
                onChange={(e) => setSettings({ ...settings, PRIMARY_BANK_NAME: e.target.value })}
                placeholder="BCA, Mandiri, BRI"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-varena-gold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nomor Rekening</label>
              <input
                type="text"
                value={settings.PRIMARY_BANK_ACCOUNT || ''}
                onChange={(e) => setSettings({ ...settings, PRIMARY_BANK_ACCOUNT: e.target.value })}
                placeholder="8830192831"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-varena-gold font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Atas Nama Rekening</label>
              <input
                type="text"
                value={settings.PRIMARY_BANK_HOLDER || ''}
                onChange={(e) => setSettings({ ...settings, PRIMARY_BANK_HOLDER: e.target.value })}
                placeholder="PT VARENA BINA NUSANTARA"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-varena-gold"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Pengaturan Keagenan Resmi */}
        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Store className="w-4 h-4 text-varena-espresso" />
            <h4 className="font-serif font-bold text-sm text-varena-espresso">
              Kebijakan Pasokan Grosir Agen
            </h4>
          </div>
          <p className="text-xs text-slate-500">
            Parameter ambang batas pesanan minimum (MOQ) dan margin diskon pasokan keagenan.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Minimal Pembelian Pasokan Agen (MOQ Box)
              </label>
              <input
                type="number"
                min={1}
                value={agentConfig.minimumRestockBox}
                onChange={(e) =>
                  setAgentConfig({ ...agentConfig, minimumRestockBox: Number(e.target.value) })
                }
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-varena-gold font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Agen wajib memesan minimal kuota ini saat restock pasokan kantor pusat.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Tipe Diskon Pasokan Default
                </label>
                <select
                  value={agentConfig.defaultDiscountType}
                  onChange={(e) =>
                    setAgentConfig({ ...agentConfig, defaultDiscountType: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-varena-gold bg-white"
                >
                  <option value="PERCENTAGE">Persentase (%)</option>
                  <option value="NOMINAL">Nominal Potongan per Box (Rp)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Nilai Diskon Default{agentConfig.defaultDiscountType === 'PERCENTAGE' ? ' (%)' : ' (Rp/box)'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step={agentConfig.defaultDiscountType === 'PERCENTAGE' ? '0.5' : '1000'}
                    min="0"
                    max={agentConfig.defaultDiscountType === 'PERCENTAGE' ? 50 : undefined}
                    value={agentConfig.defaultDiscountValue}
                    onChange={(e) =>
                      setAgentConfig({ ...agentConfig, defaultDiscountValue: Number(e.target.value) })
                    }
                    className="w-full pl-3 pr-8 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-varena-gold font-mono"
                  />
                  {agentConfig.defaultDiscountType === 'PERCENTAGE' ? (
                    <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                  ) : (
                    <span className="text-[10px] text-slate-400 absolute right-2 top-2.5 font-semibold">Rp</span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-medium">
                <input
                  type="checkbox"
                  checked={settings.FREE_SHIPPING_SUBSIDY_AGENT === 'true'}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      FREE_SHIPPING_SUBSIDY_AGENT: e.target.checked ? 'true' : 'false',
                    })
                  }
                  className="rounded text-varena-espresso focus:ring-0"
                />
                <span>Ongkir Pasokan Kantor ke Agen Ditanggung Penuh oleh Kantor</span>
              </label>
            </div>
          </div>
        </div>

        {/* Card 3: Batas Finansial & Penarikan Saldo */}
        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <CreditCard className="w-4 h-4 text-varena-espresso" />
            <h4 className="font-serif font-bold text-sm text-varena-espresso">
              Finansial &amp; Pencairan Saldo Mitra
            </h4>
          </div>
          <p className="text-xs text-slate-500">
            Aturan batas minimum penarikan saldo komisi dompet mitra ke rekening bank.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Minimum Penarikan Saldo (Rp)
              </label>
              <input
                type="number"
                step="5000"
                value={settings.MIN_PAYOUT_AMOUNT || '50000'}
                onChange={(e) => setSettings({ ...settings, MIN_PAYOUT_AMOUNT: e.target.value })}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-varena-gold font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Mitra hanya dapat mengajukan payout jika saldo minimal telah mencapai nilai ini.
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Kepatuhan Regulasi & Batas Komisi */}
        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <h4 className="font-serif font-bold text-sm text-varena-espresso">
              Kepatuhan Regulasi Direct Selling (Permendag 70/2019)
            </h4>
          </div>
          <p className="text-xs text-slate-500">
            Sistem pengaman otomatis untuk mencegah skema piramida dan melindungi legalitas perusahaan.
          </p>

          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1.5">
            <div className="font-bold">✓ Enforced Double-Entry Balance Active</div>
            <div className="text-[11px] text-emerald-800">
              Setiap pencairan dan alokasi bonus diaudit oleh jurnal buku besar otomatis (Total Debit = Total Kredit).
            </div>
            <div className="font-bold pt-1">✓ Batas Kedalaman Level Maksimal: 10 Level</div>
            <div className="text-[11px] text-emerald-800">
              Mencegah overpaying komisi sistemik dan menjaga kesehatan keuangan jangka panjang korporasi.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
