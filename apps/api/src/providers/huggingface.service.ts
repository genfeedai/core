import type { ModelCapability, ProviderModel } from '@genfeedai/types';
import { Injectable, Logger } from '@nestjs/common';

// Hugging Face Inference API base URL
const HF_API_URL = 'https://api-inference.huggingface.co/models';

// Known Hugging Face models with their capabilities
const HF_MODELS: ProviderModel[] = [
  {
    id: 'stabilityai/stable-diffusion-xl-base-1.0',
    displayName: 'Stable Diffusion XL',
    provider: 'huggingface',
    capabilities: ['text-to-image'],
    description: 'High-resolution text-to-image generation',
    pricing: 'Free tier available',
  },
  {
    id: 'runwayml/stable-diffusion-v1-5',
    displayName: 'Stable Diffusion 1.5',
    provider: 'huggingface',
    capabilities: ['text-to-image'],
    description: 'Classic Stable Diffusion model',
    pricing: 'Free tier available',
  },
  {
    id: 'stabilityai/stable-diffusion-2-1',
    displayName: 'Stable Diffusion 2.1',
    provider: 'huggingface',
    capabilities: ['text-to-image'],
    description: 'Improved Stable Diffusion model',
    pricing: 'Free tier available',
  },
  {
    id: 'CompVis/stable-diffusion-v1-4',
    displayName: 'Stable Diffusion 1.4',
    provider: 'huggingface',
    capabilities: ['text-to-image'],
    description: 'Original Stable Diffusion model',
    pricing: 'Free tier available',
  },
  {
    id: 'prompthero/openjourney-v4',
    displayName: 'OpenJourney v4',
    provider: 'huggingface',
    capabilities: ['text-to-image'],
    description: 'Midjourney-style image generation',
    pricing: 'Free tier available',
  },
  {
    id: 'dreamlike-art/dreamlike-diffusion-1.0',
    displayName: 'Dreamlike Diffusion',
    provider: 'huggingface',
    capabilities: ['text-to-image'],
    description: 'Artistic image generation',
    pricing: 'Free tier available',
  },
  {
    id: 'SG161222/Realistic_Vision_V5.1_noVAE',
    displayName: 'Realistic Vision 5.1',
    provider: 'huggingface',
    capabilities: ['text-to-image'],
    description: 'Photorealistic image generation',
    pricing: 'Free tier available',
  },
  {
    id: 'black-forest-labs/FLUX.1-dev',
    displayName: 'FLUX.1 [dev]',
    provider: 'huggingface',
    capabilities: ['text-to-image'],
    description: 'High-quality FLUX model',
    pricing: 'Free tier available',
  },
];

export interface HuggingFaceInput {
  inputs: string;
  parameters?: {
    negative_prompt?: string;
    width?: number;
    height?: number;
    num_inference_steps?: number;
    guidance_scale?: number;
    seed?: number;
  };
  options?: {
    wait_for_model?: boolean;
  };
}

export interface HuggingFaceResult {
  // For image models, returns binary data (blob)
  // We'll return the base64 encoded version
  image?: string;
  error?: string;
}

@Injectable()
export class HuggingFaceService {
  private readonly logger = new Logger(HuggingFaceService.name);

  /**
   * List available Hugging Face models
   */
  listModels(capabilities?: ModelCapability[], query?: string): ProviderModel[] {
    let models = [...HF_MODELS];

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
    return HF_MODELS.find((m) => m.id === modelId);
  }

  /**
   * Generate an image using Hugging Face Inference API
   */
  async generateImage(
    modelId: string,
    prompt: string,
    apiKey: string,
    options?: HuggingFaceInput['parameters']
  ): Promise<string> {
    const response = await fetch(`${HF_API_URL}/${modelId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: options,
        options: {
          wait_for_model: true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Hugging Face generation failed: ${errorText}`);

      // Check for specific errors
      if (response.status === 503) {
        throw new Error('Model is loading. Please try again in a moment.');
      }
      if (response.status === 401) {
        throw new Error('Invalid API key');
      }

      throw new Error(`Hugging Face generation failed: ${response.status}`);
    }

    // Response is binary image data
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const contentType = response.headers.get('content-type') ?? 'image/png';

    return `data:${contentType};base64,${base64}`;
  }

  /**
   * Check if a model is available (not loading)
   */
  async checkModelStatus(modelId: string, apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${HF_API_URL}/${modelId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: 'test',
          options: {
            wait_for_model: false,
          },
        }),
      });

      // 503 means model is loading
      return response.status !== 503;
    } catch {
      return false;
    }
  }

  /**
   * Fetch model info from Hugging Face API
   */
  async getModelInfo(
    modelId: string,
    apiKey?: string
  ): Promise<{
    id: string;
    downloads: number;
    likes: number;
    tags: string[];
  } | null> {
    try {
      const headers: Record<string, string> = {};
      if (apiKey) {
        headers.Authorization = `Bearer ${apiKey}`;
      }

      const response = await fetch(`https://huggingface.co/api/models/${modelId}`, { headers });

      if (!response.ok) return null;

      return response.json();
    } catch {
      return null;
    }
  }
}
