import { Module } from '@nestjs/common';
import { ProvidersController } from '@/controllers/providers.controller';

@Module({
  controllers: [ProvidersController],
  exports: [],
  providers: [],
})
export class ProvidersModule {}
