/**
 * Workflow Registry for @genfeedai/cli
 *
 * This registry contains metadata for all official workflow templates.
 * The actual workflow JSON files are stored in the `workflows/` directory.
 */

export interface WorkflowMetadata {
  id: string;
  name: string;
  description: string;
  category: 'image' | 'video' | 'full-pipeline';
  version: number;
  tags: string[];
}

/**
 * Registry of all available workflow templates
 */
export const WORKFLOW_REGISTRY: Record<string, WorkflowMetadata> = {
  'single-image': {
    id: 'single-image',
    name: 'Single Image Generation',
    description: 'Generate an AI image from a source image (img2img)',
    category: 'image',
    version: 1,
    tags: ['image', 'simple', 'img2img'],
  },
  'single-video': {
    id: 'single-video',
    name: 'Single Video Generation',
    description: 'Generate an AI video from a source image (img2video)',
    category: 'video',
    version: 1,
    tags: ['video', 'simple', 'img2video'],
  },
  'image-series': {
    id: 'image-series',
    name: 'Image Series',
    description: 'Generate a series of related images from a concept prompt using LLM expansion',
    category: 'image',
    version: 1,
    tags: ['image', 'series', 'llm', 'batch'],
  },
  'image-to-video': {
    id: 'image-to-video',
    name: 'Image to Video',
    description: 'Create interpolated video between two images with easing animation',
    category: 'video',
    version: 1,
    tags: ['video', 'interpolation', 'animation'],
  },
  'full-pipeline': {
    id: 'full-pipeline',
    name: 'Full Content Pipeline',
    description: 'Complete workflow: concept to images to videos to stitched output',
    category: 'full-pipeline',
    version: 1,
    tags: ['full-pipeline', 'advanced', 'complete'],
  },
};

/**
 * Get all workflow IDs
 */
export function getWorkflowIds(): string[] {
  return Object.keys(WORKFLOW_REGISTRY);
}

/**
 * Get workflow metadata by ID
 */
export function getWorkflowMetadata(id: string): WorkflowMetadata | undefined {
  return WORKFLOW_REGISTRY[id];
}

/**
 * Get workflows by category
 */
export function getWorkflowsByCategory(category: WorkflowMetadata['category']): WorkflowMetadata[] {
  return Object.values(WORKFLOW_REGISTRY).filter((w) => w.category === category);
}

/**
 * Search workflows by tag
 */
export function searchWorkflowsByTag(tag: string): WorkflowMetadata[] {
  return Object.values(WORKFLOW_REGISTRY).filter((w) =>
    w.tags.some((t) => t.toLowerCase().includes(tag.toLowerCase()))
  );
}
