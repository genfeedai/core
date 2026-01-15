import type { ModelCapability, ProviderModel } from '@genfeedai/types';
import { Injectable, Logger } from '@nestjs/common';

// fal.ai API base URL
const FAL_API_URL = 'https://fal.run';
const FAL_QUEUE_URL = 'https://queue.fal.run';

// Known fal.ai models with their capabilities
const FAL_MODELS: ProviderModel[] = [
  {
    id: 'fal-ai/flux/dev',
    displayName: 'FLUX.1 [dev]',
    provider: 'fal',
    capabilities: ['text-to-image'],
    description: 'High-quality text-to-image generation',
    pricing: '$0.025/image',
  },
  {
    id: 'fal-ai/flux-pro',
    displayName: 'FLUX.1 [pro]',
    provider: 'fal',
    capabilities: ['text-to-image'],
    description: 'Professional text-to-image generation with higher quality',
    pricing: '$0.05/image',
  },
  {
    id: 'fal-ai/flux/schnell',
    displayName: 'FLUX.1 [schnell]',
    provider: 'fal',
    capabilities: ['text-to-image'],
    description: 'Fast text-to-image generation',
    pricing: '$0.003/image',
  },
  {
    id: 'fal-ai/stable-diffusion-v3-medium',
    displayName: 'Stable Diffusion 3 Medium',
    provider: 'fal',
    capabilities: ['text-to-image'],
    description: 'Latest Stable Diffusion model',
    pricing: '$0.035/image',
  },
  {
    id: 'fal-ai/fast-sdxl',
    displayName: 'Fast SDXL',
    provider: 'fal',
    capabilities: ['text-to-image'],
    description: 'Optimized SDXL for fast generation',
    pricing: '$0.01/image',
  },
  {
    id: 'fal-ai/minimax/video-01',
    displayName: 'MiniMax Video-01',
    provider: 'fal',
    capabilities: ['text-to-video', 'image-to-video'],
    description: 'High-quality video generation',
    pricing: '$0.30/video',
  },
  {
    id: 'fal-ai/kling-video/v1/standard/text-to-video',
    displayName: 'Kling Video 1.0',
    provider: 'fal',
    capabilities: ['text-to-video'],
    description: 'Text-to-video generation',
    pricing: '$0.12/video',
  },
  {
    id: 'fal-ai/kling-video/v1/standard/image-to-video',
    displayName: 'Kling Video 1.0 (I2V)',
    provider: 'fal',
    capabilities: ['image-to-video'],
    description: 'Image-to-video generation',
    pricing: '$0.12/video',
  },
];

export interface FalGenerationInput {
  prompt: string;
  image_url?: string;
  image_size?: string;
  num_images?: number;
  seed?: number;
  [key: string]: unknown;
}

export interface FalGenerationResult {
  images?: Array<{ url: string; width: number; height: number }>;
  video?: { url: string };
  request_id?: string;
}

@Injectable()
export class FalService {
  private readonly logger = new Logger(FalService.name);

  /**
   * List available fal.ai models
   */
  listModels(capabilities?: ModelCapability[], query?: string): ProviderModel[] {
    let models = [...FAL_MODELS];

    // Filter by capabilities
    if (capabilities?.length) {
      models = models.filter((m) => m.capabilities.some((c) => capabilities.includes(c)));
    }

    // Filter by search query
    if (query) {
      const lowerQuery = query.toLowerCase();
      models = models.filter(
        (m) =>
          m.displayName.toLowerCase().includes(lowerQuery) ||
          m.id.toLowerCase().includes(lowerQuery) ||
          m.description?.toLowerCase().includes(lowerQuery)
      );
    }

    return models;
  }

  /**
   * Get a specific model by ID
   */
  getModel(modelId: string): ProviderModel | undefined {
    return FAL_MODELS.find((m) => m.id === modelId);
  }

  /**
   * Generate content using fal.ai
   * Note: fal.ai works without API key but with rate limits
   */
  async generate(
    modelId: string,
    input: FalGenerationInput,
    apiKey?: string
  ): Promise<FalGenerationResult> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers.Authorization = `Key ${apiKey}`;
    }

    const response = await fetch(`${FAL_API_URL}/${modelId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`fal.ai generation failed: ${error}`);
      throw new Error(`fal.ai generation failed: ${response.status}`);
    }

    return response.json() as Promise<FalGenerationResult>;
  }

  /**
   * Generate content using fal.ai queue (for longer operations)
   */
  async generateAsync(
    modelId: string,
    input: FalGenerationInput,
    apiKey?: string
  ): Promise<{ request_id: string }> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers.Authorization = `Key ${apiKey}`;
    }

    const response = await fetch(`${FAL_QUEUE_URL}/${modelId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`fal.ai async generation failed: ${error}`);
      throw new Error(`fal.ai async generation failed: ${response.status}`);
    }

    return response.json() as Promise<{ request_id: string }>;
  }

  /**
   * Check status of async generation
   */
  async getStatus(
    modelId: string,
    requestId: string,
    apiKey?: string
  ): Promise<{
    status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
    result?: FalGenerationResult;
    error?: string;
  }> {
    const headers: Record<string, string> = {};

    if (apiKey) {
      headers.Authorization = `Key ${apiKey}`;
    }

    const response = await fetch(`${FAL_QUEUE_URL}/${modelId}/requests/${requestId}/status`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to get status: ${response.status}`);
    }

    return response.json();
  }
}
