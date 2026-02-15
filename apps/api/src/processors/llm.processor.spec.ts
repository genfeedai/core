import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LLMProcessor } from '@/processors/llm.processor';
import { JOB_STATUS, QUEUE_NAMES } from '@/queue/queue.constants';

// Mock BullMQ WorkerHost
vi.mock('@nestjs/bullmq', () => ({
  OnWorkerEvent: () => vi.fn(),
  Processor: () => vi.fn(),
  WorkerHost: class {},
}));

describe('LLMProcessor', () => {
  let processor: LLMProcessor;
  let mockQueueManager: {
    updateJobStatus: ReturnType<typeof vi.fn>;
    addJobLog: ReturnType<typeof vi.fn>;
    moveToDeadLetterQueue: ReturnType<typeof vi.fn>;
    continueExecution: ReturnType<typeof vi.fn>;
    heartbeatJob: ReturnType<typeof vi.fn>;
  };
  let mockExecutionsService: {
    updateNodeResult: ReturnType<typeof vi.fn>;
  };
  let mockReplicateService: {
    generateText: ReturnType<typeof vi.fn>;
  };

  const mockExecutionId = new Types.ObjectId().toString();
  const mockNodeId = 'llm-node-1';

  const createMockJob = (overrides = {}) => ({
    attemptsMade: 0,
    data: {
      executionId: mockExecutionId,
      nodeData: {
        maxTokens: 1000,
        prompt: 'Write a creative story about AI',
        systemPrompt: 'You are a creative writer',
        temperature: 0.7,
        topP: 0.9,
      },
      nodeId: mockNodeId,
      nodeType: 'llm',
      timestamp: new Date().toISOString(),
      workflowId: 'workflow-123',
    },
    id: 'llm-job-123',
    opts: { attempts: 3 },
    updateProgress: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockQueueManager = {
      addJobLog: vi.fn().mockResolvedValue(undefined),
      continueExecution: vi.fn().mockResolvedValue(undefined),
      heartbeatJob: vi.fn().mockResolvedValue(undefined),
      moveToDeadLetterQueue: vi.fn().mockResolvedValue(undefined),
      updateJobStatus: vi.fn().mockResolvedValue(undefined),
    };

    mockExecutionsService = {
      updateNodeResult: vi.fn().mockResolvedValue(undefined),
    };

    mockReplicateService = {
      generateText: vi.fn().mockResolvedValue('Once upon a time in a digital world...'),
    };

    processor = new LLMProcessor(
      mockQueueManager as never,
      mockExecutionsService as never,
      mockReplicateService as never
    );
  });

  describe('process', () => {
    it('should update job status to ACTIVE', async () => {
      const job = createMockJob();

      await processor.process(job as never);

      expect(mockQueueManager.updateJobStatus).toHaveBeenCalledWith(
        'llm-job-123',
        JOB_STATUS.ACTIVE
      );
    });

    it('should update node status to processing', async () => {
      const job = createMockJob();

      await processor.process(job as never);

      expect(mockExecutionsService.updateNodeResult).toHaveBeenCalledWith(
        mockExecutionId,
        mockNodeId,
        'processing'
      );
    });

    it('should update progress at start', async () => {
      const job = createMockJob();

      await processor.process(job as never);

      expect(job.updateProgress).toHaveBeenCalledWith({
        message: 'Starting LLM generation',
        percent: 20,
      });
    });

    it('should call Replicate service with correct parameters', async () => {
      const job = createMockJob();

      await processor.process(job as never);

      expect(mockReplicateService.generateText).toHaveBeenCalledWith({
        maxTokens: 1000,
        prompt: 'Write a creative story about AI',
        systemPrompt: 'You are a creative writer',
        temperature: 0.7,
        topP: 0.9,
      });
    });

    it('should pass all LLM parameters', async () => {
      const job = createMockJob({
        data: {
          executionId: mockExecutionId,
          nodeData: {
            maxTokens: 500,
            prompt: 'Test prompt',
            systemPrompt: 'Test system',
            temperature: 0.5,
            topP: 0.8,
          },
          nodeId: mockNodeId,
          nodeType: 'llm',
          timestamp: new Date().toISOString(),
          workflowId: 'workflow-123',
        },
      });

      await processor.process(job as never);

      expect(mockReplicateService.generateText).toHaveBeenCalledWith({
        maxTokens: 500,
        prompt: 'Test prompt',
        systemPrompt: 'Test system',
        temperature: 0.5,
        topP: 0.8,
      });
    });

    it('should handle minimal parameters', async () => {
      const job = createMockJob({
        data: {
          executionId: mockExecutionId,
          nodeData: {
            prompt: 'Simple prompt',
          },
          nodeId: mockNodeId,
          nodeType: 'llm',
          timestamp: new Date().toISOString(),
          workflowId: 'workflow-123',
        },
      });

      await processor.process(job as never);

      expect(mockReplicateService.generateText).toHaveBeenCalledWith({
        maxTokens: undefined,
        prompt: 'Simple prompt',
        systemPrompt: undefined,
        temperature: undefined,
        topP: undefined,
      });
    });

    it('should update progress after text generation', async () => {
      const job = createMockJob();

      await processor.process(job as never);

      expect(job.updateProgress).toHaveBeenCalledWith({
        message: 'Text generated',
        percent: 90,
      });
    });

    it('should return success result with generated text', async () => {
      const job = createMockJob();

      const result = await processor.process(job as never);

      expect(result).toEqual({
        output: { text: 'Once upon a time in a digital world...' },
        success: true,
      });
    });

    it('should update node result with generated text', async () => {
      const job = createMockJob();

      await processor.process(job as never);

      expect(mockExecutionsService.updateNodeResult).toHaveBeenCalledWith(
        mockExecutionId,
        mockNodeId,
        'complete',
        { text: 'Once upon a time in a digital world...' }
      );
    });

    it('should update job status to COMPLETED on success', async () => {
      const job = createMockJob();

      await processor.process(job as never);

      expect(mockQueueManager.updateJobStatus).toHaveBeenCalledWith(
        'llm-job-123',
        JOB_STATUS.COMPLETED,
        expect.objectContaining({
          result: expect.objectContaining({ success: true }),
        })
      );
    });

    it('should update progress to 100% on completion', async () => {
      const job = createMockJob();

      await processor.process(job as never);

      expect(job.updateProgress).toHaveBeenCalledWith({
        message: 'Completed',
        percent: 100,
      });
    });

    it('should add completion log entry', async () => {
      const job = createMockJob();

      await processor.process(job as never);

      expect(mockQueueManager.addJobLog).toHaveBeenCalledWith(
        'llm-job-123',
        'LLM generation completed'
      );
    });

    it('should update job status to FAILED on error', async () => {
      mockReplicateService.generateText.mockRejectedValue(new Error('LLM API error'));
      const job = createMockJob();

      await expect(processor.process(job as never)).rejects.toThrow('LLM API error');

      expect(mockQueueManager.updateJobStatus).toHaveBeenCalledWith(
        'llm-job-123',
        JOB_STATUS.FAILED,
        expect.objectContaining({
          attemptsMade: 0,
          error: 'LLM API error',
        })
      );
    });

    it('should update node result to error on failure', async () => {
      mockReplicateService.generateText.mockRejectedValue(new Error('LLM API error'));
      const job = createMockJob();

      await expect(processor.process(job as never)).rejects.toThrow();

      expect(mockExecutionsService.updateNodeResult).toHaveBeenCalledWith(
        mockExecutionId,
        mockNodeId,
        'error',
        undefined,
        'LLM API error'
      );
    });

    it('should move to DLQ on last attempt', async () => {
      mockReplicateService.generateText.mockRejectedValue(new Error('LLM API error'));
      const job = createMockJob({
        attemptsMade: 2,
        opts: { attempts: 3 },
      });

      await expect(processor.process(job as never)).rejects.toThrow();

      expect(mockQueueManager.moveToDeadLetterQueue).toHaveBeenCalledWith(
        'llm-job-123',
        QUEUE_NAMES.LLM_GENERATION,
        'LLM API error'
      );
    });

    it('should not move to DLQ if not last attempt', async () => {
      mockReplicateService.generateText.mockRejectedValue(new Error('LLM API error'));
      const job = createMockJob({
        attemptsMade: 1,
        opts: { attempts: 3 },
      });

      await expect(processor.process(job as never)).rejects.toThrow();

      expect(mockQueueManager.moveToDeadLetterQueue).not.toHaveBeenCalled();
    });

    it('should handle unknown error types', async () => {
      mockReplicateService.generateText.mockRejectedValue('String error');
      const job = createMockJob();

      await expect(processor.process(job as never)).rejects.toBe('String error');

      expect(mockQueueManager.updateJobStatus).toHaveBeenCalledWith(
        'llm-job-123',
        JOB_STATUS.FAILED,
        expect.objectContaining({
          error: 'Unknown error',
        })
      );
    });
  });

  describe('onCompleted', () => {
    it('should log completion', () => {
      const job = createMockJob();
      expect(() => processor.onCompleted(job as never)).not.toThrow();
    });
  });

  describe('onFailed', () => {
    it('should log failure', () => {
      const job = createMockJob();
      const error = new Error('Test error');
      expect(() => processor.onFailed(job as never, error)).not.toThrow();
    });
  });
});
