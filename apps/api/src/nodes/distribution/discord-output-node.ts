import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseOutputNode, GeneratedVideo, DeliveryConfig, DeliveryResult } from './base-output-node';

// Discord webhook types
interface DiscordConfig {
  enabled: boolean;
  channels: string[]; // Webhook URLs or channel IDs
  caption?: string;
}

interface DiscordWebhookMessage {
  id: string;
  channel_id: string;
  author: {
    id: string;
    username: string;
    bot: boolean;
  };
  attachments: Array<{
    id: string;
    filename: string;
    url: string;
    size: number;
  }>;
}

@Injectable()
export class DiscordOutputNode extends BaseOutputNode {
  readonly platform = 'discord';
  readonly enabled: boolean;

  private readonly botToken: string;

  constructor(private readonly configService: ConfigService) {
    super();
    this.botToken = this.configService.get<string>('DISCORD_BOT_TOKEN') || '';
    this.enabled = !!this.botToken;

    if (!this.enabled) {
      this.logger.warn('Discord output node disabled: DISCORD_BOT_TOKEN not configured');
    }
  }

  async deliver(
    video: GeneratedVideo,
    config: DeliveryConfig,
    platformConfig: DiscordConfig
  ): Promise<DeliveryResult> {
    if (!this.enabled) {
      return {
        platform: this.platform,
        success: false,
        error: 'Discord bot token not configured',
      };
    }

    if (!platformConfig.channels || platformConfig.channels.length === 0) {
      return {
        platform: this.platform,
        success: false,
        error: 'No Discord channels specified',
      };
    }

    this.logger.log(
      `Delivering ${video.format} video to ${platformConfig.channels.length} Discord channels`
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

    // Check Discord file size limit (25MB for regular uploads, 100MB for Nitro)
    const maxSize = 25 * 1024 * 1024; // 25MB (conservative limit)
    if (video.buffer.length > maxSize) {
      return {
        platform: this.platform,
        success: false,
        error: `Video file too large: ${(video.buffer.length / 1024 / 1024).toFixed(1)}MB (max 25MB)`,
      };
    }

    const results: Array<Record<string, unknown>> = [];
    let successCount = 0;

    for (const channel of platformConfig.channels) {
      try {
        const result = await this.withRetry(async () => {
          // Check if it's a webhook URL or channel ID
          if (channel.includes('discord.com/api/webhooks/')) {
            return this.sendViaWebhook(channel, video, config, platformConfig.caption);
          } else {
            return this.sendViaChannelId(channel, video, config, platformConfig.caption);
          }
        });

        results.push({
          channel,
          success: true,
          message_id: result.id,
          channel_id: result.channel_id,
          url: `https://discord.com/channels/@me/${result.channel_id}/${result.id}`,
        });

        successCount++;

        // Small delay between messages to avoid rate limits
        if (platformConfig.channels.length > 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error: unknown) {
        const err = error as Error;
        this.logger.error(`Failed to send to Discord channel ${channel}: ${err.message}`);
        results.push({
          channel,
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
      total_targets: platformConfig.channels.length,
      error: successCount === 0 ? 'All deliveries failed' : undefined,
    };
  }

  /**
   * Send video via Discord webhook
   */
  private async sendViaWebhook(
    webhookUrl: string,
    video: GeneratedVideo,
    config: DeliveryConfig,
    customCaption?: string
  ): Promise<DiscordWebhookMessage> {
    const content = this.generateCaption(config.original_script, this.platform, customCaption);

    const formData = new FormData();
    formData.append('content', content);
    formData.append('file', new Blob([video.buffer!], { type: 'video/mp4' }), video.filename);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Discord webhook error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Send video via Discord Bot API (channel ID)
   */
  private async sendViaChannelId(
    channelId: string,
    video: GeneratedVideo,
    config: DeliveryConfig,
    customCaption?: string
  ): Promise<DiscordWebhookMessage> {
    const content = this.generateCaption(config.original_script, this.platform, customCaption);

    const formData = new FormData();
    formData.append('content', content);
    formData.append('file', new Blob([video.buffer!], { type: 'video/mp4' }), video.filename);

    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${this.botToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Discord API error: ${response.status} - ${errorData.message || response.statusText}`
      );
    }

    return await response.json();
  }

  /**
   * Get channel information (useful for validation)
   */
  async getChannelInfo(channelId: string): Promise<any> {
    if (!this.enabled) {
      throw new Error('Discord bot not configured');
    }

    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
      headers: {
        Authorization: `Bot ${this.botToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to get channel info: ${response.status} - ${errorData.message}`);
    }

    return await response.json();
  }

  /**
   * Test Discord bot connection
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.enabled) {
        return false;
      }

      // Get bot user info
      const response = await fetch('https://discord.com/api/v10/users/@me', {
        headers: {
          Authorization: `Bot ${this.botToken}`,
        },
      });

      return response.ok;
    } catch (error) {
      this.logger.error(`Discord connection test failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Validate webhook URL format
   */
  isValidWebhookUrl(url: string): boolean {
    const webhookPattern = /^https:\/\/discord\.com\/api\/webhooks\/\d+\/[\w-]+$/;
    return webhookPattern.test(url);
  }

  /**
   * Validate channel ID format
   */
  isValidChannelId(channelId: string): boolean {
    // Discord snowflake IDs are 17-19 digits
    const snowflakePattern = /^\d{17,19}$/;
    return snowflakePattern.test(channelId);
  }

  /**
   * Get optimal format preference for Discord (desktop-first)
   */
  protected getOptimalFormat(
    availableFormats: ('16:9' | '9:16' | '1:1')[]
  ): '16:9' | '9:16' | '1:1' {
    // Discord preference: 16:9 > 1:1 > 9:16 (desktop/web primarily)
    const preference = ['16:9', '1:1', '9:16'] as const;

    for (const format of preference) {
      if (availableFormats.includes(format)) {
        return format;
      }
    }

    return availableFormats[0];
  }
}
