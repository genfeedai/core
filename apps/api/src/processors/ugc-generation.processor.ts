import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { TTSService } from '@/services/tts.service';
import { ReplicateService } from '@/services/replicate.service';
import { DistributionService } from '@/services/distribution.service';
import { UGCGenerationJob, MOTION_PRESETS } from '@/services/ugc-factory.service';
import { UGCVideoResult } from '@/dto/create-ugc-batch.dto';

// Lip sync model fallback chain (using existing models)
const LIP_SYNC_FALLBACK_CHAIN = [
  'bytedance/omni-human', // Best quality, image native
  'veed/fabric-1.0', // Good quality, fast
  'pixverse/lipsync', // Reliable backup
  'sync/lipsync-2-pro', // Premium sync labs
  'sync/lipsync-2', // Basic sync labs
] as const;

// Aspect ratio settings for different formats
const ASPECT_RATIO_CONFIG = {
  '16:9': { width: 1920, height: 1080, replicate_format: '16:9' },
  '9:16': { width: 1080, height: 1920, replicate_format: '9:16' },
  '1:1': { width: 1080, height: 1080, replicate_format: '1:1' },
} as const;

@Processor('ugc-factory')
export class UGCGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(UGCGenerationProcessor.name);

  constructor(
    private readonly ttsService: TTSService,
    private readonly replicateService: ReplicateService,
    private readonly distributionService: DistributionService
  ) {
    super();
  }

  async process(job: Job<UGCGenerationJob, UGCVideoResult, string>): Promise<UGCVideoResult> {
    const {
      batch_id,
      variation,
      format,
      script,
      avatar_image,
      voice_config,
      motion_preset,
      delivery,
      debug_mode,
      customer_id,
    } = job.data;

    const startTime = Date.now();
    let totalCost = 0;

    this.logger.log(
      `Starting UGC generation: batch ${batch_id}, variation ${variation}, format ${format}`
    );

    try {
      // Step 1: Generate TTS audio
      const audioResult = await this.generateTTS(
        batch_id,
        `${batch_id}_${variation}_${format}_tts`,
        script,
        voice_config,
        variation,
        debug_mode
      );
      totalCost += audioResult.cost;

      // Step 2: Generate motion video with avatar
      const motionResult = await this.generateMotionVideo(
        batch_id,
        `${batch_id}_${variation}_${format}_motion`,
        avatar_image,
        motion_preset,
        format,
        script,
        debug_mode
      );
      totalCost += motionResult.cost;

      // Step 3: Lip sync the motion video with audio
      const lipSyncResult = await this.generateLipSync(
        batch_id,
        `${batch_id}_${variation}_${format}_lipsync`,
        motionResult.video_url,
        audioResult.audio_url,
        debug_mode
      );
      totalCost += lipSyncResult.cost;

      // Step 4: Distribute to platforms if configured
      let deliveryResults;
      if (delivery) {
        const distributionResults = await this.distributionService.distributeVideo(
          lipSyncResult.video_url,
          delivery,
          {
            batch_id,
            variation,
            format,
            original_script: script,
          }
        );

        // Convert distribution results to UGC video result format
        deliveryResults = this.convertDistributionResults(distributionResults);
      }

      const result: UGCVideoResult = {
        batch_id,
        variation,
        format,
        video_url: lipSyncResult.video_url,
        generation_time_ms: Date.now() - startTime,
        cost: totalCost,
        delivery_results: deliveryResults,
      };

      this.logger.log(
        `UGC generation completed: batch ${batch_id}, variation ${variation}, format ${format}, cost: $${totalCost.toFixed(3)}`
      );

      return result;
    } catch (error) {
      this.logger.error(
        `UGC generation failed: batch ${batch_id}, variation ${variation}, format ${format}`,
        error.stack
      );

      // Log for cost tracking even on failure
      if (totalCost > 0) {
        this.logger.warn(`Partial cost incurred before failure: $${totalCost.toFixed(3)}`);
      }

      throw error;
    }
  }

  /**
   * Generate TTS audio with variation for A/B testing
   */
  private async generateTTS(
    batchId: string,
    nodeId: string,
    script: string,
    voiceConfig: UGCGenerationJob['voice_config'],
    variation: number,
    debugMode?: boolean
  ): Promise<{ audio_url: string; cost: number; duration?: number }> {
    // Add slight variation to voice settings for A/B testing
    const variationConfig = {
      ...voiceConfig,
      stability: Math.max(
        0,
        Math.min(1, (voiceConfig.stability || 0.5) + (variation * 0.05 - 0.05))
      ),
      similarity_boost: Math.max(
        0,
        Math.min(1, (voiceConfig.similarity_boost || 0.75) + (variation * 0.03 - 0.03))
      ),
    };

    if (debugMode) {
      this.logger.log(`[DEBUG] Skipping TTS generation for ${nodeId}`);
      return {
        audio_url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3',
        cost: 0.02, // Mock cost
        duration: 10,
      };
    }

    const result = await this.ttsService.generateSpeech('ugc_execution', nodeId, {
      text: script,
      voice: variationConfig.voice_id,
      provider: 'elevenlabs',
      stability: variationConfig.stability,
      similarityBoost: variationConfig.similarity_boost,
    });

    // Estimate cost based on script length (ElevenLabs pricing)
    const characterCount = script.length;
    const estimatedCost = (characterCount / 1000) * 0.3; // ~$0.30 per 1000 chars

    return {
      audio_url: result.audioUrl,
      cost: estimatedCost,
      duration: result.duration,
    };
  }

  /**
   * Generate motion video using Kling Motion Control
   */
  private async generateMotionVideo(
    batchId: string,
    nodeId: string,
    avatarImage: string,
    motionPreset: keyof typeof MOTION_PRESETS,
    format: '16:9' | '9:16' | '1:1',
    script: string,
    debugMode?: boolean
  ): Promise<{ video_url: string; cost: number }> {
    const preset = MOTION_PRESETS[motionPreset];
    const aspectRatio = ASPECT_RATIO_CONFIG[format];

    if (debugMode) {
      this.logger.log(`[DEBUG] Skipping motion video generation for ${nodeId}`);
      return {
        video_url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
        cost: 0.3,
      };
    }

    const result = await this.replicateService.generateMotionControlVideo('ugc_execution', nodeId, {
      image: avatarImage,
      prompt: `Person speaking: "${script.substring(0, 100)}..."`, // Truncate for prompt
      mode: 'trajectory',
      duration: preset.duration as 5 | 10,
      aspectRatio: aspectRatio.replicate_format as '16:9' | '9:16' | '1:1',
      trajectoryPoints: [...preset.trajectory] as { x: number; y: number; frame: number }[],
      motionStrength: Math.round(preset.motion_strength * 100), // Convert to 0-100 scale
      cameraMovement: preset.camera_movement === 'slight_zoom' ? 'zoom_in' : 'static',
    });

    // Wait for completion
    let finalResult = result;
    while (finalResult.status === 'starting' || finalResult.status === 'processing') {
      await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10s
      finalResult = await this.replicateService.getPredictionStatus(result.id);
    }

    if (finalResult.status !== 'succeeded') {
      throw new Error(`Motion video generation failed: ${finalResult.error || 'Unknown error'}`);
    }

    return {
      video_url: Array.isArray(finalResult.output)
        ? finalResult.output[0]
        : (finalResult.output as string),
      cost: 0.3, // Kling Motion Control base cost
    };
  }

  /**
   * Generate lip sync video with fallback chain
   */
  private async generateLipSync(
    batchId: string,
    nodeId: string,
    videoUrl: string,
    audioUrl: string,
    debugMode?: boolean
  ): Promise<{ video_url: string; cost: number; model_used?: string }> {
    if (debugMode) {
      this.logger.log(`[DEBUG] Skipping lip sync generation for ${nodeId}`);
      return {
        video_url: videoUrl, // Return original video in debug mode
        cost: 0.15,
        model_used: 'debug_mock',
      };
    }

    // Try each model in the fallback chain
    for (const model of LIP_SYNC_FALLBACK_CHAIN) {
      try {
        this.logger.log(`Attempting lip sync with model: ${model}`);

        const result = await this.replicateService.generateLipSync('ugc_execution', nodeId, {
          video: videoUrl,
          audio: audioUrl,
          model: model as any, // Cast to match interface
        });

        // Wait for completion
        let finalResult = result;
        while (finalResult.status === 'starting' || finalResult.status === 'processing') {
          await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10s
          finalResult = await this.replicateService.getPredictionStatus(result.id);
        }

        if (finalResult.status === 'succeeded') {
          this.logger.log(`Lip sync succeeded with model: ${model}`);
          return {
            video_url: Array.isArray(finalResult.output)
              ? finalResult.output[0]
              : (finalResult.output as string),
            cost: 0.15, // Average lip sync cost
            model_used: model,
          };
        } else {
          this.logger.warn(`Lip sync failed with model ${model}: ${finalResult.error}`);
        }
      } catch (error) {
        this.logger.warn(`Lip sync model ${model} failed: ${error.message}`);
      }
    }

    throw new Error('All lip sync models failed');
  }

  /**
   * Convert distribution service results to UGC video result format
   */
  private convertDistributionResults(
    distributionResults: import('@/services/distribution.service').DistributionResults
  ): UGCVideoResult['delivery_results'] {
    const results: UGCVideoResult['delivery_results'] = {};

    // Convert each platform result
    if (distributionResults.results.telegram) {
      const telegramResult = distributionResults.results.telegram;
      results.telegram = {
        success: telegramResult.success,
        results: telegramResult.results || [],
        error: telegramResult.error,
        delivered_count: telegramResult.delivered_count,
        total_targets: telegramResult.total_targets,
      };
    }

    if (distributionResults.results.discord) {
      const discordResult = distributionResults.results.discord;
      results.discord = {
        success: discordResult.success,
        results: discordResult.results || [],
        error: discordResult.error,
        delivered_count: discordResult.delivered_count,
        total_targets: discordResult.total_targets,
      };
    }

    if (distributionResults.results.google_drive) {
      const driveResult = distributionResults.results.google_drive;
      results.google_drive = {
        success: driveResult.success,
        folder_url: driveResult.results?.[0]?.view_url,
        error: driveResult.error,
        files_uploaded: driveResult.results?.length || 0,
      };
    }

    this.logger.log(
      `Distribution completed: ${distributionResults.successful_platforms}/${distributionResults.total_platforms} platforms successful`
    );

    return results;
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<UGCGenerationJob, UGCVideoResult>) {
    const { batch_id, variation, format } = job.data;
    const result = job.returnvalue;

    this.logger.log(
      `✅ UGC job completed: ${batch_id}_${variation}_${format} in ${result?.generation_time_ms}ms, cost: $${result?.cost?.toFixed(3)}`
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<UGCGenerationJob>, error: Error) {
    const { batch_id, variation, format } = job.data;

    this.logger.error(
      `❌ UGC job failed: ${batch_id}_${variation}_${format} - ${error.message}`,
      error.stack
    );
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job<UGCGenerationJob>, progress: number) {
    const { batch_id, variation, format } = job.data;

    this.logger.debug(`⏳ UGC job progress: ${batch_id}_${variation}_${format} - ${progress}%`);
  }
}
