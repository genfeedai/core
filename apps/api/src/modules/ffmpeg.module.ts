import { forwardRef, Module } from '@nestjs/common';
import { ExecutionsModule } from '@/modules/executions.module';
import { FFmpegService } from '@/services/ffmpeg.service';

@Module({
  exports: [FFmpegService],
  imports: [forwardRef(() => ExecutionsModule)],
  providers: [FFmpegService],
})
export class FFmpegModule {}
