import { WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import type { NodeJobData } from '@/interfaces/job-data.interface';
import { JOB_STATUS, type QueueName } from '@/queue/queue.constants';
import type { ExecutionsService } from '@/services/executions.service';
import type { QueueManagerService } from '@/services/queue-manager.service';

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

  /**
   * Handles processor errors with consistent logic across all processors:
   * 1. Updates job status to FAILED
   * 2. Updates node result to error
   * 3. Moves to DLQ on last attempt
   * 4. Triggers continuation for sequential execution
   */
  protected async handleProcessorError(
    job: Job<T>,
    error: Error,
    context: ProcessorErrorContext
  ): Promise<never> {
    const { executionId, workflowId, nodeId } = job.data;
    const { queueManager, executionsService, queueName } = context;

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isLastAttempt = job.attemptsMade >= (job.opts.attempts ?? 3) - 1;

    await queueManager.updateJobStatus(job.id as string, JOB_STATUS.FAILED, {
      error: errorMessage,
      attemptsMade: job.attemptsMade,
    });

    await executionsService.updateNodeResult(executionId, nodeId, 'error', undefined, errorMessage);

    // If this was the last attempt, handle failure
    if (isLastAttempt) {
      await queueManager.moveToDeadLetterQueue(job.id as string, queueName, errorMessage);

      // Trigger continuation to process next nodes or complete execution
      await queueManager.continueExecution(executionId, workflowId);
    }

    throw error;
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
