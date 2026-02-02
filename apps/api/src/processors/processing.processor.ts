import { OnWorkerEvent, Processor } from '@nestjs/bullmq';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { ProcessingNodeType, ReframeNodeType, UpscaleNodeType } from '@genfeedai/types';
import type {
  DistributionJobData,
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
import type {
  BaseOutputNode,
  GeneratedVideo,
  DeliveryConfig,
  DeliveryResult,
} from '@/nodes/distribution/base-output-node';
import type { DistributionNodeRegistry } from '@/nodes/distribution/distribution-node-registry';
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
    private readonly filesService: FilesService,
    @Inject(forwardRef(() => 'DistributionNodeRegistry'))
    private readonly distributionNodeRegistry: DistributionNodeRegistry
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
    const output = { [outputKey]: resultUrl } as Record<string, unknown>;

    // Update execution node result
    await this.executionsService.updateNodeResult(executionId, nodeId, 'complete', output);

    await job.updateProgress({ percent: 100, message: 'Completed' });
    await this.queueManager.updateJobStatus(job.id as string, JOB_STATUS.COMPLETED, {
      result: { [`${outputKey}Url`]: resultUrl } as unknown as Record<string, unknown>,
    });
    await this.queueManager.addJobLog(job.id as string, `${nodeType} completed`);

    // Continue workflow execution to next node
    await this.queueManager.continueExecution(executionId, workflowId);

    return {
      success: true,
      output,
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
      // Update job status
      await this.queueManager.updateJobStatus(job.id as string, JOB_STATUS.ACTIVE);

      // Update node status in execution
      await this.executionsService.updateNodeResult(executionId, nodeId, 'processing');

      // Update progress
      await job.updateProgress({ percent: 10, message: `Starting ${nodeType}` });
      await this.queueManager.addJobLog(job.id as string, `Starting ${nodeType}`);

      // Check for existing prediction (retry scenario) - only for Replicate-based operations
      const replicateNodeTypes: string[] = [
        ReframeNodeType.REFRAME,
        ReframeNodeType.LUMA_REFRAME_IMAGE,
        ReframeNodeType.LUMA_REFRAME_VIDEO,
        UpscaleNodeType.UPSCALE,
        UpscaleNodeType.TOPAZ_IMAGE_UPSCALE,
        UpscaleNodeType.TOPAZ_VIDEO_UPSCALE,
        ProcessingNodeType.LIP_SYNC,
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

        case ProcessingNodeType.SUBTITLE:
          return this.handleSubtitle(job as unknown as Job<SubtitleJobData>);

        case ProcessingNodeType.VIDEO_STITCH:
          return this.handleVideoStitch(job as unknown as Job<VideoStitchJobData>);

        // Distribution nodes
        case 'telegramPost':
        case 'discordPost':
        case 'twitterPost':
        case 'instagramPost':
        case 'tiktokPost':
        case 'youtubePost':
        case 'facebookPost':
        case 'linkedinPost':
        case 'googleDriveUpload':
        case 'webhookPost':
          return this.handleDistribution(job as unknown as Job<DistributionJobData>);

        default:
          throw new Error(`Unknown processing node type: ${nodeType}`);
      }

      // Only poll for Replicate-based operations
      if (predictionId) {
        await job.updateProgress({ percent: 30, message: 'Prediction created' });
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
          // Auto-save output to local storage for Replicate-based operations
          let localOutput: Record<string, unknown> | undefined;

          // Handle all output formats (matching video.processor.ts pattern):
          // 1. output is a string (URL directly)
          // 2. output is an array (first element)
          // 3. output.video is a string
          // 4. output.image is a string
          // 5. output.output is a string

          let outputUrl: string | undefined;
          let outputType: 'image' | 'video' = 'video'; // Default to video for lipSync

          // Determine output type based on node type
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
          } else if (nodeType === ReframeNodeType.REFRAME || nodeType === UpscaleNodeType.UPSCALE) {
            outputType = nodeData.inputType === 'video' ? 'video' : 'image';
          }

          // Extract URL from all possible formats
          if (typeof result.output === 'string') {
            outputUrl = result.output;
          } else if (Array.isArray(result.output) && result.output.length > 0) {
            outputUrl = result.output[0] as string;
          } else if (result.output && typeof result.output === 'object') {
            const outputObj = result.output as Record<string, unknown>;
            outputUrl = (outputObj.video || outputObj.image || outputObj.output) as
              | string
              | undefined;
            // Override outputType if explicitly present in the response
            if (outputObj.image) outputType = 'image';
            if (outputObj.video) outputType = 'video';
          }

          if (outputUrl && typeof outputUrl === 'string') {
            try {
              const saved = await this.filesService.downloadAndSaveOutput(
                job.data.workflowId,
                nodeId,
                outputUrl
              );
              localOutput = { [outputType]: saved.url, localPath: saved.path };
              this.logger.log(`Saved ${outputType} output to ${saved.path}`);
            } catch (saveError) {
              // Log as ERROR - this is a real problem that causes files to expire
              const errorMsg = (saveError as Error).message;
              this.logger.error(
                `CRITICAL: Failed to save output locally: ${errorMsg}. ` +
                  `URL: ${outputUrl.substring(0, 100)}...`
              );
              // Continue with remote URL if save fails, but track the error
              localOutput = { [outputType]: outputUrl, saveError: errorMsg };
            }
          } else if (result.output) {
            // Fallback for unrecognized formats
            localOutput =
              typeof result.output === 'object'
                ? (result.output as Record<string, unknown>)
                : { output: result.output };
          }

          await this.executionsService.updateNodeResult(
            executionId,
            nodeId,
            'complete',
            localOutput
          );
        } else {
          await this.executionsService.updateNodeResult(
            executionId,
            nodeId,
            'error',
            undefined,
            result.error
          );
        }

        // Update job status
        await this.queueManager.updateJobStatus(job.id as string, JOB_STATUS.COMPLETED, {
          result: result as unknown as Record<string, unknown>,
        });

        await this.queueManager.addJobLog(job.id as string, `${nodeType} completed`);

        // Continue workflow execution to next node
        await this.queueManager.continueExecution(executionId, job.data.workflowId);

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
            video: nodeData.video!,
            aspectRatio: nodeData.aspectRatio,
            prompt: nodeData.prompt,
            gridPosition: nodeData.gridPosition,
          })
        : await this.replicateService.reframeImage(executionId, nodeId, {
            image: nodeData.image!,
            aspectRatio: nodeData.aspectRatio,
            model: nodeData.model,
            prompt: nodeData.prompt,
            gridPosition: nodeData.gridPosition,
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
            video: nodeData.video!,
            targetResolution: nodeData.targetResolution ?? '1080p',
            targetFps: nodeData.targetFps ?? 30,
          })
        : await this.replicateService.upscaleImage(executionId, nodeId, {
            image: nodeData.image!,
            enhanceModel: nodeData.enhanceModel ?? 'Standard V2',
            upscaleFactor: nodeData.upscaleFactor ?? '2x',
            outputFormat: nodeData.outputFormat ?? 'png',
            faceEnhancement: nodeData.faceEnhancement,
            faceEnhancementStrength: nodeData.faceEnhancementStrength,
            faceEnhancementCreativity: nodeData.faceEnhancementCreativity,
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
      await job.updateProgress({ percent: 15, message: 'Converting image to video' });
      await this.queueManager.addJobLog(
        job.id as string,
        'Converting image to video for Sync Labs'
      );

      // Create a 5-second static video from the image (lip sync will adjust to audio length)
      const result = await this.ffmpegService.imageToVideo({ image, duration: 5 });
      video = result.videoUrl;
    }

    const prediction = await this.replicateService.generateLipSync(executionId, nodeId, {
      image: isSyncLabsModel ? undefined : image, // Only pass image to non-Sync Labs models
      video,
      audio,
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
    const { executionId, nodeId, nodeData } = job.data;

    const frameResult = await this.ffmpegService.extractFrame(executionId, nodeId, {
      video: nodeData.video,
      selectionMode: nodeData.selectionMode,
      timestampSeconds: nodeData.timestampSeconds,
      percentagePosition: nodeData.percentagePosition,
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
      text,
      voice: nodeData.voice,
      provider: nodeData.provider,
      stability: nodeData.stability,
      similarityBoost: nodeData.similarityBoost,
      speed: nodeData.speed,
    });

    return this.completeLocalJob(job, ttsResult.audioUrl, 'audio');
  }

  /**
   * Handle voice change (FFmpeg - no Replicate)
   */
  private async handleVoiceChange(job: Job<VoiceChangeJobData>): Promise<JobResult> {
    const { executionId, nodeId, nodeData } = job.data;

    const voiceResult = await this.ffmpegService.replaceAudio(executionId, nodeId, {
      video: nodeData.video,
      audio: nodeData.audio,
      preserveOriginalAudio: nodeData.preserveOriginalAudio,
      audioMixLevel: nodeData.audioMixLevel,
    });

    return this.completeLocalJob(job, voiceResult.videoUrl, 'video');
  }

  /**
   * Handle subtitle (FFmpeg - no Replicate)
   */
  private async handleSubtitle(job: Job<SubtitleJobData>): Promise<JobResult> {
    const { executionId, nodeId, nodeData } = job.data;

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

    return this.completeLocalJob(job, subtitleResult.videoUrl, 'video');
  }

  /**
   * Handle video stitch (FFmpeg - no Replicate)
   */
  private async handleVideoStitch(job: Job<VideoStitchJobData>): Promise<JobResult> {
    const { executionId, nodeId, nodeData } = job.data;

    const stitchResult = await this.ffmpegService.stitchVideos(executionId, nodeId, {
      videos: nodeData.inputVideos,
      transitionType: nodeData.transitionType,
      transitionDuration: nodeData.transitionDuration,
      seamlessLoop: nodeData.seamlessLoop,
      audioCodec: nodeData.audioCodec ?? 'aac',
      outputQuality: nodeData.outputQuality ?? 'full',
    });

    return this.completeLocalJob(job, stitchResult.videoUrl, 'video');
  }

  /**
   * Map distribution node type to its output node implementation
   */
  private getDistributionNode(nodeType: string): { node: BaseOutputNode; platform: string } | null {
    return this.distributionNodeRegistry.get(nodeType);
  }

  /**
   * Handle distribution node execution (Telegram, Discord, Google Drive, etc.)
   */
  private async handleDistribution(job: Job<DistributionJobData>): Promise<JobResult> {
    const { executionId, nodeId, nodeType, nodeData, workflowId } = job.data;

    const distributionNode = this.getDistributionNode(nodeType);

    // Unimplemented platforms — skip gracefully
    if (!distributionNode) {
      this.logger.warn(`Distribution node [${nodeType}] not yet implemented — skipping`);
      const skipOutput = {
        url: null,
        skipped: true,
        reason: `Distribution platform ${nodeType} not yet implemented`,
      };
      await this.executionsService.updateNodeResult(executionId, nodeId, 'complete', skipOutput);
      await this.queueManager.updateJobStatus(job.id as string, JOB_STATUS.COMPLETED, {
        result: skipOutput as unknown as Record<string, unknown>,
      });
      await this.queueManager.continueExecution(executionId, workflowId);
      return { success: true, output: skipOutput };
    }

    // Build GeneratedVideo from upstream inputs
    const inputVideo = nodeData.inputVideo as string | undefined;
    const inputImage = nodeData.inputImage as string | undefined;
    const inputText = nodeData.inputText as string | undefined;
    const mediaUrl = inputVideo ?? inputImage;

    if (!mediaUrl) {
      throw new Error(
        `Distribution node ${nodeType} requires inputVideo or inputImage from upstream connection`
      );
    }

    const video: GeneratedVideo = {
      url: mediaUrl,
      filename: `${nodeId}_output.${inputVideo ? 'mp4' : 'png'}`,
    };

    // Build DeliveryConfig from execution context
    const config: DeliveryConfig = {
      execution_id: executionId,
      node_id: nodeId,
      original_script: inputText,
    };

    // Extract platform-specific config from nodeData
    const platformConfig = nodeData as Record<string, unknown>;

    await job.updateProgress({
      percent: 50,
      message: `Delivering to ${distributionNode.platform}`,
    });
    await this.queueManager.addJobLog(
      job.id as string,
      `Delivering to ${distributionNode.platform}`
    );

    const deliveryResult: DeliveryResult = await distributionNode.node.deliver(
      video,
      config,
      platformConfig
    );

    const output = {
      platform: deliveryResult.platform,
      success: deliveryResult.success,
      delivered_count: deliveryResult.delivered_count,
      total_targets: deliveryResult.total_targets,
      results: deliveryResult.results,
      error: deliveryResult.error,
    } as Record<string, unknown>;

    if (deliveryResult.success) {
      await this.executionsService.updateNodeResult(executionId, nodeId, 'complete', output);
    } else {
      await this.executionsService.updateNodeResult(
        executionId,
        nodeId,
        'error',
        output,
        deliveryResult.error
      );
    }

    await job.updateProgress({ percent: 100, message: 'Delivery completed' });
    await this.queueManager.updateJobStatus(job.id as string, JOB_STATUS.COMPLETED, {
      result: output,
    });
    await this.queueManager.addJobLog(job.id as string, `${nodeType} delivery completed`);
    await this.queueManager.continueExecution(executionId, workflowId);

    return {
      success: deliveryResult.success,
      output,
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
