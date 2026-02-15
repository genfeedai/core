import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReplicateController } from '@/controllers/replicate.controller';

describe('ReplicateController', () => {
  let controller: ReplicateController;

  const mockReplicateService = {
    cancelPrediction: vi.fn().mockResolvedValue(undefined),
    generateImage: vi.fn().mockResolvedValue({
      debugPayload: undefined,
      id: 'prediction-123',
      output: undefined,
      status: 'starting',
    }),
    generateText: vi.fn().mockResolvedValue('Generated text response'),
    generateVideo: vi.fn().mockResolvedValue({
      debugPayload: undefined,
      id: 'prediction-456',
      output: undefined,
      status: 'starting',
    }),
    getPredictionStatus: vi.fn().mockResolvedValue({
      error: undefined,
      id: 'prediction-123',
      output: ['https://example.com/output.png'],
      status: 'succeeded',
    }),
  };

  const mockFilesService = {
    downloadAndSaveMultipleOutputs: vi.fn(),
    downloadAndSaveOutput: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    controller = new ReplicateController(mockReplicateService as never, mockFilesService as never);
  });

  describe('POST /replicate/image', () => {
    it('should generate an image and return prediction info', async () => {
      const dto = {
        aspectRatio: '16:9',
        executionId: 'execution-123',
        model: 'nano-banana' as const,
        nodeId: 'node-1',
        prompt: 'A beautiful sunset',
      };

      const result = await controller.generateImage(dto);

      expect(result).toEqual({
        debugPayload: undefined,
        output: undefined,
        predictionId: 'prediction-123',
        status: 'starting',
      });
      expect(mockReplicateService.generateImage).toHaveBeenCalledWith(
        dto.executionId,
        dto.nodeId,
        dto.model,
        {
          aspectRatio: dto.aspectRatio,
          debugMode: undefined,
          inputImages: undefined,
          outputFormat: undefined,
          prompt: dto.prompt,
          resolution: undefined,
          schemaParams: undefined,
          selectedModel: undefined,
        }
      );
    });

    it('should pass image input when provided', async () => {
      const dto = {
        executionId: 'execution-123',
        inputImages: ['https://example.com/input.png'],
        model: 'nano-banana-pro' as const,
        nodeId: 'node-1',
        prompt: 'Enhanced image',
      };

      await controller.generateImage(dto);

      expect(mockReplicateService.generateImage).toHaveBeenCalledWith(
        dto.executionId,
        dto.nodeId,
        dto.model,
        expect.objectContaining({
          inputImages: dto.inputImages,
        })
      );
    });
  });

  describe('POST /replicate/video', () => {
    it('should generate a video and return prediction info', async () => {
      const dto = {
        duration: 5,
        executionId: 'execution-123',
        model: 'veo-3.1-fast' as const,
        nodeId: 'node-1',
        prompt: 'A dancing cat',
      };

      const result = await controller.generateVideo(dto);

      expect(result).toEqual({
        debugPayload: undefined,
        output: undefined,
        predictionId: 'prediction-456',
        status: 'starting',
      });
      expect(mockReplicateService.generateVideo).toHaveBeenCalledWith(
        dto.executionId,
        dto.nodeId,
        dto.model,
        expect.objectContaining({
          duration: dto.duration,
          prompt: dto.prompt,
        })
      );
    });

    it('should pass all video options when provided', async () => {
      const dto = {
        aspectRatio: '16:9',
        duration: 8,
        executionId: 'execution-123',
        generateAudio: true,
        image: 'https://example.com/start.png',
        lastFrame: 'https://example.com/end.png',
        model: 'veo-3.1' as const,
        negativePrompt: 'blurry, low quality',
        nodeId: 'node-1',
        prompt: 'Cinematic video',
        referenceImages: ['https://example.com/ref1.png'],
        resolution: '1080p',
        seed: 12345,
      };

      await controller.generateVideo(dto);

      expect(mockReplicateService.generateVideo).toHaveBeenCalledWith(
        dto.executionId,
        dto.nodeId,
        dto.model,
        {
          aspectRatio: dto.aspectRatio,
          debugMode: undefined,
          duration: dto.duration,
          generateAudio: dto.generateAudio,
          image: dto.image,
          lastFrame: dto.lastFrame,
          negativePrompt: dto.negativePrompt,
          prompt: dto.prompt,
          referenceImages: dto.referenceImages,
          resolution: dto.resolution,
          schemaParams: undefined,
          seed: dto.seed,
          selectedModel: undefined,
        }
      );
    });
  });

  describe('POST /replicate/llm', () => {
    it('should generate text and return output', async () => {
      const dto = {
        prompt: 'Write a haiku',
      };

      const result = await controller.generateText(dto);

      expect(result).toEqual({
        output: 'Generated text response',
        status: 'succeeded',
      });
      expect(mockReplicateService.generateText).toHaveBeenCalledWith({
        maxTokens: undefined,
        prompt: dto.prompt,
        systemPrompt: undefined,
        temperature: undefined,
        topP: undefined,
      });
    });

    it('should pass LLM parameters when provided', async () => {
      const dto = {
        maxTokens: 1000,
        prompt: 'Write a story',
        systemPrompt: 'You are a creative writer',
        temperature: 0.8,
        topP: 0.95,
      };

      await controller.generateText(dto);

      expect(mockReplicateService.generateText).toHaveBeenCalledWith({
        maxTokens: dto.maxTokens,
        prompt: dto.prompt,
        systemPrompt: dto.systemPrompt,
        temperature: dto.temperature,
        topP: dto.topP,
      });
    });
  });

  describe('GET /replicate/predictions/:id', () => {
    it('should return prediction status', async () => {
      const result = await controller.getPredictionStatus('prediction-123');

      expect(result).toEqual({
        error: undefined,
        id: 'prediction-123',
        output: ['https://example.com/output.png'],
        status: 'succeeded',
      });
      expect(mockReplicateService.getPredictionStatus).toHaveBeenCalledWith('prediction-123');
    });

    it('should include error when present', async () => {
      mockReplicateService.getPredictionStatus.mockResolvedValue({
        error: 'Model failed',
        id: 'prediction-123',
        output: null,
        status: 'failed',
      });

      const result = await controller.getPredictionStatus('prediction-123');

      expect(result.error).toBe('Model failed');
    });
  });

  describe('POST /replicate/predictions/:id/cancel', () => {
    it('should cancel a prediction', async () => {
      const result = await controller.cancelPrediction('prediction-123');

      expect(result).toEqual({ cancelled: true });
      expect(mockReplicateService.cancelPrediction).toHaveBeenCalledWith('prediction-123');
    });
  });
});
