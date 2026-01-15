import { Injectable } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { StorageAdapterType, type StorageConfig } from './storage.constants';

@Injectable()
export class StorageFactory {
  constructor(private configService: ConfigService) {}

  /**
   * Determines which storage adapter to use based on environment variables.
   *
   * Priority:
   * 1. STORAGE_ADAPTER env var (explicit override)
   * 2. MONGODB_URI present = MongoDB
   * 3. Default = SQLite
   */
  getStorageConfig(): StorageConfig {
    const explicitAdapter = this.configService.get<string>('STORAGE_ADAPTER');

    if (explicitAdapter) {
      return this.buildConfigForAdapter(explicitAdapter as StorageAdapterType);
    }

    const mongoUri = this.configService.get<string>('MONGODB_URI');
    if (mongoUri) {
      return {
        type: StorageAdapterType.MONGODB,
        connectionUri: mongoUri,
        debug: this.configService.get<boolean>('STORAGE_DEBUG', false),
      };
    }

    return {
      type: StorageAdapterType.SQLITE,
      sqlitePath: this.configService.get<string>('SQLITE_PATH', './data/genfeed.db'),
      debug: this.configService.get<boolean>('STORAGE_DEBUG', false),
    };
  }

  private buildConfigForAdapter(adapter: StorageAdapterType): StorageConfig {
    switch (adapter) {
      case StorageAdapterType.MONGODB:
        return {
          type: StorageAdapterType.MONGODB,
          connectionUri: this.configService.getOrThrow<string>('MONGODB_URI'),
          debug: this.configService.get<boolean>('STORAGE_DEBUG', false),
        };

      case StorageAdapterType.SQLITE:
        return {
          type: StorageAdapterType.SQLITE,
          sqlitePath: this.configService.get<string>('SQLITE_PATH', './data/genfeed.db'),
          debug: this.configService.get<boolean>('STORAGE_DEBUG', false),
        };

      case StorageAdapterType.POSTGRES:
        return {
          type: StorageAdapterType.POSTGRES,
          connectionUri: this.configService.getOrThrow<string>('POSTGRES_URI'),
          debug: this.configService.get<boolean>('STORAGE_DEBUG', false),
        };

      case StorageAdapterType.SUPABASE:
        return {
          type: StorageAdapterType.SUPABASE,
          connectionUri: this.configService.getOrThrow<string>('SUPABASE_URL'),
          debug: this.configService.get<boolean>('STORAGE_DEBUG', false),
        };

      default:
        throw new Error(`Unsupported storage adapter: ${adapter}`);
    }
  }
}
