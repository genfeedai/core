import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageAdapterType } from './storage.constants';
import { StorageFactory } from './storage.factory';

describe('StorageFactory', () => {
  let factory: StorageFactory;
  let mockConfigService: {
    get: ReturnType<typeof vi.fn>;
    getOrThrow: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn(),
      getOrThrow: vi.fn(),
    };
    factory = new StorageFactory(mockConfigService as never);
  });

  describe('getStorageConfig', () => {
    it('should return SQLite config when no env vars set', () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'SQLITE_PATH') return defaultValue ?? './data/genfeed.db';
        if (key === 'STORAGE_DEBUG') return false;
        return undefined;
      });

      const config = factory.getStorageConfig();

      expect(config.type).toBe(StorageAdapterType.SQLITE);
      expect(config.sqlitePath).toBe('./data/genfeed.db');
    });

    it('should return MongoDB config when MONGODB_URI is set', () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'MONGODB_URI') return 'mongodb://localhost:27017/test';
        if (key === 'STORAGE_DEBUG') return false;
        return defaultValue;
      });

      const config = factory.getStorageConfig();

      expect(config.type).toBe(StorageAdapterType.MONGODB);
      expect(config.connectionUri).toBe('mongodb://localhost:27017/test');
    });

    it('should use explicit STORAGE_ADAPTER when set', () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'STORAGE_ADAPTER') return 'mongodb';
        if (key === 'STORAGE_DEBUG') return false;
        return defaultValue;
      });
      mockConfigService.getOrThrow.mockImplementation((key: string) => {
        if (key === 'MONGODB_URI') return 'mongodb://localhost:27017/explicit';
        throw new Error(`Missing ${key}`);
      });

      const config = factory.getStorageConfig();

      expect(config.type).toBe(StorageAdapterType.MONGODB);
    });

    it('should prioritize STORAGE_ADAPTER over MONGODB_URI', () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'STORAGE_ADAPTER') return 'sqlite';
        if (key === 'MONGODB_URI') return 'mongodb://localhost:27017/test';
        if (key === 'SQLITE_PATH') return './custom.db';
        if (key === 'STORAGE_DEBUG') return false;
        return defaultValue;
      });

      const config = factory.getStorageConfig();

      expect(config.type).toBe(StorageAdapterType.SQLITE);
      expect(config.sqlitePath).toBe('./custom.db');
    });

    it('should include debug flag from environment', () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'STORAGE_DEBUG') return true;
        if (key === 'SQLITE_PATH') return defaultValue;
        return undefined;
      });

      const config = factory.getStorageConfig();

      expect(config.debug).toBe(true);
    });

    it('should use custom SQLITE_PATH when provided', () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'SQLITE_PATH') return '/custom/path/db.sqlite';
        if (key === 'STORAGE_DEBUG') return false;
        return defaultValue;
      });

      const config = factory.getStorageConfig();

      expect(config.type).toBe(StorageAdapterType.SQLITE);
      expect(config.sqlitePath).toBe('/custom/path/db.sqlite');
    });

    it('should return Postgres config when STORAGE_ADAPTER is postgres', () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'STORAGE_ADAPTER') return 'postgres';
        if (key === 'STORAGE_DEBUG') return false;
        return defaultValue;
      });
      mockConfigService.getOrThrow.mockImplementation((key: string) => {
        if (key === 'POSTGRES_URI') return 'postgresql://localhost:5432/test';
        throw new Error(`Missing ${key}`);
      });

      const config = factory.getStorageConfig();

      expect(config.type).toBe(StorageAdapterType.POSTGRES);
      expect(config.connectionUri).toBe('postgresql://localhost:5432/test');
    });

    it('should return Supabase config when STORAGE_ADAPTER is supabase', () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'STORAGE_ADAPTER') return 'supabase';
        if (key === 'STORAGE_DEBUG') return false;
        return defaultValue;
      });
      mockConfigService.getOrThrow.mockImplementation((key: string) => {
        if (key === 'SUPABASE_URL') return 'https://xyz.supabase.co';
        throw new Error(`Missing ${key}`);
      });

      const config = factory.getStorageConfig();

      expect(config.type).toBe(StorageAdapterType.SUPABASE);
      expect(config.connectionUri).toBe('https://xyz.supabase.co');
    });

    it('should throw for unsupported adapter', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'STORAGE_ADAPTER') return 'unsupported';
        return undefined;
      });

      expect(() => factory.getStorageConfig()).toThrow('Unsupported storage adapter: unsupported');
    });

    it('should throw when required connection URI is missing', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'STORAGE_ADAPTER') return 'mongodb';
        return undefined;
      });
      mockConfigService.getOrThrow.mockImplementation((key: string) => {
        throw new Error(`Missing required config: ${key}`);
      });

      expect(() => factory.getStorageConfig()).toThrow('Missing required config: MONGODB_URI');
    });
  });
});
