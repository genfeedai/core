import type { ModelCapability, ModelUseCase, ProviderModel, ProviderType } from '@genfeedai/types';
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
  {
    capabilities: ModelCapability[];
    pricing: string;
    displayName?: string;
    useCases?: ModelUseCase[];
  }
> = {
  // Image models
  'google/nano-banana': {
    capabilities: ['text-to-image'],
    pricing: '$0.039/image',
    displayName: 'Nano Banana',
    useCases: ['general'],
  },
  'google/nano-banana-pro': {
    capabilities: ['text-to-image', 'image-to-image'],
    pricing: '$0.15-0.30/image',
    displayName: 'Nano Banana Pro',
    useCases: ['general', 'style-transfer', 'image-variation'],
  },
  'prunaai/z-image-turbo': {
    capabilities: ['text-to-image'],
    pricing: '$0.002/image',
    displayName: 'Z-Image Turbo',
    useCases: ['general'],
  },
  'black-forest-labs/flux-schnell': {
    capabilities: ['text-to-image'],
    pricing: '$0.003/image',
    displayName: 'FLUX Schnell',
    useCases: ['general'],
  },
  'black-forest-labs/flux-dev': {
    capabilities: ['text-to-image'],
    pricing: '$0.025/image',
    displayName: 'FLUX Dev',
    useCases: ['general'],
  },
  'black-forest-labs/flux-1.1-pro': {
    capabilities: ['text-to-image'],
    pricing: '$0.04/image',
    displayName: 'FLUX 1.1 Pro',
    useCases: ['general'],
  },
  'black-forest-labs/flux-kontext-dev': {
    capabilities: ['text-to-image', 'image-to-image'],
    pricing: '$0.025/image',
    displayName: 'FLUX Kontext [dev]',
    useCases: ['style-transfer', 'character-consistent', 'image-variation'],
  },
  // Video models
  'google/veo-3.1-fast': {
    capabilities: ['text-to-video', 'image-to-video'],
    pricing: '$0.10-0.15/sec',
    displayName: 'Veo 3.1 Fast',
    useCases: ['general'],
  },
  'google/veo-3.1': {
    capabilities: ['text-to-video', 'image-to-video'],
    pricing: '$0.20-0.40/sec',
    displayName: 'Veo 3.1',
    useCases: ['general'],
  },
  'kwaivgi/kling-v2.5-turbo-pro': {
    capabilities: ['text-to-video', 'image-to-video'],
    pricing: '$0.15/sec',
    displayName: 'Kling v2.5 Turbo Pro',
    useCases: ['general'],
  },
  'kwaivgi/kling-v2.6-motion-control': {
    capabilities: ['image-to-video'],
    pricing: '$0.20/sec',
    displayName: 'Kling v2.6 Motion Control',
    useCases: ['general'],
  },
  'minimax/video-01': {
    capabilities: ['text-to-video', 'image-to-video'],
    pricing: '$0.20/sec',
    displayName: 'MiniMax Video-01',
    useCases: ['general'],
  },
  'luma/ray': {
    capabilities: ['text-to-video', 'image-to-video'],
    pricing: '$0.15/sec',
    displayName: 'Luma Ray',
    useCases: ['general'],
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

// Auto-detect use cases from input schema fields
function detectUseCases(schema: Record<string, unknown> | undefined): ModelUseCase[] {
  if (!schema) return [];

  const detected: ModelUseCase[] = [];
  const schemaStr = JSON.stringify(schema).toLowerCase();

  if (schemaStr.includes('ip_adapter') || schemaStr.includes('style_image')) {
    detected.push('style-transfer');
  }
  if (schemaStr.includes('reference_image') || schemaStr.includes('subject_image')) {
    detected.push('character-consistent');
  }
  if (schemaStr.includes('mask') || schemaStr.includes('inpaint')) {
    detected.push('inpainting');
  }
  if (schemaStr.includes('upscale') || schemaStr.includes('scale_factor')) {
    detected.push('upscale');
  }

  return detected;
}

// Build Replicate models from cached schemas (module-level cache)
const REPLICATE_MODELS: ProviderModel[] = replicateSchemas
  .filter((schema) => MODEL_METADATA[schema.modelId])
  .map((schema) => {
    const meta = MODEL_METADATA[schema.modelId];
    // Extract component schemas that contain enum definitions (aspect_ratio, duration, etc.)
    const componentSchemas = (schema as { componentSchemas?: Record<string, unknown> })
      .componentSchemas;

    // Merge explicit use cases with auto-detected ones from schema
    const explicitUseCases = meta.useCases || [];
    const schemaUseCases = detectUseCases(
      schema.inputSchema as Record<string, unknown> | undefined
    );
    const allUseCases = [...new Set([...explicitUseCases, ...schemaUseCases])];

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
      useCases: allUseCases.length > 0 ? allUseCases : undefined,
    };
  });

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
  const useCaseParam = searchParams.get('useCase') as ModelUseCase | null;
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
    allModels.push(...REPLICATE_MODELS);
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

  // Filter by use case
  if (useCaseParam) {
    filteredModels = filteredModels.filter((m) => m.useCases?.includes(useCaseParam));
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
