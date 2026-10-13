import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { getDb } from '@queueexpress/db';
import type { PrismaClient } from '@queueexpress/db';

/**
 * Wrapper tipis di atas Prisma client, diekspos sebagai provider global.
 *
 * Client dibuat lewat getDb() (bukan `new PrismaClient`) supaya:
 *   1. driver adapter Prisma 7 tetap terpasang,
 *   2. hanya ada satu connection pool per proses,
 *   3. client baru dibuat setelah ConfigModule memuat .env.
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private client: PrismaClient | null = null;

  get db(): PrismaClient {
    this.client ??= getDb();
    return this.client;
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.db.$connect();
      this.logger.log('Terhubung ke database');
    } catch (error) {
      this.logger.error(`Gagal terhubung ke database: ${String(error)}`);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.$disconnect();
    this.client = null;
  }
}