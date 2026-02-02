// =============================================================================
// PROVIDER TYPES
// =============================================================================

export type ProviderType = 'replicate' | 'fal' | 'huggingface';

export type ModelCapability =
  | 'text-to-image'
  | 'image-to-image'
  | 'text-to-video'
  | 'image-to-video';

export type ModelUseCase =
  | 'style-transfer'
  | 'character-consistent'
  | 'image-variation'
  | 'inpainting'
  | 'upscale'
  | 'general';

export interface ProviderModel {
  id: string;
  displayName: string;
  provider: ProviderType;
  capabilities: ModelCapability[];
  description?: string;
  thumbnail?: string;
  pricing?: string;
  inputSchema?: Record<string, unknown>;
  /** Component schemas containing enum definitions (aspect_ratio, duration, etc.) */
  componentSchemas?: Record<string, unknown>;
  /** Use cases this model supports (style transfer, upscale, etc.) */
  useCases?: ModelUseCase[];
}

export interface SelectedModel {
  /** Alias for modelId - used by hooks that expect id */
  id?: string;
  provider: ProviderType;
  modelId: string;
  displayName: string;
  inputSchema?: Record<string, unknown>;
  /** Component schemas containing enum definitions (aspect_ratio, duration, etc.) */
  componentSchemas?: Record<string, unknown>;
}
