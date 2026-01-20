import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SettingsController } from '@/controllers/settings.controller';
import { UserSettings, UserSettingsSchema } from '@/schemas/user-settings.schema';
import { SettingsService } from '@/services/settings.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: UserSettings.name, schema: UserSettingsSchema }])],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
