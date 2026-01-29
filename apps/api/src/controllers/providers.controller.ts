import type { ModelCapability, ProviderModel, ProviderType } from '@genfeedai/types';
import { Controller, Get, Headers, Query } from '@nestjs/common';

// Replicate models (hardcoded, actual calls go through ReplicateService)
const REPLICATE_MODELS: ProviderModel[] = [
  {
    capabilities: ['text-to-image'],
    description: 'Fast image generation',
    displayName: 'Nano Banana',
    id: 'google/nano-banana',
    pricing: '$0.039/image',
    provider: 'replicate',
  },
  {
    capabilities: ['text-to-image'],
    description: 'High-quality image generation up to 4K',
    displayName: 'Nano Banana Pro',
    id: 'google/nano-banana-pro',
    pricing: '$0.15-0.30/image',
    provider: 'replicate',
  },
  {
    capabilities: ['text-to-video', 'image-to-video'],
    description: 'Fast video generation',
    displayName: 'Veo 3.1 Fast',
    id: 'google/veo-3.1-fast',
    pricing: '$0.10-0.15/sec',
    provider: 'replicate',
  },
  {
    capabilities: ['text-to-video', 'image-to-video'],
    description: 'High-quality video generation',
    displayName: 'Veo 3.1',
    id: 'google/veo-3.1',
    pricing: '$0.20-0.40/sec',
    provider: 'replicate',
  },
  {
    capabilities: ['image-to-image'],
    description: 'AI-powered image outpainting',
    displayName: 'Luma Reframe Image',
    id: 'luma/reframe-image',
    pricing: '$0.01-0.03/image',
    provider: 'replicate',
  },
  {
    capabilities: ['image-to-video'],
    description: 'AI-powered video reframing',
    displayName: 'Luma Reframe Video',
    id: 'luma/reframe-video',
    pricing: '$0.06/sec',
    provider: 'replicate',
  },
  {
    capabilities: ['image-to-image'],
    description: 'AI upscaling up to 6x with face enhancement',
    displayName: 'Topaz Image Upscale',
    id: 'topazlabs/image-upscale',
    pricing: '$0.05-0.82/image',
    provider: 'replicate',
  },
  {
    capabilities: ['image-to-video'],
    description: 'AI video upscaling to 4K',
    displayName: 'Topaz Video Upscale',
    id: 'topazlabs/video-upscale',
    pricing: '$0.01-0.75/sec',
    provider: 'replicate',
  },
];

interface ListModelsQuery {
  provider?: ProviderType;
  capabilities?: string;
  query?: string;
}

@Controller('providers')
export class ProvidersController {
  /**
   * List available models from Replicate
   */
  @Get('models')
  listModels(
    @Query() queryParams: ListModelsQuery,
    @Headers('X-Replicate-Key') _replicateKey?: string
  ): ProviderModel[] {
    const { provider, capabilities: capabilitiesStr, query } = queryParams;

    // Parse capabilities from comma-separated string
    const capabilities = capabilitiesStr
      ? (capabilitiesStr.split(',') as ModelCapability[])
      : undefined;

    const models: ProviderModel[] = [];

    // Only Replicate is supported in OSS
    if (!provider || provider === 'replicate') {
      models.push(...this.filterModels(REPLICATE_MODELS, capabilities, query));
    }

    return models;
  }

  /**
   * Get a specific model by provider and ID
   */
  @Get('models/:provider/:modelId')
  getModel(
    @Query('provider') provider: ProviderType,
    @Query('modelId') modelId: string
  ): ProviderModel | undefined {
    if (provider === 'replicate') {
      return REPLICATE_MODELS.find((m) => m.id === modelId);
    }
    return undefined;
  }

  /**
   * Validate API key for Replicate
   */
  @Get('validate')
  async validateKey(
    @Query('provider') provider: ProviderType,
    @Headers('X-Replicate-Key') replicateKey?: string
  ): Promise<{ valid: boolean; message?: string }> {
    if (provider === 'replicate') {
      return this.validateReplicateKey(replicateKey);
    }
    return {
      message: 'Unknown provider. OSS only supports Replicate.',
      valid: false,
    };
  }

  private filterModels(
    models: ProviderModel[],
    capabilities?: ModelCapability[],
    query?: string
  ): ProviderModel[] {
    let result = [...models];

    if (capabilities?.length) {
      result = result.filter((m) => m.capabilities.some((c) => capabilities.includes(c)));
    }

    if (query) {
      const lowerQuery = query.toLowerCase();
      result = result.filter(
        (m) =>
          m.displayName.toLowerCase().includes(lowerQuery) ||
          m.id.toLowerCase().includes(lowerQuery) ||
          m.description?.toLowerCase().includes(lowerQuery)
      );
    }

    return result;
  }

  private async validateReplicateKey(key?: string): Promise<{ valid: boolean; message?: string }> {
    if (!key) {
      return { message: 'No API key provided', valid: false };
    }

    try {
      const response = await fetch('https://api.replicate.com/v1/account', {
        headers: { Authorization: `Token ${key}` },
      });
      return { valid: response.ok };
    } catch {
      return { message: 'Failed to validate key', valid: false };
    }
  }
}
