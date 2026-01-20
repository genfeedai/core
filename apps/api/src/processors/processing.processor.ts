import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import type { JobResult, ProcessingJobData } from '@/interfaces/job-data.interface';
import { JOB_STATUS, QUEUE_CONCURRENCY, QUEUE_NAMES } from '@/queue/queue.constants';
import type { ExecutionsService } from '@/services/executions.service';
import type { FFmpegService } from '@/services/ffmpeg.service';
import type { QueueManagerService } from '@/services/queue-manager.service';
import type { ReplicateService } from '@/services/replicate.service';
import type { TTSService } from '@/services/tts.service';

@Processor(QUEUE_NAMES.PROCESSING, {
  concurrency: QUEUE_CONCURRENCY[QUEUE_NAMES.PROCESSING],
})
export class ProcessingProcessor extends WorkerHost {
  private readonly logger = new Logger(ProcessingProcessor.name);

  constructor(
    @Inject(forwardRef(() => 'QueueManagerService'))
    private readonly queueManager: QueueManagerService,
    @Inject(forwardRef(() => 'ExecutionsService'))
    private readonly executionsService: ExecutionsService,
    @Inject(forwardRef(() => 'ReplicateService'))
    private readonly replicateService: ReplicateService,
    @Inject(forwardRef(() => 'TTSService'))
    private readonly ttsService: TTSService,
    @Inject(forwardRef(() => 'FFmpegService'))
    private readonly ffmpegService: FFmpegService
  ) {
    super();
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

      let prediction;

      switch (nodeType) {
        case 'reframe':
          // Unified reframe node - detect input type
          if (nodeData.inputType === 'video') {
            prediction = await this.replicateService.reframeVideo(executionId, nodeId, {
              video: nodeData.video as string,
              aspectRatio: nodeData.aspectRatio,
              prompt: nodeData.prompt,
              gridPosition: nodeData.gridPosition,
            });
          } else {
            prediction = await this.replicateService.reframeImage(executionId, nodeId, {
              image: nodeData.image as string,
              aspectRatio: nodeData.aspectRatio,
              model: nodeData.model,
              prompt: nodeData.prompt,
              gridPosition: nodeData.gridPosition,
            });
          }
          break;

        case 'upscale':
          // Unified upscale node - detect input type
          if (nodeData.inputType === 'video') {
            prediction = await this.replicateService.upscaleVideo(executionId, nodeId, {
              video: nodeData.video as string,
              targetResolution: nodeData.targetResolution ?? '1080p',
              targetFps: nodeData.targetFps ?? 30,
            });
          } else {
            prediction = await this.replicateService.upscaleImage(executionId, nodeId, {
              image: nodeData.image as string,
              enhanceModel: nodeData.enhanceModel ?? 'Standard V2',
              upscaleFactor: nodeData.upscaleFactor ?? '2x',
              outputFormat: nodeData.outputFormat ?? 'png',
              faceEnhancement: nodeData.faceEnhancement,
              faceEnhancementStrength: nodeData.faceEnhancementStrength,
              faceEnhancementCreativity: nodeData.faceEnhancementCreativity,
            });
          }
          break;

        case 'videoFrameExtract': {
          // Frame extraction uses FFmpeg - no Replicate needed
          const frameResult = await this.ffmpegService.extractFrame(executionId, nodeId, {
            video: nodeData.video,
            selectionMode: nodeData.selectionMode as 'first' | 'last' | 'timestamp' | 'percentage',
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

        case 'lipSync':
          prediction = await this.replicateService.generateLipSync(executionId, nodeId, {
            image: nodeData.image,
            video: nodeData.video,
            audio: nodeData.audio,
            model: nodeData.model,
            syncMode: nodeData.syncMode,
            temperature: nodeData.temperature,
            activeSpeaker: nodeData.activeSpeaker,
          });
          break;

        case 'textToSpeech': {
          // TTS doesn't use Replicate - handle directly
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

        case 'voiceChange': {
          // Voice change uses FFmpeg to replace/mix audio
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

        case 'subtitle': {
          // Subtitle burning uses FFmpeg
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

        case 'videoStitch': {
          // Video stitching with transitions (easy-peasy-ease inspired)
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

        default:
          throw new Error(`Unknown processing node type: ${nodeType}`);
      }

      await job.updateProgress({ percent: 30, message: 'Prediction created' });
      await this.queueManager.addJobLog(job.id as string, `Created prediction: ${prediction.id}`);

      // Poll for completion
      const result = await this.pollForCompletion(prediction.id, job);

      // Update job status
      await this.queueManager.updateJobStatus(job.id as string, JOB_STATUS.COMPLETED, {
        result: result as unknown as Record<string, unknown>,
      });

      await this.queueManager.addJobLog(job.id as string, `${nodeType} completed`);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.queueManager.updateJobStatus(job.id as string, JOB_STATUS.FAILED, {
        error: errorMessage,
        attemptsMade: job.attemptsMade,
      });

      await this.executionsService.updateNodeResult(
        executionId,
        nodeId,
        'error',
        undefined,
        errorMessage
      );

      // If this was the last attempt, move to DLQ
      if (job.attemptsMade >= (job.opts.attempts ?? 3) - 1) {
        await this.queueManager.moveToDeadLetterQueue(
          job.id as string,
          QUEUE_NAMES.PROCESSING,
          errorMessage
        );
      }

      throw error;
    }
  }

  /**
   * Poll Replicate for prediction completion
   * Video operations can take longer, so we use different timeouts
   */
  private async pollForCompletion(
    predictionId: string,
    job: Job<ProcessingJobData>
  ): Promise<JobResult> {
    const isVideoOperation =
      job.data.nodeType === 'lipSync' ||
      ((job.data.nodeType === 'reframe' || job.data.nodeType === 'upscale') &&
        job.data.nodeData.inputType === 'video');

    // Video: 30 minutes with 10s intervals, Image: 15 minutes with 5s intervals
    const maxAttempts = isVideoOperation ? 180 : 180;
    const pollInterval = isVideoOperation ? 10000 : 5000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const prediction = await this.replicateService.getPredictionStatus(predictionId);

      // Calculate progress (30% to 90% based on attempts)
      const progressIncrement = isVideoOperation ? 0.33 : 0.33;
      const progress = 30 + Math.min(attempt * progressIncrement, 60);
      await job.updateProgress({
        percent: progress,
        message: `Status: ${prediction.status}`,
      });

      if (prediction.status === 'succeeded') {
        await job.updateProgress({ percent: 100, message: 'Completed' });
        return {
          success: true,
          output: prediction.output as Record<string, unknown>,
          predictionId,
          predictTime: prediction.metrics?.predict_time,
        };
      }

      if (prediction.status === 'failed' || prediction.status === 'canceled') {
        return {
          success: false,
          error: prediction.error ?? `Prediction ${prediction.status}`,
          predictionId,
        };
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    // Timeout
    return {
      success: false,
      error: 'Prediction timed out',
      predictionId,
    };
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<ProcessingJobData>): void {
    this.logger.log(`Processing job completed: ${job.id} for node ${job.data.nodeId}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<ProcessingJobData>, error: Error): void {
    this.logger.error(`Processing job failed: ${job.id} for node ${job.data.nodeId}`, error.stack);
  }
}
