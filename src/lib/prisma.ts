import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Tambahkan connection_limit ke URL agar tidak exhausted di Vercel serverless
function buildDatabaseUrl(): string {
  const url = process.env.DATABASE_URL || '';
  // Prisma Postgres (prisma.io) pakai URL khusus, jangan modif
  if (url.includes('prisma.io') || url.includes('accelerate')) return url;
  // Tambahkan connection_limit jika belum ada
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

