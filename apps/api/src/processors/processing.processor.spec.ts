import type { Job } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProcessingNodeType, ReframeNodeType, UpscaleNodeType } from '@genfeedai/types';
import type { ProcessingJobData } from '@/interfaces/job-data.interface';
import { JOB_STATUS, QUEUE_NAMES } from '@/queue/queue.constants';
import { POLL_CONFIGS } from '@/services/replicate-poller.service';

// Mock dependencies
vi.mock('@nestjs/bullmq', () => ({
  OnWorkerEvent: () => vi.fn(),
  Processor: () => vi.fn(),
  WorkerHost: class {},
}));

// Create mock services
const mockQueueManager = {
  addJobLog: vi.fn(),
  continueExecution: vi.fn(),
  moveToDeadLetterQueue: vi.fn(),
  updateJobStatus: vi.fn(),
};

const mockExecutionsService = {
  findExistingJob: vi.fn().mockResolvedValue(null),
  updateNodeResult: vi.fn(),
};

const mockReplicateService: Record<string, ReturnType<typeof vi.fn>> = {
  generateLipSync: vi.fn(),
  getPredictionStatus: vi.fn(),
  reframeImage: vi.fn(),
  reframeVideo: vi.fn(),
  upscaleImage: vi.fn(),
  upscaleVideo: vi.fn(),
};

const mockReplicatePollerService = {
  createJobProgressCallback: vi.fn().mockReturnValue(() => {}),
  pollForCompletion: vi.fn(),
};

const mockTTSService = {
  generateSpeech: vi.fn(),
};

const mockFFmpegService = {
  addSubtitles: vi.fn(),
  extractFrame: vi.fn(),
  imageToVideo: vi.fn(),
  replaceAudio: vi.fn(),
  stitchVideos: vi.fn(),
};

const mockFilesService = {
  downloadAndSaveOutput: vi.fn(),
};

// Import after mocks
import { ProcessingProcessor } from '@/processors/processing.processor';

describe('ProcessingProcessor', () => {
  let processor: ProcessingProcessor;

  const createMockJob = (
    nodeType: string,
    nodeData: Record<string, unknown> = {}
  ): Job<ProcessingJobData> =>
    ({
      attemptsMade: 0,
      data: {
        executionId: 'exec-1',
        nodeData,
        nodeId: 'node-1',
        nodeType,
      },
      id: 'job-123',
      opts: { attempts: 3 },
      updateProgress: vi.fn().mockResolvedValue(undefined),
    }) as unknown as Job<ProcessingJobData>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset findExistingJob to return null by default
    mockExecutionsService.findExistingJob.mockResolvedValue(null);

    // Reset pollForCompletion to return success by default
    mockReplicatePollerService.pollForCompletion.mockResolvedValue({
      output: 'https://example.com/result.png',
      success: true,
    });

    // Reset file save to success by default
    mockFilesService.downloadAndSaveOutput.mockResolvedValue({
      path: '/local/path/result.png',
      url: 'https://saved.example.com/result.png',
    });

    processor = new ProcessingProcessor(
      mockQueueManager as never,
      mockExecutionsService as never,
      mockReplicateService as never,
      mockReplicatePollerService as never,
      mockTTSService as never,
      mockFFmpegService as never,
      mockFilesService as never
    );
  });

  describe('process - lumaReframeImage', () => {
    it('should process luma reframe image job', async () => {
      const job = createMockJob(ReframeNodeType.LUMA_REFRAME_IMAGE, {
        aspectRatio: '16:9',
        gridPosition: 'center',
        image: 'https://example.com/image.png',
        model: 'photon-flash-1',
        prompt: 'Expand the image',
      });

      mockReplicateService.reframeImage.mockResolvedValueOnce({
        id: 'pred-123',
      });

      mockReplicatePollerService.pollForCompletion.mockResolvedValueOnce({
        output: 'https://example.com/reframed.png',
        predictTime: 5.2,
        success: true,
      });

      const result = await processor.process(job);

      expect(mockReplicateService.reframeImage).toHaveBeenCalledWith('exec-1', 'node-1', {
        aspectRatio: '16:9',
        gridPosition: 'center',
        image: 'https://example.com/image.png',
        model: 'photon-flash-1',
        prompt: 'Expand the image',
      });

      expect(result.success).toBe(true);
    });

    it('should update job status to ACTIVE on start', async () => {
      const job = createMockJob(ReframeNodeType.LUMA_REFRAME_IMAGE, { image: 'test.png' });

      mockReplicateService.reframeImage.mockResolvedValueOnce({ id: 'pred-1' });

      await processor.process(job);

      expect(mockQueueManager.updateJobStatus).toHaveBeenCalledWith('job-123', JOB_STATUS.ACTIVE);
    });

    it('should update node status to processing', async () => {
      const job = createMockJob(ReframeNodeType.LUMA_REFRAME_IMAGE, { image: 'test.png' });

      mockReplicateService.reframeImage.mockResolvedValueOnce({ id: 'pred-1' });

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
      const job = createMockJob(ReframeNodeType.LUMA_REFRAME_VIDEO, {
        aspectRatio: '9:16',
        gridPosition: 'top',
        inputType: 'video',
        prompt: 'Convert to portrait',
        video: 'https://example.com/video.mp4',
      });

      mockReplicateService.reframeVideo.mockResolvedValueOnce({
        id: 'pred-456',
      });

      mockReplicatePollerService.pollForCompletion.mockResolvedValueOnce({
        output: 'https://example.com/reframed.mp4',
        success: true,
      });

      const result = await processor.process(job);

      expect(mockReplicateService.reframeVideo).toHaveBeenCalledWith('exec-1', 'node-1', {
        aspectRatio: '9:16',
        gridPosition: 'top',
        prompt: 'Convert to portrait',
        video: 'https://example.com/video.mp4',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('process - topazImageUpscale', () => {
    it('should process topaz image upscale job', async () => {
      const job = createMockJob(UpscaleNodeType.TOPAZ_IMAGE_UPSCALE, {
        enhanceModel: 'standard-v2',
        faceEnhancement: true,
        faceEnhancementCreativity: 0.5,
        faceEnhancementStrength: 0.8,
        image: 'https://example.com/image.png',
        outputFormat: 'png',
        upscaleFactor: '2x',
      });

      mockReplicateService.upscaleImage.mockResolvedValueOnce({
        id: 'pred-789',
      });

      mockReplicatePollerService.pollForCompletion.mockResolvedValueOnce({
        output: 'https://example.com/upscaled.png',
        success: true,
      });

      const result = await processor.process(job);

      expect(mockReplicateService.upscaleImage).toHaveBeenCalledWith('exec-1', 'node-1', {
        enhanceModel: 'standard-v2',
        faceEnhancement: true,
        faceEnhancementCreativity: 0.5,
        faceEnhancementStrength: 0.8,
        image: 'https://example.com/image.png',
        outputFormat: 'png',
        upscaleFactor: '2x',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('process - topazVideoUpscale', () => {
    it('should process topaz video upscale job', async () => {
      const job = createMockJob(UpscaleNodeType.TOPAZ_VIDEO_UPSCALE, {
        inputType: 'video',
        targetFps: 60,
        targetResolution: '4k',
        video: 'https://example.com/video.mp4',
      });

      mockReplicateService.upscaleVideo.mockResolvedValueOnce({
        id: 'pred-video',
      });

      mockReplicatePollerService.pollForCompletion.mockResolvedValueOnce({
        output: 'https://example.com/4k-video.mp4',
        success: true,
      });

      const result = await processor.process(job);

      expect(mockReplicateService.upscaleVideo).toHaveBeenCalledWith('exec-1', 'node-1', {
        targetFps: 60,
        targetResolution: '4k',
        video: 'https://example.com/video.mp4',
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
      const job = createMockJob(ReframeNodeType.LUMA_REFRAME_IMAGE, { image: 'test.png' });

      mockReplicateService.reframeImage.mockResolvedValueOnce({ id: 'pred-1' });

      mockReplicatePollerService.pollForCompletion.mockResolvedValueOnce({
        output: 'result.png',
        predictTime: 10.5,
        success: true,
      });

      const result = await processor.process(job);

      expect(mockReplicatePollerService.pollForCompletion).toHaveBeenCalledWith(
        'pred-1',
        expect.any(Object)
      );
      expect(result.success).toBe(true);
    });

    it('should return failure when prediction fails', async () => {
      const job = createMockJob(UpscaleNodeType.TOPAZ_IMAGE_UPSCALE, { image: 'test.png' });

      mockReplicateService.upscaleImage.mockResolvedValueOnce({ id: 'pred-1' });
      mockReplicatePollerService.pollForCompletion.mockResolvedValueOnce({
        error: 'Model error: Invalid input',
        success: false,
      });

      const result = await processor.process(job);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Model error: Invalid input');
    });

    it('should return failure when prediction is canceled', async () => {
      const job = createMockJob(ReframeNodeType.LUMA_REFRAME_VIDEO, {
        inputType: 'video',
        video: 'test.mp4',
      });

      mockReplicateService.reframeVideo.mockResolvedValueOnce({ id: 'pred-1' });
      mockReplicatePollerService.pollForCompletion.mockResolvedValueOnce({
        error: 'Prediction canceled',
        success: false,
      });

      const result = await processor.process(job);

      expect(result.success).toBe(false);
      expect(result.error).toContain('canceled');
    });

    it('should update progress during polling', async () => {
      const job = createMockJob(ReframeNodeType.LUMA_REFRAME_IMAGE, { image: 'test.png' });

      mockReplicateService.reframeImage.mockResolvedValueOnce({ id: 'pred-1' });

      await processor.process(job);

      // Should have multiple progress updates
      expect(job.updateProgress).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should update job status to FAILED on error', async () => {
      const job = createMockJob(ReframeNodeType.LUMA_REFRAME_IMAGE, { image: 'test.png' });

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
      const job = createMockJob(UpscaleNodeType.TOPAZ_VIDEO_UPSCALE, {
        inputType: 'video',
        video: 'test.mp4',
      });

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
      const job = createMockJob(ReframeNodeType.LUMA_REFRAME_IMAGE, { image: 'test.png' });
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
      const job = createMockJob(ReframeNodeType.LUMA_REFRAME_IMAGE, { image: 'test.png' });
      (job as unknown as { attemptsMade: number }).attemptsMade = 0;

      mockReplicateService.reframeImage.mockRejectedValueOnce(new Error('Temporary failure'));

      await expect(processor.process(job)).rejects.toThrow();

      expect(mockQueueManager.moveToDeadLetterQueue).not.toHaveBeenCalled();
    });

    it('should handle unknown error type', async () => {
      const job = createMockJob(ReframeNodeType.LUMA_REFRAME_IMAGE, { image: 'test.png' });

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
      const job = createMockJob(ReframeNodeType.LUMA_REFRAME_IMAGE, { image: 'test.png' });

      mockReplicateService.reframeImage.mockResolvedValueOnce({ id: 'pred-1' });

      await processor.process(job);

      expect(mockQueueManager.addJobLog).toHaveBeenCalledWith(
        'job-123',
        expect.stringContaining('Starting')
      );
    });

    it('should log prediction creation', async () => {
      const job = createMockJob(UpscaleNodeType.TOPAZ_IMAGE_UPSCALE, { image: 'test.png' });

      mockReplicateService.upscaleImage.mockResolvedValueOnce({ id: 'pred-abc' });

      await processor.process(job);

      expect(mockQueueManager.addJobLog).toHaveBeenCalledWith(
        'job-123',
        expect.stringContaining('pred-abc')
      );
    });

    it('should log job completion', async () => {
      const job = createMockJob(ReframeNodeType.LUMA_REFRAME_VIDEO, {
        inputType: 'video',
        video: 'test.mp4',
      });

      mockReplicateService.reframeVideo.mockResolvedValueOnce({ id: 'pred-1' });

      await processor.process(job);

      expect(mockQueueManager.addJobLog).toHaveBeenCalledWith(
        'job-123',
        expect.stringContaining('completed')
      );
    });
  });

  describe('job completion status', () => {
    it('should update job status to COMPLETED on success', async () => {
      const job = createMockJob(ReframeNodeType.LUMA_REFRAME_IMAGE, { image: 'test.png' });

      mockReplicateService.reframeImage.mockResolvedValueOnce({ id: 'pred-1' });
      mockReplicatePollerService.pollForCompletion.mockResolvedValueOnce({
        output: { url: 'https://example.com/result.png' },
        success: true,
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
    it('should use video poll config for lumaReframeVideo', async () => {
      const job = createMockJob(ReframeNodeType.LUMA_REFRAME_VIDEO, {
        inputType: 'video',
        video: 'test.mp4',
      });

      mockReplicateService.reframeVideo.mockResolvedValueOnce({ id: 'pred-1' });

      await processor.process(job);

      expect(mockReplicatePollerService.pollForCompletion).toHaveBeenCalledWith(
        'pred-1',
        expect.objectContaining({
          pollInterval: POLL_CONFIGS.processing.video.pollInterval,
        })
      );
    });

    it('should use video poll config for topazVideoUpscale', async () => {
      const job = createMockJob(UpscaleNodeType.TOPAZ_VIDEO_UPSCALE, {
        inputType: 'video',
        video: 'test.mp4',
      });

      mockReplicateService.upscaleVideo.mockResolvedValueOnce({ id: 'pred-1' });

      await processor.process(job);

      expect(mockReplicatePollerService.pollForCompletion).toHaveBeenCalledWith(
        'pred-1',
        expect.objectContaining({
          pollInterval: POLL_CONFIGS.processing.video.pollInterval,
        })
      );
    });

    it('should use video poll config for lipSync', async () => {
      const job = createMockJob(ProcessingNodeType.LIP_SYNC, {
        audio: 'test.mp3',
        model: 'wav2lip',
        video: 'test.mp4',
      });

      mockReplicateService.generateLipSync = vi.fn().mockResolvedValueOnce({ id: 'pred-1' });

      await processor.process(job);

      expect(mockReplicatePollerService.pollForCompletion).toHaveBeenCalledWith(
        'pred-1',
        expect.objectContaining({
          pollInterval: POLL_CONFIGS.processing.video.pollInterval,
        })
      );
    });

    it('should use image poll config for lumaReframeImage', async () => {
      const job = createMockJob(ReframeNodeType.LUMA_REFRAME_IMAGE, { image: 'test.png' });

      mockReplicateService.reframeImage.mockResolvedValueOnce({ id: 'pred-1' });

      await processor.process(job);

      expect(mockReplicatePollerService.pollForCompletion).toHaveBeenCalledWith(
        'pred-1',
        expect.objectContaining({
          pollInterval: POLL_CONFIGS.processing.image.pollInterval,
        })
      );
    });

    it('should use image poll config for topazImageUpscale', async () => {
      const job = createMockJob(UpscaleNodeType.TOPAZ_IMAGE_UPSCALE, { image: 'test.png' });

      mockReplicateService.upscaleImage.mockResolvedValueOnce({ id: 'pred-1' });

      await processor.process(job);

      expect(mockReplicatePollerService.pollForCompletion).toHaveBeenCalledWith(
        'pred-1',
        expect.objectContaining({
          pollInterval: POLL_CONFIGS.processing.image.pollInterval,
        })
      );
    });
  });

  describe('output type selection', () => {
    it('should save lumaReframeImage output under image key', async () => {
      const job = createMockJob(ReframeNodeType.LUMA_REFRAME_IMAGE, { image: 'test.png' });

      mockReplicateService.reframeImage.mockResolvedValueOnce({ id: 'pred-1' });
      mockReplicatePollerService.pollForCompletion.mockResolvedValueOnce({
        output: 'https://example.com/reframed.png',
        success: true,
      });

      await processor.process(job);

      expect(mockFilesService.downloadAndSaveOutput).toHaveBeenCalled();
      expect(mockExecutionsService.updateNodeResult).toHaveBeenCalledWith(
        'exec-1',
        'node-1',
        'complete',
        expect.objectContaining({ image: expect.any(String) })
      );
    });

    it('should save topazImageUpscale output under image key', async () => {
      const job = createMockJob(UpscaleNodeType.TOPAZ_IMAGE_UPSCALE, { image: 'test.png' });

      mockReplicateService.upscaleImage.mockResolvedValueOnce({ id: 'pred-1' });
      mockReplicatePollerService.pollForCompletion.mockResolvedValueOnce({
        output: 'https://example.com/upscaled.png',
        success: true,
      });

      await processor.process(job);

      expect(mockExecutionsService.updateNodeResult).toHaveBeenCalledWith(
        'exec-1',
        'node-1',
        'complete',
        expect.objectContaining({ image: expect.any(String) })
      );
    });

    it('should save lumaReframeVideo output under video key', async () => {
      const job = createMockJob(ReframeNodeType.LUMA_REFRAME_VIDEO, {
        inputType: 'video',
        video: 'test.mp4',
      });

      mockReplicateService.reframeVideo.mockResolvedValueOnce({ id: 'pred-1' });
      mockReplicatePollerService.pollForCompletion.mockResolvedValueOnce({
        output: 'https://example.com/reframed.mp4',
        success: true,
      });

      await processor.process(job);

      expect(mockExecutionsService.updateNodeResult).toHaveBeenCalledWith(
        'exec-1',
        'node-1',
        'complete',
        expect.objectContaining({ video: expect.any(String) })
      );
    });

    it('should save topazVideoUpscale output under video key', async () => {
      const job = createMockJob(UpscaleNodeType.TOPAZ_VIDEO_UPSCALE, {
        inputType: 'video',
        video: 'test.mp4',
      });

      mockReplicateService.upscaleVideo.mockResolvedValueOnce({ id: 'pred-1' });
      mockReplicatePollerService.pollForCompletion.mockResolvedValueOnce({
        output: 'https://example.com/upscaled.mp4',
        success: true,
      });

      await processor.process(job);

      expect(mockExecutionsService.updateNodeResult).toHaveBeenCalledWith(
        'exec-1',
        'node-1',
        'complete',
        expect.objectContaining({ video: expect.any(String) })
      );
    });

    it('should use inputType for generic reframe node', async () => {
      const job = createMockJob(ReframeNodeType.REFRAME, {
        aspectRatio: '16:9',
        inputType: 'video',
        video: 'test.mp4',
      });

      mockReplicateService.reframeVideo.mockResolvedValueOnce({ id: 'pred-1' });
      mockReplicatePollerService.pollForCompletion.mockResolvedValueOnce({
        output: 'https://example.com/reframed.mp4',
        success: true,
      });

      await processor.process(job);

      expect(mockExecutionsService.updateNodeResult).toHaveBeenCalledWith(
        'exec-1',
        'node-1',
        'complete',
        expect.objectContaining({ video: expect.any(String) })
      );
    });
  });
});
