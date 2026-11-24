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
  Users,
  AlertTriangle,
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
  const [isBulkApplying, setIsBulkApplying] = useState(false);
  const [isUpdatingMaintenance, setIsUpdatingMaintenance] = useState(false);

  // Settings state
  const [settings, setSettings] = useState<Record<string, string>>({
    PRIMARY_BANK_NAME: 'BRI',
    PRIMARY_BANK_ACCOUNT: '3065 0102 4471 539',
    PRIMARY_BANK_HOLDER: 'Sunariyo',
    MIN_PAYOUT_AMOUNT: '50000',
    PAYOUT_ADMIN_FEE_PERCENT: '10',
    PAYOUT_BANK_FEE_FLAT: '6500',
    DEFAULT_AGENT_MOQ: '10',
    DEFAULT_AGENT_DISCOUNT: '15.0',
    FREE_SHIPPING_SUBSIDY_AGENT: 'true',
    DEFAULT_SHIPPING_FEE: '20000',
    CENTRAL_DISPATCH_FEE: '15000',
    AGENT_SHIPPING_EXPENSE: '35000',
  });

  const [agentConfig, setAgentConfig] = useState({
    minimumRestockBox: 10,
    defaultDiscountType: 'PERCENTAGE',
    defaultDiscountValue: 15.0,
  });

  const [maintenanceConfig, setMaintenanceConfig] = useState({
    freezeWithdrawals: false,
    freezePurchases: false,
    freezeDeposits: false,
    message: 'Sistem sedang dalam audit & pemeliharaan berkala.',
  });

  const loadSettings = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/v1/admin/settings', { headers: authHeaders }).then((res) => res.json()),
      fetch('/api/v1/admin/maintenance', { headers: authHeaders }).then((res) => res.json()).catch(() => null),
    ])
      .then(([data, maintData]) => {
        if (data && data.settings) {
          setSettings((prev) => ({ ...prev, ...data.settings }));
        }
        if (maintData && maintData.config) {
          setMaintenanceConfig({
            freezeWithdrawals: Boolean(maintData.config.freezeWithdrawals),
            freezePurchases: Boolean(maintData.config.freezePurchases),
            freezeDeposits: Boolean(maintData.config.freezeDeposits),
            message: maintData.config.message || 'Sistem sedang dalam audit & pemeliharaan berkala.',
          });
        } else if (data && data.settings && data.settings.GLOBAL_MAINTENANCE_FREEZE) {
          try {
            const parsed = JSON.parse(data.settings.GLOBAL_MAINTENANCE_FREEZE);
            setMaintenanceConfig((prev) => ({ ...prev, ...parsed }));
          } catch {}
        }
        if (data && data.agentConfig) {
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
                GLOBAL_MAINTENANCE_FREEZE: JSON.stringify(maintenanceConfig),
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

  const handleApplyToAllAgents = () => {
    const formattedVal =
      agentConfig.defaultDiscountType === 'PERCENTAGE'
        ? `${agentConfig.defaultDiscountValue}%`
        : `Rp${Number(agentConfig.defaultDiscountValue).toLocaleString('id-ID')}/box`;

    showConfirm({
      title: 'Terapkan Diskon ke Semua Agen Aktif',
      message: `Apakah Anda yakin ingin menerapkan kebijakan diskon ${formattedVal} ke SELURUH mitra agen aktif yang sudah terdaftar? Pengaturan diskon individual mereka akan diselaraskan dengan kebijakan baru ini.`,
      confirmText: 'Ya, Terapkan ke Semua Agen',
      variant: 'amber',
      icon: 'shield',
      onConfirm: async () => {
        setIsBulkApplying(true);
        try {
          const res = await fetch('/api/v1/admin/agents/bulk-discount', {
            method: 'POST',
            headers: {
              ...authHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              discountType: agentConfig.defaultDiscountType,
              discountValue: agentConfig.defaultDiscountValue,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);

          showToast(data.message || `Berhasil menerapkan diskon ${formattedVal} ke semua agen aktif!`, 'success');
        } catch (err: any) {
          showToast(err.message || 'Gagal menerapkan diskon massal ke agen', 'error');
        } finally {
          setIsBulkApplying(false);
        }
      },
    });
  };

  const handleApplyMaintenance = () => {
    const isAnyLocked =
      maintenanceConfig.freezeWithdrawals ||
      maintenanceConfig.freezePurchases ||
      maintenanceConfig.freezeDeposits;

    const lockedList = [
      maintenanceConfig.freezePurchases ? 'Belanja / Checkout' : null,
      maintenanceConfig.freezeWithdrawals ? 'Penarikan Dana (WD)' : null,
      maintenanceConfig.freezeDeposits ? 'Topup Saldo Deposit' : null,
    ].filter(Boolean);

    const lockedActionsStr = lockedList.length > 0 ? lockedList.join(', ') : 'Tidak ada fitur yang dikunci';

    showConfirm({
      title: isAnyLocked ? 'Konfirmasi Kunci Darurat & Pemeliharaan Sistem' : 'Simpan Konfigurasi Pemeliharaan',
      message: isAnyLocked
        ? `PERINGATAN KRUSIAL: Menerapkan Kunci Darurat akan langsung MEMBLOKIR transaksi [${lockedActionsStr}] untuk SELURUH mitra secara real-time. Banner pemeliharaan akan langsung tampil di seluruh portal mitra. Lanjutkan penerapan ini?`
        : 'Apakah Anda yakin ingin menyimpan konfigurasi pemeliharaan? Saat ini seluruh kunci dalam posisi terbuka (normal).',
      confirmText: isAnyLocked ? 'Ya, Terapkan Kunci Darurat Sekarang' : 'Ya, Terapkan',
      variant: isAnyLocked ? 'rose' : 'emerald',
      icon: 'warning',
      onConfirm: async () => {
        setIsUpdatingMaintenance(true);
        try {
          const res = await fetch('/api/v1/admin/maintenance', {
            method: 'POST',
            headers: {
              ...authHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              freezeWithdrawals: maintenanceConfig.freezeWithdrawals,
              freezePurchases: maintenanceConfig.freezePurchases,
              freezeDeposits: maintenanceConfig.freezeDeposits,
              isActive: isAnyLocked,
              message: maintenanceConfig.message,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);

          showToast(data.message || 'Kunci Darurat berhasil diterapkan!', 'success');
          if (data.config) {
            setMaintenanceConfig({
              freezeWithdrawals: Boolean(data.config.freezeWithdrawals),
              freezePurchases: Boolean(data.config.freezePurchases),
              freezeDeposits: Boolean(data.config.freezeDeposits),
              message: data.config.message,
            });
          }
        } catch (err: any) {
          showToast(err.message || 'Gagal menerapkan kunci darurat', 'error');
        } finally {
          setIsUpdatingMaintenance(false);
        }
      },
    });
  };

  const handleDisableAllFreeze = () => {
    showConfirm({
      title: 'Pulihkan Sistem ke Operasional Normal',
      message:
        'Apakah Anda yakin ingin membuka SEMUA kunci darurat? Seluruh mitra akan dapat kembali melakukan transaksi belanja checkout, penarikan dana (WD), dan pengisian deposit seperti biasa.',
      confirmText: 'Ya, Buka Semua Kunci (Normalkan)',
      variant: 'emerald',
      icon: 'shield',
      onConfirm: async () => {
        setIsUpdatingMaintenance(true);
        try {
          const res = await fetch('/api/v1/admin/maintenance', {
            method: 'POST',
            headers: {
              ...authHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              freezeWithdrawals: false,
              freezePurchases: false,
              freezeDeposits: false,
              isActive: false,
              message: maintenanceConfig.message,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);

          showToast(data.message || 'Seluruh kunci telah dibuka. Sistem kembali normal.', 'success');
          if (data.config) {
            setMaintenanceConfig({
              freezeWithdrawals: false,
              freezePurchases: false,
              freezeDeposits: false,
              message: data.config.message,
            });
          }
        } catch (err: any) {
          showToast(err.message || 'Gagal membuka kunci darurat', 'error');
        } finally {
          setIsUpdatingMaintenance(false);
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

            <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-[11px] text-amber-900">
                <span className="font-semibold block sm:inline">Perbarui Kebijakan Seluruh Agen:</span> Ubah diskon semua agen yang ada saat ini sesuai nilai di atas.
              </div>
              <button
                type="button"
                disabled={isBulkApplying}
                onClick={handleApplyToAllAgents}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold flex items-center gap-1.5 transition self-start sm:self-auto shrink-0 shadow-xs disabled:opacity-50"
              >
                <Users className="w-3.5 h-3.5" />
                <span>{isBulkApplying ? 'Menerapkan...' : 'Terapkan ke Semua Agen Aktif'}</span>
              </button>
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

        {/* Card: Pengiriman & Logistik (Ongkir) */}
        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Truck className="w-4 h-4 text-varena-espresso" />
            <h4 className="font-serif font-bold text-sm text-varena-espresso">
              Pengiriman &amp; Logistik (Ongkos Kirim)
            </h4>
          </div>
          <p className="text-xs text-slate-500">
            Atur parameter biaya ongkir flat untuk pesanan reguler, dropship pusat, dan estimasi subsidi pasokan.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Ongkir Reguler / Pelanggan (Rp)
              </label>
              <input
                type="number"
                step="1000"
                value={settings.DEFAULT_SHIPPING_FEE || '20000'}
                onChange={(e) => setSettings({ ...settings, DEFAULT_SHIPPING_FEE: e.target.value })}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-varena-gold font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Ditagihkan ke pembeli reguler / mitra baru saat checkout.
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Ongkir Dropship Pusat Agen (Rp)
              </label>
              <input
                type="number"
                step="1000"
                value={settings.CENTRAL_DISPATCH_FEE || '15000'}
                onChange={(e) => setSettings({ ...settings, CENTRAL_DISPATCH_FEE: e.target.value })}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-varena-gold font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Dipotong dari deposit agen saat order dropship dari pusat.
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Beban Subsidi Pasokan Agen (Rp)
              </label>
              <input
                type="number"
                step="1000"
                value={settings.AGENT_SHIPPING_EXPENSE || '35000'}
                onChange={(e) => setSettings({ ...settings, AGENT_SHIPPING_EXPENSE: e.target.value })}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-varena-gold font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Estimasi beban biaya operasional kantor jika subsidi aktif.
              </span>
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
            Aturan batas minimum penarikan saldo dan rincian komponen biaya pencairan (biaya admin % dan biaya transfer bank).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                Batas minimum nominal saldo yang dapat ditarik mitra.
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Biaya Layanan Admin (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={settings.PAYOUT_ADMIN_FEE_PERCENT || '10'}
                  onChange={(e) => setSettings({ ...settings, PAYOUT_ADMIN_FEE_PERCENT: e.target.value })}
                  className="w-full pl-3 pr-8 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-varena-gold font-mono"
                />
                <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2" />
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Persentase biaya admin platform (misal 10%).
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Biaya Bank / Transfer Flat (Rp)
              </label>
              <input
                type="number"
                step="500"
                value={settings.PAYOUT_BANK_FEE_FLAT || '6500'}
                onChange={(e) => setSettings({ ...settings, PAYOUT_BANK_FEE_FLAT: e.target.value })}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-varena-gold font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Biaya transfer jaringan perbankan flat (misal Rp6.500).
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

        {/* Card 5: Kunci Darurat & Pemeliharaan Sistem (Global Freeze Mode) */}
        <div className="p-5 rounded-xl border border-rose-200 bg-rose-50/30 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-rose-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <div>
                <h4 className="font-serif font-bold text-sm text-rose-950">
                  Kunci Darurat &amp; Pemeliharaan Sistem (Global Freeze Mode)
                </h4>
                <p className="text-[11px] text-rose-700">
                  Digunakan oleh kantor pusat saat audit keuangan, pemeliharaan database, atau investigasi darurat.
                </p>
              </div>
            </div>
            {(maintenanceConfig.freezeWithdrawals || maintenanceConfig.freezePurchases || maintenanceConfig.freezeDeposits) && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-600 text-white animate-pulse">
                FREEZE AKTIF
              </span>
            )}
          </div>

          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="flex items-start gap-2.5 p-3 rounded-lg border border-rose-200/80 bg-white cursor-pointer hover:bg-rose-50/50 transition">
                <input
                  type="checkbox"
                  checked={maintenanceConfig.freezeWithdrawals}
                  onChange={(e) =>
                    setMaintenanceConfig((prev) => ({
                      ...prev,
                      freezeWithdrawals: e.target.checked,
                    }))
                  }
                  className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Kunci Penarikan Dana (WD)</span>
                  <span className="text-[10px] text-slate-500 leading-tight block">
                    Mitra dicegah mengajukan pencairan saldo komisi.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-lg border border-rose-200/80 bg-white cursor-pointer hover:bg-rose-50/50 transition">
                <input
                  type="checkbox"
                  checked={maintenanceConfig.freezePurchases}
                  onChange={(e) =>
                    setMaintenanceConfig((prev) => ({
                      ...prev,
                      freezePurchases: e.target.checked,
                    }))
                  }
                  className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Kunci Belanja / Checkout</span>
                  <span className="text-[10px] text-slate-500 leading-tight block">
                    Mitra dicegah membuat pesanan belanja produk baru.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-lg border border-rose-200/80 bg-white cursor-pointer hover:bg-rose-50/50 transition">
                <input
                  type="checkbox"
                  checked={maintenanceConfig.freezeDeposits}
                  onChange={(e) =>
                    setMaintenanceConfig((prev) => ({
                      ...prev,
                      freezeDeposits: e.target.checked,
                    }))
                  }
                  className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Kunci Topup Saldo</span>
                  <span className="text-[10px] text-slate-500 leading-tight block">
                    Mitra dan agen dicegah mengisi deposit saldo dompet.
                  </span>
                </div>
              </label>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Pesan Pemeliharaan untuk Pengguna (Ditampilkan pada Banner Mitra)
              </label>
              <input
                type="text"
                value={maintenanceConfig.message}
                onChange={(e) =>
                  setMaintenanceConfig((prev) => ({
                    ...prev,
                    message: e.target.value,
                  }))
                }
                placeholder="Contoh: Sistem sedang dalam audit & pemeliharaan berkala..."
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-rose-500 font-sans"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Jika salah satu kunci di atas aktif, banner peringatan ini otomatis muncul di bagian atas seluruh halaman mitra.
              </span>
            </div>

            <div className="pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-rose-200/80">
              <div className="text-[11px] text-rose-800">
                <span className="font-bold">Status Eksekusi:</span> Centang di atas memerlukan konfirmasi penerapan agar aktif di database &amp; server.
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {(maintenanceConfig.freezeWithdrawals || maintenanceConfig.freezePurchases || maintenanceConfig.freezeDeposits) && (
                  <button
                    type="button"
                    disabled={isUpdatingMaintenance}
                    onClick={handleDisableAllFreeze}
                    className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Buka Semua Kunci (Normalkan)</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={isUpdatingMaintenance}
                  onClick={handleApplyMaintenance}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>{isUpdatingMaintenance ? 'Menerapkan...' : 'Terapkan Kunci Darurat'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
