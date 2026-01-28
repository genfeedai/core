import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from '@/app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Increase body parser limit for base64 image payloads
  // Base64 adds ~33% overhead, so 50mb supports ~37mb of raw image data
  app.useBodyParser('json', { limit: '50mb' });
  app.useBodyParser('urlencoded', { limit: '50mb', extended: true });
  const logger = new Logger('Bootstrap');

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);
  const corsOrigin = configService.get<string>('CORS_ORIGIN', 'http://localhost:3000');

  // Enable CORS
  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  // Global prefix for all routes
  app.setGlobalPrefix('api');

  await app.listen(port);
  logger.log(`API running on http://localhost:${port}`);
}
bootstrap();
