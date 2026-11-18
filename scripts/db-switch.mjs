#!/usr/bin/env node
/**
 * VARENA Database Provider Switcher
 * Usage:
 *   node scripts/db-switch.mjs postgresql
 *   node scripts/db-switch.mjs sqlite
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.resolve(__dirname, '../prisma/schema.prisma');

const targetProvider = process.argv[2]?.toLowerCase();

if (!['postgresql', 'sqlite'].includes(targetProvider)) {
  console.log('Penggunaan: node scripts/db-switch.mjs <postgresql|sqlite>');
  process.exit(1);
}

let content = fs.readFileSync(schemaPath, 'utf-8');

if (targetProvider === 'postgresql') {
  content = content.replace(/provider\s*=\s*"sqlite"/g, 'provider = "postgresql"');
  fs.writeFileSync(schemaPath, content, 'utf-8');
  console.log(' Berhasil mengubah prisma/schema.prisma ke provider PostgreSQL.');
  console.log(' Pastikan variabel DATABASE_URL diatur ke connection string PostgreSQL:');
  console.log('   Contoh: postgresql://varena_user:password@localhost:5432/varena_db?schema=public\n');
} else {
  content = content.replace(/provider\s*=\s*"postgresql"/g, 'provider = "sqlite"');
  fs.writeFileSync(schemaPath, content, 'utf-8');
  console.log(' Berhasil mengubah prisma/schema.prisma ke provider SQLite.');
  console.log(' Pastikan variabel DATABASE_URL diatur ke: file:./dev.db\n');
}
