import { type DynamicModule, Global, Logger, Module, type Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import type Database from 'better-sqlite3';
import { ExecutionMongoRepository } from '../adapters/mongodb/execution.mongodb';
import { PromptLibraryMongoRepository } from '../adapters/mongodb/prompt-library.mongodb';
import { TemplateMongoRepository } from '../adapters/mongodb/template.mongodb';
import { WorkflowMongoRepository } from '../adapters/mongodb/workflow.mongodb';
import { ExecutionSqliteRepository } from '../adapters/sqlite/execution.sqlite';
import { PromptLibrarySqliteRepository } from '../adapters/sqlite/prompt-library.sqlite';

import { createSqliteDatabase } from '../adapters/sqlite/sqlite.provider';
import { TemplateSqliteRepository } from '../adapters/sqlite/template.sqlite';
import { WorkflowSqliteRepository } from '../adapters/sqlite/workflow.sqlite';
import {
  SQLITE_DATABASE,
  STORAGE_CONFIG,
  StorageAdapterType,
  type StorageConfig,
} from '../factory/storage.constants';
import { StorageFactory } from '../factory/storage.factory';
import { EXECUTION_REPOSITORY } from '../interfaces/execution.repository';
import { PROMPT_LIBRARY_REPOSITORY } from '../interfaces/prompt-library.repository';
import { TEMPLATE_REPOSITORY } from '../interfaces/template.repository';
import { WORKFLOW_REPOSITORY } from '../interfaces/workflow.repository';

@Global()
@Module({})
export class StorageModule {
  private static readonly logger = new Logger('StorageModule');

  /**
   * Register storage configuration. Call this in AppModule imports.
   */
  static forRoot(): DynamicModule {
    return {
      module: StorageModule,
      imports: [ConfigModule],
      providers: [
        StorageFactory,
        {
          provide: STORAGE_CONFIG,
          useFactory: (factory: StorageFactory) => {
            const config = factory.getStorageConfig();
            StorageModule.logger.log(`Storage adapter: ${config.type}`);
            return config;
          },
          inject: [StorageFactory],
        },
      ],
      exports: [STORAGE_CONFIG, StorageFactory],
    };
  }

  /**
   * Register SQLite repositories. Use when STORAGE_ADAPTER=sqlite or no MONGODB_URI.
   */
  static forSqlite(): DynamicModule {
    const providers: Provider[] = [
      {
        provide: SQLITE_DATABASE,
        useFactory: (config: StorageConfig) => {
          return createSqliteDatabase(config);
        },
        inject: [STORAGE_CONFIG],
      },
      {
        provide: WORKFLOW_REPOSITORY,
        useFactory: (db: Database.Database) => new WorkflowSqliteRepository(db),
        inject: [SQLITE_DATABASE],
      },
      {
        provide: EXECUTION_REPOSITORY,
        useFactory: (db: Database.Database) => new ExecutionSqliteRepository(db),
        inject: [SQLITE_DATABASE],
      },
      {
        provide: TEMPLATE_REPOSITORY,
        useFactory: (db: Database.Database) => new TemplateSqliteRepository(db),
        inject: [SQLITE_DATABASE],
      },
      {
        provide: PROMPT_LIBRARY_REPOSITORY,
        useFactory: (db: Database.Database) => new PromptLibrarySqliteRepository(db),
        inject: [SQLITE_DATABASE],
      },
    ];

    return {
      module: StorageModule,
      providers,
      exports: [
        SQLITE_DATABASE,
        WORKFLOW_REPOSITORY,
        EXECUTION_REPOSITORY,
        TEMPLATE_REPOSITORY,
        PROMPT_LIBRARY_REPOSITORY,
      ],
    };
  }

  /**
   * Register MongoDB repositories.
   * Requires MongooseModule.forFeature() to be configured separately.
   */
  static forMongoDB(models: {
    workflowModel: string;
    executionModel: string;
    templateModel: string;
    promptModel: string;
  }): DynamicModule {
    const providers: Provider[] = [
      {
        provide: WORKFLOW_REPOSITORY,
        useFactory: (model: unknown) => new WorkflowMongoRepository(model as never),
        inject: [models.workflowModel],
      },
      {
        provide: EXECUTION_REPOSITORY,
        useFactory: (model: unknown) => new ExecutionMongoRepository(model as never),
        inject: [models.executionModel],
      },
      {
        provide: TEMPLATE_REPOSITORY,
        useFactory: (model: unknown) => new TemplateMongoRepository(model as never),
        inject: [models.templateModel],
      },
      {
        provide: PROMPT_LIBRARY_REPOSITORY,
        useFactory: (model: unknown) => new PromptLibraryMongoRepository(model as never),
        inject: [models.promptModel],
      },
    ];

    return {
      module: StorageModule,
      providers,
      exports: [
        WORKFLOW_REPOSITORY,
        EXECUTION_REPOSITORY,
        TEMPLATE_REPOSITORY,
        PROMPT_LIBRARY_REPOSITORY,
      ],
    };
  }

  /**
   * Dynamically register the appropriate storage based on config.
   * This is the main entry point for automatic adapter selection.
   */
  static forRootAsync(): DynamicModule {
    return {
      module: StorageModule,
      imports: [ConfigModule],
      providers: [
        StorageFactory,
        {
          provide: STORAGE_CONFIG,
          useFactory: (factory: StorageFactory) => {
            const config = factory.getStorageConfig();
            StorageModule.logger.log(`Storage adapter configured: ${config.type}`);
            return config;
          },
          inject: [StorageFactory],
        },
        // SQLite database (created only if using SQLite)
        {
          provide: SQLITE_DATABASE,
          useFactory: (config: StorageConfig) => {
            if (config.type === StorageAdapterType.SQLITE) {
              StorageModule.logger.log(`Initializing SQLite at: ${config.sqlitePath}`);
              return createSqliteDatabase(config);
            }
            return null;
          },
          inject: [STORAGE_CONFIG],
        },
      ],
      exports: [STORAGE_CONFIG, StorageFactory, SQLITE_DATABASE],
    };
  }
}
