import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppController } from '@/controllers/app.controller';

describe('AppController', () => {
  let appController: AppController;

  const mockAppService = {
    getDetailedHealth: vi.fn().mockResolvedValue({ status: 'healthy' }),
    getHello: vi.fn().mockReturnValue('Genfeed Core API'),
    getLiveness: vi
      .fn()
      .mockResolvedValue({ alive: true, timestamp: new Date().toISOString(), uptime: 0 }),
    getMetrics: vi.fn().mockResolvedValue({ timestamp: new Date().toISOString() }),
    getReadiness: vi.fn().mockResolvedValue({
      checks: { database: true, redis: true },
      ready: true,
      timestamp: new Date().toISOString(),
    }),
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
