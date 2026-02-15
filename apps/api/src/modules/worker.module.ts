import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ExecutionsModule } from '@/modules/executions.module';
import { FilesModule } from '@/modules/files.module';
import { OllamaModule } from '@/modules/ollama.module';
import { ReplicateModule } from '@/modules/replicate.module';
import { WorkflowsModule } from '@/modules/workflows.module';
import { ImageProcessor } from '@/processors/image.processor';
import { LLMProcessor } from '@/processors/llm.processor';
import { ProcessingProcessor } from '@/processors/processing.processor';
import { VideoProcessor } from '@/processors/video.processor';
import { DEFAULT_JOB_OPTIONS, QUEUE_NAMES } from '@/queue/queue.constants';
import { QueueJob, QueueJobSchema } from '@/schemas/queue-job.schema';
import { ExecutionsService } from '@/services/executions.service';
import { FilesService } from '@/services/files.service';
import { JobRecoveryService } from '@/services/job-recovery.service';
import { OllamaService } from '@/services/ollama.service';
import { QueueManagerService } from '@/services/queue-manager.service';
import { ReplicateService } from '@/services/replicate.service';
import { WorkflowsService } from '@/services/workflows.service';

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
      envFilePath: [
        '.env.production',
        '.env.local',
        '.env',
        '../../.env.production',
        '../../.env.local',
        '../../.env',
      ],
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),

    // MongoDB Connection (for job persistence)
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
    }),

    // BullMQ Redis connection
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
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
    }),

    // Register queues based on WORKER_TYPE
    BullModule.registerQueue(
      {
        defaultJobOptions: DEFAULT_JOB_OPTIONS[QUEUE_NAMES.IMAGE_GENERATION],
        name: QUEUE_NAMES.IMAGE_GENERATION,
      },
      {
        defaultJobOptions: DEFAULT_JOB_OPTIONS[QUEUE_NAMES.VIDEO_GENERATION],
        name: QUEUE_NAMES.VIDEO_GENERATION,
      },
      {
        defaultJobOptions: DEFAULT_JOB_OPTIONS[QUEUE_NAMES.LLM_GENERATION],
        name: QUEUE_NAMES.LLM_GENERATION,
      },
      {
        defaultJobOptions: DEFAULT_JOB_OPTIONS[QUEUE_NAMES.PROCESSING],
        name: QUEUE_NAMES.PROCESSING,
      }
    ),

    // MongoDB schema for job persistence
    MongooseModule.forFeature([{ name: QueueJob.name, schema: QueueJobSchema }]),

    // Feature modules for processor dependencies
    ExecutionsModule,
    FilesModule,
    WorkflowsModule,
    ReplicateModule,
    OllamaModule,
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
    {
      provide: 'OllamaService',
      useExisting: OllamaService,
    },
    {
      provide: 'FilesService',
      useExisting: FilesService,
    },
  ],
})
export class WorkerModule {}
