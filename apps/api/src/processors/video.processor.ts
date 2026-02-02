import { OnWorkerEvent, Processor } from '@nestjs/bullmq';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import type {
  JobResult,
  MotionControlJobData,
  VideoJobData,
} from '@/interfaces/job-data.interface';
import { BaseProcessor } from '@/processors/base.processor';
import { JOB_STATUS, QUEUE_CONCURRENCY, QUEUE_NAMES } from '@/queue/queue.constants';
import type { ExecutionsService } from '@/services/executions.service';
import type { FilesService } from '@/services/files.service';
import type { QueueManagerService } from '@/services/queue-manager.service';
import type { ReplicateService } from '@/services/replicate.service';
import { POLL_CONFIGS, ReplicatePollerService } from '@/services/replicate-poller.service';

// Union type for all video generation job data
type VideoQueueJobData = VideoJobData | MotionControlJobData;

@Processor(QUEUE_NAMES.VIDEO_GENERATION, {
  concurrency: QUEUE_CONCURRENCY[QUEUE_NAMES.VIDEO_GENERATION],
})
export class VideoProcessor extends BaseProcessor<VideoQueueJobData> {
  protected readonly logger = new Logger(VideoProcessor.name);
  protected readonly queueName = QUEUE_NAMES.VIDEO_GENERATION;

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
    @Inject(forwardRef(() => 'FilesService'))
    private readonly _filesService: FilesService
  ) {
    super();
  }

  async process(job: Job<VideoQueueJobData>): Promise<JobResult> {
    const { executionId, nodeId, nodeType, debugMode } = job.data;

    this.logger.log(`Processing ${nodeType} job: ${job.id} for node ${nodeId}`);

    try {
      await this.startJob(job, `Starting ${nodeType} generation`);

      // Check for existing prediction (retry scenario)
      const existingJob = await this.executionsService.findExistingJob(executionId, nodeId);
      let predictionId: string;

      if (existingJob?.predictionId) {
        // Resume polling existing prediction
        this.logger.log(`Retry: resuming existing prediction ${existingJob.predictionId}`);
        predictionId = existingJob.predictionId;
        await job.updateProgress({ percent: 15, message: 'Resuming existing prediction' });
      } else {
        // Create new prediction - route to appropriate handler based on node type
        let prediction: { id: string };
        if (nodeType === 'motionControl') {
          const data = job.data as MotionControlJobData;
          // Get prompt/image/video from input fields (from connection) or direct fields (legacy)
          const prompt = data.nodeData.inputPrompt ?? data.nodeData.prompt;
          const image = data.nodeData.inputImage ?? data.nodeData.image;
          const video = data.nodeData.inputVideo ?? data.nodeData.video;
          prediction = await this.replicateService.generateMotionControlVideo(executionId, nodeId, {
            image,
            video,
            prompt: prompt ?? '',
            mode: data.nodeData.mode,
            duration: data.nodeData.duration,
            aspectRatio: data.nodeData.aspectRatio,
            trajectoryPoints: data.nodeData.trajectoryPoints,
            cameraMovement: data.nodeData.cameraMovement,
            cameraIntensity: data.nodeData.cameraIntensity,
            motionStrength: data.nodeData.motionStrength,
            negativePrompt: data.nodeData.negativePrompt,
            seed: data.nodeData.seed,
            // Video transfer settings
            keepOriginalSound: data.nodeData.keepOriginalSound,
            characterOrientation: data.nodeData.characterOrientation,
            quality: data.nodeData.quality,
          });
        } else {
          // Standard video generation
          const data = job.data as VideoJobData;
          const model = data.nodeData.model ?? 'veo-3.1-fast';
          // Get prompt from inputPrompt (from connection) or prompt (legacy/direct)
          const prompt = (data.nodeData.inputPrompt ?? data.nodeData.prompt) as string | undefined;
          prediction = await this.replicateService.generateVideo(executionId, nodeId, model, {
            prompt: prompt ?? '',
            image: data.nodeData.inputImage ?? data.nodeData.image,
            lastFrame: data.nodeData.lastFrame,
            referenceImages: data.nodeData.referenceImages,
            duration: data.nodeData.duration,
            aspectRatio: data.nodeData.aspectRatio,
            resolution: data.nodeData.resolution,
            generateAudio: data.nodeData.generateAudio,
            negativePrompt: data.nodeData.negativePrompt,
            seed: data.nodeData.seed,
            selectedModel: data.nodeData.selectedModel,
            schemaParams: data.nodeData.schemaParams,
            debugMode,
          });

          // Handle debug mode - skip polling and return mock data
          if ((prediction as { debugPayload?: unknown }).debugPayload) {
            const predResult = prediction as { id: string; output: string; debugPayload: unknown };
            this.logger.log(`[DEBUG] Returning mock data for node ${nodeId}`);

            const mockOutput = { video: predResult.output };
            await this.executionsService.updateNodeResult(
              executionId,
              nodeId,
              'complete',
              mockOutput
            );

            await this.queueManager.updateJobStatus(job.id as string, JOB_STATUS.COMPLETED, {
              result: {
                success: true,
                output: mockOutput,
                debugPayload: predResult.debugPayload,
              },
            });

            await this.queueManager.addJobLog(
              job.id as string,
              '[DEBUG] Mock prediction completed'
            );
            await this.queueManager.continueExecution(executionId, job.data.workflowId);

            return {
              success: true,
              output: mockOutput,
              predictionId: predResult.id,
            };
          }
        }
        predictionId = prediction.id;
        await job.updateProgress({ percent: 15, message: 'Prediction created' });
        await this.queueManager.addJobLog(job.id as string, `Created prediction: ${predictionId}`);
      }

      // Poll for completion using shared service (video uses longer intervals)
      const result = await this.replicatePollerService.pollForCompletion(predictionId, {
        ...POLL_CONFIGS.video,
        onProgress: this.replicatePollerService.createJobProgressCallback(job),
        onHeartbeat: () => this.queueManager.heartbeatJob(job.id as string),
        heartbeatInterval: 12, // Every 2 min for 10s polls (video uses longer intervals)
      });

      // Update execution node result
      if (result.success) {
        const localOutput = await this.saveAndNormalizeOutput(
          result.output,
          job.data.workflowId,
          nodeId,
          'video',
          predictionId
        );

        await this.executionsService.updateNodeResult(executionId, nodeId, 'complete', localOutput);
      } else {
        await this.executionsService.updateNodeResult(
          executionId,
          nodeId,
          'error',
          undefined,
          result.error
        );
      }

      await this.completeJob(
        job,
        result as unknown as Record<string, unknown>,
        'Video generation completed'
      );

      return result;
    } catch (error) {
      return this.handleProcessorError(job, error as Error);
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<VideoQueueJobData>): void {
    this.logJobCompleted(job, 'Video');
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<VideoQueueJobData>, error: Error): void {
    this.logJobFailed(job, error, 'Video');
  }
}
