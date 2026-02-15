import { OnWorkerEvent, Processor } from '@nestjs/bullmq';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { ProcessingNodeType, ReframeNodeType, UpscaleNodeType } from '@genfeedai/types';
import type {
  JobResult,
  LipSyncJobData,
  ProcessingJobData,
  ReframeJobData,
  SubtitleJobData,
  TextToSpeechJobData,
  TranscribeJobData,
  UpscaleJobData,
  VideoFrameExtractJobData,
  VideoStitchJobData,
  VoiceChangeJobData,
} from '@/interfaces/job-data.interface';
import type { NodeOutput } from '@/interfaces/execution-types.interface';
import { BaseProcessor } from '@/processors/base.processor';
import { JOB_STATUS, QUEUE_CONCURRENCY, QUEUE_NAMES } from '@/queue/queue.constants';
import type { ExecutionsService } from '@/services/executions.service';
import type { FFmpegService } from '@/services/ffmpeg.service';
import type { FilesService } from '@/services/files.service';
import type { QueueManagerService } from '@/services/queue-manager.service';
import type { ReplicateService } from '@/services/replicate.service';
import { POLL_CONFIGS, ReplicatePollerService } from '@/services/replicate-poller.service';
import type { TTSService } from '@/services/tts.service';

@Processor(QUEUE_NAMES.PROCESSING, {
  concurrency: QUEUE_CONCURRENCY[QUEUE_NAMES.PROCESSING],
})
export class ProcessingProcessor extends BaseProcessor<ProcessingJobData> {
  protected readonly logger = new Logger(ProcessingProcessor.name);
  protected readonly queueName = QUEUE_NAMES.PROCESSING;

  protected get filesService(): FilesService {
    return this._filesService;
  }

  constructor(
    @Inject(forwardRef(() => 'QueueManagerService'))
    protected readonly queueManager: QueueManagerService,
    @Inject(forwardRef(() => 'ExecutionsService'))
    protected readonly executionsService: ExecutionsService,
    @Inject(forwardRef(() => 'ReplicateService'))
    private readonly replicateService: ReplicateService,
    @Inject(forwardRef(() => 'ReplicatePollerService'))
    private readonly replicatePollerService: ReplicatePollerService,
    @Inject(forwardRef(() => 'TTSService'))
    private readonly ttsService: TTSService,
    @Inject(forwardRef(() => 'FFmpegService'))
    private readonly ffmpegService: FFmpegService,
    @Inject(forwardRef(() => 'FilesService'))
    private readonly _filesService: FilesService
  ) {
    super();
  }

  /**
   * Complete a local (non-Replicate) job with consistent status updates
   */
  private async completeLocalJob(
    job: Job<ProcessingJobData>,
    resultUrl: string,
    outputKey: 'image' | 'audio' | 'video'
  ): Promise<JobResult> {
    const { executionId, nodeId, nodeType, workflowId } = job.data;
    const output: NodeOutput = { [outputKey]: resultUrl };

    // Update execution node result
    await this.executionsService.updateNodeResult(executionId, nodeId, 'complete', output);

    await job.updateProgress({ message: 'Completed', percent: 100 });
    await this.queueManager.updateJobStatus(job.id as string, JOB_STATUS.COMPLETED, {
      result: { [`${outputKey}Url`]: resultUrl } as NodeOutput,
    });
    await this.queueManager.addJobLog(job.id as string, `${nodeType} completed`);

    // Continue workflow execution to next node
    await this.queueManager.continueExecution(executionId, workflowId);

    return {
      output,
      success: true,
    };
  }

  /**
   * Check for existing prediction on retry and return prediction ID if found
   */
  private checkExistingPrediction(existingPredictionId?: string): string | null {
    if (existingPredictionId) {
      this.logger.log(`Retry: resuming existing prediction ${existingPredictionId}`);
      return existingPredictionId;
    }
    return null;
  }

  async process(job: Job<ProcessingJobData>): Promise<JobResult> {
    const { executionId, nodeId, nodeType, nodeData } = job.data;

    this.logger.log(`Processing ${nodeType} job: ${job.id} for node ${nodeId}`);

    try {
      await this.startJob(job, `Starting ${nodeType}`);

      // Check for existing prediction (retry scenario) - only for Replicate-based operations
      const replicateNodeTypes: string[] = [
        ReframeNodeType.REFRAME,
        ReframeNodeType.LUMA_REFRAME_IMAGE,
        ReframeNodeType.LUMA_REFRAME_VIDEO,
        UpscaleNodeType.UPSCALE,
        UpscaleNodeType.TOPAZ_IMAGE_UPSCALE,
        UpscaleNodeType.TOPAZ_VIDEO_UPSCALE,
        ProcessingNodeType.LIP_SYNC,
        ProcessingNodeType.TRANSCRIBE,
      ];
      const existingJob = replicateNodeTypes.includes(nodeType)
        ? await this.executionsService.findExistingJob(executionId, nodeId)
        : null;

      let predictionId: string | null = null;

      switch (nodeType) {
        case ReframeNodeType.LUMA_REFRAME_IMAGE:
        case ReframeNodeType.LUMA_REFRAME_VIDEO:
        case ReframeNodeType.REFRAME:
          predictionId = await this.handleReframe(
            job as unknown as Job<ReframeJobData>,
            existingJob?.predictionId
          );
          break;

        case UpscaleNodeType.TOPAZ_IMAGE_UPSCALE:
        case UpscaleNodeType.TOPAZ_VIDEO_UPSCALE:
        case UpscaleNodeType.UPSCALE:
          predictionId = await this.handleUpscale(
            job as unknown as Job<UpscaleJobData>,
            existingJob?.predictionId
          );
          break;

        case ProcessingNodeType.VIDEO_FRAME_EXTRACT:
          return this.handleVideoFrameExtract(job as unknown as Job<VideoFrameExtractJobData>);

        case ProcessingNodeType.LIP_SYNC:
          predictionId = await this.handleLipSync(
            job as unknown as Job<LipSyncJobData>,
            existingJob?.predictionId
          );
          break;

        case ProcessingNodeType.TEXT_TO_SPEECH:
          return this.handleTextToSpeech(job as unknown as Job<TextToSpeechJobData>);

        case ProcessingNodeType.VOICE_CHANGE:
          return this.handleVoiceChange(job as unknown as Job<VoiceChangeJobData>);

        case ProcessingNodeType.TRANSCRIBE:
          predictionId = await this.handleTranscribe(
            job as unknown as Job<TranscribeJobData>,
            existingJob?.predictionId
          );
          break;

        case ProcessingNodeType.SUBTITLE:
          return this.handleSubtitle(job as unknown as Job<SubtitleJobData>);

        case ProcessingNodeType.VIDEO_STITCH:
          return this.handleVideoStitch(job as unknown as Job<VideoStitchJobData>);

        default:
          throw new Error(`Unknown processing node type: ${nodeType}`);
      }

      // Only poll for Replicate-based operations
      if (predictionId) {
        await job.updateProgress({ message: 'Prediction created', percent: 30 });
        await this.queueManager.addJobLog(job.id as string, `Created prediction: ${predictionId}`);

        // Determine poll config based on whether this is a video operation
        const isVideoOperation =
          nodeType === ProcessingNodeType.LIP_SYNC ||
          nodeType === ReframeNodeType.LUMA_REFRAME_VIDEO ||
          nodeType === UpscaleNodeType.TOPAZ_VIDEO_UPSCALE ||
          ((nodeType === ReframeNodeType.REFRAME || nodeType === UpscaleNodeType.UPSCALE) &&
            nodeData.inputType === 'video');

        const pollConfig = isVideoOperation
          ? POLL_CONFIGS.processing.video
          : POLL_CONFIGS.processing.image;

        // Poll for completion using shared service
        const result = await this.replicatePollerService.pollForCompletion(predictionId, {
          ...pollConfig,
          onProgress: this.replicatePollerService.createJobProgressCallback(job),
        });

        // Update execution node result
        if (result.success) {
          if (nodeType === ProcessingNodeType.TRANSCRIBE) {
            // Whisper returns { transcription: string } or a string — extract text directly
            const whisperOutput = result.output as { transcription?: string } | string;
            const text =
              typeof whisperOutput === 'string'
                ? whisperOutput
                : (whisperOutput?.transcription ?? '');
            await this.executionsService.updateNodeResult(executionId, nodeId, 'complete', {
              text,
            });
          } else {
            // Determine output type based on node type
            let outputType: 'image' | 'video' = 'video';
            if (
              nodeType === ReframeNodeType.LUMA_REFRAME_IMAGE ||
              nodeType === UpscaleNodeType.TOPAZ_IMAGE_UPSCALE
            ) {
              outputType = 'image';
            } else if (
              nodeType === ReframeNodeType.LUMA_REFRAME_VIDEO ||
              nodeType === UpscaleNodeType.TOPAZ_VIDEO_UPSCALE
            ) {
              outputType = 'video';
            } else if (
              nodeType === ReframeNodeType.REFRAME ||
              nodeType === UpscaleNodeType.UPSCALE
            ) {
              outputType = nodeData.inputType === 'video' ? 'video' : 'image';
            }

            const localOutput = await this.saveAndNormalizeOutput(
              result.output,
              job.data.workflowId,
              nodeId,
              outputType
            );

            await this.executionsService.updateNodeResult(
              executionId,
              nodeId,
              'complete',
              localOutput
            );
          }
        } else {
          await this.executionsService.updateNodeResult(
            executionId,
            nodeId,
            'error',
            undefined,
            result.error
          );
        }

        await this.completeJob(job, result as unknown as NodeOutput, `${nodeType} completed`);

        return result;
      }

      // Non-Replicate operations already returned above
      throw new Error(`Unexpected code path for node type: ${nodeType}`);
    } catch (error) {
      return this.handleProcessorError(job, error as Error);
    }
  }

  /**
   * Handle reframe operation (image or video)
   */
  private async handleReframe(
    job: Job<ReframeJobData>,
    existingPredictionId?: string
  ): Promise<string> {
    const existing = this.checkExistingPrediction(existingPredictionId);
    if (existing) return existing;

    const { executionId, nodeId, nodeData } = job.data;

    const prediction =
      nodeData.inputType === 'video'
        ? await this.replicateService.reframeVideo(executionId, nodeId, {
            aspectRatio: nodeData.aspectRatio,
            gridPosition: nodeData.gridPosition,
            prompt: nodeData.prompt,
            video: nodeData.video!,
          })
        : await this.replicateService.reframeImage(executionId, nodeId, {
            aspectRatio: nodeData.aspectRatio,
            gridPosition: nodeData.gridPosition,
            image: nodeData.image!,
            model: nodeData.model,
            prompt: nodeData.prompt,
          });

    return prediction.id;
  }

  /**
   * Handle upscale operation (image or video)
   */
  private async handleUpscale(
    job: Job<UpscaleJobData>,
    existingPredictionId?: string
  ): Promise<string> {
    const existing = this.checkExistingPrediction(existingPredictionId);
    if (existing) return existing;

    const { executionId, nodeId, nodeData } = job.data;

    const prediction =
      nodeData.inputType === 'video'
        ? await this.replicateService.upscaleVideo(executionId, nodeId, {
            targetFps: nodeData.targetFps ?? 30,
            targetResolution: nodeData.targetResolution ?? '1080p',
            video: nodeData.video!,
          })
        : await this.replicateService.upscaleImage(executionId, nodeId, {
            enhanceModel: nodeData.enhanceModel ?? 'Standard V2',
            faceEnhancement: nodeData.faceEnhancement,
            faceEnhancementCreativity: nodeData.faceEnhancementCreativity,
            faceEnhancementStrength: nodeData.faceEnhancementStrength,
            image: nodeData.image!,
            outputFormat: nodeData.outputFormat ?? 'png',
            upscaleFactor: nodeData.upscaleFactor ?? '2x',
          });

    return prediction.id;
  }

  /**
   * Handle lip sync operation
   */
  private async handleLipSync(
    job: Job<LipSyncJobData>,
    existingPredictionId?: string
  ): Promise<string> {
    const existing = this.checkExistingPrediction(existingPredictionId);
    if (existing) return existing;

    const { executionId, nodeId, nodeData } = job.data;

    // Inputs come from inputX (connected upstream) or X (direct input)
    const audio = nodeData.inputAudio ?? nodeData.audio;
    const image = nodeData.inputImage ?? nodeData.image;
    let video = nodeData.inputVideo ?? nodeData.video;

    if (!audio) {
      throw new Error('No audio input provided for lip sync');
    }
    if (!image && !video) {
      throw new Error('No image or video input provided for lip sync');
    }

    // Sync Labs models require video input - convert image to static video if needed
    const isSyncLabsModel = nodeData.model.startsWith('sync/');
    if (isSyncLabsModel && image && !video) {
      this.logger.log(`Converting image to video for Sync Labs lip sync (node ${nodeId})`);
      await job.updateProgress({ message: 'Converting image to video', percent: 15 });
      await this.queueManager.addJobLog(
        job.id as string,
        'Converting image to video for Sync Labs'
      );

      // Create a 5-second static video from the image (lip sync will adjust to audio length)
      const result = await this.ffmpegService.imageToVideo({ duration: 5, image });
      video = result.videoUrl;
    }

    const prediction = await this.replicateService.generateLipSync(executionId, nodeId, {
      activeSpeaker: nodeData.activeSpeaker,
      audio,
      image: isSyncLabsModel ? undefined : image, // Only pass image to non-Sync Labs models
      model: nodeData.model,
      syncMode: nodeData.syncMode,
      temperature: nodeData.temperature,
      video,
    });
    return prediction.id;
  }

  /**
   * Handle transcription via Whisper (Replicate)
   */
  private async handleTranscribe(
    job: Job<TranscribeJobData>,
    existingPredictionId?: string
  ): Promise<string> {
    const existing = this.checkExistingPrediction(existingPredictionId);
    if (existing) return existing;

    const { executionId, nodeId, nodeData } = job.data;
    const audio = nodeData.inputAudio ?? nodeData.audio ?? nodeData.inputVideo ?? nodeData.video;

    if (!audio) {
      throw new Error('No audio or video input for transcription');
    }

    const prediction = await this.replicateService.transcribeAudio(executionId, nodeId, {
      audio,
      language: nodeData.language !== 'auto' ? nodeData.language : undefined,
    });

    return prediction.id;
  }

  /**
   * Handle video frame extraction (FFmpeg - no Replicate)
   */
  private async handleVideoFrameExtract(job: Job<VideoFrameExtractJobData>): Promise<JobResult> {
    const { executionId, nodeId, nodeData } = job.data;

    const frameResult = await this.ffmpegService.extractFrame(executionId, nodeId, {
      percentagePosition: nodeData.percentagePosition,
      selectionMode: nodeData.selectionMode,
      timestampSeconds: nodeData.timestampSeconds,
      video: nodeData.video,
    });

    return this.completeLocalJob(job, frameResult.imageUrl, 'image');
  }

  /**
   * Handle text to speech (no Replicate)
   */
  private async handleTextToSpeech(job: Job<TextToSpeechJobData>): Promise<JobResult> {
    const { executionId, nodeId, nodeData } = job.data;

    // Text comes from inputText (connected upstream node) or text (direct input)
    const text = nodeData.inputText ?? nodeData.text;
    if (!text) {
      throw new Error('No text input provided for text-to-speech');
    }

    const ttsResult = await this.ttsService.generateSpeech(executionId, nodeId, {
      provider: nodeData.provider,
      similarityBoost: nodeData.similarityBoost,
      speed: nodeData.speed,
      stability: nodeData.stability,
      text,
      voice: nodeData.voice,
    });

    return this.completeLocalJob(job, ttsResult.audioUrl, 'audio');
  }

  /**
   * Handle voice change (FFmpeg - no Replicate)
   */
  private async handleVoiceChange(job: Job<VoiceChangeJobData>): Promise<JobResult> {
    const { executionId, nodeId, nodeData } = job.data;

    const voiceResult = await this.ffmpegService.replaceAudio(executionId, nodeId, {
      audio: nodeData.audio,
      audioMixLevel: nodeData.audioMixLevel,
      preserveOriginalAudio: nodeData.preserveOriginalAudio,
      video: nodeData.video,
    });

    return this.completeLocalJob(job, voiceResult.videoUrl, 'video');
  }

  /**
   * Handle subtitle (FFmpeg - no Replicate)
   */
  private async handleSubtitle(job: Job<SubtitleJobData>): Promise<JobResult> {
    const { executionId, nodeId, nodeData } = job.data;

    const subtitleResult = await this.ffmpegService.addSubtitles(executionId, nodeId, {
      backgroundColor: nodeData.backgroundColor,
      fontColor: nodeData.fontColor,
      fontFamily: nodeData.fontFamily,
      fontSize: nodeData.fontSize,
      position: nodeData.position,
      style: nodeData.style,
      text: nodeData.text,
      video: nodeData.video,
    });

    return this.completeLocalJob(job, subtitleResult.videoUrl, 'video');
  }

  /**
   * Handle video stitch (FFmpeg - no Replicate)
   */
  private async handleVideoStitch(job: Job<VideoStitchJobData>): Promise<JobResult> {
    const { executionId, nodeId, nodeData } = job.data;

    const stitchResult = await this.ffmpegService.stitchVideos(executionId, nodeId, {
      audioCodec: nodeData.audioCodec ?? 'aac',
      outputQuality: nodeData.outputQuality ?? 'full',
      seamlessLoop: nodeData.seamlessLoop,
      transitionDuration: nodeData.transitionDuration,
      transitionType: nodeData.transitionType,
      videos: nodeData.inputVideos,
    });

    return this.completeLocalJob(job, stitchResult.videoUrl, 'video');
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
