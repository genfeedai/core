import { BullModule } from '@nestjs/bullmq';
import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { BullBoardController } from '@/controllers/bull-board.controller';
import { ExecutionsModule } from '@/modules/executions.module';
import { FFmpegModule } from '@/modules/ffmpeg.module';
import { ReplicateModule } from '@/modules/replicate.module';
import { TTSModule } from '@/modules/tts.module';
import { WorkflowsModule } from '@/modules/workflows.module';
import { ImageProcessor } from '@/processors/image.processor';
import { LLMProcessor } from '@/processors/llm.processor';
import { ProcessingProcessor } from '@/processors/processing.processor';
import { VideoProcessor } from '@/processors/video.processor';
import { WorkflowProcessor } from '@/processors/workflow.processor';
import { DEFAULT_JOB_OPTIONS, QUEUE_NAMES } from '@/queue/queue.constants';
import { QueueJob, QueueJobSchema } from '@/schemas/queue-job.schema';
import { ExecutionsService } from '@/services/executions.service';
import { FFmpegService } from '@/services/ffmpeg.service';
import { JobRecoveryService } from '@/services/job-recovery.service';
import { QueueManagerService } from '@/services/queue-manager.service';
import { ReplicateService } from '@/services/replicate.service';
import { TTSService } from '@/services/tts.service';
import { WorkflowInterfaceService } from '@/services/workflow-interface.service';
import { WorkflowsService } from '@/services/workflows.service';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),

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

    // Register queues
    BullModule.registerQueue(
      {
        name: QUEUE_NAMES.WORKFLOW_ORCHESTRATOR,
        defaultJobOptions: DEFAULT_JOB_OPTIONS[QUEUE_NAMES.WORKFLOW_ORCHESTRATOR],
      },
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

    // Feature modules
    forwardRef(() => ExecutionsModule),
    forwardRef(() => WorkflowsModule),
    forwardRef(() => ReplicateModule),
    forwardRef(() => TTSModule),
    forwardRef(() => FFmpegModule),
  ],
  providers: [
    // Services
    QueueManagerService,
    JobRecoveryService,

    // Processors
    WorkflowProcessor,
    ImageProcessor,
    VideoProcessor,
    LLMProcessor,
    ProcessingProcessor,

    // Aliased providers for forwardRef injection in processors
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
      provide: 'TTSService',
      useExisting: TTSService,
    },
    {
      provide: 'FFmpegService',
      useExisting: FFmpegService,
    },
    {
      provide: 'WorkflowInterfaceService',
      useExisting: WorkflowInterfaceService,
    },
  ],
  controllers: [BullBoardController],
  exports: [QueueManagerService, JobRecoveryService, BullModule],
})
export class QueueModule {}
