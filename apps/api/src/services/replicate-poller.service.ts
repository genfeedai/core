import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import type { JobResult, NodeJobData } from '@/interfaces/job-data.interface';
import type { ReplicateService } from '@/services/replicate.service';

export interface PollOptions {
  maxAttempts: number;
  pollInterval: number;
  progressStart?: number;
  progressEnd?: number;
  onProgress?: (progress: number, status: string) => Promise<void>;
}

/**
 * Default poll configurations for different operation types
 */
export const POLL_CONFIGS = {
  image: {
    maxAttempts: 60, // 5 minutes with 5s intervals
    pollInterval: 5000,
    progressStart: 30,
    progressEnd: 90,
  },
  video: {
    maxAttempts: 120, // 20 minutes with 10s intervals
    pollInterval: 10000,
    progressStart: 15,
    progressEnd: 95,
  },
  processing: {
    image: {
      maxAttempts: 180, // 15 minutes with 5s intervals
      pollInterval: 5000,
      progressStart: 30,
      progressEnd: 90,
    },
    video: {
      maxAttempts: 180, // 30 minutes with 10s intervals
      pollInterval: 10000,
      progressStart: 30,
      progressEnd: 90,
    },
  },
} as const;

/**
 * Service for polling Replicate predictions for completion
 * Centralizes the polling logic to avoid duplication across processors
 */
@Injectable()
export class ReplicatePollerService {
  private readonly logger = new Logger(ReplicatePollerService.name);

  constructor(private readonly replicateService: ReplicateService) {}

  /**
   * Poll Replicate for prediction completion
   * Returns a JobResult when the prediction succeeds, fails, or times out
   */
  async pollForCompletion(predictionId: string, options: PollOptions): Promise<JobResult> {
    const { maxAttempts, pollInterval, progressStart = 30, progressEnd = 90, onProgress } = options;

    const progressRange = progressEnd - progressStart;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const prediction = await this.replicateService.getPredictionStatus(predictionId);

      // Calculate progress as a percentage of the range
      const progressPercent = Math.min((attempt / maxAttempts) * progressRange, progressRange);
      const progress = progressStart + progressPercent;

      // Report progress if callback provided
      if (onProgress) {
        await onProgress(progress, prediction.status);
      }

      if (prediction.status === 'succeeded') {
        if (onProgress) {
          await onProgress(100, 'Completed');
        }
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
    this.logger.warn(`Prediction ${predictionId} timed out after ${maxAttempts} attempts`);
    return {
      success: false,
      error: 'Prediction timed out',
      predictionId,
    };
  }

  /**
   * Create a progress callback for a BullMQ job
   */
  createJobProgressCallback<T extends NodeJobData>(job: Job<T>) {
    return async (progress: number, message: string): Promise<void> => {
      await job.updateProgress({ percent: progress, message: `Status: ${message}` });
    };
  }
}
