import type { ModelCapability, ProviderModel, ProviderType } from '@genfeedai/types';
import { Controller, Get, Headers, Query } from '@nestjs/common';
import type { FalService } from './fal.service';
import type { HuggingFaceService } from './huggingface.service';

// Replicate models (hardcoded, actual calls go through ReplicateService)
const REPLICATE_MODELS: ProviderModel[] = [
  {
    id: 'google/nano-banana',
    displayName: 'Nano Banana',
    provider: 'replicate',
    capabilities: ['text-to-image'],
    description: 'Fast image generation',
    pricing: '$0.039/image',
  },
  {
    id: 'google/nano-banana-pro',
    displayName: 'Nano Banana Pro',
    provider: 'replicate',
    capabilities: ['text-to-image'],
    description: 'High-quality image generation up to 4K',
    pricing: '$0.15-0.30/image',
  },
  {
    id: 'google/veo-3.1-fast',
    displayName: 'Veo 3.1 Fast',
    provider: 'replicate',
    capabilities: ['text-to-video', 'image-to-video'],
    description: 'Fast video generation',
    pricing: '$0.10-0.15/sec',
  },
  {
    id: 'google/veo-3.1',
    displayName: 'Veo 3.1',
    provider: 'replicate',
    capabilities: ['text-to-video', 'image-to-video'],
    description: 'High-quality video generation',
    pricing: '$0.20-0.40/sec',
  },
  {
    id: 'luma/reframe-image',
    displayName: 'Luma Reframe Image',
    provider: 'replicate',
    capabilities: ['image-to-image'],
    description: 'AI-powered image outpainting',
    pricing: '$0.01-0.03/image',
  },
  {
    id: 'luma/reframe-video',
    displayName: 'Luma Reframe Video',
    provider: 'replicate',
    capabilities: ['image-to-video'],
    description: 'AI-powered video reframing',
    pricing: '$0.06/sec',
  },
  {
    id: 'topazlabs/image-upscale',
    displayName: 'Topaz Image Upscale',
    provider: 'replicate',
    capabilities: ['image-to-image'],
    description: 'AI upscaling up to 6x with face enhancement',
    pricing: '$0.05-0.82/image',
  },
  {
    id: 'topazlabs/video-upscale',
    displayName: 'Topaz Video Upscale',
    provider: 'replicate',
    capabilities: ['image-to-video'],
    description: 'AI video upscaling to 4K',
    pricing: '$0.01-0.75/sec',
  },
];

interface ListModelsQuery {
  provider?: ProviderType;
  capabilities?: string;
  query?: string;
}

@Controller('providers')
export class ProvidersController {
  constructor(
    private readonly falService: FalService,
    private readonly huggingFaceService: HuggingFaceService
  ) {}

  /**
   * List available models from all or specific providers
   */
  @Get('models')
  listModels(
    @Query() queryParams: ListModelsQuery,
    @Headers('X-Replicate-Key') _replicateKey?: string,
    @Headers('X-Fal-Key') _falKey?: string,
    @Headers('X-HF-Key') _hfKey?: string
  ): ProviderModel[] {
    const { provider, capabilities: capabilitiesStr, query } = queryParams;

    // Parse capabilities from comma-separated string
    const capabilities = capabilitiesStr
      ? (capabilitiesStr.split(',') as ModelCapability[])
      : undefined;

    const models: ProviderModel[] = [];

    // Get models from each provider
    if (!provider || provider === 'replicate') {
      models.push(...this.filterModels(REPLICATE_MODELS, capabilities, query));
    }

    if (!provider || provider === 'fal') {
      models.push(...this.falService.listModels(capabilities, query));
    }

    if (!provider || provider === 'huggingface') {
      models.push(...this.huggingFaceService.listModels(capabilities, query));
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
    switch (provider) {
      case 'replicate':
        return REPLICATE_MODELS.find((m) => m.id === modelId);
      case 'fal':
        return this.falService.getModel(modelId);
      case 'huggingface':
        return this.huggingFaceService.getModel(modelId);
      default:
        return undefined;
    }
  }

  /**
   * Validate API key for a provider
   */
  @Get('validate')
  async validateKey(
    @Query('provider') provider: ProviderType,
    @Headers('X-Replicate-Key') replicateKey?: string,
    @Headers('X-Fal-Key') falKey?: string,
    @Headers('X-HF-Key') hfKey?: string
  ): Promise<{ valid: boolean; message?: string }> {
    switch (provider) {
      case 'replicate':
        return this.validateReplicateKey(replicateKey);
      case 'fal':
        return this.validateFalKey(falKey);
      case 'huggingface':
        return this.validateHuggingFaceKey(hfKey);
      default:
        return { valid: false, message: 'Unknown provider' };
    }
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
      return { valid: false, message: 'No API key provided' };
    }

    try {
      const response = await fetch('https://api.replicate.com/v1/account', {
        headers: { Authorization: `Token ${key}` },
      });
      return { valid: response.ok };
    } catch {
      return { valid: false, message: 'Failed to validate key' };
    }
  }

  private async validateFalKey(key?: string): Promise<{ valid: boolean; message?: string }> {
    if (!key) {
      // fal.ai works without a key (rate-limited)
      return { valid: true, message: 'fal.ai works without API key (rate-limited)' };
    }

    try {
      const response = await fetch('https://fal.run/fal-ai/flux/dev', {
        method: 'POST',
        headers: {
          Authorization: `Key ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: 'test', parameters: { num_images: 0 } }),
      });
      // 400 means key is valid but request was bad (expected)
      // 401 means invalid key
      return { valid: response.status !== 401 };
    } catch {
      return { valid: false, message: 'Failed to validate key' };
    }
  }

  private async validateHuggingFaceKey(
    key?: string
  ): Promise<{ valid: boolean; message?: string }> {
    if (!key) {
      return { valid: false, message: 'No API key provided' };
    }

    try {
      const response = await fetch('https://huggingface.co/api/whoami-v2', {
        headers: { Authorization: `Bearer ${key}` },
      });
      return { valid: response.ok };
    } catch {
      return { valid: false, message: 'Failed to validate key' };
    }
  }
}
