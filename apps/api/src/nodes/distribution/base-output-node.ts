import { Logger } from '@nestjs/common';

export interface GeneratedVideo {
  url: string;
  buffer?: Buffer;
  filename: string;
  format?: '16:9' | '9:16' | '1:1';
  width?: number;
  height?: number;
  duration?: number;
  size_bytes?: number;
}

export interface DeliveryConfig {
  original_script?: string;
  execution_id: string;
  node_id: string;
  batch_id?: string;
  variation?: number;
  format?: '16:9' | '9:16' | '1:1';
}

export interface DeliveryResult {
  platform: string;
  success: boolean;
  results?: any[];
  error?: string;
  delivered_count?: number;
  total_targets?: number;
}

export abstract class BaseOutputNode {
  protected readonly logger = new Logger(this.constructor.name);

  abstract readonly platform: string;
  abstract readonly enabled: boolean;

  abstract deliver(
    video: GeneratedVideo,
    config: DeliveryConfig,
    platformConfig: any
  ): Promise<DeliveryResult>;

  /**
   * Download video from URL and convert to buffer
   */
  protected async downloadVideo(url: string): Promise<Buffer> {
    this.logger.debug(`Downloading video from: ${url.substring(0, 50)}...`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Generate platform-specific caption from original script
   */
  protected generateCaption(
    script: string | undefined,
    platform: string,
    customCaption?: string
  ): string {
    if (customCaption) {
      return customCaption;
    }

    // Platform-specific caption generation
    switch (platform) {
      case 'telegram':
        return `🎬 ${script ?? 'Generated content'}\n\n#AI #ContentCreation`;

      case 'discord':
        return `**New Video Generated**\n\n${script ?? 'Generated content'}`;

      default:
        return script ?? '';
    }
  }

  /**
   * Get optimal format for platform
   */
  protected getOptimalFormat(
    availableFormats: ('16:9' | '9:16' | '1:1')[]
  ): '16:9' | '9:16' | '1:1' {
    // Default preference order (can be overridden by subclasses)
    const preference = ['9:16', '1:1', '16:9'] as const;

    for (const format of preference) {
      if (availableFormats.includes(format)) {
        return format;
      }
    }

    return availableFormats[0];
  }

  /**
   * Validate file size limits
   */
  protected validateFileSize(sizeBytes: number, maxSizeBytes: number): boolean {
    return sizeBytes <= maxSizeBytes;
  }

  /**
   * Get file extension from URL or format
   */
  protected getFileExtension(url: string): string {
    const urlParts = url.split('.');
    const extension = urlParts[urlParts.length - 1].split('?')[0]; // Remove query params

    if (['mp4', 'mov', 'avi', 'mkv'].includes(extension.toLowerCase())) {
      return extension.toLowerCase();
    }

    return 'mp4'; // Default to mp4
  }

  /**
   * Retry wrapper for delivery attempts
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Delivery attempt ${attempt}/${maxAttempts} failed: ${error.message}`);

        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
        }
      }
    }

    throw lastError!;
  }
}
