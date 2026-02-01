/**
 * Workflow Registry for @genfeedai/workflows
 *
 * This registry contains metadata for all official workflow templates.
 * The actual workflow JSON files are stored in the `workflows/` directory.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export interface WorkflowJson {
  version: number;
  name: string;
  description: string;
  edgeStyle: string;
  createdAt: string;
  updatedAt: string;
  nodes: any[];
  edges: any[];
}

export interface WorkflowMetadata {
  slug: string;
  title: string;
  description: string;
  category: 'image-generation' | 'video-generation' | 'full-pipeline';
  tags: string[];
  tier: 'free' | 'paid' | 'premium';
  icon: string;
  defaultModel: string;
  inputTypes: string[];
  outputTypes: string[];
  version: number;
}

/**
 * Registry of all available workflow templates
 */
export const WORKFLOW_REGISTRY: Record<string, WorkflowMetadata> = {
  'single-image': {
    slug: 'single-image',
    title: 'Single Image Generation',
    description: 'Generate an AI image from a source image (img2img) with enhanced styling',
    category: 'image-generation',
    tags: ['image', 'simple', 'img2img', 'enhancement'],
    tier: 'free',
    icon: '🖼️',
    defaultModel: 'nano-banana-pro',
    inputTypes: ['image', 'text'],
    outputTypes: ['image'],
    version: 1,
  },
  'single-video': {
    slug: 'single-video',
    title: 'Single Video Generation',
    description: 'Generate an AI video from a source image (img2video) with motion effects',
    category: 'video-generation',
    tags: ['video', 'simple', 'img2video', 'animation'],
    tier: 'free',
    icon: '🎬',
    defaultModel: 'nano-banana-pro',
    inputTypes: ['image', 'text'],
    outputTypes: ['video'],
    version: 1,
  },
  'image-series': {
    slug: 'image-series',
    title: 'Image Series Generation',
    description:
      'Generate a series of related images from a concept using LLM-powered prompt expansion',
    category: 'image-generation',
    tags: ['image', 'series', 'llm', 'batch', 'automation'],
    tier: 'free',
    icon: '📸',
    defaultModel: 'nano-banana-pro',
    inputTypes: ['text'],
    outputTypes: ['image'],
    version: 1,
  },
  'image-to-video': {
    slug: 'image-to-video',
    title: 'Image to Video Transition',
    description:
      'Create smooth interpolated video transitions between two images with easing effects',
    category: 'video-generation',
    tags: ['video', 'interpolation', 'animation', 'transition'],
    tier: 'free',
    icon: '🎞️',
    defaultModel: 'nano-banana-pro',
    inputTypes: ['image'],
    outputTypes: ['video'],
    version: 1,
  },
  'full-pipeline': {
    slug: 'full-pipeline',
    title: 'Full Content Pipeline',
    description: 'Complete end-to-end workflow: concept development to final video production',
    category: 'full-pipeline',
    tags: ['pipeline', 'advanced', 'complete', 'automation', 'production'],
    tier: 'free',
    icon: '⚡',
    defaultModel: 'nano-banana-pro',
    inputTypes: ['text'],
    outputTypes: ['video'],
    version: 1,
  },
  'ugc-factory': {
    slug: 'ugc-factory',
    title: 'UGC Content Factory',
    description: 'Automated user-generated content creation for social media and marketing',
    category: 'full-pipeline',
    tags: ['ugc', 'social', 'automation', 'marketing', 'content'],
    tier: 'free',
    icon: '🏭',
    defaultModel: 'nano-banana-pro',
    inputTypes: ['text'],
    outputTypes: ['video', 'image'],
    version: 1,
  },
};

/**
 * Get all workflows
 */
export function getAllWorkflows(): WorkflowMetadata[] {
  return Object.values(WORKFLOW_REGISTRY);
}

/**
 * Get workflow metadata by slug
 */
export function getWorkflow(slug: string): WorkflowMetadata | undefined {
  return WORKFLOW_REGISTRY[slug];
}

/**
 * Get workflow JSON by slug
 */
export function getWorkflowJson(slug: string): WorkflowJson | undefined {
  try {
    const workflowPath = path.join(__dirname, '..', 'workflows', `${slug}.json`);
    const jsonContent = fs.readFileSync(workflowPath, 'utf-8');
    return JSON.parse(jsonContent);
  } catch (_error) {
    return undefined;
  }
}

/**
 * Get all workflow IDs (legacy compatibility)
 */
export function getWorkflowIds(): string[] {
  return Object.keys(WORKFLOW_REGISTRY);
}

/**
 * Get workflow metadata by ID (legacy compatibility)
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
