import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FalService } from './fal.service';
import { HuggingFaceService } from './huggingface.service';
import { ProvidersController } from './providers.controller';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ProvidersController', () => {
  let controller: ProvidersController;
  let falService: FalService;
  let huggingFaceService: HuggingFaceService;

  beforeEach(() => {
    falService = new FalService();
    huggingFaceService = new HuggingFaceService();
    controller = new ProvidersController(falService, huggingFaceService);
    mockFetch.mockReset();
  });

  describe('listModels', () => {
    it('should return models from all providers when no filter', () => {
      const models = controller.listModels({});

      expect(models.length).toBeGreaterThan(0);

      // Should have models from all three providers
      const providers = [...new Set(models.map((m) => m.provider))];
      expect(providers).toContain('replicate');
      expect(providers).toContain('fal');
      expect(providers).toContain('huggingface');
    });

    it('should filter by replicate provider', () => {
      const models = controller.listModels({ provider: 'replicate' });

      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.provider === 'replicate')).toBe(true);
    });

    it('should filter by fal provider', () => {
      const models = controller.listModels({ provider: 'fal' });

      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.provider === 'fal')).toBe(true);
    });

    it('should filter by huggingface provider', () => {
      const models = controller.listModels({ provider: 'huggingface' });

      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.provider === 'huggingface')).toBe(true);
    });

    it('should filter by text-to-image capability', () => {
      const models = controller.listModels({ capabilities: 'text-to-image' });

      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.capabilities.includes('text-to-image'))).toBe(true);
    });

    it('should filter by text-to-video capability', () => {
      const models = controller.listModels({ capabilities: 'text-to-video' });

      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.capabilities.includes('text-to-video'))).toBe(true);
    });

    it('should filter by image-to-video capability', () => {
      const models = controller.listModels({ capabilities: 'image-to-video' });

      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.capabilities.includes('image-to-video'))).toBe(true);
    });

    it('should filter by multiple capabilities', () => {
      const models = controller.listModels({ capabilities: 'text-to-video,image-to-video' });

      expect(models.length).toBeGreaterThan(0);
      models.forEach((m) => {
        const hasTextToVideo = m.capabilities.includes('text-to-video');
        const hasImageToVideo = m.capabilities.includes('image-to-video');
        expect(hasTextToVideo || hasImageToVideo).toBe(true);
      });
    });

    it('should filter by search query', () => {
      const models = controller.listModels({ query: 'nano' });

      expect(models.length).toBeGreaterThan(0);
      models.forEach((m) => {
        const matchesQuery =
          m.displayName.toLowerCase().includes('nano') ||
          m.id.toLowerCase().includes('nano') ||
          m.description?.toLowerCase().includes('nano');
        expect(matchesQuery).toBe(true);
      });
    });

    it('should combine provider and capability filters', () => {
      const models = controller.listModels({
        provider: 'replicate',
        capabilities: 'text-to-image',
      });

      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.provider === 'replicate')).toBe(true);
      expect(models.every((m) => m.capabilities.includes('text-to-image'))).toBe(true);
    });

    it('should return Replicate processing models', () => {
      const models = controller.listModels({ provider: 'replicate' });

      const lumaReframe = models.find((m) => m.id === 'luma/reframe-image');
      expect(lumaReframe).toBeDefined();
      expect(lumaReframe?.displayName).toBe('Luma Reframe Image');

      const topazUpscale = models.find((m) => m.id === 'topazlabs/image-upscale');
      expect(topazUpscale).toBeDefined();
    });

    it('should return empty array for unknown provider', () => {
      const models = controller.listModels({ provider: 'unknown' as never });

      expect(models).toEqual([]);
    });
  });

  describe('getModel', () => {
    it('should get model by provider and ID for replicate', () => {
      const model = controller.getModel('replicate', 'google/nano-banana');

      expect(model).toBeDefined();
      expect(model?.id).toBe('google/nano-banana');
    });

    it('should get model by provider and ID for fal', () => {
      const model = controller.getModel('fal', 'fal-ai/flux/dev');

      expect(model).toBeDefined();
      expect(model?.id).toBe('fal-ai/flux/dev');
    });

    it('should get model by provider and ID for huggingface', () => {
      const model = controller.getModel('huggingface', 'stabilityai/stable-diffusion-xl-base-1.0');

      expect(model).toBeDefined();
      expect(model?.id).toBe('stabilityai/stable-diffusion-xl-base-1.0');
    });

    it('should return undefined for unknown model', () => {
      const model = controller.getModel('replicate', 'unknown-model');

      expect(model).toBeUndefined();
    });

    it('should return undefined for unknown provider', () => {
      const model = controller.getModel('unknown' as never, 'some-model');

      expect(model).toBeUndefined();
    });
  });

  describe('validateKey', () => {
    describe('replicate', () => {
      it('should return valid=false when no key provided', async () => {
        const result = await controller.validateKey('replicate');

        expect(result.valid).toBe(false);
        expect(result.message).toBe('No API key provided');
      });

      it('should validate replicate key successfully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
        });

        const result = await controller.validateKey(
          'replicate',
          'r8_valid_key',
          undefined,
          undefined
        );

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.replicate.com/v1/account',
          expect.objectContaining({
            headers: { Authorization: 'Token r8_valid_key' },
          })
        );

        expect(result.valid).toBe(true);
      });

      it('should return invalid for bad replicate key', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
        });

        const result = await controller.validateKey('replicate', 'invalid_key');

        expect(result.valid).toBe(false);
      });

      it('should handle network error', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const result = await controller.validateKey('replicate', 'some_key');

        expect(result.valid).toBe(false);
        expect(result.message).toBe('Failed to validate key');
      });
    });

    describe('fal', () => {
      it('should return valid=true when no key (rate-limited access)', async () => {
        const result = await controller.validateKey('fal');

        expect(result.valid).toBe(true);
        expect(result.message).toBe('fal.ai works without API key (rate-limited)');
      });

      it('should validate fal key successfully', async () => {
        mockFetch.mockResolvedValueOnce({
          status: 400, // 400 means key is valid but request was bad
        });

        const result = await controller.validateKey('fal', undefined, 'fal_valid_key', undefined);

        expect(result.valid).toBe(true);
      });

      it('should return invalid for bad fal key (401)', async () => {
        mockFetch.mockResolvedValueOnce({
          status: 401,
        });

        const result = await controller.validateKey('fal', undefined, 'invalid_fal_key');

        expect(result.valid).toBe(false);
      });

      it('should handle network error', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const result = await controller.validateKey('fal', undefined, 'some_key');

        expect(result.valid).toBe(false);
        expect(result.message).toBe('Failed to validate key');
      });
    });

    describe('huggingface', () => {
      it('should return valid=false when no key provided', async () => {
        const result = await controller.validateKey('huggingface');

        expect(result.valid).toBe(false);
        expect(result.message).toBe('No API key provided');
      });

      it('should validate huggingface key successfully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
        });

        const result = await controller.validateKey(
          'huggingface',
          undefined,
          undefined,
          'hf_valid_key'
        );

        expect(mockFetch).toHaveBeenCalledWith(
          'https://huggingface.co/api/whoami-v2',
          expect.objectContaining({
            headers: { Authorization: 'Bearer hf_valid_key' },
          })
        );

        expect(result.valid).toBe(true);
      });

      it('should return invalid for bad huggingface key', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
        });

        const result = await controller.validateKey('huggingface', undefined, undefined, 'bad_key');

        expect(result.valid).toBe(false);
      });

      it('should handle network error', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const result = await controller.validateKey(
          'huggingface',
          undefined,
          undefined,
          'some_key'
        );

        expect(result.valid).toBe(false);
        expect(result.message).toBe('Failed to validate key');
      });
    });

    describe('unknown provider', () => {
      it('should return invalid for unknown provider', async () => {
        const result = await controller.validateKey('unknown' as never);

        expect(result.valid).toBe(false);
        expect(result.message).toBe('Unknown provider');
      });
    });
  });

  describe('Replicate models data', () => {
    it('should include Nano Banana models', () => {
      const models = controller.listModels({ provider: 'replicate' });

      const nanoBanana = models.find((m) => m.id === 'google/nano-banana');
      expect(nanoBanana).toBeDefined();
      expect(nanoBanana?.displayName).toBe('Nano Banana');

      const nanoBananaPro = models.find((m) => m.id === 'google/nano-banana-pro');
      expect(nanoBananaPro).toBeDefined();
      expect(nanoBananaPro?.displayName).toBe('Nano Banana Pro');
    });

    it('should include Veo video models', () => {
      const models = controller.listModels({ provider: 'replicate' });

      const veoFast = models.find((m) => m.id === 'google/veo-3.1-fast');
      expect(veoFast).toBeDefined();
      expect(veoFast?.capabilities).toContain('text-to-video');
      expect(veoFast?.capabilities).toContain('image-to-video');

      const veo = models.find((m) => m.id === 'google/veo-3.1');
      expect(veo).toBeDefined();
    });

    it('should include Luma Reframe models', () => {
      const models = controller.listModels({ provider: 'replicate' });

      const lumaImage = models.find((m) => m.id === 'luma/reframe-image');
      expect(lumaImage).toBeDefined();
      expect(lumaImage?.capabilities).toContain('image-to-image');

      const lumaVideo = models.find((m) => m.id === 'luma/reframe-video');
      expect(lumaVideo).toBeDefined();
    });

    it('should include Topaz upscale models', () => {
      const models = controller.listModels({ provider: 'replicate' });

      const topazImage = models.find((m) => m.id === 'topazlabs/image-upscale');
      expect(topazImage).toBeDefined();
      expect(topazImage?.capabilities).toContain('image-to-image');

      const topazVideo = models.find((m) => m.id === 'topazlabs/video-upscale');
      expect(topazVideo).toBeDefined();
    });

    it('should have pricing info for all replicate models', () => {
      const models = controller.listModels({ provider: 'replicate' });

      models.forEach((model) => {
        expect(model.pricing).toBeDefined();
        expect(typeof model.pricing).toBe('string');
      });
    });
  });
});
