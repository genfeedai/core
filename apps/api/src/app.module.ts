import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ExecutionsModule } from './executions/executions.module';
import { Execution, ExecutionSchema } from './executions/schemas/execution.schema';
import { PromptLibraryModule } from './prompt-library/prompt-library.module';
import {
  PromptLibraryItem,
  PromptLibraryItemSchema,
} from './prompt-library/schemas/prompt-library-item.schema';
import { ProvidersModule } from './providers/providers.module';
import { QueueModule } from './queue/queue.module';
import { ReplicateModule } from './replicate/replicate.module';
import { StorageSetupModule } from './storage/storage-setup.module';
import { Template, TemplateSchema } from './templates/schemas/template.schema';
import { TemplatesModule } from './templates/templates.module';
// Import schemas for MongoDB adapter
import { Workflow, WorkflowSchema } from './workflows/schemas/workflow.schema';
import { WorkflowsModule } from './workflows/workflows.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        '.env.production',
        '.env.local',
        '.env',
        '../../.env.production',
        '../../.env.local',
        '../../.env',
      ],
    }),

    // Storage Setup (determines adapter type)
    StorageSetupModule.forRoot(),

    // Conditional MongoDB Connection
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const mongoUri = configService.get<string>('MONGODB_URI');
        const storageAdapter = configService.get<string>('STORAGE_ADAPTER');

        // Only connect if using MongoDB adapter
        if (storageAdapter === 'mongodb' || (!storageAdapter && mongoUri)) {
          return { uri: mongoUri };
        }

        // SQLite mode - no MongoDB connection needed
        return { uri: undefined };
      },
      inject: [ConfigService],
    }),

    // Register Mongoose schemas (needed for MongoDB adapter)
    MongooseModule.forFeature([
      { name: Workflow.name, schema: WorkflowSchema },
      { name: Execution.name, schema: ExecutionSchema },
      { name: Template.name, schema: TemplateSchema },
      { name: PromptLibraryItem.name, schema: PromptLibraryItemSchema },
    ]),

    // Storage repositories
    StorageSetupModule.forFeature(),

    // Feature Modules
    WorkflowsModule,
    TemplatesModule,
    ExecutionsModule,
    ReplicateModule,
    PromptLibraryModule,
    ProvidersModule,

    // Queue Management (BullMQ + Redis)
    QueueModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
