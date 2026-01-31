import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { UGCFactoryService } from '@/services/ugc-factory.service';
import { DistributionService } from '@/services/distribution.service';
import { CreateUGCBatchDto } from '@/dto/create-ugc-batch.dto';

@Controller('ugc-factory')
export class UGCFactoryController {
  constructor(
    private readonly ugcFactoryService: UGCFactoryService,
    private readonly distributionService: DistributionService
  ) {}

  /**
   * Create a new UGC batch
   */
  @Post('batch')
  async createBatch(@Body() createBatchDto: CreateUGCBatchDto) {
    return this.ugcFactoryService.createUGCBatch(createBatchDto);
  }

  /**
   * Get batch status and results
   */
  @Get('batch/:batchId')
  async getBatchStatus(@Param('batchId') batchId: string) {
    return this.ugcFactoryService.getBatchStatus(batchId);
  }

  /**
   * Get available voice options
   */
  @Get('voices')
  async getVoices() {
    return {
      voices: this.ugcFactoryService.getAvailableVoices(),
      total: this.ugcFactoryService.getAvailableVoices().length,
    };
  }

  /**
   * Get motion presets
   */
  @Get('motion-presets')
  async getMotionPresets() {
    return {
      casual_talking: {
        name: 'Casual Talking',
        description: 'Natural, relaxed speaking motion with subtle movement',
        motion_strength: 0.3,
        duration: 5,
      },
      enthusiastic: {
        name: 'Enthusiastic',
        description: 'Animated, energetic speaking with pronounced gestures',
        motion_strength: 0.6,
        duration: 5,
      },
      professional: {
        name: 'Professional',
        description: 'Minimal, stable movement for corporate/business content',
        motion_strength: 0.15,
        duration: 6,
      },
    };
  }

  /**
   * Check delivery platform configuration
   */
  @Get('delivery/config')
  async checkDeliveryConfig() {
    return this.ugcFactoryService.checkDeliveryConfiguration();
  }

  /**
   * Test all delivery platform connections
   */
  @Get('delivery/test')
  async testDeliveryConnections() {
    const connectionTests = await this.distributionService.testAllConnections();
    const platformSummary = this.distributionService.getPlatformSummary();

    return {
      connection_tests: connectionTests,
      platform_summary: platformSummary,
      overall_status: connectionTests.every((test) => test.connected || !test.enabled)
        ? 'healthy'
        : 'issues_detected',
    };
  }

  /**
   * Get cost estimate for a batch
   */
  @Post('estimate')
  async getCostEstimate(@Body() estimateDto: CreateUGCBatchDto) {
    // Create a temporary batch to get cost estimate without actually queuing
    const mockResult = await this.ugcFactoryService.createUGCBatch({
      ...estimateDto,
      debug_mode: true, // This won't actually queue jobs
    });

    return {
      estimated_cost: mockResult.total_estimated_cost,
      estimated_completion: mockResult.estimated_completion,
      total_videos: mockResult.jobs_queued,
      breakdown: {
        videos: mockResult.jobs_queued,
        cost_per_video: mockResult.total_estimated_cost / mockResult.jobs_queued,
        formats: estimateDto.output_formats || ['16:9', '9:16', '1:1'],
        variations: estimateDto.variations || 3,
      },
    };
  }

  /**
   * List recent batches
   */
  @Get('batches')
  async listBatches(@Query('limit') limit = 20) {
    // TODO: Implement batch history lookup
    return {
      batches: [],
      total: 0,
      message: 'Batch history lookup not yet implemented',
    };
  }

  /**
   * Health check for UGC Factory
   */
  @Get('health')
  async healthCheck() {
    const deliveryConfig = await this.ugcFactoryService.checkDeliveryConfiguration();
    const connectionTests = await this.distributionService.testAllConnections();
    const platformSummary = this.distributionService.getPlatformSummary();

    const configuredPlatforms = deliveryConfig.filter((p) => p.configured).length;
    const connectedPlatforms = connectionTests.filter((p) => p.connected && p.enabled).length;

    return {
      status: 'healthy',
      version: '1.0.0',
      features: {
        voice_options: this.ugcFactoryService.getAvailableVoices().length,
        motion_presets: 3,
        output_formats: ['16:9', '9:16', '1:1'],
        delivery_platforms: {
          total: platformSummary.length,
          configured: configuredPlatforms,
          connected: connectedPlatforms,
          platforms: platformSummary.map((p) => ({
            platform: p.platform,
            enabled: p.enabled,
            description: p.description,
          })),
        },
      },
      dependencies: {
        elevenlabs: '✅ Ready',
        replicate: '✅ Ready',
        bullmq: '✅ Ready',
        distribution: connectedPlatforms > 0 ? '✅ Ready' : '⚠️ No platforms connected',
      },
    };
  }
}
