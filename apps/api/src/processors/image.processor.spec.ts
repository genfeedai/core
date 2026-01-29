import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JOB_STATUS, QUEUE_NAMES } from '@/queue/queue.constants';
import { POLL_CONFIGS } from '@/services/replicate-poller.service';

// Mock BullMQ WorkerHost
vi.mock('@nestjs/bullmq', () => ({
  Processor: () => vi.fn(),
  WorkerHost: class {},
  OnWorkerEvent: () => vi.fn(),
}));

// Create mock services
const mockQueueManager = {
  updateJobStatus: vi.fn(),
  addJobLog: vi.fn(),
  moveToDeadLetterQueue: vi.fn(),
  continueExecution: vi.fn(),
  heartbeatJob: vi.fn(),
};

const mockExecutionsService = {
  updateNodeResult: vi.fn(),
  findExistingJob: vi.fn().mockResolvedValue(null),
};

const mockReplicateService = {
  generateImage: vi.fn(),
};

const mockReplicatePollerService = {
  pollForCompletion: vi.fn(),
  createJobProgressCallback: vi.fn().mockReturnValue(() => {}),
};

const mockFilesService = {
  downloadAndSaveOutput: vi.fn(),
  downloadAndSaveMultipleOutputs: vi.fn(),
  urlsToBase64Async: vi.fn().mockResolvedValue([]),
};

// Import after mocks
import { ImageProcessor } from '@/processors/image.processor';

describe('ImageProcessor', () => {
  let processor: ImageProcessor;

  const mockExecutionId = new Types.ObjectId().toString();
  const mockNodeId = 'image-node-1';
  const mockPredictionId = 'pred-123';

  const createMockJob = (overrides = {}) => ({
    id: 'job-123',
    data: {
      executionId: mockExecutionId,
      workflowId: 'workflow-123',
      nodeId: mockNodeId,
      nodeType: 'imageGen',
      nodeData: {
        prompt: 'A beautiful sunset',
        aspectRatio: '16:9',
        model: 'flux-pro',
      },
      timestamp: new Date().toISOString(),
    },
    attemptsMade: 0,
    opts: { attempts: 3 },
    updateProgress: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset findExistingJob to return null by default
    mockExecutionsService.findExistingJob.mockResolvedValue(null);

    // Reset generateImage to return a prediction
    mockReplicateService.generateImage.mockResolvedValue({ id: mockPredictionId });

    // Reset pollForCompletion to return success by default
    mockReplicatePollerService.pollForCompletion.mockResolvedValue({
      success: true,
      output: ['https://example.com/image.png'],
      predictTime: 5.2,
    });

    // Reset file save to success by default
    mockFilesService.downloadAndSaveOutput.mockResolvedValue({
      url: 'https://saved.example.com/image.png',
      path: '/local/path/image.png',
    });

    // Reset urlsToBase64Async
    mockFilesService.urlsToBase64Async.mockResolvedValue([]);

    processor = new ImageProcessor(
      mockQueueManager as never,
      mockExecutionsService as never,
      mockReplicateService as never,
      mockReplicatePollerService as never,
      mockFilesService as never
    );
  });

  describe('process', () => {
    it('should update job status to ACTIVE', async () => {
      const job = createMockJob();

      await processor.process(job as never);

      expect(mockQueueManager.updateJobStatus).toHaveBeenCalledWith('job-123', JOB_STATUS.ACTIVE);
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
        percent: 10,
        message: 'Starting image generation',
      });
    });

    it('should call Replicate service with correct parameters', async () => {
      const job = createMockJob();

      await processor.process(job as never);

      expect(mockReplicateService.generateImage).toHaveBeenCalledWith(
        mockExecutionId,
        mockNodeId,
        'flux-pro',
        expect.objectContaining({
          prompt: 'A beautiful sunset',
          aspectRatio: '16:9',
        })
      );
    });

    it('should use default model when not specified', async () => {
      const job = createMockJob({
        data: {
          executionId: mockExecutionId,
          workflowId: 'workflow-123',
          nodeId: mockNodeId,
          nodeType: 'imageGen',
          nodeData: { prompt: 'test' },
          timestamp: new Date().toISOString(),
        },
      });

      await processor.process(job as never);

      expect(mockReplicateService.generateImage).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'nano-banana', // Default model
        expect.anything()
      );
    });

    it('should add log entry when prediction is created', async () => {
      const job = createMockJob();

      await processor.process(job as never);

      expect(mockQueueManager.addJobLog).toHaveBeenCalledWith(
        'job-123',
        `Created prediction: ${mockPredictionId}`
      );
    });

    it('should poll for prediction completion via replicatePollerService', async () => {
      const job = createMockJob();

      await processor.process(job as never);

      expect(mockReplicatePollerService.pollForCompletion).toHaveBeenCalledWith(
        mockPredictionId,
        expect.objectContaining({
          pollInterval: POLL_CONFIGS.image.pollInterval,
        })
      );
    });

    it('should return result from pollForCompletion', async () => {
      const job = createMockJob();

      const result = await processor.process(job as never);

      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          output: ['https://example.com/image.png'],
          predictTime: 5.2,
        })
      );
    });

    it('should download and save output on success', async () => {
      const job = createMockJob();

      await processor.process(job as never);

      expect(mockFilesService.downloadAndSaveOutput).toHaveBeenCalledWith(
        'workflow-123',
        mockNodeId,
        'https://example.com/image.png',
        mockPredictionId
      );
    });

    it('should update node result with local output on success', async () => {
      const job = createMockJob();

      await processor.process(job as never);

      expect(mockExecutionsService.updateNodeResult).toHaveBeenCalledWith(
        mockExecutionId,
        mockNodeId,
        'complete',
        expect.objectContaining({
          image: 'https://saved.example.com/image.png',
        })
      );
    });

    it('should update job status to COMPLETED on success', async () => {
      const job = createMockJob();

      await processor.process(job as never);

      expect(mockQueueManager.updateJobStatus).toHaveBeenCalledWith(
        'job-123',
        JOB_STATUS.COMPLETED,
        expect.objectContaining({
          result: expect.objectContaining({ success: true }),
        })
      );
    });

    it('should continue execution after success', async () => {
      const job = createMockJob();

      await processor.process(job as never);

      expect(mockQueueManager.continueExecution).toHaveBeenCalledWith(
        mockExecutionId,
        'workflow-123'
      );
    });

    it('should return failure result when prediction fails', async () => {
      mockReplicatePollerService.pollForCompletion.mockResolvedValue({
        success: false,
        error: 'Model error',
      });
      const job = createMockJob();

      const result = await processor.process(job as never);

      expect(result).toEqual(
        expect.objectContaining({
          success: false,
          error: 'Model error',
        })
      );
    });

    it('should update node result to error when prediction fails', async () => {
      mockReplicatePollerService.pollForCompletion.mockResolvedValue({
        success: false,
        error: 'Model error',
      });
      const job = createMockJob();

      await processor.process(job as never);

      expect(mockExecutionsService.updateNodeResult).toHaveBeenCalledWith(
        mockExecutionId,
        mockNodeId,
        'error',
        undefined,
        'Model error'
      );
    });

    it('should update job status to FAILED on thrown error', async () => {
      mockReplicateService.generateImage.mockRejectedValue(new Error('API error'));
      const job = createMockJob();

      await expect(processor.process(job as never)).rejects.toThrow('API error');

      expect(mockQueueManager.updateJobStatus).toHaveBeenCalledWith(
        'job-123',
        JOB_STATUS.FAILED,
        expect.objectContaining({
          error: 'API error',
          attemptsMade: 0,
        })
      );
    });

    it('should update node result to error on thrown error', async () => {
      mockReplicateService.generateImage.mockRejectedValue(new Error('API error'));
      const job = createMockJob();

      await expect(processor.process(job as never)).rejects.toThrow();

      expect(mockExecutionsService.updateNodeResult).toHaveBeenCalledWith(
        mockExecutionId,
        mockNodeId,
        'error',
        undefined,
        'API error'
      );
    });

    it('should move to DLQ on last attempt', async () => {
      mockReplicateService.generateImage.mockRejectedValue(new Error('API error'));
      const job = createMockJob({
        attemptsMade: 2, // Last attempt (0-indexed, 3 total)
        opts: { attempts: 3 },
      });

      await expect(processor.process(job as never)).rejects.toThrow();

      expect(mockQueueManager.moveToDeadLetterQueue).toHaveBeenCalledWith(
        'job-123',
        QUEUE_NAMES.IMAGE_GENERATION,
        'API error'
      );
    });

    it('should not move to DLQ if not last attempt', async () => {
      mockReplicateService.generateImage.mockRejectedValue(new Error('API error'));
      const job = createMockJob({
        attemptsMade: 1, // Not last attempt
        opts: { attempts: 3 },
      });

      await expect(processor.process(job as never)).rejects.toThrow();

      expect(mockQueueManager.moveToDeadLetterQueue).not.toHaveBeenCalled();
    });

    it('should resume existing prediction on retry', async () => {
      mockExecutionsService.findExistingJob.mockResolvedValue({
        predictionId: 'existing-pred-456',
      });
      const job = createMockJob();

      await processor.process(job as never);

      // Should NOT call generateImage since we resume the existing prediction
      expect(mockReplicateService.generateImage).not.toHaveBeenCalled();

      // Should poll with existing prediction ID
      expect(mockReplicatePollerService.pollForCompletion).toHaveBeenCalledWith(
        'existing-pred-456',
        expect.any(Object)
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
