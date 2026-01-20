import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import type {
  JobResult,
  MotionControlJobData,
  VideoJobData,
} from '@/interfaces/job-data.interface';
import { JOB_STATUS, QUEUE_CONCURRENCY, QUEUE_NAMES } from '@/queue/queue.constants';
import type { ExecutionsService } from '@/services/executions.service';
import type { QueueManagerService } from '@/services/queue-manager.service';
import type { ReplicateService } from '@/services/replicate.service';

// Union type for all video generation job data
type VideoQueueJobData = VideoJobData | MotionControlJobData;

@Processor(QUEUE_NAMES.VIDEO_GENERATION, {
  concurrency: QUEUE_CONCURRENCY[QUEUE_NAMES.VIDEO_GENERATION],
})
export class VideoProcessor extends WorkerHost {
  private readonly logger = new Logger(VideoProcessor.name);

  constructor(
    @Inject(forwardRef(() => 'QueueManagerService'))
    private readonly queueManager: QueueManagerService,
    @Inject(forwardRef(() => 'ExecutionsService'))
    private readonly executionsService: ExecutionsService,
    @Inject(forwardRef(() => 'ReplicateService'))
    private readonly replicateService: ReplicateService
  ) {
    super();
  }

  async process(job: Job<VideoQueueJobData>): Promise<JobResult> {
    const { executionId, workflowId, nodeId, nodeType } = job.data;

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
        let prediction;
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

      // Poll for completion (video takes longer)
      const result = await this.pollForCompletion(predictionId, job);

      // Update job status
      await this.queueManager.updateJobStatus(job.id as string, JOB_STATUS.COMPLETED, {
        result: result as unknown as Record<string, unknown>,
      });

      await this.queueManager.addJobLog(job.id as string, 'Video generation completed');

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isLastAttempt = job.attemptsMade >= (job.opts.attempts ?? 3) - 1;

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

      // If this was the last attempt, handle failure
      if (isLastAttempt) {
        await this.queueManager.moveToDeadLetterQueue(
          job.id as string,
          QUEUE_NAMES.VIDEO_GENERATION,
          errorMessage
        );

        // Trigger continuation to process next nodes or complete execution
        await this.queueManager.continueExecution(executionId, workflowId);
      }

      throw error;
    }
  }

  /**
   * Poll Replicate for prediction completion
   * Video generation takes longer, so we use longer intervals
   */
  private async pollForCompletion(
    predictionId: string,
    job: Job<VideoQueueJobData>
  ): Promise<JobResult> {
    const maxAttempts = 120; // 20 minutes with 10 second intervals
    const pollInterval = 10000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const prediction = await this.replicateService.getPredictionStatus(predictionId);

      const progress = 15 + Math.min(attempt * 0.7, 80); // Progress from 15% to 95%
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
      error: 'Video prediction timed out',
      predictionId,
    };
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<VideoQueueJobData>): void {
    this.logger.log(`Video job completed: ${job.id} for node ${job.data.nodeId}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<VideoQueueJobData>, error: Error): void {
    this.logger.error(`Video job failed: ${job.id} for node ${job.data.nodeId}`, error.stack);
  }
}
