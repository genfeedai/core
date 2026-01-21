import { OnWorkerEvent, Processor } from '@nestjs/bullmq';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import type {
  JobResult,
  MotionControlJobData,
  VideoJobData,
} from '@/interfaces/job-data.interface';
import { BaseProcessor, type ProcessorErrorContext } from '@/processors/base.processor';
import { JOB_STATUS, QUEUE_CONCURRENCY, QUEUE_NAMES } from '@/queue/queue.constants';
import type { ExecutionsService } from '@/services/executions.service';
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

  private readonly errorContext: ProcessorErrorContext;

  constructor(
    @Inject(forwardRef(() => 'QueueManagerService'))
    private readonly queueManager: QueueManagerService,
    @Inject(forwardRef(() => 'ExecutionsService'))
    private readonly executionsService: ExecutionsService,
    @Inject(forwardRef(() => 'ReplicateService'))
    private readonly replicateService: ReplicateService,
    @Inject(forwardRef(() => 'ReplicatePollerService'))
    private readonly replicatePollerService: ReplicatePollerService
  ) {
    super();
    this.errorContext = {
      queueManager: this.queueManager,
      executionsService: this.executionsService,
      queueName: QUEUE_NAMES.VIDEO_GENERATION,
    };
  }

  async process(job: Job<VideoQueueJobData>): Promise<JobResult> {
    const { executionId, nodeId, nodeType } = job.data;

    this.logger.log(`Processing ${nodeType} job: ${job.id} for node ${nodeId}`);

    try {
      // Update job status
      await this.queueManager.updateJobStatus(job.id as string, JOB_STATUS.ACTIVE);

      // Update node status in execution
      await this.executionsService.updateNodeResult(executionId, nodeId, 'processing');

      // Update progress
      await job.updateProgress({ percent: 5, message: `Starting ${nodeType} generation` });
      await this.queueManager.addJobLog(job.id as string, `Starting ${nodeType} generation`);

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
          prediction = await this.replicateService.generateMotionControlVideo(executionId, nodeId, {
            image: data.nodeData.image,
            prompt: data.nodeData.prompt,
            mode: data.nodeData.mode,
            duration: data.nodeData.duration,
            aspectRatio: data.nodeData.aspectRatio,
            trajectoryPoints: data.nodeData.trajectoryPoints,
            cameraMovement: data.nodeData.cameraMovement,
            cameraIntensity: data.nodeData.cameraIntensity,
            motionStrength: data.nodeData.motionStrength,
            negativePrompt: data.nodeData.negativePrompt,
            seed: data.nodeData.seed,
          });
        } else {
          // Standard video generation
          const data = job.data as VideoJobData;
          const model = data.nodeData.model ?? 'veo-3.1-fast';
          prediction = await this.replicateService.generateVideo(executionId, nodeId, model, {
            prompt: data.nodeData.prompt,
            image: data.nodeData.image,
            lastFrame: data.nodeData.lastFrame,
            referenceImages: data.nodeData.referenceImages,
            duration: data.nodeData.duration,
            aspectRatio: data.nodeData.aspectRatio,
            resolution: data.nodeData.resolution,
            generateAudio: data.nodeData.generateAudio,
            negativePrompt: data.nodeData.negativePrompt,
            seed: data.nodeData.seed,
          });
        }
        predictionId = prediction.id;
        await job.updateProgress({ percent: 15, message: 'Prediction created' });
        await this.queueManager.addJobLog(job.id as string, `Created prediction: ${predictionId}`);
      }

      // Poll for completion using shared service (video uses longer intervals)
      const result = await this.replicatePollerService.pollForCompletion(predictionId, {
        ...POLL_CONFIGS.video,
        onProgress: this.replicatePollerService.createJobProgressCallback(job),
      });

      // Update job status
      await this.queueManager.updateJobStatus(job.id as string, JOB_STATUS.COMPLETED, {
        result: result as unknown as Record<string, unknown>,
      });

      await this.queueManager.addJobLog(job.id as string, 'Video generation completed');

      return result;
    } catch (error) {
      return this.handleProcessorError(job, error as Error, this.errorContext);
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
