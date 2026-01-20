/**
 * Utility functions for calculating node dimensions based on output aspect ratio.
 * Ported from node-banana for consistent node sizing behavior.
 */

// Node sizing constraints
const MIN_WIDTH = 200;
const MAX_WIDTH = 500;
const MIN_HEIGHT = 200;
const MAX_HEIGHT = 600;

// Node chrome: header (~40px), controls/padding (~60px)
const NODE_CHROME_HEIGHT = 100;

/**
 * Extract dimensions from a base64 data URL image.
 * @param base64DataUrl - The image as a base64 data URL (e.g., "data:image/png;base64,...")
 * @returns Promise resolving to {width, height} or null if extraction fails
 */
export function getImageDimensions(
  base64DataUrl: string
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    if (!base64DataUrl || !base64DataUrl.startsWith('data:image')) {
      resolve(null);
      return;
    }

    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      resolve(null);
    };
    img.src = base64DataUrl;
  });
}

/**
 * Extract dimensions from a video data URL or blob URL.
 * @param videoUrl - The video as a data URL or blob URL
 * @returns Promise resolving to {width, height} or null if extraction fails
 */
export function getVideoDimensions(
  videoUrl: string
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    if (!videoUrl) {
      resolve(null);
      return;
    }

    const video = document.createElement('video');
    video.onloadedmetadata = () => {
      resolve({ width: video.videoWidth, height: video.videoHeight });
    };
    video.onerror = () => {
      resolve(null);
    };
    video.src = videoUrl;
  });
}

/**
 * Calculate node dimensions that maintain aspect ratio within constraints.
 * @param aspectRatio - Width divided by height (e.g., 16/9 for landscape, 9/16 for portrait)
 * @param baseWidth - Starting width to calculate from (default 300px)
 * @returns {width, height} dimensions that fit within constraints
 */
export function calculateNodeSize(
  aspectRatio: number,
  baseWidth = 300
): { width: number; height: number } {
  // Handle invalid aspect ratios
  if (!aspectRatio || aspectRatio <= 0 || !Number.isFinite(aspectRatio)) {
    return { width: 300, height: 300 }; // Return default square
  }

  // Start with base width and calculate content height
  let width = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, baseWidth));

  // Calculate content area height based on aspect ratio
  // Content height = width / aspectRatio
  let contentHeight = width / aspectRatio;
  let totalHeight = contentHeight + NODE_CHROME_HEIGHT;

  // Check if height exceeds max - if so, scale down width to fit
  if (totalHeight > MAX_HEIGHT) {
    contentHeight = MAX_HEIGHT - NODE_CHROME_HEIGHT;
    width = contentHeight * aspectRatio;
    totalHeight = MAX_HEIGHT;
  }

  // Check if height is below min - if so, scale up width to fit
  if (totalHeight < MIN_HEIGHT) {
    contentHeight = MIN_HEIGHT - NODE_CHROME_HEIGHT;
    width = contentHeight * aspectRatio;
    totalHeight = MIN_HEIGHT;
  }

  // Clamp width to constraints
  if (width > MAX_WIDTH) {
    width = MAX_WIDTH;
    contentHeight = width / aspectRatio;
    totalHeight = contentHeight + NODE_CHROME_HEIGHT;
    // Re-clamp height
    totalHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, totalHeight));
  }

  if (width < MIN_WIDTH) {
    width = MIN_WIDTH;
    contentHeight = width / aspectRatio;
    totalHeight = contentHeight + NODE_CHROME_HEIGHT;
    // Re-clamp height
    totalHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, totalHeight));
  }

  return {
    width: Math.round(width),
    height: Math.round(totalHeight),
  };
}

/**
 * Calculate node dimensions that maintain aspect ratio while preserving current height if provided.
 * @param aspectRatio - Width divided by height (e.g., 16/9 for landscape, 9/16 for portrait)
 * @param currentHeight - Optional current height to preserve (if within constraints)
 * @returns {width, height} dimensions that fit within constraints
 */
export function calculateNodeSizePreservingHeight(
  aspectRatio: number,
  currentHeight?: number
): { width: number; height: number } {
  // Handle invalid aspect ratios
  if (!aspectRatio || aspectRatio <= 0 || !Number.isFinite(aspectRatio)) {
    return { width: 300, height: currentHeight ?? 300 };
  }

  // If we have a current height, try to preserve it
  if (currentHeight !== undefined && currentHeight >= MIN_HEIGHT && currentHeight <= MAX_HEIGHT) {
    // Calculate content height (total - chrome)
    const contentHeight = currentHeight - NODE_CHROME_HEIGHT;

    // Calculate width from aspect ratio
    let width = contentHeight * aspectRatio;

    // Clamp width to constraints
    width = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width));

    return {
      width: Math.round(width),
      height: Math.round(currentHeight),
    };
  }

  // Fall back to standard calculation if no valid current height
  return calculateNodeSize(aspectRatio);
}

/**
 * Parse aspect ratio string to numeric value.
 * @param aspectRatio - Aspect ratio string like "16:9", "1:1", "9:16"
 * @returns Numeric aspect ratio (width / height)
 */
export function parseAspectRatio(aspectRatio: string): number {
  const [width, height] = aspectRatio.split(':').map(Number);
  if (!width || !height || height === 0) return 1;
  return width / height;
}

/**
 * Default dimensions for each node type.
 * Used for consistent node sizing when creating new nodes.
 */
export const DEFAULT_NODE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  imageInput: { width: 300, height: 232 },
  videoInput: { width: 300, height: 232 },
  audioInput: { width: 300, height: 200 },
  prompt: { width: 320, height: 220 },
  template: { width: 320, height: 240 },
  imageGen: { width: 300, height: 272 },
  videoGen: { width: 300, height: 292 },
  llm: { width: 320, height: 360 },
  lipSync: { width: 300, height: 252 },
  textToSpeech: { width: 300, height: 280 },
  transcribe: { width: 300, height: 260 },
  voiceChange: { width: 300, height: 260 },
  resize: { width: 300, height: 272 },
  animation: { width: 300, height: 252 },
  videoStitch: { width: 300, height: 272 },
  videoTrim: { width: 300, height: 252 },
  videoFrameExtract: { width: 300, height: 232 },
  reframe: { width: 300, height: 272 },
  upscale: { width: 300, height: 292 },
  imageGridSplit: { width: 300, height: 252 },
  annotation: { width: 300, height: 272 },
  subtitle: { width: 300, height: 272 },
  output: { width: 320, height: 272 },
  workflowInput: { width: 280, height: 200 },
  workflowOutput: { width: 280, height: 200 },
  workflowRef: { width: 320, height: 280 },
};
