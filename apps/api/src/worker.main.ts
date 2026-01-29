import { WorkerModule } from '@/modules/worker.module';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

/**
 * Worker Entry Point
 *
 * This is a separate entry point for running queue processors
 * as a standalone process (without HTTP server).
 *
 * Designed for deployment on EC2 or container environments.
 *
 * Usage:
 *   WORKER_TYPE=image bun run start:worker
 *   WORKER_TYPE=video bun run start:worker
 *   WORKER_TYPE=all bun run start:worker (default)
 *
 * Environment:
 *   WORKER_TYPE - 'image' | 'video' | 'llm' | 'all'
 *   WORKER_CONCURRENCY - Override default concurrency
 *   REDIS_HOST - Redis host
 *   REDIS_PORT - Redis port
 *   REDIS_PASSWORD - Redis password (optional)
 *   MONGODB_URI - MongoDB connection string
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger('Worker');

  const workerType = process.env.WORKER_TYPE ?? 'all';

  logger.log(`Starting worker process...`);
  logger.log(`Worker type: ${workerType}`);
  logger.log(
    `Redis: ${process.env.REDIS_HOST ?? 'local.genfeed.ai'}:${process.env.REDIS_PORT ?? 6379}`
  );

  // Create application context (no HTTP server)
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  // Enable graceful shutdown
  app.enableShutdownHooks();

  // Handle process signals
  process.on('SIGINT', async () => {
    logger.log('Received SIGINT, shutting down gracefully...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.log('Received SIGTERM, shutting down gracefully...');
    await app.close();
    process.exit(0);
  });

  logger.log('Worker started and processing jobs...');
  logger.log('Press Ctrl+C to stop');
}

const logger = new Logger('WorkerBootstrap');
bootstrap().catch((error) => {
  logger.error('Failed to start worker:', error);
  process.exit(1);
});
