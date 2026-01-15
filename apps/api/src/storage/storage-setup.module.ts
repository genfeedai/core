import {
  createSqliteDatabase,
  EXECUTION_REPOSITORY,
  ExecutionMongoRepository,
  ExecutionSqliteRepository,
  PROMPT_LIBRARY_REPOSITORY,
  PromptLibraryMongoRepository,
  PromptLibrarySqliteRepository,
  SQLITE_DATABASE,
  StorageAdapterType,
  TEMPLATE_REPOSITORY,
  TemplateMongoRepository,
  TemplateSqliteRepository,
  WORKFLOW_REPOSITORY,
  WorkflowMongoRepository,
  WorkflowSqliteRepository,
} from '@genfeedai/storage';
import { type DynamicModule, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Execution } from '../executions/schemas/execution.schema';
import { PromptLibraryItem } from '../prompt-library/schemas/prompt-library-item.schema';
import { Template } from '../templates/schemas/template.schema';
import { Workflow } from '../workflows/schemas/workflow.schema';

@Module({})
export class StorageSetupModule {
  private static readonly logger = new Logger('StorageSetupModule');

  static forRoot(): DynamicModule {
    return {
      module: StorageSetupModule,
      imports: [ConfigModule],
      providers: [
        // Determine which adapter to use
        {
          provide: 'STORAGE_TYPE',
          useFactory: (configService: ConfigService) => {
            const explicitAdapter = configService.get<string>('STORAGE_ADAPTER');
            if (explicitAdapter) return explicitAdapter;

            const mongoUri = configService.get<string>('MONGODB_URI');
            return mongoUri ? 'mongodb' : 'sqlite';
          },
          inject: [ConfigService],
        },
        // SQLite database (only created if using SQLite)
        {
          provide: SQLITE_DATABASE,
          useFactory: (storageType: string, configService: ConfigService) => {
            if (storageType !== 'sqlite') return null;

            const sqlitePath = configService.get<string>('SQLITE_PATH', './data/genfeed.db');
            StorageSetupModule.logger.log(`Initializing SQLite database at: ${sqlitePath}`);

            return createSqliteDatabase({
              type: StorageAdapterType.SQLITE,
              sqlitePath,
              debug: configService.get<boolean>('STORAGE_DEBUG', false),
            });
          },
          inject: ['STORAGE_TYPE', ConfigService],
        },
      ],
      exports: ['STORAGE_TYPE', SQLITE_DATABASE],
    };
  }

  /**
   * Register repositories - call AFTER forRoot() and MongooseModule setup
   */
  static forFeature(): DynamicModule {
    return {
      module: StorageSetupModule,
      providers: [
        // Workflow Repository
        {
          provide: WORKFLOW_REPOSITORY,
          useFactory: (storageType: string, sqliteDb: unknown, mongoModel?: unknown) => {
            if (storageType === 'sqlite') {
              StorageSetupModule.logger.log('Using SQLite workflow repository');
              return new WorkflowSqliteRepository(sqliteDb as never);
            }
            StorageSetupModule.logger.log('Using MongoDB workflow repository');
            return new WorkflowMongoRepository(mongoModel as never);
          },
          inject: [
            'STORAGE_TYPE',
            SQLITE_DATABASE,
            { token: getModelToken(Workflow.name), optional: true },
          ],
        },
        // Execution Repository
        {
          provide: EXECUTION_REPOSITORY,
          useFactory: (storageType: string, sqliteDb: unknown, mongoModel?: unknown) => {
            if (storageType === 'sqlite') {
              return new ExecutionSqliteRepository(sqliteDb as never);
            }
            return new ExecutionMongoRepository(mongoModel as never);
          },
          inject: [
            'STORAGE_TYPE',
            SQLITE_DATABASE,
            { token: getModelToken(Execution.name), optional: true },
          ],
        },
        // Template Repository
        {
          provide: TEMPLATE_REPOSITORY,
          useFactory: (storageType: string, sqliteDb: unknown, mongoModel?: unknown) => {
            if (storageType === 'sqlite') {
              return new TemplateSqliteRepository(sqliteDb as never);
            }
            return new TemplateMongoRepository(mongoModel as never);
          },
          inject: [
            'STORAGE_TYPE',
            SQLITE_DATABASE,
            { token: getModelToken(Template.name), optional: true },
          ],
        },
        // Prompt Library Repository
        {
          provide: PROMPT_LIBRARY_REPOSITORY,
          useFactory: (storageType: string, sqliteDb: unknown, mongoModel?: unknown) => {
            if (storageType === 'sqlite') {
              return new PromptLibrarySqliteRepository(sqliteDb as never);
            }
            return new PromptLibraryMongoRepository(mongoModel as never);
          },
          inject: [
            'STORAGE_TYPE',
            SQLITE_DATABASE,
            { token: getModelToken(PromptLibraryItem.name), optional: true },
          ],
        },
      ],
      exports: [
        WORKFLOW_REPOSITORY,
        EXECUTION_REPOSITORY,
        TEMPLATE_REPOSITORY,
        PROMPT_LIBRARY_REPOSITORY,
      ],
    };
  }
}
