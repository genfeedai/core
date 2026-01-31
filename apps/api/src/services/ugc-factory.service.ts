import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { CreateUGCBatchDto, UGCBatchResult, UGCVideoResult } from '@/dto/create-ugc-batch.dto';

// Motion presets for Kling Motion Control
export const MOTION_PRESETS = {
  casual_talking: {
    trajectory: [
      { x: 0.5, y: 0.5, frame: 0 }, // center start
      { x: 0.52, y: 0.48, frame: 30 }, // slight lean right
      { x: 0.48, y: 0.52, frame: 60 }, // slight lean left
      { x: 0.5, y: 0.5, frame: 90 }, // return center
    ],
    motion_strength: 0.3,
    duration: 5,
    camera_movement: 'static',
  },
  enthusiastic: {
    trajectory: [
      { x: 0.5, y: 0.5, frame: 0 },
      { x: 0.55, y: 0.45, frame: 20 }, // more pronounced movement
      { x: 0.45, y: 0.55, frame: 40 },
      { x: 0.55, y: 0.45, frame: 60 },
      { x: 0.5, y: 0.5, frame: 80 },
    ],
    motion_strength: 0.6,
    duration: 5,
    camera_movement: 'slight_zoom',
  },
  professional: {
    trajectory: [
      { x: 0.5, y: 0.5, frame: 0 },
      { x: 0.51, y: 0.49, frame: 40 }, // minimal, stable movement
      { x: 0.49, y: 0.51, frame: 80 },
      { x: 0.5, y: 0.5, frame: 120 },
    ],
    motion_strength: 0.15,
    duration: 6,
    camera_movement: 'static',
  },
} as const;

// Cost estimation (based on existing pricing)
const COST_ESTIMATES = {
  tts_per_second: 0.001, // ElevenLabs ~$0.30/1000 chars
  motion_video: 0.3, // Kling Motion Control
  lip_sync: 0.15, // Average across 5 models
  format_conversion: 0.05, // Video processing
  delivery_per_platform: 0.01, // API calls + storage
} as const;

export interface UGCGenerationJob {
  batch_id: string;
  variation: number;
  format: '16:9' | '9:16' | '1:1';
  script: string;
  avatar_image: string;
  voice_config: {
    voice_id: string;
    stability?: number;
    similarity_boost?: number;
    speed?: number;
  };
  motion_preset: keyof typeof MOTION_PRESETS;
  delivery?: CreateUGCBatchDto['delivery'];
  debug_mode?: boolean;
  customer_id?: string;
  batch_name?: string;
}

@Injectable()
export class UGCFactoryService {
  private readonly logger = new Logger(UGCFactoryService.name);

  constructor(
    @InjectQueue('ugc-factory') private ugcQueue: Queue,
    private readonly configService: ConfigService
  ) {}

  /**
   * Create a new UGC batch with multiple videos
   */
  async createUGCBatch(input: CreateUGCBatchDto): Promise<UGCBatchResult> {
    const batchId = `ugc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.logger.log(
      `Creating UGC batch ${batchId} with ${input.variations} variations across ${input.output_formats?.length || 3} formats`
    );

    // Calculate total jobs
    const variations = input.variations || 3;
    const formats = input.output_formats || ['16:9', '9:16', '1:1'];
    const totalJobs = variations * formats.length;

    // Queue individual generation jobs
    const queuedJobs = [];
    for (let variation = 0; variation < variations; variation++) {
      for (const format of formats) {
        const job = await this.queueUGCGeneration(batchId, variation, format, input);
        queuedJobs.push(job);
      }
    }

    // Calculate estimated cost
    const estimatedCost = this.calculateEstimatedCost(input, totalJobs);

    const result: UGCBatchResult = {
      batch_id: batchId,
      jobs_queued: totalJobs,
      estimated_completion: this.estimateCompletionTime(totalJobs),
      total_estimated_cost: estimatedCost,
      status: 'queued',
      created_at: new Date(),
    };

    this.logger.log(
      `UGC batch ${batchId} queued: ${totalJobs} jobs, estimated cost: $${estimatedCost.toFixed(2)}`
    );

    return result;
  }

  /**
   * Queue a single UGC video generation job
   */
  private async queueUGCGeneration(
    batchId: string,
    variation: number,
    format: '16:9' | '9:16' | '1:1',
    input: CreateUGCBatchDto
  ) {
    const jobData: UGCGenerationJob = {
      batch_id: batchId,
      variation,
      format,
      script: input.script,
      avatar_image: input.avatar_image,
      voice_config: input.voice_config,
      motion_preset: input.motion_preset,
      delivery: input.delivery,
      debug_mode: input.debug_mode,
      customer_id: input.customer_id,
      batch_name: input.batch_name,
    };

    return this.ugcQueue.add('generate-ugc-video', jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 100, // Keep last 100 completed jobs
      removeOnFail: 50, // Keep last 50 failed jobs for debugging
    });
  }

  /**
   * Get batch status and results
   */
  async getBatchStatus(batchId: string): Promise<{
    batch_id: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    total_jobs: number;
    completed_jobs: number;
    failed_jobs: number;
    results: UGCVideoResult[];
    total_cost: number;
  }> {
    // Get all jobs for this batch
    const jobs = await this.ugcQueue.getJobs(['completed', 'failed', 'active', 'waiting']);
    const batchJobs = jobs.filter((job) => job.data?.batch_id === batchId);

    const completed = batchJobs.filter((job) => job.finishedOn).length;
    const failed = batchJobs.filter((job) => job.failedReason).length;
    const total = batchJobs.length;

    // Determine overall status
    let status: 'queued' | 'processing' | 'completed' | 'failed';
    if (failed === total) {
      status = 'failed';
    } else if (completed === total) {
      status = 'completed';
    } else if (completed > 0 || failed > 0) {
      status = 'processing';
    } else {
      status = 'queued';
    }

    // Extract results from completed jobs
    const results: UGCVideoResult[] = batchJobs
      .filter((job) => job.finishedOn && job.returnvalue)
      .map((job) => job.returnvalue as UGCVideoResult);

    // Calculate total actual cost
    const totalCost = results.reduce((sum, result) => sum + (result.cost || 0), 0);

    return {
      batch_id: batchId,
      status,
      total_jobs: total,
      completed_jobs: completed,
      failed_jobs: failed,
      results,
      total_cost: totalCost,
    };
  }

  /**
   * Calculate estimated cost for a UGC batch
   */
  private calculateEstimatedCost(input: CreateUGCBatchDto, totalJobs: number): number {
    // Script length estimation (rough)
    const scriptSeconds = Math.max(5, Math.min(30, input.script.length / 10));

    // Per-job costs
    const ttsEst = scriptSeconds * COST_ESTIMATES.tts_per_second;
    const motionEst = COST_ESTIMATES.motion_video;
    const lipSyncEst = COST_ESTIMATES.lip_sync;
    const formatEst = COST_ESTIMATES.format_conversion;

    // Delivery costs (count enabled platforms)
    let deliveryPlatforms = 0;
    if (input.delivery) {
      const platforms = [
        'telegram',
        'discord',
        'twitter',
        'instagram',
        'tiktok',
        'youtube_shorts',
        'facebook',
        'linkedin',
        'google_drive',
        'webhook',
      ] as const;
      deliveryPlatforms = platforms.filter((p) => input.delivery?.[p]?.enabled).length;
    }
    const deliveryEst = deliveryPlatforms * COST_ESTIMATES.delivery_per_platform;

    const costPerJob = ttsEst + motionEst + lipSyncEst + formatEst + deliveryEst;

    return costPerJob * totalJobs;
  }

  /**
   * Estimate completion time based on job count
   */
  private estimateCompletionTime(jobCount: number): string {
    // Rough estimation: TTS (30s) + Motion (120s) + LipSync (90s) + Distribution (30s) = 4.5 minutes per job
    // With parallel processing, assume ~3 concurrent jobs
    const estimatedMinutes = Math.ceil((jobCount * 4.5) / 3);

    if (estimatedMinutes < 60) {
      return `${estimatedMinutes} minutes`;
    } else {
      const hours = Math.floor(estimatedMinutes / 60);
      const minutes = estimatedMinutes % 60;
      return `${hours}h ${minutes}m`;
    }
  }

  /**
   * Get motion preset configuration
   */
  getMotionPreset(presetName: keyof typeof MOTION_PRESETS) {
    return MOTION_PRESETS[presetName];
  }

  /**
   * List available voice options
   */
  getAvailableVoices() {
    return [
      'rachel',
      'drew',
      'clyde',
      'paul',
      'domi',
      'dave',
      'fin',
      'sarah',
      'antoni',
      'thomas',
      'charlie',
      'george',
      'emily',
      'elli',
      'callum',
      'patrick',
      'harry',
      'liam',
      'dorothy',
      'josh',
      'arnold',
      'charlotte',
      'matilda',
      'matthew',
      'james',
      'joseph',
      'jeremy',
      'michael',
      'ethan',
      'gigi',
      'freya',
      'grace',
      'daniel',
      'lily',
      'serena',
      'adam',
      'nicole',
      'jessie',
      'ryan',
      'sam',
      'glinda',
      'giovanni',
      'mimi',
    ];
  }

  /**
   * Check if delivery platforms are properly configured
   */
  async checkDeliveryConfiguration(): Promise<
    {
      platform: string;
      configured: boolean;
      missing_env_vars?: string[];
    }[]
  > {
    const platformChecks = [
      {
        platform: 'telegram',
        env_vars: ['TELEGRAM_BOT_TOKEN'],
      },
      {
        platform: 'discord',
        env_vars: ['DISCORD_BOT_TOKEN'],
      },
      {
        platform: 'twitter',
        env_vars: ['TWITTER_API_KEY', 'TWITTER_ACCESS_TOKEN'],
      },
      {
        platform: 'instagram',
        env_vars: ['INSTAGRAM_ACCESS_TOKEN'],
      },
      {
        platform: 'tiktok',
        env_vars: ['TIKTOK_ACCESS_TOKEN'],
      },
      {
        platform: 'youtube_shorts',
        env_vars: ['YOUTUBE_API_KEY'],
      },
      {
        platform: 'facebook',
        env_vars: ['FACEBOOK_ACCESS_TOKEN'],
      },
      {
        platform: 'linkedin',
        env_vars: ['LINKEDIN_ACCESS_TOKEN'],
      },
      {
        platform: 'google_drive',
        env_vars: ['GOOGLE_DRIVE_CREDENTIALS'],
      },
    ];

    return platformChecks.map((check) => {
      const missingVars = check.env_vars.filter((envVar) => !this.configService.get(envVar));

      return {
        platform: check.platform,
        configured: missingVars.length === 0,
        missing_env_vars: missingVars.length > 0 ? missingVars : undefined,
      };
    });
  }
}
