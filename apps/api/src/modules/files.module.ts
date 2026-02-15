import { Module } from '@nestjs/common';
import { FilesController } from '@/controllers/files.controller';
import { FilesService } from '@/services/files.service';

@Module({
  controllers: [FilesController],
  exports: [FilesService],
  providers: [FilesService],
})
export class FilesModule {}
