import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Mengambil URL database pooled untuk mencegah "Too many connections" di Vercel serverless
function buildDatabaseUrl(): string {
  // 1. Prioritaskan DATABASE_URL_POOLED (bawaan integrasi Prisma Postgres di Vercel)
  let url = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL || '';

  // 2. Jika URL masih mengarah ke direct db.prisma.io tanpa pooled, otomatis alihkan ke pooled.db.prisma.io
  if (url.includes('@db.prisma.io') && !url.includes('@pooled.db.prisma.io')) {
    url = url.replace('@db.prisma.io', '@pooled.db.prisma.io');
  }

  // 3. Jika pakai Prisma Cloud / Accelerate, biarkan URL apa adanya
  if (url.includes('prisma.io') || url.includes('accelerate')) {
    return url;
  }

  // 4. Untuk PostgreSQL umum lainnya, pasang limit koneksi agar serverless aman
  try {
    const u = new URL(url);
    if (!u.searchParams.has('connection_limit')) {
      u.searchParams.set('connection_limit', '3');
    }
    if (!u.searchParams.has('pool_timeout')) {
      u.searchParams.set('pool_timeout', '10');
    }
    return u.toString();
  } catch {
    return url;
  }
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    datasources: {
      db: {
        url: buildDatabaseUrl(),
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
export default prisma;

