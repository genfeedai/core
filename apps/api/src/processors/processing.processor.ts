import { OnWorkerEvent, Processor } from '@nestjs/bullmq';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import type {
  JobResult,
  LipSyncJobData,
  ProcessingJobData,
  ReframeJobData,
  SubtitleJobData,
  TextToSpeechJobData,
  UpscaleJobData,
  VideoFrameExtractJobData,
  VideoStitchJobData,
  VoiceChangeJobData,
} from '@/interfaces/job-data.interface';
import { BaseProcessor, type ProcessorErrorContext } from '@/processors/base.processor';
import { JOB_STATUS, QUEUE_CONCURRENCY, QUEUE_NAMES } from '@/queue/queue.constants';
import type { ExecutionsService } from '@/services/executions.service';
import type { FFmpegService } from '@/services/ffmpeg.service';
import type { QueueManagerService } from '@/services/queue-manager.service';
import type { ReplicateService } from '@/services/replicate.service';
import { POLL_CONFIGS, ReplicatePollerService } from '@/services/replicate-poller.service';
import type { TTSService } from '@/services/tts.service';

@Processor(QUEUE_NAMES.PROCESSING, {
  concurrency: QUEUE_CONCURRENCY[QUEUE_NAMES.PROCESSING],
})
export class ProcessingProcessor extends BaseProcessor<ProcessingJobData> {
  protected readonly logger = new Logger(ProcessingProcessor.name);

  private readonly errorContext: ProcessorErrorContext;

  constructor(
    @Inject(forwardRef(() => 'QueueManagerService'))
    private readonly queueManager: QueueManagerService,
    @Inject(forwardRef(() => 'ExecutionsService'))
    private readonly executionsService: ExecutionsService,
    @Inject(forwardRef(() => 'ReplicateService'))
    private readonly replicateService: ReplicateService,
    @Inject(forwardRef(() => 'ReplicatePollerService'))
    private readonly replicatePollerService: ReplicatePollerService,
    @Inject(forwardRef(() => 'TTSService'))
    private readonly ttsService: TTSService,
    @Inject(forwardRef(() => 'FFmpegService'))
    private readonly ffmpegService: FFmpegService
  ) {
    super();
    this.errorContext = {
      queueManager: this.queueManager,
      executionsService: this.executionsService,
      queueName: QUEUE_NAMES.PROCESSING,
    };
  }

  async process(job: Job<ProcessingJobData>): Promise<JobResult> {
    const { executionId, nodeId, nodeType, nodeData } = job.data;

    this.logger.log(`Processing ${nodeType} job: ${job.id} for node ${nodeId}`);

    try {
      // Update job status
      await this.queueManager.updateJobStatus(job.id as string, JOB_STATUS.ACTIVE);

      // Update node status in execution
      await this.executionsService.updateNodeResult(executionId, nodeId, 'processing');

      // Update progress
      await job.updateProgress({ percent: 10, message: `Starting ${nodeType}` });
      await this.queueManager.addJobLog(job.id as string, `Starting ${nodeType}`);

      // Check for existing prediction (retry scenario) - only for Replicate-based operations
      const replicateNodeTypes = ['reframe', 'upscale', 'lipSync'];
      const existingJob = replicateNodeTypes.includes(nodeType)
        ? await this.executionsService.findExistingJob(executionId, nodeId)
        : null;

      let predictionId: string | null = null;

      switch (nodeType) {
        case 'reframe':
          predictionId = await this.handleReframe(
            job as unknown as Job<ReframeJobData>,
            existingJob?.predictionId
          );
          break;

        case 'upscale':
          predictionId = await this.handleUpscale(
            job as unknown as Job<UpscaleJobData>,
            existingJob?.predictionId
          );
          break;

        case 'videoFrameExtract':
          return this.handleVideoFrameExtract(job as unknown as Job<VideoFrameExtractJobData>);

        case 'lipSync':
          predictionId = await this.handleLipSync(
            job as unknown as Job<LipSyncJobData>,
            existingJob?.predictionId
          );
          break;

        case 'textToSpeech':
          return this.handleTextToSpeech(job as unknown as Job<TextToSpeechJobData>);

        case 'voiceChange':
          return this.handleVoiceChange(job as unknown as Job<VoiceChangeJobData>);

        case 'subtitle':
          return this.handleSubtitle(job as unknown as Job<SubtitleJobData>);

        case 'videoStitch':
          return this.handleVideoStitch(job as unknown as Job<VideoStitchJobData>);

        default:
          throw new Error(`Unknown processing node type: ${nodeType}`);
      }

      // Only poll for Replicate-based operations
      if (predictionId) {
        await job.updateProgress({ percent: 30, message: 'Prediction created' });
        await this.queueManager.addJobLog(job.id as string, `Created prediction: ${predictionId}`);

        // Determine poll config based on whether this is a video operation
        const isVideoOperation =
          nodeType === 'lipSync' ||
          ((nodeType === 'reframe' || nodeType === 'upscale') && nodeData.inputType === 'video');

        const pollConfig = isVideoOperation
          ? POLL_CONFIGS.processing.video
          : POLL_CONFIGS.processing.image;

        // Poll for completion using shared service
        const result = await this.replicatePollerService.pollForCompletion(predictionId, {
          ...pollConfig,
          onProgress: this.replicatePollerService.createJobProgressCallback(job),
        });

        // Update job status
        await this.queueManager.updateJobStatus(job.id as string, JOB_STATUS.COMPLETED, {
          result: result as unknown as Record<string, unknown>,
        });

        await this.queueManager.addJobLog(job.id as string, `${nodeType} completed`);

        return result;
      }

      // Non-Replicate operations already returned above
      throw new Error(`Unexpected code path for node type: ${nodeType}`);
    } catch (error) {
      return this.handleProcessorError(job, error as Error, this.errorContext);
    }
  }

  /**
   * Handle reframe operation (image or video)
   */
  private async handleReframe(
    job: Job<ReframeJobData>,
    existingPredictionId?: string
  ): Promise<string> {
    const { executionId, nodeId, nodeData } = job.data;

    if (existingPredictionId) {
      this.logger.log(`Retry: resuming existing prediction ${existingPredictionId}`);
      return existingPredictionId;
    }

    let prediction: { id: string };
    if (nodeData.inputType === 'video') {
      prediction = await this.replicateService.reframeVideo(executionId, nodeId, {
        video: nodeData.video!,
        aspectRatio: nodeData.aspectRatio,
        prompt: nodeData.prompt,
        gridPosition: nodeData.gridPosition,
      });
    } else {
      prediction = await this.replicateService.reframeImage(executionId, nodeId, {
        image: nodeData.image!,
        aspectRatio: nodeData.aspectRatio,
        model: nodeData.model,
        prompt: nodeData.prompt,
        gridPosition: nodeData.gridPosition,
      });
    }
    return prediction.id;
  }

  /**
   * Handle upscale operation (image or video)
   */
  private async handleUpscale(
    job: Job<UpscaleJobData>,
    existingPredictionId?: string
  ): Promise<string> {
    const { executionId, nodeId, nodeData } = job.data;

    if (existingPredictionId) {
      this.logger.log(`Retry: resuming existing prediction ${existingPredictionId}`);
      return existingPredictionId;
    }

    let prediction: { id: string };
    if (nodeData.inputType === 'video') {
      prediction = await this.replicateService.upscaleVideo(executionId, nodeId, {
        video: nodeData.video!,
        targetResolution: nodeData.targetResolution ?? '1080p',
        targetFps: nodeData.targetFps ?? 30,
      });
    } else {
      prediction = await this.replicateService.upscaleImage(executionId, nodeId, {
        image: nodeData.image!,
        enhanceModel: nodeData.enhanceModel ?? 'Standard V2',
        upscaleFactor: nodeData.upscaleFactor ?? '2x',
        outputFormat: nodeData.outputFormat ?? 'png',
        faceEnhancement: nodeData.faceEnhancement,
        faceEnhancementStrength: nodeData.faceEnhancementStrength,
        faceEnhancementCreativity: nodeData.faceEnhancementCreativity,
      });
    }
    return prediction.id;
  }

  /**
   * Handle lip sync operation
   */
  private async handleLipSync(
    job: Job<LipSyncJobData>,
    existingPredictionId?: string
  ): Promise<string> {
    const { executionId, nodeId, nodeData } = job.data;

    if (existingPredictionId) {
      this.logger.log(`Retry: resuming existing prediction ${existingPredictionId}`);
      return existingPredictionId;
    }

    const prediction = await this.replicateService.generateLipSync(executionId, nodeId, {
      image: nodeData.image,
      video: nodeData.video,
      audio: nodeData.audio,
      model: nodeData.model,
      syncMode: nodeData.syncMode,
      temperature: nodeData.temperature,
      activeSpeaker: nodeData.activeSpeaker,
    });
    return prediction.id;
  }

  /**
   * Handle video frame extraction (FFmpeg - no Replicate)
   */
  private async handleVideoFrameExtract(job: Job<VideoFrameExtractJobData>): Promise<JobResult> {
    const { executionId, nodeId, nodeType, nodeData } = job.data;

    const frameResult = await this.ffmpegService.extractFrame(executionId, nodeId, {
      video: nodeData.video,
      selectionMode: nodeData.selectionMode,
      timestampSeconds: nodeData.timestampSeconds,
      percentagePosition: nodeData.percentagePosition,
    });

    await job.updateProgress({ percent: 100, message: 'Completed' });
    await this.queueManager.updateJobStatus(job.id as string, JOB_STATUS.COMPLETED, {
      result: { imageUrl: frameResult.imageUrl } as unknown as Record<string, unknown>,
    });
    await this.queueManager.addJobLog(job.id as string, `${nodeType} completed`);

    return {
      success: true,
      output: { image: frameResult.imageUrl } as Record<string, unknown>,
    };
  }

  /**
   * Handle text to speech (no Replicate)
   */
  private async handleTextToSpeech(job: Job<TextToSpeechJobData>): Promise<JobResult> {
    const { executionId, nodeId, nodeType, nodeData } = job.data;

    const ttsResult = await this.ttsService.generateSpeech(executionId, nodeId, {
      text: nodeData.text,
      voice: nodeData.voice,
      provider: nodeData.provider,
      stability: nodeData.stability,
      similarityBoost: nodeData.similarityBoost,
      speed: nodeData.speed,
    });

    await job.updateProgress({ percent: 100, message: 'Completed' });
    await this.queueManager.updateJobStatus(job.id as string, JOB_STATUS.COMPLETED, {
      result: { audioUrl: ttsResult.audioUrl } as unknown as Record<string, unknown>,
    });
    await this.queueManager.addJobLog(job.id as string, `${nodeType} completed`);

    return {
      success: true,
      output: { audio: ttsResult.audioUrl } as Record<string, unknown>,
    };
  }

  /**
   * Handle voice change (FFmpeg - no Replicate)
   */
  private async handleVoiceChange(job: Job<VoiceChangeJobData>): Promise<JobResult> {
    const { executionId, nodeId, nodeType, nodeData } = job.data;

    const voiceResult = await this.ffmpegService.replaceAudio(executionId, nodeId, {
      video: nodeData.video,
      audio: nodeData.audio,
      preserveOriginalAudio: nodeData.preserveOriginalAudio,
      audioMixLevel: nodeData.audioMixLevel,
    });

    await job.updateProgress({ percent: 100, message: 'Completed' });
    await this.queueManager.updateJobStatus(job.id as string, JOB_STATUS.COMPLETED, {
      result: { videoUrl: voiceResult.videoUrl } as unknown as Record<string, unknown>,
    });
    await this.queueManager.addJobLog(job.id as string, `${nodeType} completed`);

    return {
      success: true,
      output: { video: voiceResult.videoUrl } as Record<string, unknown>,
    };
  }

  /**
   * Handle subtitle (FFmpeg - no Replicate)
   */
  private async handleSubtitle(job: Job<SubtitleJobData>): Promise<JobResult> {
    const { executionId, nodeId, nodeType, nodeData } = job.data;

    const subtitleResult = await this.ffmpegService.addSubtitles(executionId, nodeId, {
      video: nodeData.video,
      text: nodeData.text,
      style: nodeData.style,
      position: nodeData.position,
      fontSize: nodeData.fontSize,
      fontColor: nodeData.fontColor,
      backgroundColor: nodeData.backgroundColor,
      fontFamily: nodeData.fontFamily,
    });

    await job.updateProgress({ percent: 100, message: 'Completed' });
    await this.queueManager.updateJobStatus(job.id as string, JOB_STATUS.COMPLETED, {
      result: { videoUrl: subtitleResult.videoUrl } as unknown as Record<string, unknown>,
    });
    await this.queueManager.addJobLog(job.id as string, `${nodeType} completed`);

    return {
      success: true,
      output: { video: subtitleResult.videoUrl } as Record<string, unknown>,
    };
  }

  /**
   * Handle video stitch (FFmpeg - no Replicate)
   */
  private async handleVideoStitch(job: Job<VideoStitchJobData>): Promise<JobResult> {
    const { executionId, nodeId, nodeType, nodeData } = job.data;

    const stitchResult = await this.ffmpegService.stitchVideos(executionId, nodeId, {
      videos: nodeData.inputVideos,
      transitionType: nodeData.transitionType,
      transitionDuration: nodeData.transitionDuration,
      seamlessLoop: nodeData.seamlessLoop,
      audioCodec: nodeData.audioCodec ?? 'aac',
      outputQuality: nodeData.outputQuality ?? 'full',
    });

    await job.updateProgress({ percent: 100, message: 'Completed' });
    await this.queueManager.updateJobStatus(job.id as string, JOB_STATUS.COMPLETED, {
      result: { videoUrl: stitchResult.videoUrl } as unknown as Record<string, unknown>,
    });
    await this.queueManager.addJobLog(job.id as string, `${nodeType} completed`);

    return {
      success: true,
      output: { video: stitchResult.videoUrl } as Record<string, unknown>,
    };
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<ProcessingJobData>): void {
    this.logJobCompleted(job, 'Processing');
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<ProcessingJobData>, error: Error): void {
    this.logJobFailed(job, error, 'Processing');
  }
}
