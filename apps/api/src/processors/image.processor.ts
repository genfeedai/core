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
    private readonly filesService: FilesService
  ) {
    super();
  }

  async process(job: Job<ImageJobData>): Promise<JobResult> {
    const { executionId, nodeId, nodeData, debugMode } = job.data;

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
        // Log output format for debugging
        this.logger.log(
          `Output format for node ${nodeId}: type=${typeof result.output}, ` +
            `isArray=${Array.isArray(result.output)}, ` +
            `sample=${JSON.stringify(result.output).substring(0, 150)}`
        );

        // Auto-save output to local storage
        let localOutput: Record<string, unknown>;

        // Handle all output formats:
        // 1. output is a string (URL directly)
        // 2. output is an array (most common from Replicate - may have multiple images)
        // 3. output.image is a string (some models return { image: "url" })
        if (Array.isArray(result.output) && result.output.length > 0) {
          const imageUrls = result.output as string[];

          if (imageUrls.length === 1) {
            // Single image - existing logic for backward compat
            try {
              const saved = await this.filesService.downloadAndSaveOutput(
                job.data.workflowId,
                nodeId,
                imageUrls[0],
                predictionId
              );
              localOutput = {
                image: saved.url,
                localPath: saved.path,
                images: [saved.url],
                localPaths: [saved.path],
              };
              this.logger.log(`Saved image output to ${saved.path}`);
            } catch (saveError) {
              const errorMsg = (saveError as Error).message;
              this.logger.error(
                `CRITICAL: Failed to save output locally: ${errorMsg}. URL: ${imageUrls[0].substring(0, 100)}...`
              );
              localOutput = {
                image: imageUrls[0],
                images: imageUrls,
                saveError: errorMsg,
              };
            }
          } else {
            // Multiple images - batch save all
            try {
              const savedFiles = await this.filesService.downloadAndSaveMultipleOutputs(
                job.data.workflowId,
                nodeId,
                imageUrls,
                predictionId
              );
              localOutput = {
                image: savedFiles[0].url, // Backward compat - first image
                localPath: savedFiles[0].path,
                images: savedFiles.map((f) => f.url),
                localPaths: savedFiles.map((f) => f.path),
                imageCount: savedFiles.length,
              };
              this.logger.log(`Saved ${savedFiles.length} images for node ${nodeId}`);
            } catch (saveError) {
              const errorMsg = (saveError as Error).message;
              this.logger.error(
                `CRITICAL: Failed to save ${imageUrls.length} outputs locally: ${errorMsg}`
              );
              localOutput = {
                image: imageUrls[0],
                images: imageUrls,
                imageCount: imageUrls.length,
                saveError: errorMsg,
              };
            }
          }
        } else if (typeof result.output === 'string') {
          // String URL - wrap in arrays for consistency
          try {
            const saved = await this.filesService.downloadAndSaveOutput(
              job.data.workflowId,
              nodeId,
              result.output,
              predictionId
            );
            localOutput = {
              image: saved.url,
              localPath: saved.path,
              images: [saved.url],
              localPaths: [saved.path],
            };
            this.logger.log(`Saved image output to ${saved.path}`);
          } catch (saveError) {
            const errorMsg = (saveError as Error).message;
            this.logger.error(
              `CRITICAL: Failed to save output locally: ${errorMsg}. URL: ${result.output.substring(0, 100)}...`
            );
            localOutput = {
              image: result.output,
              images: [result.output],
              saveError: errorMsg,
            };
          }
        } else if (
          result.output &&
          typeof result.output === 'object' &&
          !Array.isArray(result.output) &&
          'image' in result.output
        ) {
          // Object with image field
          const output = result.output as Record<string, unknown>;
          const imageUrl = output.image as string;
          try {
            const saved = await this.filesService.downloadAndSaveOutput(
              job.data.workflowId,
              nodeId,
              imageUrl,
              predictionId
            );
            localOutput = {
              ...output,
              image: saved.url,
              localPath: saved.path,
              images: [saved.url],
              localPaths: [saved.path],
            };
            this.logger.log(`Saved image output to ${saved.path}`);
          } catch (saveError) {
            const errorMsg = (saveError as Error).message;
            this.logger.error(`CRITICAL: Failed to save output locally: ${errorMsg}`);
            localOutput = {
              ...output,
              images: [imageUrl],
              saveError: errorMsg,
            };
          }
        } else {
          // Unknown format - try to extract any URL string
          const outputStr = JSON.stringify(result.output);
          const urlMatch = outputStr.match(/https?:\/\/[^\s"']+\.(jpg|jpeg|png|webp|gif)/i);

          if (urlMatch) {
            const extractedUrl = urlMatch[0];
            this.logger.log(`Extracted URL from unknown format: ${extractedUrl.substring(0, 80)}`);
            try {
              const saved = await this.filesService.downloadAndSaveOutput(
                job.data.workflowId,
                nodeId,
                extractedUrl,
                predictionId
              );
              localOutput = {
                image: saved.url,
                localPath: saved.path,
                images: [saved.url],
                localPaths: [saved.path],
              };
            } catch (saveError) {
              this.logger.error(
                `CRITICAL: Failed to save extracted URL: ${(saveError as Error).message}`
              );
              localOutput = {
                image: extractedUrl,
                images: [extractedUrl],
                saveError: (saveError as Error).message,
              };
            }
          } else {
            // No URL found - pass through as-is
            localOutput = result.output as Record<string, unknown>;
          }
        }

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

      // Update job status
      await this.queueManager.updateJobStatus(job.id as string, JOB_STATUS.COMPLETED, {
        result: result as unknown as Record<string, unknown>,
      });

      await this.queueManager.addJobLog(job.id as string, 'Image generation completed');

      // Continue workflow execution to next node
      await this.queueManager.continueExecution(executionId, job.data.workflowId);

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
