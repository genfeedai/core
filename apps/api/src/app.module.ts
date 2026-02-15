import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from '@/controllers/app.controller';
import { ExecutionsModule } from '@/modules/executions.module';
import { FilesModule } from '@/modules/files.module';
import { PromptsModule } from '@/modules/prompts.module';
import { ProvidersModule } from '@/modules/providers.module';
import { QueueModule } from '@/modules/queue.module';
import { ReplicateModule } from '@/modules/replicate.module';
import { SettingsModule } from '@/modules/settings.module';
import { TemplatesModule } from '@/modules/templates.module';
import { TTSModule } from '@/modules/tts.module';
import { WorkflowsModule } from '@/modules/workflows.module';
import { AppService } from '@/services/app.service';

@Module({
  controllers: [AppController],
  imports: [
    // Configuration
    ConfigModule.forRoot({
      envFilePath: ['.env.local', '.env'],
      isGlobal: true,
    }),

    // MongoDB Connection
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('MONGODB_URI'),
      }),
    }),

    // Feature Modules
    WorkflowsModule,
    TemplatesModule,
    ExecutionsModule,
    ReplicateModule,
    TTSModule,
    PromptsModule,
    ProvidersModule,
    SettingsModule,
    FilesModule,

    // Queue Management (BullMQ + Redis)
    QueueModule,
  ],
  providers: [AppService],
})
export class AppModule {}
