import { Injectable, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BaseOutputNode,
  GeneratedVideo,
  DeliveryConfig,
  DeliveryResult,
  PlatformConfig,
} from './base-output-node';
import { DistributionNodeRegistry } from './distribution-node-registry';

// Discord webhook types
interface DiscordConfig extends PlatformConfig {
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
export class DiscordOutputNode extends BaseOutputNode implements OnModuleInit {
  readonly platform = 'discord';
  readonly enabled: boolean;

  private readonly botToken: string;

  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => DistributionNodeRegistry))
    private readonly registry: DistributionNodeRegistry
  ) {
    super();
    this.botToken = this.configService.get<string>('DISCORD_BOT_TOKEN') || '';
    this.enabled = !!this.botToken;

    if (!this.enabled) {
      this.logger.warn('Discord output node disabled: DISCORD_BOT_TOKEN not configured');
    }
  }

  onModuleInit(): void {
    this.registry.register('discordPost', 'discord', this);
  }

  async deliver(
    video: GeneratedVideo,
    config: DeliveryConfig,
    platformConfig: DiscordConfig
  ): Promise<DeliveryResult> {
    return this.deliverToTargets(video, config, platformConfig.channels, {
      maxFileSizeMB: 25,
      emptyTargetsError: 'No Discord channels specified',
      sendToTarget: async (channel, vid, cfg) => {
        if (channel.includes('discord.com/api/webhooks/')) {
          return this.sendViaWebhook(channel, vid, cfg, platformConfig.caption) as Promise<
            Record<string, unknown>
          >;
        }
        return this.sendViaChannelId(channel, vid, cfg, platformConfig.caption) as Promise<
          Record<string, unknown>
        >;
      },
      formatTargetResult: (channel, result) => ({
        channel,
        success: true,
        message_id: result.id,
        channel_id: result.channel_id,
        url: `https://discord.com/channels/@me/${result.channel_id}/${result.id}`,
      }),
      formatTargetError: (channel, error) => ({
        channel,
        success: false,
        error: error.message,
      }),
    });
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
  async getChannelInfo(channelId: string): Promise<Record<string, unknown>> {
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
      const err = error as Error;
      this.logger.error(`Discord connection test failed: ${err.message}`);
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
