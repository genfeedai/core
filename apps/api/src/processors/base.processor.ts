import { WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import type { NodeJobData } from '@/interfaces/job-data.interface';
import { JOB_STATUS, type QueueName } from '@/queue/queue.constants';
import type { ExecutionsService } from '@/services/executions.service';
import type { FilesService } from '@/services/files.service';
import type { QueueManagerService } from '@/services/queue-manager.service';

/** Result of extracting output URL(s) from Replicate output */
interface ExtractedOutput {
  url: string | undefined;
  type: 'image' | 'video';
  allUrls: string[];
}

export interface ProcessorErrorContext {
  queueManager: QueueManagerService;
  executionsService: ExecutionsService;
  queueName: QueueName;
}

/**
 * Base processor class with shared error handling logic
 * All processors should extend this class to avoid duplicating error handling code
 */
export abstract class BaseProcessor<T extends NodeJobData> extends WorkerHost {
  protected abstract readonly logger: Logger;
  protected abstract readonly queueName: QueueName;
  protected abstract readonly queueManager: QueueManagerService;
  protected abstract readonly executionsService: ExecutionsService;

  /**
   * Handles processor errors with consistent logic across all processors:
   * 1. Updates job status to FAILED
   * 2. Updates node result to error
   * 3. Moves to DLQ on last attempt
   * 4. Triggers continuation for sequential execution
   *
   * For 429 rate limit errors, extracts retry_after and applies appropriate delay
   */
  protected async handleProcessorError(job: Job<T>, error: Error): Promise<never> {
    const { executionId, workflowId, nodeId } = job.data;

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isLastAttempt = job.attemptsMade >= (job.opts.attempts ?? 3) - 1;

    // Check for rate limit (429) error and extract retry_after
    const retryAfter = this.extractRetryAfter(errorMessage);
    if (retryAfter && !isLastAttempt) {
      this.logger.warn(`Rate limited (429) for job ${job.id}, will retry after ${retryAfter}s`);
      // Add extra buffer to the retry_after time
      const delayMs = (retryAfter + 2) * 1000;
      await job.moveToDelayed(Date.now() + delayMs);
    }

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
      await this.queueManager.moveToDeadLetterQueue(job.id as string, this.queueName, errorMessage);

      // Trigger continuation to process next nodes or complete execution
      await this.queueManager.continueExecution(executionId, workflowId);
    }

    throw error;
  }

  /**
   * Extract retry_after value from 429 error message
   * Returns seconds to wait, or null if not a rate limit error
   */
  private extractRetryAfter(errorMessage: string): number | null {
    // Check if it's a 429 error
    if (!errorMessage.includes('429') && !errorMessage.includes('Too Many Requests')) {
      return null;
    }

    // Try to extract retry_after from the error message
    // Format: "retry_after":8 or "retry_after": 8
    const match = errorMessage.match(/"retry_after":\s*(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }

    // Default to 10 seconds if we can't extract the value
    return 10;
  }

  /**
   * Update job progress and add log entry in one call
   */
  protected async updateProgressWithLog(
    job: Job<T>,
    percent: number,
    message: string
  ): Promise<void> {
    await job.updateProgress({ percent, message });
    await this.queueManager.addJobLog(job.id as string, message);
  }

  /** Override in subclasses that need file saving */
  protected get filesService(): FilesService | null {
    return null;
  }

  /**
   * Extract the primary output URL from various Replicate output formats.
   * Handles: string, array, { video: url }, { image: url }, { output: url }, regex fallback.
   */
  protected extractOutputUrl(
    output: unknown,
    preferredType: 'image' | 'video' = 'video'
  ): ExtractedOutput {
    let url: string | undefined;
    let type: 'image' | 'video' = preferredType;
    const allUrls: string[] = [];

    // 1. String URL directly
    if (typeof output === 'string') {
      url = output;
      allUrls.push(output);
      return { url, type, allUrls };
    }

    // 2. Array of URLs (most common from Replicate)
    if (Array.isArray(output) && output.length > 0) {
      url = output[0] as string;
      for (const item of output) {
        if (typeof item === 'string') {
          allUrls.push(item);
        }
      }
      return { url, type, allUrls };
    }

    // 3-5. Object with known fields
    if (output && typeof output === 'object' && !Array.isArray(output)) {
      const outputObj = output as Record<string, unknown>;

      if (typeof outputObj.video === 'string') {
        url = outputObj.video;
        type = 'video';
        allUrls.push(url);
        return { url, type, allUrls };
      }

      if (typeof outputObj.image === 'string') {
        url = outputObj.image;
        type = 'image';
        allUrls.push(url);
        return { url, type, allUrls };
      }

      if (typeof outputObj.output === 'string') {
        url = outputObj.output;
        allUrls.push(url);
        return { url, type, allUrls };
      }
    }

    // 6. Regex fallback: search for URL pattern in JSON.stringify(output)
    const outputStr = JSON.stringify(output);
    const urlMatch = outputStr.match(/https?:\/\/[^\s"']+\.(jpg|jpeg|png|webp|gif|mp4|mov|webm)/i);
    if (urlMatch) {
      url = urlMatch[0];
      allUrls.push(url);
    }

    return { url, type, allUrls };
  }

  /**
   * Save Replicate output to local storage and normalize the result format.
   * Returns the normalized output record for updateNodeResult.
   */
  protected async saveAndNormalizeOutput(
    output: unknown,
    workflowId: string,
    nodeId: string,
    outputType: 'image' | 'video',
    predictionId?: string
  ): Promise<Record<string, unknown>> {
    const extracted = this.extractOutputUrl(output, outputType);
    const svc = this.filesService;

    // For images with multiple URLs, use batch save
    if (outputType === 'image' && extracted.allUrls.length > 1 && svc) {
      try {
        const savedFiles = await svc.downloadAndSaveMultipleOutputs(
          workflowId,
          nodeId,
          extracted.allUrls,
          predictionId
        );
        return {
          image: savedFiles[0].url,
          localPath: savedFiles[0].path,
          images: savedFiles.map((f) => f.url),
          localPaths: savedFiles.map((f) => f.path),
          imageCount: savedFiles.length,
        };
      } catch (saveError) {
        const errorMsg = (saveError as Error).message;
        this.logger.error(
          `CRITICAL: Failed to save ${extracted.allUrls.length} outputs locally: ${errorMsg}`
        );
        return {
          image: extracted.allUrls[0],
          images: extracted.allUrls,
          imageCount: extracted.allUrls.length,
          saveError: errorMsg,
        };
      }
    }

    // Single URL save
    if (extracted.url && svc) {
      try {
        const saved = await svc.downloadAndSaveOutput(
          workflowId,
          nodeId,
          extracted.url,
          predictionId
        );

        // Build base result with saved URL
        const baseResult: Record<string, unknown> = {
          [extracted.type]: saved.url,
          localPath: saved.path,
        };

        // For images, always include arrays for consistency
        if (outputType === 'image') {
          baseResult.images = [saved.url];
          baseResult.localPaths = [saved.path];
        }

        // Preserve extra fields from object outputs
        if (output && typeof output === 'object' && !Array.isArray(output)) {
          const outputObj = output as Record<string, unknown>;
          for (const [key, value] of Object.entries(outputObj)) {
            if (!(key in baseResult)) {
              baseResult[key] = value;
            }
          }
        }

        this.logger.log(`Saved ${extracted.type} output to ${saved.path}`);
        return baseResult;
      } catch (saveError) {
        const errorMsg = (saveError as Error).message;
        this.logger.error(
          `CRITICAL: Failed to save output locally: ${errorMsg}. ` +
            `URL: ${extracted.url.substring(0, 100)}...`
        );

        // Fall back to remote URL
        const fallback: Record<string, unknown> = {
          [extracted.type]: extracted.url,
          saveError: errorMsg,
        };

        if (outputType === 'image') {
          fallback.images = [extracted.url];
        }

        // Preserve extra fields from object outputs
        if (output && typeof output === 'object' && !Array.isArray(output)) {
          const outputObj = output as Record<string, unknown>;
          for (const [key, value] of Object.entries(outputObj)) {
            if (!(key in fallback)) {
              fallback[key] = value;
            }
          }
        }

        return fallback;
      }
    }

    // No URL found or no filesService - pass through as-is
    if (extracted.url) {
      const result: Record<string, unknown> = { [extracted.type]: extracted.url };
      if (outputType === 'image') {
        result.images = [extracted.url];
      }
      return result;
    }

    // Completely unknown format - pass through
    if (output && typeof output === 'object') {
      return output as Record<string, unknown>;
    }

    return { output };
  }

  /**
   * Standard job start sequence: update status to ACTIVE, set node to processing, log start
   */
  protected async startJob(job: Job<T>, message: string): Promise<void> {
    await this.queueManager.updateJobStatus(job.id as string, JOB_STATUS.ACTIVE);
    await this.executionsService.updateNodeResult(
      job.data.executionId,
      job.data.nodeId,
      'processing'
    );
    await this.updateProgressWithLog(job, 10, message);
  }

  /**
   * Standard job completion sequence: update status to COMPLETED, log completion, continue execution
   */
  protected async completeJob(
    job: Job<T>,
    result: Record<string, unknown>,
    message: string
  ): Promise<void> {
    await this.queueManager.updateJobStatus(job.id as string, JOB_STATUS.COMPLETED, { result });
    await this.queueManager.addJobLog(job.id as string, message);
    await this.queueManager.continueExecution(job.data.executionId, job.data.workflowId);
  }

  /**
   * Log job completion event
   */
  protected logJobCompleted(job: Job<T>, jobType: string): void {
    this.logger.log(`${jobType} job completed: ${job.id} for node ${job.data.nodeId}`);
  }

  /**
   * Log job failure event
   */
  protected logJobFailed(job: Job<T>, error: Error, jobType: string): void {
    this.logger.error(`${jobType} job failed: ${job.id} for node ${job.data.nodeId}`, error.stack);
  }
}
