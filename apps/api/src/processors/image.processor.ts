import { OnWorkerEvent, Processor } from '@nestjs/bullmq';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import type { ImageJobData, JobResult } from '@/interfaces/job-data.interface';
import { BaseProcessor } from '@/processors/base.processor';
import { JOB_STATUS, QUEUE_CONCURRENCY, QUEUE_NAMES } from '@/queue/queue.constants';
import type { ExecutionsService } from '@/services/executions.service';
import type { FilesService } from '@/services/files.service';
import type { QueueManagerService } from '@/services/queue-manager.service';
import type { ReplicateService } from '@/services/replicate.service';
import { POLL_CONFIGS, ReplicatePollerService } from '@/services/replicate-poller.service';

@Processor(QUEUE_NAMES.IMAGE_GENERATION, {
  concurrency: QUEUE_CONCURRENCY[QUEUE_NAMES.IMAGE_GENERATION],
})
export class ImageProcessor extends BaseProcessor<ImageJobData> {
  protected readonly logger = new Logger(ImageProcessor.name);
  protected readonly queueName = QUEUE_NAMES.IMAGE_GENERATION;

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

  async process(job: Job<ImageJobData>): Promise<JobResult> {
    const { executionId, nodeId, nodeData, debugMode } = job.data;

    this.logger.log(`Processing image generation job: ${job.id} for node ${nodeId}`);

    try {
      await this.startJob(job, 'Starting image generation');

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

        // Convert all URLs (local and remote) to base64 for Replicate
        const inputImages = nodeData.inputImages
          ? await this.filesService.urlsToBase64Async(nodeData.inputImages)
          : [];

        // Get prompt from inputPrompt (from connection) or prompt (legacy/direct)
        const prompt = (nodeData.inputPrompt ?? nodeData.prompt) as string | undefined;

        const prediction = await this.replicateService.generateImage(executionId, nodeId, model, {
          prompt: prompt ?? '',
          inputImages,
          aspectRatio: nodeData.aspectRatio,
          resolution: nodeData.resolution,
          outputFormat: nodeData.outputFormat,
          selectedModel: nodeData.selectedModel,
          schemaParams: nodeData.schemaParams,
          debugMode,
        });

        // Handle debug mode - skip polling and return mock data
        if (prediction.debugPayload) {
          this.logger.log(`[DEBUG] Returning mock data for node ${nodeId}`);

          const mockOutput = { image: prediction.output as string };
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
              debugPayload: prediction.debugPayload,
            },
          });

          await this.queueManager.addJobLog(job.id as string, '[DEBUG] Mock prediction completed');
          await this.queueManager.continueExecution(executionId, job.data.workflowId);

          return {
            success: true,
            output: mockOutput,
            predictionId: prediction.id,
          };
        }

        predictionId = prediction.id;
        await job.updateProgress({ percent: 30, message: 'Prediction created' });
        await this.queueManager.addJobLog(job.id as string, `Created prediction: ${predictionId}`);
      }

      // Poll for completion using shared service
      const result = await this.replicatePollerService.pollForCompletion(predictionId, {
        ...POLL_CONFIGS.image,
        onProgress: this.replicatePollerService.createJobProgressCallback(job),
        onHeartbeat: () => this.queueManager.heartbeatJob(job.id as string),
      });

      // Update execution node result
      if (result.success) {
        this.logger.log(
          `Output format for node ${nodeId}: type=${typeof result.output}, ` +
            `isArray=${Array.isArray(result.output)}, ` +
            `sample=${JSON.stringify(result.output).substring(0, 150)}`
        );

        const localOutput = await this.saveAndNormalizeOutput(
          result.output,
          job.data.workflowId,
          nodeId,
          'image',
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
        'Image generation completed'
      );

      return result;
    } catch (error) {
      return this.handleProcessorError(job, error as Error);
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
