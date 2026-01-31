import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { UGCFactoryService } from '@/services/ugc-factory.service';
import { UGCFactoryController } from '@/controllers/ugc-factory.controller';
import { UGCGenerationProcessor } from '@/processors/ugc-generation.processor';
import { DistributionService } from '@/services/distribution.service';
import { TelegramOutputNode } from '@/nodes/distribution/telegram-output-node';
import { DiscordOutputNode } from '@/nodes/distribution/discord-output-node';
import { GoogleDriveOutputNode } from '@/nodes/distribution/google-drive-output-node';
import { TTSModule } from '@/modules/tts.module';
import { ReplicateModule } from '@/modules/replicate.module';

@Module({
  imports: [
    // Register the UGC Factory job queue
    BullModule.registerQueue({
      name: 'ugc-factory',
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    }),

    // Import existing modules we'll reuse
    TTSModule,
    ReplicateModule,
  ],
  providers: [
    UGCFactoryService,
    UGCGenerationProcessor,
    DistributionService,
    TelegramOutputNode,
    DiscordOutputNode,
    GoogleDriveOutputNode,
  ],
  controllers: [UGCFactoryController],
  exports: [
    UGCFactoryService, // Export for use in other modules
  ],
})
export class UGCFactoryModule {}
