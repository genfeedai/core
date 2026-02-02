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

// Telegram Bot API types
interface TelegramConfig extends PlatformConfig {
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
export class TelegramOutputNode extends BaseOutputNode implements OnModuleInit {
  readonly platform = 'telegram';
  readonly enabled: boolean;

  private readonly botToken: string;
  private readonly apiBaseUrl = 'https://api.telegram.org/bot';

  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => DistributionNodeRegistry))
    private readonly registry: DistributionNodeRegistry
  ) {
    super();
    this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN') || '';
    this.enabled = !!this.botToken;

    if (!this.enabled) {
      this.logger.warn('Telegram output node disabled: TELEGRAM_BOT_TOKEN not configured');
    }
  }

  onModuleInit(): void {
    this.registry.register('telegramPost', 'telegram', this);
  }

  async deliver(
    video: GeneratedVideo,
    config: DeliveryConfig,
    platformConfig: TelegramConfig
  ): Promise<DeliveryResult> {
    return this.deliverToTargets(video, config, platformConfig.targets, {
      maxFileSizeMB: 50,
      emptyTargetsError: 'No Telegram targets specified',
      sendToTarget: async (target, vid, cfg) => {
        return this.sendVideo(target, vid, cfg, platformConfig.caption) as Promise<
          Record<string, unknown>
        >;
      },
      formatTargetResult: (target, result) => ({
        target,
        success: true,
        message_id: result.message_id,
        chat_id: (result.chat as Record<string, unknown>)?.id,
        url: this.generateMessageUrl(target, result.message_id as number),
      }),
      formatTargetError: (target, error) => ({
        target,
        success: false,
        error: error.message,
      }),
    });
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
  async getBotInfo(): Promise<Record<string, unknown>> {
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
      const err = error as Error;
      this.logger.error(`Telegram connection test failed: ${err.message}`);
      return false;
    }
  }
}
