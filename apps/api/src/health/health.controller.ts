import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<{ status: string; database: string; uptimeSeconds: number; at: string }> {
    let database = 'ok';

    try {
      await this.prisma.db.$queryRaw`SELECT 1`;
    } catch (error) {
      database = `error: ${String(error)}`;
    }

    return {
      status: database === 'ok' ? 'ok' : 'degraded',
      database,
      uptimeSeconds: Math.round(process.uptime()),
      at: new Date().toISOString(),
    };
  }
}