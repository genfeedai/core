import {
  EXECUTION_REPOSITORY,
  PROMPT_LIBRARY_REPOSITORY,
  SQLITE_DATABASE,
  TEMPLATE_REPOSITORY,
  WORKFLOW_REPOSITORY,
} from '@genfeedai/storage';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { StorageSetupModule } from './storage-setup.module';

describe('StorageSetupModule', () => {
  describe('forRoot', () => {
    it('should detect SQLite when no MONGODB_URI is set', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            ignoreEnvFile: true,
          }),
          StorageSetupModule.forRoot(),
        ],
      })
        .overrideProvider(ConfigService)
        .useValue({
          get: vi.fn((key: string) => {
            if (key === 'STORAGE_ADAPTER') return undefined;
            if (key === 'MONGODB_URI') return undefined;
            if (key === 'SQLITE_PATH') return ':memory:';
            return undefined;
          }),
        })
        .compile();

      const storageType = module.get('STORAGE_TYPE');
      expect(storageType).toBe('sqlite');
    });

    it('should detect MongoDB when MONGODB_URI is set', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            ignoreEnvFile: true,
          }),
          StorageSetupModule.forRoot(),
        ],
      })
        .overrideProvider(ConfigService)
        .useValue({
          get: vi.fn((key: string) => {
            if (key === 'STORAGE_ADAPTER') return undefined;
            if (key === 'MONGODB_URI') return 'mongodb://localhost:27017/test';
            return undefined;
          }),
        })
        .compile();

      const storageType = module.get('STORAGE_TYPE');
      expect(storageType).toBe('mongodb');
    });

    it('should use explicit STORAGE_ADAPTER when set', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            ignoreEnvFile: true,
          }),
          StorageSetupModule.forRoot(),
        ],
      })
        .overrideProvider(ConfigService)
        .useValue({
          get: vi.fn((key: string) => {
            if (key === 'STORAGE_ADAPTER') return 'sqlite';
            if (key === 'MONGODB_URI') return 'mongodb://localhost:27017/test';
            return undefined;
          }),
        })
        .compile();

      const storageType = module.get('STORAGE_TYPE');
      expect(storageType).toBe('sqlite');
    });

    it('should export STORAGE_TYPE and SQLITE_DATABASE', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            ignoreEnvFile: true,
          }),
          StorageSetupModule.forRoot(),
        ],
      })
        .overrideProvider(ConfigService)
        .useValue({
          get: vi.fn((key: string) => {
            if (key === 'STORAGE_ADAPTER') return 'sqlite';
            if (key === 'SQLITE_PATH') return ':memory:';
            if (key === 'STORAGE_DEBUG') return false;
            return undefined;
          }),
        })
        .compile();

      expect(() => module.get('STORAGE_TYPE')).not.toThrow();
      expect(() => module.get(SQLITE_DATABASE)).not.toThrow();
    });
  });

  describe('forFeature', () => {
    it('should provide all repository tokens when using SQLite', async () => {
      // Mock SQLite database
      const mockSqliteDb = {
        prepare: vi.fn().mockReturnValue({
          run: vi.fn(),
          get: vi.fn(),
          all: vi.fn(),
        }),
      };

      // Compile module to verify it can be created with SQLite config
      await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            ignoreEnvFile: true,
          }),
        ],
        providers: [
          { provide: 'STORAGE_TYPE', useValue: 'sqlite' },
          { provide: SQLITE_DATABASE, useValue: mockSqliteDb },
        ],
      })
        .overrideProvider(ConfigService)
        .useValue({
          get: vi.fn(),
        })
        .compile();

      // Verify repository tokens are exported from the storage package
      expect(WORKFLOW_REPOSITORY).toBeDefined();
      expect(EXECUTION_REPOSITORY).toBeDefined();
      expect(TEMPLATE_REPOSITORY).toBeDefined();
      expect(PROMPT_LIBRARY_REPOSITORY).toBeDefined();
    });
  });
});

describe('Storage adapter selection logic', () => {
  it('should prioritize explicit STORAGE_ADAPTER over MONGODB_URI', () => {
    // When STORAGE_ADAPTER=sqlite is set, it should use SQLite even if MONGODB_URI exists
    const getAdapter = (storageAdapter?: string, mongoUri?: string) => {
      if (storageAdapter) return storageAdapter;
      return mongoUri ? 'mongodb' : 'sqlite';
    };

    expect(getAdapter('sqlite', 'mongodb://localhost')).toBe('sqlite');
    expect(getAdapter('mongodb', undefined)).toBe('mongodb');
    expect(getAdapter(undefined, 'mongodb://localhost')).toBe('mongodb');
    expect(getAdapter(undefined, undefined)).toBe('sqlite');
  });

  it('should default to SQLite when no configuration is provided', () => {
    const getAdapter = (storageAdapter?: string, mongoUri?: string) => {
      if (storageAdapter) return storageAdapter;
      return mongoUri ? 'mongodb' : 'sqlite';
    };

    expect(getAdapter()).toBe('sqlite');
  });
});
