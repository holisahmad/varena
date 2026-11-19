'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  Truck,
  Percent,
  MapPin,
  Award,
  ArrowRight,
  CheckCircle2,
  Clock,
  Store,
  Phone,
  Building,
  HelpCircle,
  Package,
} from 'lucide-react';

export default function AgentRegisterPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [existingStatus, setExistingStatus] = useState<string | null>(null);
  const [agentCity, setAgentCity] = useState('');

  // Form states
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [warehouseAddress, setWarehouseAddress] = useState('');
  const [storageCapacity, setStorageCapacity] = useState('50');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('varena_user');
    if (!stored) {
      router.push('/login?redirect=/member/agent-register');
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      setUser(parsed);
      setContactPhone(parsed.phone || '');

      // Check current agent status
      fetchAgentStatus(parsed.memberCode);
    } catch (e) {
      router.push('/login');
    }
  }, [router]);

  const fetchAgentStatus = async (memberCode: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/agent/profile?memberCode=${memberCode}`);
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.isAgent) {
          setExistingStatus('ACTIVE');
          setAgentCity(data.city);
        } else if (data.status === 'APPLIED') {
          setExistingStatus('PENDING');
          setAgentCity(data.city);
        }
      }
    } catch (e) {
      console.error('Failed to check agent profile:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) {
      setErrorMessage('Anda wajib menyetujui komitmen pelayanan distribusi keagenan.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/v1/agent/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberCode: user?.memberCode,
          city,
          province,
          warehouseAddress,
          storageCapacity: parseInt(storageCapacity, 10) || 50,
          contactPhone,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengirimkan pendaftaran keagenan.');
      }

      setSuccessMessage(data.message || 'Pendaftaran keagenan berhasil diajukan!');
      setExistingStatus('PENDING');
      setAgentCity(city);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-varena-ivory-light flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-varena-gold border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-varena-taupe font-medium">Memverifikasi profil kemitraan Anda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-varena-ivory-light py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Breadcrumb / Back Link */}
        <div className="flex items-center justify-between">
          <Link
            href="/member"
            className="text-xs font-semibold text-varena-taupe hover:text-varena-espresso flex items-center gap-1.5 transition"
          >
            &larr; Kembali ke Dashboard Mitra
          </Link>
          <span className="text-[11px] font-mono tracking-wider text-varena-gold bg-varena-espresso px-3 py-1 rounded-full uppercase">
            Direct Selling Official Agent
          </span>
        </div>

        {/* Hero Banner Header */}
        <div className="bg-gradient-to-r from-varena-espresso via-[#3D2E24] to-varena-espresso rounded-3xl p-8 sm:p-10 text-varena-ivory-light shadow-xl border border-varena-gold/30 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-96 h-96 bg-varena-gold/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-2xl relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-varena-gold/20 text-varena-gold-light border border-varena-gold/40 text-xs font-medium">
              <Store className="w-3.5 h-3.5" />
              <span>Program Keagenan Resmi VARENA</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-wide leading-tight">
              Pusat Distribusi Regional &amp; Keagenan Resmi
            </h1>
            <p className="text-sm text-varena-ivory/80 leading-relaxed">
              Jadilah representasi logistik resmi VARENA di kota Anda. Dapatkan fasilitas pasokan grosir langsung dari
              kantor pusat dengan <strong>100% Bebas Biaya Ongkir</strong>, diskon khusus agen, pengalihan pesanan
              konsumen regional, dan reward prestasi berkala.
            </p>
          </div>
        </div>

        {/* Status Alert if Already Active */}
        {existingStatus === 'ACTIVE' && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-lg font-bold text-amber-900">
                  Akun Anda Telah Resmi Menjadi Agen VARENA!
                </h3>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Selamat, akun kemitraan Anda telah diverifikasi oleh manajemen kantor pusat sebagai Agen Resmi Wilayah{' '}
                  <span className="font-bold underline">{agentCity || 'Regional'}</span>. Anda memiliki akses penuh ke
                  Portal Agen untuk melakukan restock grosir bebas ongkir, menyalurkan distribusi, dan memantau buku kas deposit.
                </p>
              </div>
            </div>
            <div className="pt-2 flex flex-wrap gap-3">
              <Link
                href="/agent"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-varena-espresso text-varena-gold font-bold text-sm hover:bg-varena-espresso-dark transition shadow-md"
              >
                <span>Buka Portal Eksekutif Agen</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Status Alert if Pending Review */}
        {existingStatus === 'PENDING' && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 shadow-sm space-y-3">
            <div className="flex items-start gap-3">
              <Clock className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-serif text-base font-bold text-blue-900">
                  Pengajuan Keagenan Anda Sedang Ditinjau oleh Kantor Pusat
                </h3>
                <p className="text-xs text-blue-800 leading-relaxed">
                  Pengajuan Anda untuk wilayah <strong>{agentCity || 'terpilih'}</strong> telah diterima oleh sistem operasional kami. Tim verifikasi logistik VARENA akan meninjau kelayakan titik gudang Anda dan menghubungi Anda melalui WhatsApp/telepon dalam 1-2 hari kerja.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 4 Core Value Benefits for Agents */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-2 hover:border-varena-gold/50 transition">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <h4 className="font-serif text-sm font-bold text-varena-espresso">100% Bebas Ongkir</h4>
            <p className="text-xs text-varena-taupe leading-relaxed">
              Biaya pengiriman barang dari pabrik/kantor pusat ke alamat gudang agen sepenuhnya ditanggung oleh kantor pusat VARENA.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-2 hover:border-varena-gold/50 transition">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Percent className="w-5 h-5" />
            </div>
            <h4 className="font-serif text-sm font-bold text-varena-espresso">Diskon Khusus Agen</h4>
            <p className="text-xs text-varena-taupe leading-relaxed">
              Dapatkan selisih margin keuntungan menarik melalui potongan harga khusus grosir resmi untuk setiap kuantiti box restock.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-2 hover:border-varena-gold/50 transition">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
              <MapPin className="w-5 h-5" />
            </div>
            <h4 className="font-serif text-sm font-bold text-varena-espresso">Pengalihan Pesanan Kota</h4>
            <p className="text-xs text-varena-taupe leading-relaxed">
              Order konsumen atau mitra di wilayah Anda yang masuk ke kantor pusat dialihkan ke agen terdekat demi pengiriman cepat &amp; Anda raih laba penjualan.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-2 hover:border-varena-gold/50 transition">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <h4 className="font-serif text-sm font-bold text-varena-espresso">Reward &amp; Bonus Khusus</h4>
            <p className="text-xs text-varena-taupe leading-relaxed">
              Bagi agen dengan volume distribusi terbaik berhak mendapatkan bonus saldo kas deposit atau reward fisik (aset/emas) dari manajemen.
            </p>
          </div>
        </div>

        {/* Application Form (Only visible if not active agent yet) */}
        {existingStatus !== 'ACTIVE' && (
          <div className="bg-white rounded-3xl border border-varena-taupe/20 shadow-lg p-6 sm:p-10 space-y-6">
            <div className="border-b border-varena-taupe/15 pb-4">
              <h2 className="font-serif text-xl font-bold text-varena-espresso flex items-center gap-2">
                <Store className="w-5 h-5 text-varena-gold" />
                <span>Formulir Pengajuan Keagenan Resmi</span>
              </h2>
              <p className="text-xs text-varena-taupe mt-1">
                Lengkapi rincian lokasi gudang dan kesiapan operasional Anda untuk dievaluasi oleh dewan manajemen VARENA.
              </p>
            </div>

            {errorMessage && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 text-xs">
              {/* Profile Read-Only Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-varena-ivory-light border border-varena-taupe/20">
                <div>
                  <span className="text-varena-taupe block text-[11px]">Nama Pemohon Mitra</span>
                  <span className="font-bold text-varena-espresso text-sm">{user?.displayName || '-'}</span>
                </div>
                <div>
                  <span className="text-varena-taupe block text-[11px]">Nomor ID Kemitraan</span>
                  <span className="font-mono font-bold text-varena-gold text-sm">{user?.memberCode || '-'}</span>
                </div>
              </div>

              {/* Form Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block font-semibold text-varena-espresso mb-1.5">
                    Provinsi Wilayah Distribusi *
                  </label>
                  <input
                    type="text"
                    required
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    placeholder="Contoh: Jawa Timur"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-varena-taupe/30 focus:outline-none focus:border-varena-gold text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-varena-espresso mb-1.5">
                    Kota / Kabupaten Wilayah Keagenan *
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Contoh: Surabaya"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-varena-taupe/30 focus:outline-none focus:border-varena-gold text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-varena-espresso mb-1.5">
                  Alamat Lengkap Titik Distribusi / Gudang Penyimpanan *
                </label>
                <textarea
                  required
                  rows={3}
                  value={warehouseAddress}
                  onChange={(e) => setWarehouseAddress(e.target.value)}
                  placeholder="Tuliskan nama jalan, nomor ruko/rumah, kelurahan, kecamatan, dan kode pos lokasi penampungan stok..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-varena-taupe/30 focus:outline-none focus:border-varena-gold text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block font-semibold text-varena-espresso mb-1.5 flex items-center justify-between">
                    <span>Estimasi Kapasitas Gudang (Box) *</span>
                    <span className="text-[10px] text-varena-taupe">Daya tampung aman</span>
                  </label>
                  <input
                    type="number"
                    min="10"
                    required
                    value={storageCapacity}
                    onChange={(e) => setStorageCapacity(e.target.value)}
                    placeholder="50"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-varena-taupe/30 font-mono focus:outline-none focus:border-varena-gold text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-varena-espresso mb-1.5 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-varena-gold" />
                    <span>Nomor WhatsApp Aktif Penanggung Jawab *</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="081234567890"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-varena-taupe/30 font-mono focus:outline-none focus:border-varena-gold text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-varena-espresso mb-1.5">
                  Pengalaman Distribusi / Alasan Pengajuan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ceritakan kesiapan jaringan tim mitra Anda di wilayah tersebut atau armada antar jemput yang tersedia..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-varena-taupe/30 focus:outline-none focus:border-varena-gold text-sm"
                />
              </div>

              {/* Agreement checkbox */}
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 rounded text-varena-gold focus:ring-varena-gold"
                />
                <label htmlFor="agreeTerms" className="text-xs text-varena-espresso leading-relaxed cursor-pointer">
                  Saya menyatakan data di atas benar dan berkomitmen menjaga stabilitas pasokan produk VARENA di
                  wilayah saya sesuai standar operasional direct selling resmi kantor pusat.
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting || !agreeTerms}
                  className="w-full py-3.5 px-6 rounded-xl bg-varena-espresso text-varena-gold font-bold hover:bg-varena-espresso-dark disabled:opacity-50 transition shadow-lg text-sm flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    'Mengirimkan Pengajuan...'
                  ) : (
                    <>
                      <span>Kirimkan Pendaftaran Keagenan Resmi</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
