import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppService } from '@/services/app.service';

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    getWaitingCount: vi.fn().mockResolvedValue(0),
    getActiveCount: vi.fn().mockResolvedValue(0),
    getCompletedCount: vi.fn().mockResolvedValue(0),
    getFailedCount: vi.fn().mockResolvedValue(0),
  })),
}));

describe('AppService', () => {
  let service: AppService;

  const mockConnection = {
    readyState: 1,
    db: {
      command: vi.fn().mockResolvedValue({ ok: 1 }),
      collection: vi.fn().mockReturnValue({
        countDocuments: vi.fn().mockResolvedValue(0),
      }),
    },
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
