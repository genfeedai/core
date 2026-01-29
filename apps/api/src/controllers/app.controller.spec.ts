import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppController } from '@/controllers/app.controller';

describe('AppController', () => {
  let appController: AppController;

  const mockAppService = {
    getHello: vi.fn().mockReturnValue('Genfeed Core API'),
    getLiveness: vi
      .fn()
      .mockResolvedValue({ alive: true, timestamp: new Date().toISOString(), uptime: 0 }),
    getReadiness: vi
      .fn()
      .mockResolvedValue({
        ready: true,
        timestamp: new Date().toISOString(),
        checks: { database: true, redis: true },
      }),
    getDetailedHealth: vi.fn().mockResolvedValue({ status: 'healthy' }),
    getMetrics: vi.fn().mockResolvedValue({ timestamp: new Date().toISOString() }),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    appController = new AppController(mockAppService as never);
  });

  describe('root', () => {
    it('should return "Genfeed Core API"', () => {
      expect(appController.getHello()).toBe('Genfeed Core API');
    });
  });
});
