import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  const config = app.get(ConfigService);
  const port = config.get<number>('API_PORT', 4000);
  const prefix = config.get<string>('API_GLOBAL_PREFIX', 'api');
  const webOrigin = config.get<string>('WEB_ORIGIN', 'http://localhost:3000');

  app.setGlobalPrefix(prefix);
  app.enableCors({
    origin: webOrigin.split(',').map((origin) => origin.trim()),
    credentials: true,
  });
  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');

  logger.log(`API siap di http://localhost:${port}/${prefix}`);
  logger.log(`CORS diizinkan untuk: ${webOrigin}`);
}

void bootstrap().catch((error: unknown) => {
  new Logger('Bootstrap').error(`Gagal menjalankan API: ${String(error)}`);
  process.exit(1);
});