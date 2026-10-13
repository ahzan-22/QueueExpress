import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'node:path';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { RealtimeModule } from './realtime/realtime.module';
import { StoresModule } from './stores/stores.module';
import { validateEnv } from './config/env.validation';

// .env disimpan di root monorepo (lihat .env.example), jadi path-nya di absolutkan
// agar API tetap bisa start dari direktori mana pun.
const rootEnvPath = resolve(__dirname, '../../../../.env');
const apiEnvPath = resolve(__dirname, '../../../.env');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [rootEnvPath, apiEnvPath, resolve(process.cwd(), '.env')],
      validate: validateEnv,
    }),
    PrismaModule,
    StoresModule,
    QueueModule,
    RealtimeModule,
    HealthModule,
  ],
})
export class AppModule {}