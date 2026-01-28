import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReplicateController } from '@/controllers/replicate.controller';
import { ReplicateService } from '@/services/replicate.service';

describe('ReplicateController', () => {
  let controller: ReplicateController;
  let _replicateService: ReplicateService;

  const mockReplicateService = {
    generateImage: vi.fn().mockResolvedValue({
      id: 'prediction-123',
      status: 'starting',
    }),
    generateVideo: vi.fn().mockResolvedValue({
      id: 'prediction-456',
      status: 'starting',
    }),
    generateText: vi.fn().mockResolvedValue('Generated text response'),
    getPredictionStatus: vi.fn().mockResolvedValue({
      id: 'prediction-123',
      status: 'succeeded',
      output: ['https://example.com/output.png'],
    }),
    cancelPrediction: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReplicateController],
      providers: [{ provide: ReplicateService, useValue: mockReplicateService }],
    }).compile();

    controller = module.get<ReplicateController>(ReplicateController);
    _replicateService = module.get<ReplicateService>(ReplicateService);
  });

  describe('POST /replicate/image', () => {
    it('should generate an image and return prediction info', async () => {
      const dto = {
        executionId: 'execution-123',
        nodeId: 'node-1',
        model: 'nano-banana' as const,
        prompt: 'A beautiful sunset',
        aspectRatio: '16:9',
      };

      const result = await controller.generateImage(dto);

      expect(result).toEqual({
        predictionId: 'prediction-123',
        status: 'starting',
      });
      expect(mockReplicateService.generateImage).toHaveBeenCalledWith(
        dto.executionId,
        dto.nodeId,
        dto.model,
        {
          prompt: dto.prompt,
          inputImages: undefined,
          aspectRatio: dto.aspectRatio,
          resolution: undefined,
          outputFormat: undefined,
        }
      );
    });

    it('should pass image input when provided', async () => {
      const dto = {
        executionId: 'execution-123',
        nodeId: 'node-1',
        model: 'nano-banana-pro' as const,
        prompt: 'Enhanced image',
        inputImages: ['https://example.com/input.png'],
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
        executionId: 'execution-123',
        nodeId: 'node-1',
        model: 'veo-3.1-fast' as const,
        prompt: 'A dancing cat',
        duration: 5,
      };

      const result = await controller.generateVideo(dto);

      expect(result).toEqual({
        predictionId: 'prediction-456',
        status: 'starting',
      });
      expect(mockReplicateService.generateVideo).toHaveBeenCalledWith(
        dto.executionId,
        dto.nodeId,
        dto.model,
        expect.objectContaining({
          prompt: dto.prompt,
          duration: dto.duration,
        })
      );
    });

    it('should pass all video options when provided', async () => {
      const dto = {
        executionId: 'execution-123',
        nodeId: 'node-1',
        model: 'veo-3.1' as const,
        prompt: 'Cinematic video',
        image: 'https://example.com/start.png',
        lastFrame: 'https://example.com/end.png',
        referenceImages: ['https://example.com/ref1.png'],
        duration: 8,
        aspectRatio: '16:9',
        resolution: '1080p',
        generateAudio: true,
        negativePrompt: 'blurry, low quality',
        seed: 12345,
      };

      await controller.generateVideo(dto);

      expect(mockReplicateService.generateVideo).toHaveBeenCalledWith(
        dto.executionId,
        dto.nodeId,
        dto.model,
        {
          prompt: dto.prompt,
          image: dto.image,
          lastFrame: dto.lastFrame,
          referenceImages: dto.referenceImages,
          duration: dto.duration,
          aspectRatio: dto.aspectRatio,
          resolution: dto.resolution,
          generateAudio: dto.generateAudio,
          negativePrompt: dto.negativePrompt,
          seed: dto.seed,
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
        prompt: dto.prompt,
        systemPrompt: undefined,
        maxTokens: undefined,
        temperature: undefined,
        topP: undefined,
      });
    });

    it('should pass LLM parameters when provided', async () => {
      const dto = {
        prompt: 'Write a story',
        systemPrompt: 'You are a creative writer',
        maxTokens: 1000,
        temperature: 0.8,
        topP: 0.95,
      };

      await controller.generateText(dto);

      expect(mockReplicateService.generateText).toHaveBeenCalledWith({
        prompt: dto.prompt,
        systemPrompt: dto.systemPrompt,
        maxTokens: dto.maxTokens,
        temperature: dto.temperature,
        topP: dto.topP,
      });
    });
  });

  describe('GET /replicate/predictions/:id', () => {
    it('should return prediction status', async () => {
      const result = await controller.getPredictionStatus('prediction-123');

      expect(result).toEqual({
        id: 'prediction-123',
        status: 'succeeded',
        output: ['https://example.com/output.png'],
        error: undefined,
      });
      expect(mockReplicateService.getPredictionStatus).toHaveBeenCalledWith('prediction-123');
    });

    it('should include error when present', async () => {
      mockReplicateService.getPredictionStatus.mockResolvedValue({
        id: 'prediction-123',
        status: 'failed',
        output: null,
        error: 'Model failed',
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
