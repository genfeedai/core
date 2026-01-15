import { Module } from '@nestjs/common';
import { FalService } from './fal.service';
import { HuggingFaceService } from './huggingface.service';
import { ProvidersController } from './providers.controller';

@Module({
  controllers: [ProvidersController],
  providers: [FalService, HuggingFaceService],
  exports: [FalService, HuggingFaceService],
})
export class ProvidersModule {}
