/**
 * Centralized node type registry — single source of truth for all node type metadata.
 *
 * Previously, node type information was scattered across:
 *   - queue.constants.ts: NODE_TYPE_TO_QUEUE, PASSTHROUGH_NODE_TYPES
 *   - executions.service.ts: PASSTHROUGH_NODE_TYPES, PASSTHROUGH_OUTPUT_MAP
 *   - queue-manager.service.ts: NODE_TYPE_TO_JOB_TYPE, NODE_TYPE_TO_PRIORITY
 *
 * This registry consolidates all node type semantics and derives the constants
 * used by the workflow orchestrator, queue manager, and execution services.
 */
import { QUEUE_NAMES, type QueueName } from '@/queue/queue.constants';

/**
 * Node category classification
 */
export type NodeCategory = 'input' | 'ai' | 'processing' | 'output' | 'composition' | 'text';

/**
 * A single entry in the node type registry.
 */
export interface NodeTypeEntry {
  /** The node type string identifier (e.g. 'imageGen', 'prompt') */
  type: string;
  /** Category for grouping and documentation */
  category: NodeCategory;
  /** Queue for BullMQ job processing. Undefined = not routed to a specific queue */
  queue?: QueueName;
  /**
   * Whether the workflow orchestrator should skip this node type entirely
   * (mark as complete immediately without creating a BullMQ job).
   */
  skipQueue: boolean;
  /**
   * Whether output values can be read directly from node.data fields
   * (vs. from execution nodeResults). Used for input resolution.
   */
  dataPassthrough: boolean;
  /**
   * Handle → data field mapping for extracting output from node.data.
   * Keys are handle IDs (e.g. 'output', 'image'), values are node.data field names.
   * Only relevant when dataPassthrough is true. Nodes without an outputMap
   * fall back to probing common fields (image, video, audio, prompt, text, value).
   */
  outputMap?: Record<string, string>;
}

/**
 * The complete node type registry.
 *
 * Passthrough semantics (two independent dimensions):
 *   skipQueue=true  → orchestrator skips this node (no BullMQ job created)
 *   dataPassthrough=true → input resolution reads output from node.data
 *
 * Most input nodes are both skipQueue and dataPassthrough.
 * Processing/AI nodes are neither.
 * Some nodes (promptConstructor, template) are dataPassthrough but NOT skipQueue.
 */
export const NODE_TYPE_REGISTRY: readonly NodeTypeEntry[] = [
  // ── Input nodes ──────────────────────────────────────────────────────
  { category: 'input', dataPassthrough: true, skipQueue: true, type: 'input' },
  {
    category: 'input',
    dataPassthrough: true,
    outputMap: { output: 'prompt', text: 'prompt' },
    skipQueue: true,
    type: 'prompt',
  },
  {
    category: 'input',
    dataPassthrough: true,
    outputMap: { image: 'image', output: 'image' },
    skipQueue: true,
    type: 'imageInput',
  },
  {
    category: 'input',
    dataPassthrough: true,
    outputMap: { output: 'video', video: 'video' },
    skipQueue: true,
    type: 'videoInput',
  },
  {
    category: 'input',
    dataPassthrough: true,
    outputMap: { audio: 'audio', output: 'audio' },
    skipQueue: true,
    type: 'audioInput',
  },

  // ── AI generation nodes ──────────────────────────────────────────────
  {
    category: 'ai',
    dataPassthrough: false,
    queue: QUEUE_NAMES.IMAGE_GENERATION,
    skipQueue: false,
    type: 'imageGen',
  },
  {
    category: 'ai',
    dataPassthrough: false,
    queue: QUEUE_NAMES.VIDEO_GENERATION,
    skipQueue: false,
    type: 'videoGen',
  },
  {
    category: 'ai',
    dataPassthrough: false,
    queue: QUEUE_NAMES.LLM_GENERATION,
    skipQueue: false,
    type: 'llm',
  },
  {
    category: 'ai',
    dataPassthrough: false,
    queue: QUEUE_NAMES.VIDEO_GENERATION,
    skipQueue: false,
    type: 'motionControl',
  },

  // ── Processing nodes ─────────────────────────────────────────────────
  {
    category: 'processing',
    dataPassthrough: false,
    queue: QUEUE_NAMES.PROCESSING,
    skipQueue: false,
    type: 'reframe',
  },
  {
    category: 'processing',
    dataPassthrough: false,
    queue: QUEUE_NAMES.PROCESSING,
    skipQueue: false,
    type: 'lumaReframeImage',
  },
  {
    category: 'processing',
    dataPassthrough: false,
    queue: QUEUE_NAMES.PROCESSING,
    skipQueue: false,
    type: 'lumaReframeVideo',
  },
  {
    category: 'processing',
    dataPassthrough: false,
    queue: QUEUE_NAMES.PROCESSING,
    skipQueue: false,
    type: 'upscale',
  },
  {
    category: 'processing',
    dataPassthrough: false,
    queue: QUEUE_NAMES.PROCESSING,
    skipQueue: false,
    type: 'topazImageUpscale',
  },
  {
    category: 'processing',
    dataPassthrough: false,
    queue: QUEUE_NAMES.PROCESSING,
    skipQueue: false,
    type: 'topazVideoUpscale',
  },
  {
    category: 'processing',
    dataPassthrough: false,
    queue: QUEUE_NAMES.PROCESSING,
    skipQueue: false,
    type: 'lipSync',
  },
  {
    category: 'processing',
    dataPassthrough: false,
    queue: QUEUE_NAMES.PROCESSING,
    skipQueue: false,
    type: 'textToSpeech',
  },
  {
    category: 'processing',
    dataPassthrough: false,
    queue: QUEUE_NAMES.PROCESSING,
    skipQueue: false,
    type: 'transcribe',
  },
  {
    category: 'processing',
    dataPassthrough: false,
    queue: QUEUE_NAMES.PROCESSING,
    skipQueue: false,
    type: 'voiceChange',
  },
  {
    category: 'processing',
    dataPassthrough: false,
    queue: QUEUE_NAMES.PROCESSING,
    skipQueue: false,
    type: 'videoFrameExtract',
  },
  {
    category: 'processing',
    dataPassthrough: false,
    queue: QUEUE_NAMES.PROCESSING,
    skipQueue: false,
    type: 'subtitle',
  },
  {
    category: 'processing',
    dataPassthrough: false,
    queue: QUEUE_NAMES.PROCESSING,
    skipQueue: false,
    type: 'videoStitch',
  },
  {
    category: 'processing',
    dataPassthrough: false,
    queue: QUEUE_NAMES.PROCESSING,
    skipQueue: false,
    type: 'resize',
  },
  {
    category: 'processing',
    dataPassthrough: false,
    queue: QUEUE_NAMES.PROCESSING,
    skipQueue: false,
    type: 'videoTrim',
  },
  {
    category: 'processing',
    dataPassthrough: false,
    queue: QUEUE_NAMES.PROCESSING,
    skipQueue: false,
    type: 'animation',
  },
  {
    category: 'processing',
    dataPassthrough: false,
    queue: QUEUE_NAMES.PROCESSING,
    skipQueue: false,
    type: 'imageGridSplit',
  },

  // ── Output nodes ─────────────────────────────────────────────────────
  { category: 'output', dataPassthrough: false, skipQueue: true, type: 'download' },
  { category: 'output', dataPassthrough: true, skipQueue: false, type: 'output' },
  { category: 'output', dataPassthrough: false, skipQueue: true, type: 'outputGallery' },
  { category: 'output', dataPassthrough: false, skipQueue: true, type: 'imageCompare' },
  { category: 'output', dataPassthrough: false, skipQueue: true, type: 'annotation' },

  // ── Text processing nodes ────────────────────────────────────────────
  {
    category: 'text',
    dataPassthrough: true,
    outputMap: { output: 'outputText', text: 'outputText' },
    skipQueue: false,
    type: 'promptConstructor',
  },
  {
    category: 'text',
    dataPassthrough: true,
    outputMap: { output: 'resolvedPrompt', text: 'resolvedPrompt' },
    skipQueue: false,
    type: 'template',
  },

  // ── Composition nodes ────────────────────────────────────────────────
  {
    category: 'composition',
    dataPassthrough: true,
    outputMap: { output: 'value', value: 'value' },
    skipQueue: true,
    type: 'workflowInput',
  },
  { category: 'composition', dataPassthrough: true, skipQueue: true, type: 'workflowOutput' },
  {
    category: 'composition',
    dataPassthrough: false,
    queue: QUEUE_NAMES.WORKFLOW_ORCHESTRATOR,
    skipQueue: false,
    type: 'workflowRef',
  },
] as const;

// ── Derived constants ────────────────────────────────────────────────────

/**
 * Node type → queue mapping for processable nodes.
 * Replaces the standalone NODE_TYPE_TO_QUEUE in queue.constants.ts.
 */
export const NODE_TYPE_TO_QUEUE: Record<string, QueueName> = Object.fromEntries(
  NODE_TYPE_REGISTRY.filter(
    (e): e is NodeTypeEntry & { queue: QueueName } => e.queue !== undefined
  ).map((e) => [e.type, e.queue])
);

/**
 * Node types that skip queue processing entirely — marked complete immediately
 * by the workflow orchestrator without creating a BullMQ job.
 * Replaces PASSTHROUGH_NODE_TYPES in queue.constants.ts.
 */
export const QUEUE_PASSTHROUGH_TYPES = NODE_TYPE_REGISTRY.filter((e) => e.skipQueue).map(
  (e) => e.type
);

/**
 * Node types whose output can be read directly from node.data fields
 * (for input resolution, instead of reading from execution results).
 * Replaces PASSTHROUGH_NODE_TYPES in executions.service.ts.
 */
export const DATA_PASSTHROUGH_TYPES = NODE_TYPE_REGISTRY.filter((e) => e.dataPassthrough).map(
  (e) => e.type
);

/**
 * Handle → data field mapping for extracting output values from passthrough node data.
 * Replaces PASSTHROUGH_OUTPUT_MAP in executions.service.ts.
 */
export const PASSTHROUGH_OUTPUT_MAP: Record<string, Record<string, string>> = Object.fromEntries(
  NODE_TYPE_REGISTRY.filter(
    (e): e is NodeTypeEntry & { outputMap: Record<string, string> } => e.outputMap !== undefined
  ).map((e) => [e.type, e.outputMap])
);

// ── Lookup helpers ───────────────────────────────────────────────────────

const registryByType = new Map(NODE_TYPE_REGISTRY.map((e) => [e.type, e]));

/**
 * Look up a node type entry by its type string.
 */
export function getNodeTypeEntry(type: string): NodeTypeEntry | undefined {
  return registryByType.get(type);
}

/**
 * Check if a node type skips queue processing.
 */
export function isQueuePassthrough(type: string): boolean {
  return registryByType.get(type)?.skipQueue ?? false;
}

/**
 * Check if a node type's output is readable from node data.
 */
export function isDataPassthrough(type: string): boolean {
  return registryByType.get(type)?.dataPassthrough ?? false;
}
