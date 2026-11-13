import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h1 className="font-serif text-5xl font-bold text-varena-espresso mb-2">404</h1>
      <h2 className="text-base font-semibold text-varena-taupe-dark mb-4">Halaman Tidak Ditemukan</h2>
      <p className="text-xs text-varena-taupe max-w-sm mb-6">
        Halaman yang Anda cari mungkin telah dipindahkan atau tidak tersedia.
      </p>
      <Link
        href="/"
        className="px-5 py-2.5 rounded-lg bg-varena-espresso text-varena-ivory text-xs font-semibold hover:bg-varena-espresso-dark transition"
      >
        Kembali ke Beranda
      </Link>
    </div>
  );
}

