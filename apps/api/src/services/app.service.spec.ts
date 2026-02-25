import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppService } from '@/services/app.service';

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(function queueConstructor(this: unknown) {
    return {
      getActiveCount: vi.fn().mockResolvedValue(0),
      getCompletedCount: vi.fn().mockResolvedValue(0),
      getFailedCount: vi.fn().mockResolvedValue(0),
      getWaitingCount: vi.fn().mockResolvedValue(0),
    };
  }),
}));

describe('AppService', () => {
  let service: AppService;

  const mockConnection = {
    db: {
      collection: vi.fn().mockReturnValue({
        countDocuments: vi.fn().mockResolvedValue(0),
      }),
      command: vi.fn().mockResolvedValue({ ok: 1 }),
    },
    readyState: 1,
  };

  const mockConfigService = {
    get: vi.fn().mockImplementation((_key: string, defaultValue: unknown) => defaultValue),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    service = new AppService(mockConnection as never, mockConfigService as never);
  });

  describe('getHello', () => {
    it('should return "Genfeed Core API"', () => {
      expect(service.getHello()).toBe('Genfeed Core API');
    });
  });
});
