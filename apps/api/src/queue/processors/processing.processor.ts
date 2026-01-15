import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import type { ExecutionsService } from '../../executions/executions.service';
import type { ReplicateService } from '../../replicate/replicate.service';
import type { JobResult, ProcessingJobData } from '../interfaces/job-data.interface';
import { JOB_STATUS, QUEUE_CONCURRENCY, QUEUE_NAMES } from '../queue.constants';
import type { QueueManagerService } from '../services/queue-manager.service';

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
    private readonly replicateService: ReplicateService
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
        case 'lumaReframeImage':
          prediction = await this.replicateService.reframeImage(executionId, nodeId, {
            image: nodeData.image,
            aspectRatio: nodeData.aspectRatio,
            model: nodeData.model,
            prompt: nodeData.prompt,
            gridPosition: nodeData.gridPosition,
          });
          break;

        case 'lumaReframeVideo':
          prediction = await this.replicateService.reframeVideo(executionId, nodeId, {
            video: nodeData.video,
            aspectRatio: nodeData.aspectRatio,
            prompt: nodeData.prompt,
            gridPosition: nodeData.gridPosition,
          });
          break;

        case 'topazImageUpscale':
          prediction = await this.replicateService.upscaleImage(executionId, nodeId, {
            image: nodeData.image,
            enhanceModel: nodeData.enhanceModel,
            upscaleFactor: nodeData.upscaleFactor,
            outputFormat: nodeData.outputFormat,
            faceEnhancement: nodeData.faceEnhancement,
            faceEnhancementStrength: nodeData.faceEnhancementStrength,
            faceEnhancementCreativity: nodeData.faceEnhancementCreativity,
          });
          break;

        case 'topazVideoUpscale':
          prediction = await this.replicateService.upscaleVideo(executionId, nodeId, {
            video: nodeData.video,
            targetResolution: nodeData.targetResolution,
            targetFps: nodeData.targetFps,
          });
          break;

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
      job.data.nodeType === 'topazVideoUpscale' || job.data.nodeType === 'lumaReframeVideo';

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
