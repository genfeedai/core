import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SettingsController } from '@/controllers/settings.controller';
import { Settings, SettingsSchema } from '@/schemas/settings.schema';
import { SettingsService } from '@/services/settings.service';

@Module({
  controllers: [SettingsController],
  exports: [SettingsService],
  imports: [MongooseModule.forFeature([{ name: Settings.name, schema: SettingsSchema }])],
  providers: [SettingsService],
})
export class SettingsModule {}
