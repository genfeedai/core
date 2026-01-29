import type { ModelCapability, ProviderModel, ProviderType } from '@genfeedai/types';
// Import the cached schemas (includes cover images from Replicate API)
import replicateSchemas from '@genfeedai/types/replicate/schemas.json';
import { type NextRequest, NextResponse } from 'next/server';

// Helper to check which providers have env credentials
function getConfiguredProviders(): Set<ProviderType> {
  const configured = new Set<ProviderType>();

  if (process.env.REPLICATE_API_TOKEN) {
    configured.add('replicate');
  }
  if (process.env.FAL_API_KEY) {
    configured.add('fal');
  }
  if (process.env.HF_API_TOKEN) {
    configured.add('huggingface');
  }

  return configured;
}

// Model metadata (capabilities and pricing not in schema)
const MODEL_METADATA: Record<
  string,
  { capabilities: ModelCapability[]; pricing: string; displayName?: string }
> = {
  // Image models
  'google/nano-banana': {
    capabilities: ['text-to-image'],
    pricing: '$0.039/image',
    displayName: 'Nano Banana',
  },
  'google/nano-banana-pro': {
    capabilities: ['text-to-image', 'image-to-image'],
    pricing: '$0.15-0.30/image',
    displayName: 'Nano Banana Pro',
  },
  'prunaai/z-image-turbo': {
    capabilities: ['text-to-image'],
    pricing: '$0.002/image',
    displayName: 'Z-Image Turbo',
  },
  'black-forest-labs/flux-schnell': {
    capabilities: ['text-to-image'],
    pricing: '$0.003/image',
    displayName: 'FLUX Schnell',
  },
  'black-forest-labs/flux-dev': {
    capabilities: ['text-to-image'],
    pricing: '$0.025/image',
    displayName: 'FLUX Dev',
  },
  'black-forest-labs/flux-1.1-pro': {
    capabilities: ['text-to-image'],
    pricing: '$0.04/image',
    displayName: 'FLUX 1.1 Pro',
  },
  'stability-ai/sdxl': {
    capabilities: ['text-to-image', 'image-to-image'],
    pricing: '$0.0023/image',
    displayName: 'Stable Diffusion XL',
  },
  'bytedance/sdxl-lightning-4step': {
    capabilities: ['text-to-image'],
    pricing: '$0.0015/image',
    displayName: 'SDXL Lightning',
  },
  // Video models
  'google/veo-3.1-fast': {
    capabilities: ['text-to-video', 'image-to-video'],
    pricing: '$0.10-0.15/sec',
    displayName: 'Veo 3.1 Fast',
  },
  'google/veo-3.1': {
    capabilities: ['text-to-video', 'image-to-video'],
    pricing: '$0.20-0.40/sec',
    displayName: 'Veo 3.1',
  },
  'kwaivgi/kling-v2.5-turbo-pro': {
    capabilities: ['text-to-video', 'image-to-video'],
    pricing: '$0.15/sec',
    displayName: 'Kling v2.5 Turbo Pro',
  },
  'kwaivgi/kling-v2.6-motion-control': {
    capabilities: ['image-to-video'],
    pricing: '$0.20/sec',
    displayName: 'Kling v2.6 Motion Control',
  },
  'minimax/video-01': {
    capabilities: ['text-to-video', 'image-to-video'],
    pricing: '$0.20/sec',
    displayName: 'MiniMax Video-01',
  },
  'luma/ray': {
    capabilities: ['text-to-video', 'image-to-video'],
    pricing: '$0.15/sec',
    displayName: 'Luma Ray',
  },
  // Lip-sync
  'sync/lipsync-2': {
    capabilities: ['image-to-video'],
    pricing: '$0.05/sec',
    displayName: 'Lipsync 2',
  },
  'sync/lipsync-2-pro': {
    capabilities: ['image-to-video'],
    pricing: '$0.10/sec',
    displayName: 'Lipsync 2 Pro',
  },
};

// Build Replicate models from cached schemas
function getReplicateModels(): ProviderModel[] {
  return replicateSchemas
    .filter((schema) => MODEL_METADATA[schema.modelId])
    .map((schema) => {
      const meta = MODEL_METADATA[schema.modelId];
      // Extract component schemas that contain enum definitions (aspect_ratio, duration, etc.)
      const componentSchemas = (schema as { componentSchemas?: Record<string, unknown> })
        .componentSchemas;

      return {
        id: schema.modelId,
        displayName: meta.displayName || schema.name,
        provider: 'replicate' as ProviderType,
        capabilities: meta.capabilities,
        description: schema.description?.slice(0, 100) || '',
        pricing: meta.pricing,
        thumbnail: (schema as { coverImageUrl?: string }).coverImageUrl || undefined,
        inputSchema: schema.inputSchema as Record<string, unknown> | undefined,
        componentSchemas: componentSchemas as Record<string, unknown> | undefined,
      };
    });
}

// fal.ai models (static - they don't have a public model listing API)
const FAL_MODELS: ProviderModel[] = [
  {
    id: 'fal-ai/flux/schnell',
    displayName: 'FLUX Schnell',
    provider: 'fal',
    capabilities: ['text-to-image'],
    description: 'Fast image generation on fal.ai',
    pricing: '$0.003/image',
  },
  {
    id: 'fal-ai/flux-pro',
    displayName: 'FLUX Pro',
    provider: 'fal',
    capabilities: ['text-to-image'],
    description: 'Professional image generation on fal.ai',
    pricing: '$0.05/image',
  },
  {
    id: 'fal-ai/kling-video',
    displayName: 'Kling Video',
    provider: 'fal',
    capabilities: ['text-to-video', 'image-to-video'],
    description: 'High-quality video generation',
    pricing: '$0.10/sec',
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const provider = searchParams.get('provider') as ProviderType | null;
  const capabilitiesParam = searchParams.get('capabilities');
  const query = searchParams.get('query')?.toLowerCase();

  // Parse capabilities filter
  const capabilities = capabilitiesParam
    ? (capabilitiesParam.split(',') as ModelCapability[])
    : null;

  // Get configured providers from env
  const configuredProviders = getConfiguredProviders();
  const configuredProvidersList = Array.from(configuredProviders) as ProviderType[];

  // Build models list from configured providers
  const allModels: ProviderModel[] = [];

  // Add Replicate models from cached schemas (includes cover images)
  if (configuredProviders.has('replicate')) {
    allModels.push(...getReplicateModels());
  }

  // Add fal.ai models if configured
  if (configuredProviders.has('fal')) {
    allModels.push(...FAL_MODELS);
  }

  // Filter to only configured providers
  let filteredModels = allModels.filter((m) => configuredProviders.has(m.provider));

  // Filter by specific provider (if requested and configured)
  if (provider && configuredProviders.has(provider)) {
    filteredModels = filteredModels.filter((m) => m.provider === provider);
  }

  // Filter by capabilities
  if (capabilities?.length) {
    filteredModels = filteredModels.filter((m) =>
      m.capabilities.some((c) => capabilities.includes(c))
    );
  }

  // Filter by search query
  if (query) {
    filteredModels = filteredModels.filter(
      (m) =>
        m.displayName.toLowerCase().includes(query) ||
        m.id.toLowerCase().includes(query) ||
        m.description?.toLowerCase().includes(query)
    );
  }

  return NextResponse.json({
    models: filteredModels,
    configuredProviders: configuredProvidersList,
  });
}
