import { Logger } from '@nestjs/common';

export interface PlatformConfig {
  enabled: boolean;
}

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
  results?: Array<Record<string, unknown>>;
  error?: string;
  delivered_count?: number;
  total_targets?: number;
}

export abstract class BaseOutputNode {
  protected readonly logger = new Logger(this.constructor.name);

  abstract readonly platform: string;
  abstract readonly enabled: boolean;

  abstract deliver<TPlatformConfig extends PlatformConfig>(
    video: GeneratedVideo,
    config: DeliveryConfig,
    platformConfig: TPlatformConfig
  ): Promise<DeliveryResult>;

  /**
   * Ensure video buffer is available, downloading if necessary
   */
  protected async ensureBuffer(video: GeneratedVideo): Promise<Buffer> {
    if (video.buffer) return video.buffer;
    video.buffer = await this.downloadVideo(video.url);
    return video.buffer;
  }

  /**
   * Template method that encapsulates the shared delivery loop pattern.
   * Used by Discord, Telegram, and similar multi-target output nodes.
   */
  protected async deliverToTargets<TTarget>(
    video: GeneratedVideo,
    config: DeliveryConfig,
    targets: TTarget[],
    options: {
      maxFileSizeMB: number;
      emptyTargetsError: string;
      sendToTarget: (
        target: TTarget,
        video: GeneratedVideo,
        config: DeliveryConfig
      ) => Promise<Record<string, unknown>>;
      formatTargetResult: (
        target: TTarget,
        result: Record<string, unknown>
      ) => Record<string, unknown>;
      formatTargetError: (target: TTarget, error: Error) => Record<string, unknown>;
    }
  ): Promise<DeliveryResult> {
    // Step 1: Check if platform is enabled
    if (!this.enabled) {
      return {
        platform: this.platform,
        success: false,
        error: `${this.platform} not configured`,
      };
    }

    // Step 2: Check targets not empty
    if (!targets || targets.length === 0) {
      return {
        platform: this.platform,
        success: false,
        error: options.emptyTargetsError,
      };
    }

    this.logger.log(
      `Delivering ${video.format ?? 'unknown format'} video to ${targets.length} ${this.platform} targets`
    );

    // Step 3: Ensure buffer is available
    try {
      await this.ensureBuffer(video);
    } catch (error) {
      const err = error as Error;
      return {
        platform: this.platform,
        success: false,
        error: `Failed to download video: ${err.message}`,
      };
    }

    // Step 4: Validate file size
    const maxSizeBytes = options.maxFileSizeMB * 1024 * 1024;
    if (video.buffer && video.buffer.length > maxSizeBytes) {
      return {
        platform: this.platform,
        success: false,
        error: `Video file too large: ${(video.buffer.length / 1024 / 1024).toFixed(1)}MB (max ${options.maxFileSizeMB}MB)`,
      };
    }

    // Step 5-8: Loop targets, collect results
    const results: Array<Record<string, unknown>> = [];
    let successCount = 0;

    for (const target of targets) {
      try {
        const result = await this.withRetry(() => options.sendToTarget(target, video, config));
        results.push(options.formatTargetResult(target, result));
        successCount++;

        // Rate-limit delay between targets
        if (targets.length > 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error: unknown) {
        const err = error as Error;
        this.logger.error(`Failed to send to ${this.platform} target: ${err.message}`);
        results.push(options.formatTargetError(target, err));
      }
    }

    // Step 9: Return DeliveryResult
    return {
      platform: this.platform,
      success: successCount > 0,
      results,
      delivered_count: successCount,
      total_targets: targets.length,
      error: successCount === 0 ? 'All deliveries failed' : undefined,
    };
  }

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
        this.logger.warn(`Delivery attempt ${attempt}/${maxAttempts} failed: ${lastError.message}`);

        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
        }
      }
    }

    throw lastError!;
  }
}
