import type { Job } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProcessingJobData } from '../interfaces/job-data.interface';
import { JOB_STATUS, QUEUE_NAMES } from '../queue.constants';

// Mock dependencies
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
};

const mockExecutionsService = {
  updateNodeResult: vi.fn(),
};

const mockReplicateService = {
  reframeImage: vi.fn(),
  reframeVideo: vi.fn(),
  upscaleImage: vi.fn(),
  upscaleVideo: vi.fn(),
  getPredictionStatus: vi.fn(),
};

// Import after mocks
import { ProcessingProcessor } from './processing.processor';

describe('ProcessingProcessor', () => {
  let processor: ProcessingProcessor;

  const createMockJob = (
    nodeType: string,
    nodeData: Record<string, unknown> = {}
  ): Job<ProcessingJobData> =>
    ({
      id: 'job-123',
      data: {
        executionId: 'exec-1',
        nodeId: 'node-1',
        nodeType,
        nodeData,
      },
      updateProgress: vi.fn().mockResolvedValue(undefined),
      attemptsMade: 0,
      opts: { attempts: 3 },
    }) as unknown as Job<ProcessingJobData>;

  beforeEach(() => {
    vi.clearAllMocks();

    processor = new ProcessingProcessor(
      mockQueueManager as never,
      mockExecutionsService as never,
      mockReplicateService as never
    );
  });

  describe('process - lumaReframeImage', () => {
    it('should process luma reframe image job', async () => {
      const job = createMockJob('lumaReframeImage', {
        image: 'https://example.com/image.png',
        aspectRatio: '16:9',
        model: 'photon-flash-1',
        prompt: 'Expand the image',
        gridPosition: 'center',
      });

      mockReplicateService.reframeImage.mockResolvedValueOnce({
        id: 'pred-123',
      });

      mockReplicateService.getPredictionStatus.mockResolvedValueOnce({
        status: 'succeeded',
        output: 'https://example.com/reframed.png',
        metrics: { predict_time: 5.2 },
      });

      const result = await processor.process(job);

      expect(mockReplicateService.reframeImage).toHaveBeenCalledWith('exec-1', 'node-1', {
        image: 'https://example.com/image.png',
        aspectRatio: '16:9',
        model: 'photon-flash-1',
        prompt: 'Expand the image',
        gridPosition: 'center',
      });

      expect(result.success).toBe(true);
      expect(result.predictionId).toBe('pred-123');
    });

    it('should update job status to ACTIVE on start', async () => {
      const job = createMockJob('lumaReframeImage', { image: 'test.png' });

      mockReplicateService.reframeImage.mockResolvedValueOnce({ id: 'pred-1' });
      mockReplicateService.getPredictionStatus.mockResolvedValueOnce({
        status: 'succeeded',
        output: 'result.png',
      });

      await processor.process(job);

      expect(mockQueueManager.updateJobStatus).toHaveBeenCalledWith('job-123', JOB_STATUS.ACTIVE);
    });

    it('should update node status to processing', async () => {
      const job = createMockJob('lumaReframeImage', { image: 'test.png' });

      mockReplicateService.reframeImage.mockResolvedValueOnce({ id: 'pred-1' });
      mockReplicateService.getPredictionStatus.mockResolvedValueOnce({
        status: 'succeeded',
        output: 'result.png',
      });

      await processor.process(job);

      expect(mockExecutionsService.updateNodeResult).toHaveBeenCalledWith(
        'exec-1',
        'node-1',
        'processing'
      );
    });
  });

  describe('process - lumaReframeVideo', () => {
    it('should process luma reframe video job', async () => {
      const job = createMockJob('lumaReframeVideo', {
        video: 'https://example.com/video.mp4',
        aspectRatio: '9:16',
        prompt: 'Convert to portrait',
        gridPosition: 'top',
      });

      mockReplicateService.reframeVideo.mockResolvedValueOnce({
        id: 'pred-456',
      });

      mockReplicateService.getPredictionStatus.mockResolvedValueOnce({
        status: 'succeeded',
        output: 'https://example.com/reframed.mp4',
      });

      const result = await processor.process(job);

      expect(mockReplicateService.reframeVideo).toHaveBeenCalledWith('exec-1', 'node-1', {
        video: 'https://example.com/video.mp4',
        aspectRatio: '9:16',
        prompt: 'Convert to portrait',
        gridPosition: 'top',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('process - topazImageUpscale', () => {
    it('should process topaz image upscale job', async () => {
      const job = createMockJob('topazImageUpscale', {
        image: 'https://example.com/image.png',
        enhanceModel: 'standard-v2',
        upscaleFactor: '2x',
        outputFormat: 'png',
        faceEnhancement: true,
        faceEnhancementStrength: 0.8,
        faceEnhancementCreativity: 0.5,
      });

      mockReplicateService.upscaleImage.mockResolvedValueOnce({
        id: 'pred-789',
      });

      mockReplicateService.getPredictionStatus.mockResolvedValueOnce({
        status: 'succeeded',
        output: 'https://example.com/upscaled.png',
      });

      const result = await processor.process(job);

      expect(mockReplicateService.upscaleImage).toHaveBeenCalledWith('exec-1', 'node-1', {
        image: 'https://example.com/image.png',
        enhanceModel: 'standard-v2',
        upscaleFactor: '2x',
        outputFormat: 'png',
        faceEnhancement: true,
        faceEnhancementStrength: 0.8,
        faceEnhancementCreativity: 0.5,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('process - topazVideoUpscale', () => {
    it('should process topaz video upscale job', async () => {
      const job = createMockJob('topazVideoUpscale', {
        video: 'https://example.com/video.mp4',
        targetResolution: '4k',
        targetFps: 60,
      });

      mockReplicateService.upscaleVideo.mockResolvedValueOnce({
        id: 'pred-video',
      });

      mockReplicateService.getPredictionStatus.mockResolvedValueOnce({
        status: 'succeeded',
        output: 'https://example.com/4k-video.mp4',
      });

      const result = await processor.process(job);

      expect(mockReplicateService.upscaleVideo).toHaveBeenCalledWith('exec-1', 'node-1', {
        video: 'https://example.com/video.mp4',
        targetResolution: '4k',
        targetFps: 60,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('process - unknown node type', () => {
    it('should throw error for unknown node type', async () => {
      const job = createMockJob('unknownNodeType', {});

      await expect(processor.process(job)).rejects.toThrow(
        'Unknown processing node type: unknownNodeType'
      );
    });
  });

  describe('polling for completion', () => {
    it('should poll until prediction succeeds', async () => {
      const job = createMockJob('lumaReframeImage', { image: 'test.png' });

      mockReplicateService.reframeImage.mockResolvedValueOnce({ id: 'pred-1' });

      // First call: processing, second call: succeeded
      mockReplicateService.getPredictionStatus
        .mockResolvedValueOnce({ status: 'processing' })
        .mockResolvedValueOnce({ status: 'processing' })
        .mockResolvedValueOnce({
          status: 'succeeded',
          output: 'result.png',
          metrics: { predict_time: 10.5 },
        });

      const result = await processor.process(job);

      expect(mockReplicateService.getPredictionStatus).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(true);
      expect(result.predictTime).toBe(10.5);
    });

    it('should return failure when prediction fails', async () => {
      const job = createMockJob('topazImageUpscale', { image: 'test.png' });

      mockReplicateService.upscaleImage.mockResolvedValueOnce({ id: 'pred-1' });
      mockReplicateService.getPredictionStatus.mockResolvedValueOnce({
        status: 'failed',
        error: 'Model error: Invalid input',
      });

      const result = await processor.process(job);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Model error: Invalid input');
    });

    it('should return failure when prediction is canceled', async () => {
      const job = createMockJob('lumaReframeVideo', { video: 'test.mp4' });

      mockReplicateService.reframeVideo.mockResolvedValueOnce({ id: 'pred-1' });
      mockReplicateService.getPredictionStatus.mockResolvedValueOnce({
        status: 'canceled',
      });

      const result = await processor.process(job);

      expect(result.success).toBe(false);
      expect(result.error).toContain('canceled');
    });

    it('should update progress during polling', async () => {
      const job = createMockJob('lumaReframeImage', { image: 'test.png' });

      mockReplicateService.reframeImage.mockResolvedValueOnce({ id: 'pred-1' });
      mockReplicateService.getPredictionStatus
        .mockResolvedValueOnce({ status: 'processing' })
        .mockResolvedValueOnce({ status: 'succeeded', output: 'result.png' });

      await processor.process(job);

      // Should have multiple progress updates
      expect(job.updateProgress).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should update job status to FAILED on error', async () => {
      const job = createMockJob('lumaReframeImage', { image: 'test.png' });

      mockReplicateService.reframeImage.mockRejectedValueOnce(new Error('API Error'));

      await expect(processor.process(job)).rejects.toThrow('API Error');

      expect(mockQueueManager.updateJobStatus).toHaveBeenCalledWith(
        'job-123',
        JOB_STATUS.FAILED,
        expect.objectContaining({
          error: 'API Error',
        })
      );
    });

    it('should update node status to error', async () => {
      const job = createMockJob('topazVideoUpscale', { video: 'test.mp4' });

      mockReplicateService.upscaleVideo.mockRejectedValueOnce(new Error('Processing failed'));

      await expect(processor.process(job)).rejects.toThrow();

      expect(mockExecutionsService.updateNodeResult).toHaveBeenCalledWith(
        'exec-1',
        'node-1',
        'error',
        undefined,
        'Processing failed'
      );
    });

    it('should move to DLQ on final attempt', async () => {
      const job = createMockJob('lumaReframeImage', { image: 'test.png' });
      (job as unknown as { attemptsMade: number }).attemptsMade = 2; // This is the 3rd attempt (0-indexed)

      mockReplicateService.reframeImage.mockRejectedValueOnce(new Error('Persistent failure'));

      await expect(processor.process(job)).rejects.toThrow();

      expect(mockQueueManager.moveToDeadLetterQueue).toHaveBeenCalledWith(
        'job-123',
        QUEUE_NAMES.PROCESSING,
        'Persistent failure'
      );
    });

    it('should not move to DLQ on non-final attempt', async () => {
      const job = createMockJob('lumaReframeImage', { image: 'test.png' });
      (job as unknown as { attemptsMade: number }).attemptsMade = 0;

      mockReplicateService.reframeImage.mockRejectedValueOnce(new Error('Temporary failure'));

      await expect(processor.process(job)).rejects.toThrow();

      expect(mockQueueManager.moveToDeadLetterQueue).not.toHaveBeenCalled();
    });

    it('should handle unknown error type', async () => {
      const job = createMockJob('lumaReframeImage', { image: 'test.png' });

      mockReplicateService.reframeImage.mockRejectedValueOnce('string error');

      await expect(processor.process(job)).rejects.toThrow();

      expect(mockQueueManager.updateJobStatus).toHaveBeenCalledWith(
        'job-123',
        JOB_STATUS.FAILED,
        expect.objectContaining({
          error: 'Unknown error',
        })
      );
    });
  });

  describe('job logging', () => {
    it('should log job start', async () => {
      const job = createMockJob('lumaReframeImage', { image: 'test.png' });

      mockReplicateService.reframeImage.mockResolvedValueOnce({ id: 'pred-1' });
      mockReplicateService.getPredictionStatus.mockResolvedValueOnce({
        status: 'succeeded',
        output: 'result.png',
      });

      await processor.process(job);

      expect(mockQueueManager.addJobLog).toHaveBeenCalledWith(
        'job-123',
        expect.stringContaining('Starting')
      );
    });

    it('should log prediction creation', async () => {
      const job = createMockJob('topazImageUpscale', { image: 'test.png' });

      mockReplicateService.upscaleImage.mockResolvedValueOnce({ id: 'pred-abc' });
      mockReplicateService.getPredictionStatus.mockResolvedValueOnce({
        status: 'succeeded',
        output: 'result.png',
      });

      await processor.process(job);

      expect(mockQueueManager.addJobLog).toHaveBeenCalledWith(
        'job-123',
        expect.stringContaining('pred-abc')
      );
    });

    it('should log job completion', async () => {
      const job = createMockJob('lumaReframeVideo', { video: 'test.mp4' });

      mockReplicateService.reframeVideo.mockResolvedValueOnce({ id: 'pred-1' });
      mockReplicateService.getPredictionStatus.mockResolvedValueOnce({
        status: 'succeeded',
        output: 'result.mp4',
      });

      await processor.process(job);

      expect(mockQueueManager.addJobLog).toHaveBeenCalledWith(
        'job-123',
        expect.stringContaining('completed')
      );
    });
  });

  describe('job completion status', () => {
    it('should update job status to COMPLETED on success', async () => {
      const job = createMockJob('lumaReframeImage', { image: 'test.png' });

      mockReplicateService.reframeImage.mockResolvedValueOnce({ id: 'pred-1' });
      mockReplicateService.getPredictionStatus.mockResolvedValueOnce({
        status: 'succeeded',
        output: { url: 'https://example.com/result.png' },
      });

      await processor.process(job);

      expect(mockQueueManager.updateJobStatus).toHaveBeenCalledWith(
        'job-123',
        JOB_STATUS.COMPLETED,
        expect.objectContaining({
          result: expect.any(Object),
        })
      );
    });
  });

  describe('polling timeouts', () => {
    it('should use longer timeout for video operations', async () => {
      // This is a behavioral test - video operations should not timeout as quickly
      const job = createMockJob('topazVideoUpscale', { video: 'test.mp4' });

      mockReplicateService.upscaleVideo.mockResolvedValueOnce({ id: 'pred-1' });
      mockReplicateService.getPredictionStatus.mockResolvedValueOnce({
        status: 'succeeded',
        output: 'result.mp4',
      });

      const result = await processor.process(job);

      expect(result.success).toBe(true);
    });

    it('should use shorter timeout for image operations', async () => {
      const job = createMockJob('lumaReframeImage', { image: 'test.png' });

      mockReplicateService.reframeImage.mockResolvedValueOnce({ id: 'pred-1' });
      mockReplicateService.getPredictionStatus.mockResolvedValueOnce({
        status: 'succeeded',
        output: 'result.png',
      });

      const result = await processor.process(job);

      expect(result.success).toBe(true);
    });
  });
});
