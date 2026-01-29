import type { ImageModel, LipSyncModel, VideoModel } from '@genfeedai/types';

/**
 * Centralized Model Registry
 *
 * Defines all available AI models and their mappings between:
 * - Internal type identifiers (used in node data)
 * - API model IDs (used when calling provider APIs)
 * - Display labels (shown in UI)
 */

// =============================================================================
// IMAGE MODELS
// =============================================================================

export interface ImageModelConfig {
  value: ImageModel;
  label: string;
  apiId: string;
}

export const IMAGE_MODELS: ImageModelConfig[] = [
  { value: 'nano-banana', label: 'Nano Banana', apiId: 'google/nano-banana' },
  { value: 'nano-banana-pro', label: 'Nano Banana Pro', apiId: 'google/nano-banana-pro' },
];

/** Maps API model ID -> internal model type */
export const IMAGE_MODEL_MAP: Record<string, ImageModel> = Object.fromEntries(
  IMAGE_MODELS.map((m) => [m.apiId, m.value])
) as Record<string, ImageModel>;

/** Maps internal model type -> API model ID */
export const IMAGE_MODEL_ID_MAP: Record<ImageModel, string> = Object.fromEntries(
  IMAGE_MODELS.map((m) => [m.value, m.apiId])
) as Record<ImageModel, string>;

export const DEFAULT_IMAGE_MODEL: ImageModel = 'nano-banana-pro';

// =============================================================================
// VIDEO MODELS
// =============================================================================

export interface VideoModelConfig {
  value: VideoModel;
  label: string;
  description: string;
  apiId: string;
}

export const VIDEO_MODELS: VideoModelConfig[] = [
  {
    value: 'veo-3.1-fast',
    label: 'Veo 3.1 Fast',
    description: 'Fast',
    apiId: 'google/veo-3.1-fast',
  },
  { value: 'veo-3.1', label: 'Veo 3.1', description: 'High quality', apiId: 'google/veo-3.1' },
];

/** Maps API model ID -> internal model type */
export const VIDEO_MODEL_MAP: Record<string, VideoModel> = Object.fromEntries(
  VIDEO_MODELS.map((m) => [m.apiId, m.value])
) as Record<string, VideoModel>;

/** Maps internal model type -> API model ID */
export const VIDEO_MODEL_ID_MAP: Record<VideoModel, string> = Object.fromEntries(
  VIDEO_MODELS.map((m) => [m.value, m.apiId])
) as Record<VideoModel, string>;

export const DEFAULT_VIDEO_MODEL: VideoModel = 'veo-3.1-fast';

// =============================================================================
// LIP SYNC MODELS
// =============================================================================

export interface LipSyncModelConfig {
  value: LipSyncModel;
  label: string;
  supportsImage: boolean;
}

export const LIPSYNC_MODELS: LipSyncModelConfig[] = [
  { value: 'bytedance/omni-human', label: 'OmniHuman (Image)', supportsImage: true },
  { value: 'veed/fabric-1.0', label: 'VEED Fabric (Image)', supportsImage: true },
  { value: 'sync/lipsync-2-pro', label: 'Sync Labs Pro (Video)', supportsImage: false },
  { value: 'sync/lipsync-2', label: 'Sync Labs (Video)', supportsImage: false },
  { value: 'pixverse/lipsync', label: 'Pixverse', supportsImage: true },
];

export const LIPSYNC_SYNC_MODES = [
  { value: 'loop' as const, label: 'Loop' },
  { value: 'bounce' as const, label: 'Bounce' },
  { value: 'cut_off' as const, label: 'Cut Off' },
  { value: 'silence' as const, label: 'Silence' },
  { value: 'remap' as const, label: 'Remap' },
];

export const DEFAULT_LIPSYNC_MODEL: LipSyncModel = 'bytedance/omni-human';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/** Get display label for an image model */
export function getImageModelLabel(model: ImageModel): string {
  return IMAGE_MODELS.find((m) => m.value === model)?.label ?? model;
}

/** Get display label for a video model */
export function getVideoModelLabel(model: VideoModel): string {
  return VIDEO_MODELS.find((m) => m.value === model)?.label ?? model;
}

/** Get display label for a lip sync model */
export function getLipSyncModelLabel(model: LipSyncModel): string {
  return LIPSYNC_MODELS.find((m) => m.value === model)?.label ?? model;
}

/** Check if a lip sync model supports image input */
export function lipSyncModelSupportsImage(model: LipSyncModel): boolean {
  return LIPSYNC_MODELS.find((m) => m.value === model)?.supportsImage ?? false;
}
