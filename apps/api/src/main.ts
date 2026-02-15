import * as Sentry from '@sentry/node';
import { AppModule } from '@/app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

// Initialize Sentry before anything else
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: `genfeed-core-api@${process.env.VERSION || '1.0.0'}`,
    tracesSampleRate: 1.0,
  });
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Increase body parser limit for base64 image payloads
  // Base64 adds ~33% overhead, so 50mb supports ~37mb of raw image data
  app.useBodyParser('json', { limit: '50mb' });
  app.useBodyParser('urlencoded', { extended: true, limit: '50mb' });
  const logger = new Logger('Bootstrap');

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);
  const corsOrigin = configService.get<string>('CORS_ORIGIN', 'http://local.genfeed.ai:3000');

  // Enable CORS
  app.enableCors({
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    origin: corsOrigin,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    })
  );

  // Global prefix for all routes
  app.setGlobalPrefix('api');

  await app.listen(port);
  logger.debug(`API running on http://local.genfeed.ai:${port}`);
}
bootstrap();
