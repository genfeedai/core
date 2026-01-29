import { PRICING } from '@genfeedai/core';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CostCalculatorService } from '@/services/cost-calculator.service';
import { ExecutionsService } from '@/services/executions.service';
import { FilesService } from '@/services/files.service';
import { ReplicateService } from '@/services/replicate.service';
import { SchemaMapperService } from '@/services/schema-mapper.service';
import { WorkflowsService } from '@/services/workflows.service';
import { mockReplicateClient } from '@/test/mocks/replicate.mock';

describe('ReplicateService', () => {
  let service: ReplicateService;

  const mockExecutionsService = {
    createJob: vi.fn().mockResolvedValue({ _id: 'job-123' }),
    findJobByPredictionId: vi.fn().mockResolvedValue({
      executionId: 'execution-123',
      nodeId: 'node-1',
    }),
    findExecution: vi.fn().mockResolvedValue({
      workflowId: 'workflow-123',
    }),
    updateJob: vi.fn().mockResolvedValue({}),
    updateNodeResult: vi.fn().mockResolvedValue({}),
    updateExecutionCost: vi.fn().mockResolvedValue({}),
  };

  const mockWorkflowsService = {
    findOne: vi.fn().mockResolvedValue({
      nodes: [{ id: 'node-1', data: { model: 'nano-banana' } }],
    }),
  };

  const mockCostCalculatorService = {
    calculatePredictionCost: vi.fn().mockReturnValue(0.05),
    buildJobCostBreakdown: vi.fn().mockReturnValue({ model: 'nano-banana', cost: 0.05 }),
  };

  const mockConfigService = {
    get: vi.fn((key: string) => {
      if (key === 'REPLICATE_API_TOKEN') return 'test-token';
      return undefined;
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset service-specific mocks
    mockExecutionsService.createJob.mockResolvedValue({ _id: 'job-123' });
    mockExecutionsService.findJobByPredictionId.mockResolvedValue({
      executionId: 'execution-123',
      nodeId: 'node-1',
    });
    mockExecutionsService.findExecution.mockResolvedValue({
      workflowId: 'workflow-123',
    });
    mockWorkflowsService.findOne.mockResolvedValue({
      nodes: [{ id: 'node-1', data: { model: 'nano-banana' } }],
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReplicateService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: ExecutionsService, useValue: mockExecutionsService },
        { provide: WorkflowsService, useValue: mockWorkflowsService },
        { provide: CostCalculatorService, useValue: mockCostCalculatorService },
        {
          provide: FilesService,
          useValue: {
            downloadAndSaveOutput: vi.fn(),
            urlsToBase64Async: vi.fn().mockResolvedValue([]),
            urlToBase64: vi.fn().mockImplementation((url: string) => url),
          },
        },
        {
          provide: SchemaMapperService,
          useValue: {
            mapSchemaToInput: vi.fn().mockReturnValue({}),
            mapImageInput: vi.fn().mockReturnValue({ prompt: 'A test image' }),
            mapVideoInput: vi.fn().mockReturnValue({ prompt: 'A test video' }),
          },
        },
      ],
    }).compile();

    service = module.get<ReplicateService>(ReplicateService);
  });

  describe('generateImage', () => {
    it('should create a prediction with nano-banana model', async () => {
      const result = await service.generateImage('execution-1', 'node-1', 'nano-banana', {
        prompt: 'A test image',
        aspectRatio: '16:9',
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('mock-prediction-id');
      expect(result.status).toBe('starting');
      expect(mockExecutionsService.createJob).toHaveBeenCalledWith(
        'execution-1',
        'node-1',
        'mock-prediction-id'
      );
    });

    it('should create a prediction with nano-banana-pro model', async () => {
      const result = await service.generateImage('execution-1', 'node-1', 'nano-banana-pro', {
        prompt: 'A high quality test image',
        resolution: '4K',
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('mock-prediction-id');
      expect(mockExecutionsService.createJob).toHaveBeenCalled();
    });

    it('should use default aspect ratio when not provided', async () => {
      await service.generateImage('execution-1', 'node-1', 'nano-banana', {
        prompt: 'Test image',
      });

      expect(mockExecutionsService.createJob).toHaveBeenCalled();
    });

    it('should include image input when provided', async () => {
      await service.generateImage('execution-1', 'node-1', 'nano-banana', {
        prompt: 'Test image',
        inputImages: ['https://example.com/input.png'],
      });

      expect(mockExecutionsService.createJob).toHaveBeenCalled();
    });
  });

  describe('generateVideo', () => {
    it('should create a prediction with veo-3.1-fast model', async () => {
      const result = await service.generateVideo('execution-1', 'node-1', 'veo-3.1-fast', {
        prompt: 'A test video',
        duration: 5,
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('mock-prediction-id');
      expect(mockExecutionsService.createJob).toHaveBeenCalled();
    });

    it('should create a prediction with veo-3.1 model', async () => {
      const result = await service.generateVideo('execution-1', 'node-1', 'veo-3.1', {
        prompt: 'A high quality test video',
      });

      expect(result).toBeDefined();
      expect(mockExecutionsService.createJob).toHaveBeenCalled();
    });

    it('should use default duration and aspect ratio', async () => {
      await service.generateVideo('execution-1', 'node-1', 'veo-3.1-fast', {
        prompt: 'Test video',
      });

      expect(mockExecutionsService.createJob).toHaveBeenCalled();
    });

    it('should include reference images when provided', async () => {
      await service.generateVideo('execution-1', 'node-1', 'veo-3.1-fast', {
        prompt: 'Test video',
        referenceImages: ['https://example.com/ref1.png', 'https://example.com/ref2.png'],
      });

      expect(mockExecutionsService.createJob).toHaveBeenCalled();
    });

    it('should handle audio generation setting', async () => {
      await service.generateVideo('execution-1', 'node-1', 'veo-3.1', {
        prompt: 'Test video',
        generateAudio: false,
      });

      expect(mockExecutionsService.createJob).toHaveBeenCalled();
    });
  });

  describe('generateText', () => {
    it('should generate text using LLM', async () => {
      const result = await service.generateText({
        prompt: 'Write a haiku about testing',
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should use default system prompt when not provided', async () => {
      const result = await service.generateText({
        prompt: 'Test prompt',
      });

      expect(result).toBeDefined();
    });

    it('should accept custom parameters', async () => {
      const result = await service.generateText({
        prompt: 'Test prompt',
        systemPrompt: 'You are a helpful assistant',
        maxTokens: 500,
        temperature: 0.5,
        topP: 0.8,
      });

      expect(result).toBeDefined();
    });

    it('should join array output into string', async () => {
      mockReplicateClient.run.mockResolvedValue(['Part 1', ' Part 2', ' Part 3']);

      const result = await service.generateText({
        prompt: 'Test prompt',
      });

      expect(result).toBe('Part 1 Part 2 Part 3');
    });

    it('should handle non-array output', async () => {
      mockReplicateClient.run.mockResolvedValue('Single string output');

      const result = await service.generateText({
        prompt: 'Test prompt',
      });

      expect(result).toBe('Single string output');
    });
  });

  describe('getPredictionStatus', () => {
    it('should return prediction status', async () => {
      const result = await service.getPredictionStatus('prediction-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('mock-prediction-id');
      expect(result.status).toBe('succeeded');
    });
  });

  describe('cancelPrediction', () => {
    it('should cancel a prediction', async () => {
      await expect(service.cancelPrediction('prediction-123')).resolves.toBeUndefined();
    });
  });

  describe('calculateWorkflowCost', () => {
    it('should calculate cost for nano-banana images', () => {
      const cost = service.calculateWorkflowCost(5, 'nano-banana', '1K', 0, 'veo-3.1-fast', false);

      expect(cost).toBe(5 * PRICING['nano-banana']);
    });

    it('should calculate cost for nano-banana-pro images at 1K', () => {
      const cost = service.calculateWorkflowCost(
        3,
        'nano-banana-pro',
        '1K',
        0,
        'veo-3.1-fast',
        false
      );

      expect(cost).toBe(3 * PRICING['nano-banana-pro']['1K']);
    });

    it('should calculate cost for nano-banana-pro images at 4K', () => {
      const cost = service.calculateWorkflowCost(
        2,
        'nano-banana-pro',
        '4K',
        0,
        'veo-3.1-fast',
        false
      );

      expect(cost).toBe(2 * PRICING['nano-banana-pro']['4K']);
    });

    it('should calculate cost for veo-3.1-fast video without audio', () => {
      const cost = service.calculateWorkflowCost(0, 'nano-banana', '1K', 10, 'veo-3.1-fast', false);

      expect(cost).toBe(10 * PRICING['veo-3.1-fast'].withoutAudio);
    });

    it('should calculate cost for veo-3.1-fast video with audio', () => {
      const cost = service.calculateWorkflowCost(0, 'nano-banana', '1K', 10, 'veo-3.1-fast', true);

      expect(cost).toBe(10 * PRICING['veo-3.1-fast'].withAudio);
    });

    it('should calculate cost for veo-3.1 video', () => {
      const cost = service.calculateWorkflowCost(0, 'nano-banana', '1K', 8, 'veo-3.1', true);

      expect(cost).toBe(8 * PRICING['veo-3.1'].withAudio);
    });

    it('should calculate combined cost for images and video', () => {
      const cost = service.calculateWorkflowCost(3, 'nano-banana', '1K', 10, 'veo-3.1-fast', true);

      const expectedCost = 3 * PRICING['nano-banana'] + 10 * PRICING['veo-3.1-fast'].withAudio;
      expect(cost).toBe(expectedCost);
    });
  });

  describe('calculateLLMCost', () => {
    it('should calculate cost based on token count', () => {
      const cost = service.calculateLLMCost(100, 200);

      expect(cost).toBe((100 + 200) * PRICING.llama);
    });

    it('should handle zero tokens', () => {
      const cost = service.calculateLLMCost(0, 0);

      expect(cost).toBe(0);
    });
  });
});
