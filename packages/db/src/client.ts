import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';

export type PrismaLogLevel = 'query' | 'info' | 'warn' | 'error';

export type PrismaClientOptions = {
  /** Defaults ke process.env.DATABASE_URL */
  connectionString?: string;
  log?: PrismaLogLevel[];
};

/**
 * Prisma 7 mewajibkan driver adapter, jadi `new PrismaClient()` tanpa argumen
 * tidak lagi valid. Semua pembuatan client lewat fungsi ini supaya apps/api,
 * seed script, dan script CLI memakai cara yang sama.
 */
export function createPrismaClient(options: PrismaClientOptions = {}): PrismaClient {
  const connectionString = options.connectionString ?? process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL belum diset. Salin .env.example menjadi .env di root monorepo lalu isi nilainya.',
    );
  }

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log: options.log ?? ['warn', 'error'],
  });
}

/**
 * Singleton untuk runtime server.
 *
 * Sengaja lazy (tidak dievaluasi saat modul di-import) karena NestJS baru
 * mengisi process.env dari .env ketika AppModule dibuat, sedangkan import
 * package ini terjadi jauh sebelum itu. Instance juga disimpan di globalThis
 * agar hot-reload di development tidak membuka koneksi baru tiap perubahan file.
 */
const globalForPrisma = globalThis as unknown as { __queueExpressPrisma?: PrismaClient };

export function getDb(): PrismaClient {
  if (globalForPrisma.__queueExpressPrisma) {
    return globalForPrisma.__queueExpressPrisma;
  }

  const client = createPrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.__queueExpressPrisma = client;
  }

  return client;
}