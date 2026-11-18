#!/usr/bin/env node
/**
 * VARENA PostgreSQL Automated Setup & Migration Script
 * Usage:
 *   node scripts/migrate-to-postgres.mjs
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=====================================================');
console.log('  VARENA Platform - PostgreSQL Setup & Migration');
console.log('=====================================================\n');

// 1. Verify DATABASE_URL
const envFile = path.resolve(rootDir, '.env');
let dbUrl = process.env.DATABASE_URL;

if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf-8');
  const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
  if (match) {
    dbUrl = match[1];
  }
}

if (!dbUrl || (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://'))) {
  console.error(' [ERROR] DATABASE_URL di .env belum diarahkan ke PostgreSQL.');
  console.log('Format yang diharapkan:');
  console.log('  DATABASE_URL="postgresql://[user]:[password]@[host]:5432/[dbname]?schema=public"\n');
  console.log('Silakan copy konfigurasi dari .env.production.example ke .env terlebih dahulu.');
  process.exit(1);
}

console.log(' 1. DATABASE_URL PostgreSQL terdeteksi.');

// 2. Set schema.prisma to postgresql
console.log(' 2. Memastikan prisma/schema.prisma disetel ke PostgreSQL...');
execSync('node scripts/db-switch.mjs postgresql', { cwd: rootDir, stdio: 'inherit' });

// 3. Generate Prisma Client
console.log(' 3. Melakukan generate Prisma Client...');
try {
  execSync('npx prisma generate', { cwd: rootDir, stdio: 'inherit' });
} catch (err) {
  console.error(' Gagal generate Prisma Client:', err.message);
  process.exit(1);
}

// 4. Push Schema to PostgreSQL
console.log(' 4. Mendorong (push) struktur tabel dan index ke PostgreSQL...');
try {
  execSync('npx prisma db push --accept-data-loss', { cwd: rootDir, stdio: 'inherit' });
} catch (err) {
  console.error(' Gagal push skema ke database PostgreSQL:', err.message);
  process.exit(1);
}

// 5. Seed Initial Data
console.log(' 5. Mengisi data awal (Seed) untuk Corporate, Produk, Marketing Plan, dan Jaringan...');
try {
  execSync('node scripts/seed.mjs', { cwd: rootDir, stdio: 'inherit' });
} catch (err) {
  console.error(' Gagal seeding data awal:', err.message);
  process.exit(1);
}

console.log('\n=====================================================');
console.log(' Migrasi ke PostgreSQL Berhasil!');
console.log(' Sistem VARENA siap melayani ribuan transaksi bersamaan.');
console.log('=====================================================\n');
