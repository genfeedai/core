import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JOB_STATUS, QUEUE_NAMES } from '@/queue/queue.constants';

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
  generateVideo: vi.fn(),
};

const mockReplicatePollerService = {
  pollForCompletion: vi.fn(),
  createJobProgressCallback: vi.fn().mockReturnValue(() => {}),
};

const mockFilesService = {
  downloadAndSaveOutput: vi.fn(),
};

// Import after mocks
import { VideoProcessor } from '@/processors/video.processor';
import { POLL_CONFIGS } from '@/services/replicate-poller.service';

describe('VideoProcessor', () => {
  let processor: VideoProcessor;

  const mockExecutionId = new Types.ObjectId().toString();
  const mockNodeId = 'video-node-1';
  const mockPredictionId = 'pred-video-123';

  const createMockJob = (overrides = {}) => ({
    id: 'video-job-123',
    data: {
      executionId: mockExecutionId,
      workflowId: 'workflow-123',
      nodeId: mockNodeId,
      nodeType: 'videoGen',
      nodeData: {
        prompt: 'A cinematic video of waves',
        duration: 5,
        aspectRatio: '16:9',
        model: 'veo-3.1-turbo',
        generateAudio: true,
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

    // Reset pollForCompletion to return success by default
    mockReplicatePollerService.pollForCompletion.mockResolvedValue({
      success: true,
      output: ['https://example.com/video.mp4'],
    });

    // Reset generateVideo to return a prediction
    mockReplicateService.generateVideo.mockResolvedValue({ id: mockPredictionId });

    // Reset file save to success by default
    mockFilesService.downloadAndSaveOutput.mockResolvedValue({
      url: 'https://saved.example.com/video.mp4',
      path: '/local/path/video.mp4',
    });

    processor = new VideoProcessor(
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

      expect(mockQueueManager.updateJobStatus).toHaveBeenCalledWith(
        'video-job-123',
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
        percent: 5,
        message: 'Starting videoGen generation',
      });
    });

    it('should call Replicate service with correct parameters', async () => {
      const job = createMockJob();

      await processor.process(job as never);

      expect(mockReplicateService.generateVideo).toHaveBeenCalledWith(
        mockExecutionId,
        mockNodeId,
        'veo-3.1-turbo',
        expect.objectContaining({
          prompt: 'A cinematic video of waves',
          duration: 5,
          aspectRatio: '16:9',
          generateAudio: true,
        })
      );
    });

    it('should use default model when not specified', async () => {
      const job = createMockJob({
        data: {
          executionId: mockExecutionId,
          workflowId: 'workflow-123',
          nodeId: mockNodeId,
          nodeType: 'videoGen',
          nodeData: { prompt: 'test video' },
          timestamp: new Date().toISOString(),
        },
      });

      await processor.process(job as never);

      expect(mockReplicateService.generateVideo).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'veo-3.1-fast',
        expect.anything()
      );
    });

    it('should pass all video-specific parameters', async () => {
      const job = createMockJob({
        data: {
          executionId: mockExecutionId,
          workflowId: 'workflow-123',
          nodeId: mockNodeId,
          nodeType: 'videoGen',
          nodeData: {
            prompt: 'test',
            image: 'https://example.com/start.jpg',
            lastFrame: 'https://example.com/end.jpg',
            referenceImages: ['https://example.com/ref1.jpg'],
            negativePrompt: 'blur, distortion',
            seed: 12345,
            resolution: '1080p',
          },
          timestamp: new Date().toISOString(),
        },
      });

      await processor.process(job as never);

      expect(mockReplicateService.generateVideo).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          image: 'https://example.com/start.jpg',
          lastFrame: 'https://example.com/end.jpg',
          referenceImages: ['https://example.com/ref1.jpg'],
          negativePrompt: 'blur, distortion',
          seed: 12345,
          resolution: '1080p',
        })
      );
    });

    it('should add log entry when prediction is created', async () => {
      const job = createMockJob();

      await processor.process(job as never);

      expect(mockQueueManager.addJobLog).toHaveBeenCalledWith(
        'video-job-123',
        `Created prediction: ${mockPredictionId}`
      );
    });

    it('should poll for prediction completion', async () => {
      const job = createMockJob();

      await processor.process(job as never);

      expect(mockReplicatePollerService.pollForCompletion).toHaveBeenCalledWith(
        mockPredictionId,
        expect.objectContaining({
          ...POLL_CONFIGS.video,
          heartbeatInterval: 12,
        })
      );
    });

    it('should return success result when prediction succeeds', async () => {
      const job = createMockJob();

      const result = await processor.process(job as never);

      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          output: ['https://example.com/video.mp4'],
        })
      );
    });

    it('should save output locally on success', async () => {
      const job = createMockJob();

      await processor.process(job as never);

      expect(mockFilesService.downloadAndSaveOutput).toHaveBeenCalledWith(
        'workflow-123',
        mockNodeId,
        'https://example.com/video.mp4',
        mockPredictionId
      );
    });

    it('should update node result with saved video on success', async () => {
      const job = createMockJob();

      await processor.process(job as never);

      expect(mockExecutionsService.updateNodeResult).toHaveBeenCalledWith(
        mockExecutionId,
        mockNodeId,
        'complete',
        expect.objectContaining({
          video: 'https://saved.example.com/video.mp4',
          localPath: '/local/path/video.mp4',
        })
      );
    });

    it('should update job status to COMPLETED on success', async () => {
      const job = createMockJob();

      await processor.process(job as never);

      expect(mockQueueManager.updateJobStatus).toHaveBeenCalledWith(
        'video-job-123',
        JOB_STATUS.COMPLETED,
        expect.objectContaining({
          result: expect.objectContaining({ success: true }),
        })
      );
    });

    it('should add completion log entry', async () => {
      const job = createMockJob();

      await processor.process(job as never);

      expect(mockQueueManager.addJobLog).toHaveBeenCalledWith(
        'video-job-123',
        'Video generation completed'
      );
    });

    it('should continue execution after completion', async () => {
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
        error: 'Video generation failed',
      });
      const job = createMockJob();

      const result = await processor.process(job as never);

      expect(result).toEqual(
        expect.objectContaining({
          success: false,
          error: 'Video generation failed',
        })
      );
    });

    it('should update node result to error on prediction failure', async () => {
      mockReplicatePollerService.pollForCompletion.mockResolvedValue({
        success: false,
        error: 'Video generation failed',
      });
      const job = createMockJob();

      await processor.process(job as never);

      expect(mockExecutionsService.updateNodeResult).toHaveBeenCalledWith(
        mockExecutionId,
        mockNodeId,
        'error',
        undefined,
        'Video generation failed'
      );
    });

    it('should update job status to FAILED on thrown error', async () => {
      mockReplicateService.generateVideo.mockRejectedValue(new Error('Video API error'));
      const job = createMockJob();

      await expect(processor.process(job as never)).rejects.toThrow('Video API error');

      expect(mockQueueManager.updateJobStatus).toHaveBeenCalledWith(
        'video-job-123',
        JOB_STATUS.FAILED,
        expect.objectContaining({
          error: 'Video API error',
          attemptsMade: 0,
        })
      );
    });

    it('should update node result to error on thrown error', async () => {
      mockReplicateService.generateVideo.mockRejectedValue(new Error('Video API error'));
      const job = createMockJob();

      await expect(processor.process(job as never)).rejects.toThrow();

      expect(mockExecutionsService.updateNodeResult).toHaveBeenCalledWith(
        mockExecutionId,
        mockNodeId,
        'error',
        undefined,
        'Video API error'
      );
    });

    it('should move to DLQ on last attempt', async () => {
      mockReplicateService.generateVideo.mockRejectedValue(new Error('Video API error'));
      const job = createMockJob({
        attemptsMade: 2,
        opts: { attempts: 3 },
      });

      await expect(processor.process(job as never)).rejects.toThrow();

      expect(mockQueueManager.moveToDeadLetterQueue).toHaveBeenCalledWith(
        'video-job-123',
        QUEUE_NAMES.VIDEO_GENERATION,
        'Video API error'
      );
    });

    it('should not move to DLQ if not last attempt', async () => {
      mockReplicateService.generateVideo.mockRejectedValue(new Error('Video API error'));
      const job = createMockJob({
        attemptsMade: 0,
        opts: { attempts: 3 },
      });

      await expect(processor.process(job as never)).rejects.toThrow();

      expect(mockQueueManager.moveToDeadLetterQueue).not.toHaveBeenCalled();
    });

    it('should handle file save failure gracefully', async () => {
      mockFilesService.downloadAndSaveOutput.mockRejectedValue(new Error('Storage unavailable'));
      const job = createMockJob();

      const result = await processor.process(job as never);

      // Should still succeed but with remote URL
      expect(result).toEqual(expect.objectContaining({ success: true }));
      expect(mockExecutionsService.updateNodeResult).toHaveBeenCalledWith(
        mockExecutionId,
        mockNodeId,
        'complete',
        expect.objectContaining({
          video: 'https://example.com/video.mp4',
          saveError: 'Storage unavailable',
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
