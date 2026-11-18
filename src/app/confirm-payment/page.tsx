'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  CreditCard,
  Upload,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Building2,
  FileText,
  Clock,
} from 'lucide-react';

function ConfirmPaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [orderNumber, setOrderNumber] = useState('');
  const [senderBankName, setSenderBankName] = useState('BCA');
  const [senderAccountName, setSenderAccountName] = useState('');
  const [transferAmountPaid, setTransferAmountPaid] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const paramOrder = searchParams.get('orderNumber');
    if (paramOrder) {
      setOrderNumber(paramOrder.toUpperCase());
    }
  }, [searchParams]);

  // Handle local image file upload and convert to base64 preview
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file bukti transfer maksimal 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPaymentProofUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!orderNumber.trim()) {
      setErrorMessage('Nomor pesanan wajib diisi.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/v1/orders/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: orderNumber.trim().toUpperCase(),
          senderBankName,
          senderAccountName,
          transferAmountPaid: parseInt(transferAmountPaid.replace(/[^0-9]/g, ''), 10),
          transferNotes,
          paymentProofUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengirimkan konfirmasi pembayaran.');
      }

      setSuccessMessage(data.message);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <Link
        href="/checkout"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-varena-taupe hover:text-varena-espresso transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Kembali ke Halaman Pemesanan</span>
      </Link>

      <div className="bg-white border border-varena-taupe/20 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <div className="inline-block px-2.5 py-0.5 rounded text-[10px] uppercase font-mono font-semibold bg-varena-gold/20 text-varena-espresso border border-varena-gold/40 mb-1">
            Layanan Rekonsiliasi Transfer Bank
          </div>
          <h1 className="font-serif text-2xl font-bold text-varena-espresso">
            Form Konfirmasi Pembayaran Manual
          </h1>
          <p className="text-xs text-varena-taupe mt-1 leading-relaxed">
            Gunakan form ini jika Anda telah melakukan transfer antar-bank namun lupa mencantumkan kode unik 3 digit, salah memasukkan angka kode unik, atau mutasi bank belum terverifikasi secara otomatis.
          </p>
        </div>

        {/* Informasi Rekening Resmi */}
        <div className="p-4 rounded-xl bg-varena-ivory-light border border-varena-taupe/20 text-xs space-y-2">
          <div className="font-bold text-varena-espresso flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-varena-gold" />
            <span>Rekening Resmi Tujuan Transfer Korporasi:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 rounded-lg bg-white border border-varena-taupe/20">
              <div className="text-varena-taupe">Bank BCA:</div>
              <div className="font-mono font-bold text-varena-espresso text-sm">8820-192-888</div>
              <div className="text-[10px] text-varena-taupe">a.n. PT VARENA MAJU BERSAMA</div>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-varena-taupe/20">
              <div className="text-varena-taupe">Bank Mandiri:</div>
              <div className="font-mono font-bold text-varena-espresso text-sm">137-00-1928-8888</div>
              <div className="text-[10px] text-varena-taupe">a.n. PT VARENA MAJU BERSAMA</div>
            </div>
          </div>
        </div>

        {successMessage ? (
          <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg font-bold text-emerald-900">
              Konfirmasi Berhasil Diajukan!
            </h3>
            <p className="text-xs text-emerald-800 leading-relaxed max-w-md mx-auto">
              {successMessage}
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
              <button
                onClick={() => router.push('/member')}
                className="py-2.5 px-5 rounded-lg bg-varena-espresso text-varena-gold-light font-semibold text-xs hover:bg-varena-espresso-dark transition shadow"
              >
                Ke Portal Kemitraan Saya
              </button>
              <button
                onClick={() => {
                  setSuccessMessage(null);
                  setOrderNumber('');
                  setTransferAmountPaid('');
                  setPaymentProofUrl(null);
                }}
                className="py-2.5 px-5 rounded-lg border border-varena-taupe/30 text-varena-espresso font-medium text-xs hover:bg-varena-ivory transition"
              >
                Konfirmasi Pesanan Lain
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {errorMessage && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block font-semibold text-varena-espresso mb-1">
                Nomor Pesanan VARENA *
              </label>
              <input
                type="text"
                required
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                placeholder="Contoh: VRN-88201928-102"
                className="w-full px-3.5 py-2.5 rounded-lg border border-varena-taupe/30 uppercase font-mono font-bold focus:outline-none focus:border-varena-gold"
              />
              <span className="text-[10px] text-varena-taupe mt-1 block">
                Nomor pesanan yang Anda terima saat menyelesaikan checkout pemesanan.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-varena-espresso mb-1">
                  Bank Asal Pengirim *
                </label>
                <select
                  value={senderBankName}
                  onChange={(e) => setSenderBankName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-varena-taupe/30 bg-white focus:outline-none focus:border-varena-gold font-medium"
                >
                  <option value="BCA">BCA (Bank Central Asia)</option>
                  <option value="Mandiri">Bank Mandiri</option>
                  <option value="BRI">BRI (Bank Rakyat Indonesia)</option>
                  <option value="BNI">BNI (Bank Negara Indonesia)</option>
                  <option value="BSI">BSI (Bank Syariah Indonesia)</option>
                  <option value="CIMB Niaga">CIMB Niaga</option>
                  <option value="Permata">Bank Permata</option>
                  <option value="Lainnya">Bank Lainnya / E-Wallet</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-varena-espresso mb-1">
                  Nama Pemilik Rekening Pengirim *
                </label>
                <input
                  type="text"
                  required
                  value={senderAccountName}
                  onChange={(e) => setSenderAccountName(e.target.value)}
                  placeholder="Nama sesuai buku tabungan / mutasi"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-varena-espresso mb-1">
                Nominal Riil yang Ditransfer (Rp) *
              </label>
              <input
                type="text"
                required
                value={transferAmountPaid}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  setTransferAmountPaid(raw ? parseInt(raw, 10).toLocaleString('id-ID') : '');
                }}
                placeholder="Contoh: 520.000"
                className="w-full px-3.5 py-2.5 rounded-lg border border-varena-taupe/30 font-mono font-bold text-sm focus:outline-none focus:border-varena-gold"
              />
              <span className="text-[10px] text-varena-taupe mt-1 block">
                Tulis nominal uang yang Anda kirimkan secara nyata dari aplikasi mobile banking / ATM Anda.
              </span>
            </div>

            <div>
              <label className="block font-semibold text-varena-espresso mb-1">
                Upload Foto Bukti Transfer / Slip Bank (Maks. 5 MB) *
              </label>
              <div className="border-2 border-dashed border-varena-taupe/30 rounded-xl p-4 text-center hover:border-varena-gold transition bg-slate-50">
                <input
                  type="file"
                  id="proof-file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="proof-file"
                  className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
                >
                  <Upload className="w-6 h-6 text-varena-gold" />
                  <span className="font-semibold text-varena-espresso">Pilih file foto bukti transfer</span>
                  <span className="text-[10px] text-varena-taupe">Format JPG, PNG, atau screenshot m-banking</span>
                </label>
              </div>

              {paymentProofUrl && (
                <div className="mt-3 p-2 rounded-lg border border-varena-taupe/20 bg-white flex items-center gap-3">
                  <img
                    src={paymentProofUrl}
                    alt="Bukti Transfer"
                    className="w-16 h-16 object-cover rounded border"
                  />
                  <div className="text-[11px] text-varena-taupe space-y-0.5">
                    <div className="font-semibold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Foto bukti berhasil dipilih</span>
                    </div>
                    <div>Siap dikirimkan ke tim verifikasi keuangan</div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block font-semibold text-varena-espresso mb-1">
                Catatan / Keterangan Tambahan
              </label>
              <textarea
                rows={3}
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                placeholder="Misal: Saya transfer bulat Rp520.000 karena lupa menyertakan 3 digit kode unik Rp342."
                className="w-full px-3.5 py-2.5 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-varena-espresso text-varena-gold-light font-semibold hover:bg-varena-espresso-dark transition shadow flex items-center justify-center gap-2"
              >
                {loading ? 'Mengirimkan Bukti...' : 'Kirim Bukti Pembayaran'}
              </button>
            </div>

            <div className="text-[10px] text-varena-taupe text-center flex items-center justify-center gap-1 pt-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>Verifikasi transfer diproses secara aman dalam waktu 15 - 60 menit jam operasional.</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ConfirmPaymentPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-sm text-varena-taupe">Memuat form konfirmasi...</div>}>
      <ConfirmPaymentContent />
    </Suspense>
  );
}
