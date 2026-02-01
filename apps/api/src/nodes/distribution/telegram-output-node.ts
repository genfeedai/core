import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseOutputNode, GeneratedVideo, DeliveryConfig, DeliveryResult } from './base-output-node';

// Telegram Bot API types
interface TelegramConfig {
  enabled: boolean;
  targets: string[]; // [@channel_username, chat_id, group_id]
  caption?: string;
}

interface TelegramMessage {
  message_id: number;
  chat: {
    id: number;
    username?: string;
    type: string;
  };
  date: number;
}

@Injectable()
export class TelegramOutputNode extends BaseOutputNode {
  readonly platform = 'telegram';
  readonly enabled: boolean;

  private readonly botToken: string;
  private readonly apiBaseUrl = 'https://api.telegram.org/bot';

  constructor(private readonly configService: ConfigService) {
    super();
    this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN') || '';
    this.enabled = !!this.botToken;

    if (!this.enabled) {
      this.logger.warn('Telegram output node disabled: TELEGRAM_BOT_TOKEN not configured');
    }
  }

  async deliver(
    video: GeneratedVideo,
    config: DeliveryConfig,
    platformConfig: TelegramConfig
  ): Promise<DeliveryResult> {
    if (!this.enabled) {
      return {
        platform: this.platform,
        success: false,
        error: 'Telegram bot token not configured',
      };
    }

    if (!platformConfig.targets || platformConfig.targets.length === 0) {
      return {
        platform: this.platform,
        success: false,
        error: 'No Telegram targets specified',
      };
    }

    this.logger.log(
      `Delivering ${video.format} video to ${platformConfig.targets.length} Telegram targets`
    );

    // Download video buffer if not already available
    if (!video.buffer) {
      try {
        video.buffer = await this.downloadVideo(video.url);
      } catch (error) {
        return {
          platform: this.platform,
          success: false,
          error: `Failed to download video: ${error.message}`,
        };
      }
    }

    // Check Telegram file size limit (50MB for videos)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (video.buffer.length > maxSize) {
      return {
        platform: this.platform,
        success: false,
        error: `Video file too large: ${(video.buffer.length / 1024 / 1024).toFixed(1)}MB (max 50MB)`,
      };
    }

    const results: Array<Record<string, unknown>> = [];
    let successCount = 0;

    for (const target of platformConfig.targets) {
      try {
        const result = await this.withRetry(async () => {
          return this.sendVideo(target, video, config, platformConfig.caption);
        });

        results.push({
          target,
          success: true,
          message_id: result.message_id,
          chat_id: result.chat.id,
          url: this.generateMessageUrl(target, result.message_id),
        });

        successCount++;

        // Small delay between messages to avoid rate limits
        if (platformConfig.targets.length > 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error: unknown) {
        const err = error as Error;
        this.logger.error(`Failed to send to Telegram target ${target}: ${err.message}`);
        results.push({
          target,
          success: false,
          error: err.message,
        });
      }
    }

    return {
      platform: this.platform,
      success: successCount > 0,
      results,
      delivered_count: successCount,
      total_targets: platformConfig.targets.length,
      error: successCount === 0 ? 'All deliveries failed' : undefined,
    };
  }

  /**
   * Send video to a specific Telegram chat/channel
   */
  private async sendVideo(
    chatId: string,
    video: GeneratedVideo,
    config: DeliveryConfig,
    customCaption?: string
  ): Promise<TelegramMessage> {
    const caption = this.generateCaption(config.original_script, this.platform, customCaption);

    // Prepare form data
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('video', new Blob([video.buffer!], { type: 'video/mp4' }), video.filename);
    formData.append('caption', caption);
    formData.append('parse_mode', 'HTML');

    // Add video metadata
    if (video.width && video.height) {
      formData.append('width', video.width.toString());
      formData.append('height', video.height.toString());
    }

    if (video.duration) {
      formData.append('duration', Math.round(video.duration).toString());
    }

    const response = await fetch(`${this.apiBaseUrl}${this.botToken}/sendVideo`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Telegram API error: ${response.status} - ${errorData.description || response.statusText}`
      );
    }

    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Telegram API error: ${data.description || 'Unknown error'}`);
    }

    return data.result;
  }

  /**
   * Generate URL for Telegram message (if possible)
   */
  private generateMessageUrl(chatId: string, messageId: number): string | undefined {
    // For channels with usernames, we can generate public URLs
    if (chatId.startsWith('@')) {
      const username = chatId.substring(1);
      return `https://t.me/${username}/${messageId}`;
    }

    // For private chats/groups, no public URL available
    return undefined;
  }

  /**
   * Get bot information (useful for health checks)
   */
  async getBotInfo(): Promise<any> {
    if (!this.enabled) {
      throw new Error('Telegram bot not configured');
    }

    const response = await fetch(`${this.apiBaseUrl}${this.botToken}/getMe`);
    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Failed to get bot info: ${data.description}`);
    }

    return data.result;
  }

  /**
   * Test connection to Telegram API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getBotInfo();
      return true;
    } catch (error) {
      this.logger.error(`Telegram connection test failed: ${error.message}`);
      return false;
    }
  }
}
