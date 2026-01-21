import { OnWorkerEvent, Processor } from '@nestjs/bullmq';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import type { ImageJobData, JobResult } from '@/interfaces/job-data.interface';
import { BaseProcessor, type ProcessorErrorContext } from '@/processors/base.processor';
import { JOB_STATUS, QUEUE_CONCURRENCY, QUEUE_NAMES } from '@/queue/queue.constants';
import type { ExecutionsService } from '@/services/executions.service';
import type { QueueManagerService } from '@/services/queue-manager.service';
import type { ReplicateService } from '@/services/replicate.service';
import { POLL_CONFIGS, ReplicatePollerService } from '@/services/replicate-poller.service';

@Processor(QUEUE_NAMES.IMAGE_GENERATION, {
  concurrency: QUEUE_CONCURRENCY[QUEUE_NAMES.IMAGE_GENERATION],
})
export class ImageProcessor extends BaseProcessor<ImageJobData> {
  protected readonly logger = new Logger(ImageProcessor.name);

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
      queueName: QUEUE_NAMES.IMAGE_GENERATION,
    };
  }

  async process(job: Job<ImageJobData>): Promise<JobResult> {
    const { executionId, nodeId, nodeData } = job.data;

    this.logger.log(`Processing image generation job: ${job.id} for node ${nodeId}`);

    try {
      // Update job status
      await this.queueManager.updateJobStatus(job.id as string, JOB_STATUS.ACTIVE);

      // Update node status in execution
      await this.executionsService.updateNodeResult(executionId, nodeId, 'processing');

      // Update progress
      await job.updateProgress({ percent: 10, message: 'Starting image generation' });
      await this.queueManager.addJobLog(job.id as string, 'Starting image generation');

      // Check for existing prediction (retry scenario)
      const existingJob = await this.executionsService.findExistingJob(executionId, nodeId);
      let predictionId: string;

      if (existingJob?.predictionId) {
        // Resume polling existing prediction
        this.logger.log(`Retry: resuming existing prediction ${existingJob.predictionId}`);
        predictionId = existingJob.predictionId;
        await job.updateProgress({ percent: 30, message: 'Resuming existing prediction' });
      } else {
        // Create new prediction
        const model = nodeData.model ?? 'nano-banana';
        const prediction = await this.replicateService.generateImage(executionId, nodeId, model, {
          prompt: nodeData.prompt,
          imageInput: nodeData.imageInput,
          aspectRatio: nodeData.aspectRatio,
          resolution: nodeData.resolution,
          outputFormat: nodeData.outputFormat,
        });
        predictionId = prediction.id;
        await job.updateProgress({ percent: 30, message: 'Prediction created' });
        await this.queueManager.addJobLog(job.id as string, `Created prediction: ${predictionId}`);
      }

      // Poll for completion using shared service
      const result = await this.replicatePollerService.pollForCompletion(predictionId, {
        ...POLL_CONFIGS.image,
        onProgress: this.replicatePollerService.createJobProgressCallback(job),
      });

      // Update job status
      await this.queueManager.updateJobStatus(job.id as string, JOB_STATUS.COMPLETED, {
        result: result as unknown as Record<string, unknown>,
      });

      await this.queueManager.addJobLog(job.id as string, 'Image generation completed');

      return result;
    } catch (error) {
      return this.handleProcessorError(job, error as Error, this.errorContext);
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<ImageJobData>): void {
    this.logJobCompleted(job, 'Image');
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<ImageJobData>, error: Error): void {
    this.logJobFailed(job, error, 'Image');
  }
}
