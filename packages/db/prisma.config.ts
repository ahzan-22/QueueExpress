import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

// File .env berada di root monorepo (lihat .env.example).
loadEnv({ path: '../../.env' });
loadEnv();

/**
 * Prisma 7 tidak lagi membaca `url` dari datasource block di schema.prisma.
 * Prisma CLI (migrate / db push / studio) memakai nilai di sini.
 *
 * Kita memakai DIRECT_URL (Supabase session-mode pooler, port 5432) karena
 * session pooler wajib dipakai untuk migration. Direct URL bukan opsional di
 * Supabase karena port 6543 (transaction mode) tidak mendukung prepared
 * statements yang dibutuhkan Prisma Migrate.
 *
 * Nilai DATABASE_URL tetap dipakai aplikasi saat runtime (packages/db/src/client.ts
 * memakai process.env.DATABASE_URL).
 */
const migrationUrl = process.env['DIRECT_URL'] ?? process.env['DATABASE_URL'];

if (!migrationUrl) {
  throw new Error(
    'DIRECT_URL atau DATABASE_URL belum diset. Salin .env.example menjadi .env di root monorepo lalu isi nilainya.',
  );
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'bun run src/seed.ts',
  },
  datasource: {
    url: migrationUrl,
  },
});