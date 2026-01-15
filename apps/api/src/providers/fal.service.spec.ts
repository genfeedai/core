import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FalService } from './fal.service';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('FalService', () => {
  let service: FalService;

  beforeEach(() => {
    service = new FalService();
    mockFetch.mockReset();
  });

  describe('listModels', () => {
    it('should return all models when no filters', () => {
      const models = service.listModels();

      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.provider === 'fal')).toBe(true);
    });

    it('should filter by text-to-image capability', () => {
      const models = service.listModels(['text-to-image']);

      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.capabilities.includes('text-to-image'))).toBe(true);
    });

    it('should filter by text-to-video capability', () => {
      const models = service.listModels(['text-to-video']);

      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.capabilities.includes('text-to-video'))).toBe(true);
    });

    it('should filter by image-to-video capability', () => {
      const models = service.listModels(['image-to-video']);

      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.capabilities.includes('image-to-video'))).toBe(true);
    });

    it('should filter by multiple capabilities', () => {
      const models = service.listModels(['text-to-video', 'image-to-video']);

      expect(models.length).toBeGreaterThan(0);
      models.forEach((m) => {
        const hasTextToVideo = m.capabilities.includes('text-to-video');
        const hasImageToVideo = m.capabilities.includes('image-to-video');
        expect(hasTextToVideo || hasImageToVideo).toBe(true);
      });
    });

    it('should filter by search query', () => {
      const models = service.listModels(undefined, 'flux');

      expect(models.length).toBeGreaterThan(0);
      models.forEach((m) => {
        const matchesQuery =
          m.displayName.toLowerCase().includes('flux') ||
          m.id.toLowerCase().includes('flux') ||
          m.description?.toLowerCase().includes('flux');
        expect(matchesQuery).toBe(true);
      });
    });

    it('should filter by both capabilities and query', () => {
      const models = service.listModels(['text-to-image'], 'stable');

      expect(models.length).toBeGreaterThan(0);
      models.forEach((m) => {
        expect(m.capabilities.includes('text-to-image')).toBe(true);
        const matchesQuery =
          m.displayName.toLowerCase().includes('stable') ||
          m.id.toLowerCase().includes('stable') ||
          m.description?.toLowerCase().includes('stable');
        expect(matchesQuery).toBe(true);
      });
    });

    it('should return empty array for non-matching query', () => {
      const models = service.listModels(undefined, 'nonexistentmodel12345');

      expect(models).toEqual([]);
    });

    it('should return empty array for non-matching capability', () => {
      const models = service.listModels(['nonexistent-capability' as never]);

      expect(models).toEqual([]);
    });
  });

  describe('getModel', () => {
    it('should return model by exact ID', () => {
      const model = service.getModel('fal-ai/flux/dev');

      expect(model).toBeDefined();
      expect(model?.id).toBe('fal-ai/flux/dev');
      expect(model?.displayName).toBe('FLUX.1 [dev]');
    });

    it('should return undefined for unknown model', () => {
      const model = service.getModel('unknown-model-id');

      expect(model).toBeUndefined();
    });

    it('should return FLUX pro model', () => {
      const model = service.getModel('fal-ai/flux-pro');

      expect(model).toBeDefined();
      expect(model?.displayName).toBe('FLUX.1 [pro]');
    });

    it('should return FLUX schnell model', () => {
      const model = service.getModel('fal-ai/flux/schnell');

      expect(model).toBeDefined();
      expect(model?.displayName).toBe('FLUX.1 [schnell]');
    });

    it('should return MiniMax video model', () => {
      const model = service.getModel('fal-ai/minimax/video-01');

      expect(model).toBeDefined();
      expect(model?.capabilities).toContain('text-to-video');
      expect(model?.capabilities).toContain('image-to-video');
    });
  });

  describe('generate', () => {
    it('should make POST request to fal.run', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          images: [{ url: 'https://example.com/image.png', width: 1024, height: 1024 }],
        }),
      });

      const result = await service.generate('fal-ai/flux/dev', {
        prompt: 'A beautiful sunset',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://fal.run/fal-ai/flux/dev',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ prompt: 'A beautiful sunset' }),
        })
      );

      expect(result.images).toHaveLength(1);
      expect(result.images?.[0].url).toBe('https://example.com/image.png');
    });

    it('should include Authorization header when API key provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ images: [] }),
      });

      await service.generate('fal-ai/flux/dev', { prompt: 'test' }, 'fal_api_key_123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Key fal_api_key_123',
          }),
        })
      );
    });

    it('should not include Authorization header without API key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ images: [] }),
      });

      await service.generate('fal-ai/flux/dev', { prompt: 'test' });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers).not.toHaveProperty('Authorization');
    });

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      await expect(service.generate('fal-ai/flux/dev', { prompt: 'test' })).rejects.toThrow(
        'fal.ai generation failed: 500'
      );
    });

    it('should pass additional input parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ images: [] }),
      });

      await service.generate('fal-ai/flux/dev', {
        prompt: 'test',
        image_size: '1024x1024',
        num_images: 2,
        seed: 12345,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            prompt: 'test',
            image_size: '1024x1024',
            num_images: 2,
            seed: 12345,
          }),
        })
      );
    });
  });

  describe('generateAsync', () => {
    it('should make POST request to queue.fal.run', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ request_id: 'req-123' }),
      });

      const result = await service.generateAsync('fal-ai/minimax/video-01', {
        prompt: 'A video of waves',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://queue.fal.run/fal-ai/minimax/video-01',
        expect.objectContaining({
          method: 'POST',
        })
      );

      expect(result.request_id).toBe('req-123');
    });

    it('should include Authorization header when API key provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ request_id: 'req-123' }),
      });

      await service.generateAsync('fal-ai/minimax/video-01', { prompt: 'test' }, 'fal_key');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Key fal_key',
          }),
        })
      );
    });

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      });

      await expect(
        service.generateAsync('fal-ai/minimax/video-01', { prompt: 'test' })
      ).rejects.toThrow('fal.ai async generation failed: 400');
    });
  });

  describe('getStatus', () => {
    it('should check status of async request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'COMPLETED',
          result: { video: { url: 'https://example.com/video.mp4' } },
        }),
      });

      const result = await service.getStatus('fal-ai/minimax/video-01', 'req-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://queue.fal.run/fal-ai/minimax/video-01/requests/req-123/status',
        expect.objectContaining({
          method: 'GET',
        })
      );

      expect(result.status).toBe('COMPLETED');
      expect(result.result?.video?.url).toBe('https://example.com/video.mp4');
    });

    it('should return IN_QUEUE status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'IN_QUEUE' }),
      });

      const result = await service.getStatus('fal-ai/minimax/video-01', 'req-123');

      expect(result.status).toBe('IN_QUEUE');
    });

    it('should return IN_PROGRESS status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'IN_PROGRESS' }),
      });

      const result = await service.getStatus('fal-ai/minimax/video-01', 'req-123');

      expect(result.status).toBe('IN_PROGRESS');
    });

    it('should return FAILED status with error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'FAILED', error: 'Model error' }),
      });

      const result = await service.getStatus('fal-ai/minimax/video-01', 'req-123');

      expect(result.status).toBe('FAILED');
      expect(result.error).toBe('Model error');
    });

    it('should include Authorization header when API key provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'COMPLETED' }),
      });

      await service.getStatus('fal-ai/minimax/video-01', 'req-123', 'fal_key');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Key fal_key',
          }),
        })
      );
    });

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(service.getStatus('fal-ai/minimax/video-01', 'nonexistent')).rejects.toThrow(
        'Failed to get status: 404'
      );
    });
  });

  describe('model data integrity', () => {
    it('should have pricing info for all models', () => {
      const models = service.listModels();

      models.forEach((model) => {
        expect(model.pricing).toBeDefined();
        expect(typeof model.pricing).toBe('string');
      });
    });

    it('should have descriptions for all models', () => {
      const models = service.listModels();

      models.forEach((model) => {
        expect(model.description).toBeDefined();
        expect(model.description?.length).toBeGreaterThan(0);
      });
    });

    it('should have display names for all models', () => {
      const models = service.listModels();

      models.forEach((model) => {
        expect(model.displayName).toBeDefined();
        expect(model.displayName.length).toBeGreaterThan(0);
      });
    });

    it('should have at least one capability per model', () => {
      const models = service.listModels();

      models.forEach((model) => {
        expect(model.capabilities.length).toBeGreaterThan(0);
      });
    });
  });
});
