import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HuggingFaceService } from './huggingface.service';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('HuggingFaceService', () => {
  let service: HuggingFaceService;

  beforeEach(() => {
    service = new HuggingFaceService();
    mockFetch.mockReset();
  });

  describe('listModels', () => {
    it('should return all models when no filters', () => {
      const models = service.listModels();

      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.provider === 'huggingface')).toBe(true);
    });

    it('should filter by text-to-image capability', () => {
      const models = service.listModels(['text-to-image']);

      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.capabilities.includes('text-to-image'))).toBe(true);
    });

    it('should filter by search query', () => {
      const models = service.listModels(undefined, 'stable');

      expect(models.length).toBeGreaterThan(0);
      models.forEach((m) => {
        const matchesQuery =
          m.displayName.toLowerCase().includes('stable') ||
          m.id.toLowerCase().includes('stable') ||
          m.description?.toLowerCase().includes('stable');
        expect(matchesQuery).toBe(true);
      });
    });

    it('should filter by FLUX query', () => {
      const models = service.listModels(undefined, 'flux');

      expect(models.length).toBeGreaterThan(0);
      models.forEach((m) => {
        const matchesQuery =
          m.displayName.toLowerCase().includes('flux') || m.id.toLowerCase().includes('flux');
        expect(matchesQuery).toBe(true);
      });
    });

    it('should filter by both capabilities and query', () => {
      const models = service.listModels(['text-to-image'], 'sdxl');

      models.forEach((m) => {
        expect(m.capabilities.includes('text-to-image')).toBe(true);
        const matchesQuery =
          m.displayName.toLowerCase().includes('sdxl') || m.id.toLowerCase().includes('sdxl');
        expect(matchesQuery).toBe(true);
      });
    });

    it('should return empty array for non-matching query', () => {
      const models = service.listModels(undefined, 'nonexistentmodel12345');

      expect(models).toEqual([]);
    });
  });

  describe('getModel', () => {
    it('should return SDXL model by exact ID', () => {
      const model = service.getModel('stabilityai/stable-diffusion-xl-base-1.0');

      expect(model).toBeDefined();
      expect(model?.id).toBe('stabilityai/stable-diffusion-xl-base-1.0');
      expect(model?.displayName).toBe('Stable Diffusion XL');
    });

    it('should return SD 1.5 model', () => {
      const model = service.getModel('runwayml/stable-diffusion-v1-5');

      expect(model).toBeDefined();
      expect(model?.displayName).toBe('Stable Diffusion 1.5');
    });

    it('should return SD 2.1 model', () => {
      const model = service.getModel('stabilityai/stable-diffusion-2-1');

      expect(model).toBeDefined();
      expect(model?.displayName).toBe('Stable Diffusion 2.1');
    });

    it('should return OpenJourney model', () => {
      const model = service.getModel('prompthero/openjourney-v4');

      expect(model).toBeDefined();
      expect(model?.displayName).toBe('OpenJourney v4');
    });

    it('should return Dreamlike Diffusion model', () => {
      const model = service.getModel('dreamlike-art/dreamlike-diffusion-1.0');

      expect(model).toBeDefined();
      expect(model?.displayName).toBe('Dreamlike Diffusion');
    });

    it('should return Realistic Vision model', () => {
      const model = service.getModel('SG161222/Realistic_Vision_V5.1_noVAE');

      expect(model).toBeDefined();
      expect(model?.displayName).toBe('Realistic Vision 5.1');
    });

    it('should return undefined for unknown model', () => {
      const model = service.getModel('unknown-model-id');

      expect(model).toBeUndefined();
    });
  });

  describe('generateImage', () => {
    it('should make POST request to HuggingFace API', async () => {
      const mockArrayBuffer = new ArrayBuffer(8);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => mockArrayBuffer,
        headers: new Headers({ 'content-type': 'image/png' }),
      });

      const result = await service.generateImage(
        'stabilityai/stable-diffusion-xl-base-1.0',
        'A beautiful landscape',
        'hf_api_key'
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer hf_api_key',
            'Content-Type': 'application/json',
          }),
        })
      );

      expect(result).toMatch(/^data:image\/png;base64,/);
    });

    it('should include parameters in request body', async () => {
      const mockArrayBuffer = new ArrayBuffer(8);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => mockArrayBuffer,
        headers: new Headers({ 'content-type': 'image/png' }),
      });

      await service.generateImage(
        'stabilityai/stable-diffusion-xl-base-1.0',
        'test prompt',
        'hf_key',
        {
          negative_prompt: 'ugly, blurry',
          width: 1024,
          height: 1024,
          num_inference_steps: 30,
          guidance_scale: 7.5,
          seed: 42,
        }
      );

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.inputs).toBe('test prompt');
      expect(callBody.parameters.negative_prompt).toBe('ugly, blurry');
      expect(callBody.parameters.width).toBe(1024);
      expect(callBody.parameters.height).toBe(1024);
      expect(callBody.parameters.num_inference_steps).toBe(30);
      expect(callBody.parameters.guidance_scale).toBe(7.5);
      expect(callBody.parameters.seed).toBe(42);
      expect(callBody.options.wait_for_model).toBe(true);
    });

    it('should throw error when model is loading (503)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => 'Model is loading',
      });

      await expect(service.generateImage('model', 'prompt', 'key')).rejects.toThrow(
        'Model is loading. Please try again in a moment.'
      );
    });

    it('should throw error for invalid API key (401)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Invalid token',
      });

      await expect(service.generateImage('model', 'prompt', 'invalid_key')).rejects.toThrow(
        'Invalid API key'
      );
    });

    it('should throw generic error for other failures', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal error',
      });

      await expect(service.generateImage('model', 'prompt', 'key')).rejects.toThrow(
        'Hugging Face generation failed: 500'
      );
    });

    it('should return base64 image with correct content type', async () => {
      // Create mock binary data
      const mockData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG magic bytes
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => mockData.buffer,
        headers: new Headers({ 'content-type': 'image/jpeg' }),
      });

      const result = await service.generateImage('model', 'prompt', 'key');

      expect(result).toMatch(/^data:image\/jpeg;base64,/);
    });

    it('should default to image/png when no content-type header', async () => {
      const mockData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => mockData.buffer,
        headers: new Headers(), // No content-type
      });

      const result = await service.generateImage('model', 'prompt', 'key');

      expect(result).toMatch(/^data:image\/png;base64,/);
    });
  });

  describe('checkModelStatus', () => {
    it('should return true when model is available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const isAvailable = await service.checkModelStatus('model-id', 'key');

      expect(isAvailable).toBe(true);
    });

    it('should return false when model is loading (503)', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 503,
      });

      const isAvailable = await service.checkModelStatus('model-id', 'key');

      expect(isAvailable).toBe(false);
    });

    it('should return false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const isAvailable = await service.checkModelStatus('model-id', 'key');

      expect(isAvailable).toBe(false);
    });

    it('should send minimal test request', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      await service.checkModelStatus('model-id', 'api_key');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.inputs).toBe('test');
      expect(callBody.options.wait_for_model).toBe(false);
    });
  });

  describe('getModelInfo', () => {
    it('should fetch model info from HuggingFace API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'stabilityai/stable-diffusion-xl-base-1.0',
          downloads: 1000000,
          likes: 5000,
          tags: ['text-to-image', 'diffusion'],
        }),
      });

      const info = await service.getModelInfo('stabilityai/stable-diffusion-xl-base-1.0');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://huggingface.co/api/models/stabilityai/stable-diffusion-xl-base-1.0',
        expect.objectContaining({
          headers: {},
        })
      );

      expect(info?.id).toBe('stabilityai/stable-diffusion-xl-base-1.0');
      expect(info?.downloads).toBe(1000000);
      expect(info?.likes).toBe(5000);
    });

    it('should include Authorization header when API key provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'model' }),
      });

      await service.getModelInfo('model-id', 'hf_api_key');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { Authorization: 'Bearer hf_api_key' },
        })
      );
    });

    it('should return null on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const info = await service.getModelInfo('nonexistent-model');

      expect(info).toBeNull();
    });

    it('should return null on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const info = await service.getModelInfo('model-id');

      expect(info).toBeNull();
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

    it('should have valid huggingface IDs (owner/model format)', () => {
      const models = service.listModels();

      models.forEach((model) => {
        expect(model.id).toMatch(/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+$/);
      });
    });

    it('should have at least one capability per model', () => {
      const models = service.listModels();

      models.forEach((model) => {
        expect(model.capabilities.length).toBeGreaterThan(0);
      });
    });

    it('should have all models as text-to-image capable', () => {
      const models = service.listModels();

      // All current HF models are text-to-image
      models.forEach((model) => {
        expect(model.capabilities).toContain('text-to-image');
      });
    });
  });
});
