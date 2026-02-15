import { OnWorkerEvent, Processor } from '@nestjs/bullmq';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { KlingQuality } from '@genfeedai/types';
import type {
  JobResult,
  MotionControlJobData,
  VideoJobData,
} from '@/interfaces/job-data.interface';
import type { NodeOutput } from '@/interfaces/execution-types.interface';
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
        await job.updateProgress({ message: 'Resuming existing prediction', percent: 15 });
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
            aspectRatio: data.nodeData.aspectRatio,
            cameraIntensity: data.nodeData.cameraIntensity,
            cameraMovement: data.nodeData.cameraMovement,
            characterOrientation: data.nodeData.characterOrientation,
            duration: data.nodeData.duration,
            image,
            // Video transfer settings
            keepOriginalSound: data.nodeData.keepOriginalSound,
            mode: data.nodeData.mode,
            motionStrength: data.nodeData.motionStrength,
            negativePrompt: data.nodeData.negativePrompt,
            prompt: prompt ?? '',
            quality:
              data.nodeData.qualityMode === KlingQuality.PRO
                ? KlingQuality.PRO
                : KlingQuality.STANDARD,
            seed: data.nodeData.seed,
            trajectoryPoints: data.nodeData.trajectoryPoints,
            video,
          });
        } else {
          // Standard video generation
          const data = job.data as VideoJobData;
          const model = data.nodeData.model ?? 'veo-3.1-fast';
          // Get prompt from inputPrompt (from connection) or prompt (legacy/direct)
          const prompt = (data.nodeData.inputPrompt ?? data.nodeData.prompt) as string | undefined;
          prediction = await this.replicateService.generateVideo(executionId, nodeId, model, {
            aspectRatio: data.nodeData.aspectRatio,
            debugMode,
            duration: data.nodeData.duration,
            generateAudio: data.nodeData.generateAudio,
            image: data.nodeData.inputImage ?? data.nodeData.image,
            lastFrame: data.nodeData.lastFrame,
            negativePrompt: data.nodeData.negativePrompt,
            prompt: prompt ?? '',
            referenceImages: data.nodeData.referenceImages,
            resolution: data.nodeData.resolution,
            schemaParams: data.nodeData.schemaParams,
            seed: data.nodeData.seed,
            selectedModel: data.nodeData.selectedModel,
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
                debugPayload: predResult.debugPayload,
                output: mockOutput,
                success: true,
              },
            });

            await this.queueManager.addJobLog(
              job.id as string,
              '[DEBUG] Mock prediction completed'
            );
            await this.queueManager.continueExecution(executionId, job.data.workflowId);

            return {
              output: mockOutput,
              predictionId: predResult.id,
              success: true,
            };
          }
        }
        predictionId = prediction.id;
        await job.updateProgress({ message: 'Prediction created', percent: 15 });
        await this.queueManager.addJobLog(job.id as string, `Created prediction: ${predictionId}`);
      }

      // Poll for completion using shared service (video uses longer intervals)
      const result = await this.replicatePollerService.pollForCompletion(predictionId, {
        ...POLL_CONFIGS.video,
        heartbeatInterval: 12, // Every 2 min for 10s polls (video uses longer intervals)
        onHeartbeat: () => this.queueManager.heartbeatJob(job.id as string),
        onProgress: this.replicatePollerService.createJobProgressCallback(job),
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

      await this.completeJob(job, result as unknown as NodeOutput, 'Video generation completed');

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
