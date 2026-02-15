import { Module } from '@nestjs/common';
import { OllamaService } from '@/services/ollama.service';

@Module({
  exports: [OllamaService],
  providers: [OllamaService],
})
export class OllamaModule {}
