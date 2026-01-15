import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ExecutionsModule } from '../executions/executions.module';
import { ExecutionsService } from '../executions/executions.service';
import { ReplicateModule } from '../replicate/replicate.module';
import { ReplicateService } from '../replicate/replicate.service';
import { WorkflowsModule } from '../workflows/workflows.module';
import { WorkflowsService } from '../workflows/workflows.service';
import { ImageProcessor } from './processors/image.processor';
import { LLMProcessor } from './processors/llm.processor';
import { ProcessingProcessor } from './processors/processing.processor';
import { VideoProcessor } from './processors/video.processor';
import { DEFAULT_JOB_OPTIONS, QUEUE_NAMES } from './queue.constants';
import { QueueJob, QueueJobSchema } from './schemas/queue-job.schema';
import { JobRecoveryService } from './services/job-recovery.service';
import { QueueManagerService } from './services/queue-manager.service';

/**
 * Worker Module - For running queue processors as a separate process
 *
 * This module is designed to run independently from the API server.
 * Workers can be deployed to EC2 instances for distributed processing.
 *
 * Environment variables:
 * - WORKER_TYPE: 'image' | 'video' | 'llm' | 'all' (default: 'all')
 * - WORKER_CONCURRENCY: number (overrides default concurrency)
 * - REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
 * - MONGODB_URI
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        '.env.production',
        '.env.local',
        '.env',
        '../../.env.production',
        '../../.env.local',
        '../../.env',
      ],
    }),
    ScheduleModule.forRoot(),

    // MongoDB Connection (for job persistence)
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),

    // BullMQ Redis connection
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisHost = configService.get<string>('REDIS_HOST', 'localhost');
        const redisPort = configService.get<number>('REDIS_PORT', 6379);
        const redisPassword = configService.get<string>('REDIS_PASSWORD');

        return {
          connection: {
            host: redisHost,
            port: redisPort,
            ...(redisPassword && { password: redisPassword }),
          },
        };
      },
      inject: [ConfigService],
    }),

    // Register queues based on WORKER_TYPE
    BullModule.registerQueue(
      {
        name: QUEUE_NAMES.IMAGE_GENERATION,
        defaultJobOptions: DEFAULT_JOB_OPTIONS[QUEUE_NAMES.IMAGE_GENERATION],
      },
      {
        name: QUEUE_NAMES.VIDEO_GENERATION,
        defaultJobOptions: DEFAULT_JOB_OPTIONS[QUEUE_NAMES.VIDEO_GENERATION],
      },
      {
        name: QUEUE_NAMES.LLM_GENERATION,
        defaultJobOptions: DEFAULT_JOB_OPTIONS[QUEUE_NAMES.LLM_GENERATION],
      },
      {
        name: QUEUE_NAMES.PROCESSING,
        defaultJobOptions: DEFAULT_JOB_OPTIONS[QUEUE_NAMES.PROCESSING],
      }
    ),

    // MongoDB schema for job persistence
    MongooseModule.forFeature([{ name: QueueJob.name, schema: QueueJobSchema }]),

    // Feature modules for processor dependencies
    ExecutionsModule,
    WorkflowsModule,
    ReplicateModule,
  ],
  providers: [
    // Services
    QueueManagerService,
    JobRecoveryService,

    // Processors (conditionally enabled based on WORKER_TYPE)
    ImageProcessor,
    VideoProcessor,
    LLMProcessor,
    ProcessingProcessor,

    // Aliased providers for injection
    {
      provide: 'QueueManagerService',
      useExisting: QueueManagerService,
    },
    {
      provide: 'ExecutionsService',
      useExisting: ExecutionsService,
    },
    {
      provide: 'WorkflowsService',
      useExisting: WorkflowsService,
    },
    {
      provide: 'ReplicateService',
      useExisting: ReplicateService,
    },
  ],
})
export class WorkerModule {}
