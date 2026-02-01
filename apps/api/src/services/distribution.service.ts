import { Injectable, Logger } from '@nestjs/common';
import { TelegramOutputNode } from '@/nodes/distribution/telegram-output-node';
import { DiscordOutputNode } from '@/nodes/distribution/discord-output-node';
import { GoogleDriveOutputNode } from '@/nodes/distribution/google-drive-output-node';
import {
  GeneratedVideo,
  DeliveryConfig,
  DeliveryResult,
} from '@/nodes/distribution/base-output-node';
import { UGCGenerationJob } from '@/services/ugc-factory.service';

export interface DistributionResults {
  total_platforms: number;
  successful_platforms: number;
  failed_platforms: number;
  results: {
    telegram?: DeliveryResult;
    discord?: DeliveryResult;
    google_drive?: DeliveryResult;
  };
  total_delivery_time_ms: number;
}

@Injectable()
export class DistributionService {
  private readonly logger = new Logger(DistributionService.name);

  constructor(
    private readonly telegramNode: TelegramOutputNode,
    private readonly discordNode: DiscordOutputNode,
    private readonly googleDriveNode: GoogleDriveOutputNode
  ) {}

  /**
   * Distribute video to all enabled platforms
   */
  async distributeVideo(
    videoUrl: string,
    deliveryConfig: UGCGenerationJob['delivery'],
    batchConfig: {
      batch_id: string;
      variation: number;
      format: '16:9' | '9:16' | '1:1';
      original_script: string;
    }
  ): Promise<DistributionResults> {
    const startTime = Date.now();

    if (!deliveryConfig) {
      return {
        total_platforms: 0,
        successful_platforms: 0,
        failed_platforms: 0,
        results: {},
        total_delivery_time_ms: 0,
      };
    }

    this.logger.log(
      `Starting distribution for ${batchConfig.batch_id}_${batchConfig.variation}_${batchConfig.format}`
    );

    // Prepare video object
    const video: GeneratedVideo = {
      url: videoUrl,
      filename: `${batchConfig.batch_id}_v${batchConfig.variation}_${batchConfig.format}.mp4`,
      format: batchConfig.format,
      width: this.getFormatDimensions(batchConfig.format).width,
      height: this.getFormatDimensions(batchConfig.format).height,
    };

    // Prepare delivery configuration
    const deliveryCtx: DeliveryConfig = {
      original_script: batchConfig.original_script,
      batch_id: batchConfig.batch_id,
      variation: batchConfig.variation,
      format: batchConfig.format,
    };

    // Collect enabled platforms
    const enabledPlatforms = this.getEnabledPlatforms(deliveryConfig);
    const deliveryPromises: Promise<{ platform: string; result: DeliveryResult }>[] = [];

    // Queue parallel deliveries
    if (deliveryConfig.telegram?.enabled && this.telegramNode.enabled) {
      deliveryPromises.push(
        this.deliverToPlatform('telegram', () =>
          this.telegramNode.deliver(video, deliveryCtx, {
            ...deliveryConfig.telegram!,
            targets: deliveryConfig.telegram!.targets || [],
          })
        )
      );
    }

    if (deliveryConfig.discord?.enabled && this.discordNode.enabled) {
      deliveryPromises.push(
        this.deliverToPlatform('discord', () =>
          this.discordNode.deliver(video, deliveryCtx, {
            ...deliveryConfig.discord!,
            channels: deliveryConfig.discord!.channels || [],
          })
        )
      );
    }

    if (deliveryConfig.google_drive?.enabled && this.googleDriveNode.enabled) {
      deliveryPromises.push(
        this.deliverToPlatform('google_drive', () =>
          this.googleDriveNode.deliver(video, deliveryCtx, deliveryConfig.google_drive!)
        )
      );
    }

    // Execute all deliveries in parallel
    const results = await Promise.allSettled(deliveryPromises);

    // Process results
    const distributionResults: DistributionResults = {
      total_platforms: enabledPlatforms.length,
      successful_platforms: 0,
      failed_platforms: 0,
      results: {},
      total_delivery_time_ms: Date.now() - startTime,
    };

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { platform, result: deliveryResult } = result.value;
        distributionResults.results[platform as keyof typeof distributionResults.results] =
          deliveryResult;

        if (deliveryResult.success) {
          distributionResults.successful_platforms++;
        } else {
          distributionResults.failed_platforms++;
        }
      } else {
        // Promise was rejected
        distributionResults.failed_platforms++;
        this.logger.error(`Distribution promise rejected: ${result.reason}`);
      }
    }

    this.logger.log(
      `Distribution completed: ${distributionResults.successful_platforms}/${distributionResults.total_platforms} platforms successful ` +
        `in ${distributionResults.total_delivery_time_ms}ms`
    );

    return distributionResults;
  }

  /**
   * Wrapper for individual platform delivery with error handling
   */
  private async deliverToPlatform(
    platform: string,
    deliveryFn: () => Promise<DeliveryResult>
  ): Promise<{ platform: string; result: DeliveryResult }> {
    try {
      const result = await deliveryFn();
      this.logger.log(`${platform} delivery result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      return { platform, result };
    } catch (error) {
      this.logger.error(`${platform} delivery error: ${error.message}`);
      return {
        platform,
        result: {
          platform,
          success: false,
          error: error.message,
        },
      };
    }
  }

  /**
   * Get list of enabled platforms from delivery config
   */
  private getEnabledPlatforms(deliveryConfig: UGCGenerationJob['delivery']): string[] {
    const platforms: string[] = [];

    if (deliveryConfig?.telegram?.enabled) platforms.push('telegram');
    if (deliveryConfig?.discord?.enabled) platforms.push('discord');
    if (deliveryConfig?.google_drive?.enabled) platforms.push('google_drive');

    return platforms;
  }

  /**
   * Get video dimensions for format
   */
  private getFormatDimensions(format: '16:9' | '9:16' | '1:1'): { width: number; height: number } {
    switch (format) {
      case '16:9':
        return { width: 1920, height: 1080 };
      case '9:16':
        return { width: 1080, height: 1920 };
      case '1:1':
        return { width: 1080, height: 1080 };
      default:
        return { width: 1920, height: 1080 };
    }
  }

  /**
   * Test all platform connections
   */
  async testAllConnections(): Promise<
    {
      platform: string;
      enabled: boolean;
      connected: boolean;
      error?: string;
    }[]
  > {
    const testResults: Array<{
      platform: string;
      enabled: boolean;
      connected: boolean;
      error?: string;
    }> = [];

    // Test Telegram
    try {
      const telegramConnected = await this.telegramNode.testConnection();
      testResults.push({
        platform: 'telegram',
        enabled: this.telegramNode.enabled,
        connected: telegramConnected,
      });
    } catch (error: unknown) {
      testResults.push({
        platform: 'telegram',
        enabled: this.telegramNode.enabled,
        connected: false,
        error: (error as Error).message,
      });
    }

    // Test Discord
    try {
      const discordConnected = await this.discordNode.testConnection();
      testResults.push({
        platform: 'discord',
        enabled: this.discordNode.enabled,
        connected: discordConnected,
      });
    } catch (error: unknown) {
      testResults.push({
        platform: 'discord',
        enabled: this.discordNode.enabled,
        connected: false,
        error: (error as Error).message,
      });
    }

    // Test Google Drive
    try {
      const driveConnected = await this.googleDriveNode.testConnection();
      testResults.push({
        platform: 'google_drive',
        enabled: this.googleDriveNode.enabled,
        connected: driveConnected,
      });
    } catch (error: unknown) {
      testResults.push({
        platform: 'google_drive',
        enabled: this.googleDriveNode.enabled,
        connected: false,
        error: (error as Error).message,
      });
    }

    return testResults;
  }

  /**
   * Get platform configuration summary
   */
  getPlatformSummary(): {
    platform: string;
    enabled: boolean;
    description: string;
  }[] {
    return [
      {
        platform: 'telegram',
        enabled: this.telegramNode.enabled,
        description: 'Send videos to Telegram channels, groups, or private chats',
      },
      {
        platform: 'discord',
        enabled: this.discordNode.enabled,
        description: 'Upload videos to Discord channels via bot or webhooks',
      },
      {
        platform: 'google_drive',
        enabled: this.googleDriveNode.enabled,
        description: 'Organized backup storage with metadata in Google Drive',
      },
    ];
  }
}
