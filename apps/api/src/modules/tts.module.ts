import { forwardRef, Module } from '@nestjs/common';
import { ExecutionsModule } from '@/modules/executions.module';
import { TTSService } from '@/services/tts.service';

@Module({
  exports: [TTSService],
  imports: [forwardRef(() => ExecutionsModule)],
  providers: [TTSService],
})
export class TTSModule {}
