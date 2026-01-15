import { topologicalSort } from '@genfeedai/core';
import {
  type ImageGridSplitNodeData,
  NODE_STATUS,
  type NodeType,
  type TweetInputNodeData,
  type TweetRemixNodeData,
  type ValidationResult,
  type WorkflowNode,
} from '@genfeedai/types';
import { create } from 'zustand';
import { logger } from '@/lib/logger';
import { useWorkflowStore } from './workflowStore';

// Node types grouped by execution pattern
const INPUT_NODES = ['prompt', 'imageInput', 'template', 'videoInput', 'audioInput'];
const OUTPUT_NODES = ['output', 'preview', 'download'];
const AI_NODES = ['imageGen', 'videoGen', 'llm'];
const PROCESSING_NODES = ['animation', 'videoStitch', 'resize', 'videoTrim'];
const REPLICATE_PROCESSING_NODES = [
  'lumaReframeImage',
  'lumaReframeVideo',
  'topazImageUpscale',
  'topazVideoUpscale',
];

// Helper to call API with JSON body
async function callJsonApi(
  url: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; data: Record<string, unknown>; error?: string }> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    return { ok: false, data: {}, error: response.statusText };
  }
  const data = await response.json();
  return { ok: true, data };
}

// Handle special node types with unique logic
async function executeSpecialNode(
  nodeType: string,
  node: WorkflowNode,
  inputs: Map<string, string | string[]>,
  workflowStore: ReturnType<typeof useWorkflowStore.getState>
): Promise<void> {
  const nodeId = node.id;

  switch (nodeType) {
    case 'tweetInput': {
      const tweetData = node.data as TweetInputNodeData;
      if (tweetData.inputMode === 'url' && tweetData.tweetUrl) {
        const { ok, data } = await callJsonApi('/api/tweet/fetch', { url: tweetData.tweetUrl });
        if (!ok) throw new Error('Failed to fetch tweet');
        workflowStore.updateNodeData(nodeId, {
          extractedTweet: data.text,
          authorHandle: data.authorHandle,
          status: NODE_STATUS.complete,
        });
      } else {
        workflowStore.updateNodeData(nodeId, {
          extractedTweet: tweetData.rawText,
          status: NODE_STATUS.complete,
        });
      }
      break;
    }

    case 'tweetRemix': {
      const inputTweet = inputs.get('tweet') as string;
      const remixConfig = node.data as TweetRemixNodeData;
      workflowStore.updateNodeData(nodeId, { inputTweet });
      const { ok, data } = await callJsonApi('/api/tweet/remix', {
        originalTweet: inputTweet,
        tone: remixConfig.tone,
        maxLength: remixConfig.maxLength,
      });
      if (!ok) throw new Error('Failed to generate variations');
      workflowStore.updateNodeData(nodeId, {
        variations: data.variations,
        status: NODE_STATUS.complete,
      });
      break;
    }

    case 'imageGridSplit': {
      const inputImage = inputs.get('image') as string;
      if (!inputImage) throw new Error('No input image connected');
      const gridData = node.data as ImageGridSplitNodeData;
      workflowStore.updateNodeData(nodeId, { inputImage });

      const formData = new FormData();
      formData.append('image', inputImage);
      formData.append('gridRows', String(gridData.gridRows ?? 2));
      formData.append('gridCols', String(gridData.gridCols ?? 3));
      formData.append('borderInset', String(gridData.borderInset ?? 10));
      formData.append('outputFormat', gridData.outputFormat ?? 'jpg');
      formData.append('quality', String(gridData.quality ?? 95));

      const response = await fetch('/api/tools/grid-split', { method: 'POST', body: formData });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error ?? `Grid split error: ${response.statusText}`);
      }
      const result = await response.json();
      if (!result.success || !result.images) throw new Error('Grid split failed');
      workflowStore.updateNodeData(nodeId, {
        outputImages: result.images.map((img: { data: string }) => img.data),
        status: NODE_STATUS.complete,
      });
      break;
    }

    default:
      // Unknown node type - just mark complete
      workflowStore.updateNodeData(nodeId, { status: NODE_STATUS.complete });
  }
}

export interface Job {
  nodeId: string;
  predictionId: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  progress: number;
  output: unknown | null;
  error: string | null;
  createdAt: string;
}

interface ExecutionStore {
  // State
  isRunning: boolean;
  currentNodeId: string | null;
  executionQueue: string[];
  completedNodes: Set<string>;
  validationErrors: ValidationResult | null;

  // Job tracking
  jobs: Map<string, Job>;

  // Cost tracking
  estimatedCost: number;
  actualCost: number;

  // Actions
  executeWorkflow: () => Promise<void>;
  executeNode: (nodeId: string) => Promise<void>;
  stopExecution: () => void;
  retryNode: (nodeId: string) => Promise<void>;
  clearValidationErrors: () => void;

  // Job management
  addJob: (nodeId: string, predictionId: string) => void;
  updateJob: (predictionId: string, updates: Partial<Job>) => void;
  getJobByNodeId: (nodeId: string) => Job | undefined;

  // Helpers
  getExecutionOrder: () => string[];
  resetExecution: () => void;
}

export const useExecutionStore = create<ExecutionStore>((set, get) => ({
  isRunning: false,
  currentNodeId: null,
  executionQueue: [],
  completedNodes: new Set(),
  validationErrors: null,
  jobs: new Map(),
  estimatedCost: 0,
  actualCost: 0,

  executeWorkflow: async () => {
    const { isRunning, getExecutionOrder, executeNode, resetExecution } = get();
    if (isRunning) return;

    const workflowStore = useWorkflowStore.getState();

    // Validate workflow before execution
    const validation = workflowStore.validateWorkflow();
    if (!validation.isValid) {
      set({ validationErrors: validation });
      return;
    }

    // Clear any previous validation errors
    set({ validationErrors: null });

    resetExecution();
    const order = getExecutionOrder();

    set({
      isRunning: true,
      executionQueue: order,
    });

    for (const nodeId of order) {
      const { isRunning: stillRunning } = get();
      if (!stillRunning) break;

      // Check if node is locked (individual or via group)
      const isLocked = workflowStore.isNodeLocked(nodeId);
      if (isLocked) {
        const node = workflowStore.getNodeById(nodeId);
        if (node?.data.cachedOutput) {
          // Use cached output for locked node
          workflowStore.updateNodeData(nodeId, {
            status: NODE_STATUS.complete,
          });
          set((state) => ({
            completedNodes: new Set([...state.completedNodes, nodeId]),
          }));
          continue;
        }
        // No cached output - execute anyway and warn
      }

      try {
        await executeNode(nodeId);
      } catch (error) {
        logger.error(`Error executing node ${nodeId}`, error, { context: 'ExecutionStore' });
        // Continue with other nodes or stop based on error type
      }
    }

    set({ isRunning: false, currentNodeId: null });
  },

  executeNode: async (nodeId) => {
    const workflowStore = useWorkflowStore.getState();
    const node = workflowStore.getNodeById(nodeId);
    if (!node) return;

    set({ currentNodeId: nodeId });

    // Update node status to processing
    workflowStore.updateNodeData(nodeId, { status: NODE_STATUS.processing });

    try {
      // Get connected inputs
      const inputs = workflowStore.getConnectedInputs(nodeId);

      // Execute based on node type
      const nodeType = node.type as NodeType;
      const inputsObj = Object.fromEntries(inputs);

      // Input nodes - just mark complete
      if (INPUT_NODES.includes(nodeType)) {
        workflowStore.updateNodeData(nodeId, { status: NODE_STATUS.complete });
      }
      // Output nodes - receive media input and mark complete
      else if (OUTPUT_NODES.includes(nodeType)) {
        workflowStore.updateNodeData(nodeId, {
          inputMedia: inputs.get('media') as string,
          status: NODE_STATUS.complete,
        });
      }
      // AI nodes (imageGen, videoGen, llm) - may have async jobs
      else if (AI_NODES.includes(nodeType)) {
        const { ok, data, error } = await callJsonApi(`/api/replicate/${nodeType}`, {
          nodeId,
          inputs: inputsObj,
          config: node.data,
        });
        if (!ok) throw new Error(`API error: ${error}`);
        if (data.predictionId) {
          get().addJob(nodeId, data.predictionId as string);
          await pollJob(data.predictionId as string, nodeId, workflowStore, get());
        } else if (data.output) {
          updateNodeOutput(nodeId, nodeType, data.output, workflowStore);
        }
      }
      // Replicate processing nodes (Luma/Topaz) - may have async jobs
      else if (REPLICATE_PROCESSING_NODES.includes(nodeType)) {
        const { ok, data, error } = await callJsonApi('/api/replicate/processing', {
          nodeId,
          nodeType,
          inputs: inputsObj,
          config: node.data,
        });
        if (!ok) throw new Error(`API error: ${error}`);
        if (data.predictionId) {
          get().addJob(nodeId, data.predictionId as string);
          await pollJob(data.predictionId as string, nodeId, workflowStore, get());
        } else if (data.output) {
          updateNodeOutput(nodeId, nodeType, data.output, workflowStore);
        }
      }
      // Video processing nodes
      else if (PROCESSING_NODES.includes(nodeType)) {
        const { ok, data, error } = await callJsonApi('/api/video/process', {
          nodeId,
          nodeType,
          inputs: inputsObj,
          config: node.data,
        });
        if (!ok) throw new Error(`Processing error: ${error}`);
        updateNodeOutput(nodeId, nodeType, data.output, workflowStore);
      }
      // Special case handlers
      else {
        await executeSpecialNode(nodeType, node, inputs, workflowStore);
      }

      set((state) => ({
        completedNodes: new Set([...state.completedNodes, nodeId]),
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      workflowStore.updateNodeData(nodeId, {
        status: NODE_STATUS.error,
        error: errorMessage,
      });
      throw error;
    }
  },

  stopExecution: () => {
    set({
      isRunning: false,
      currentNodeId: null,
      executionQueue: [],
    });
  },

  clearValidationErrors: () => {
    set({ validationErrors: null });
  },

  retryNode: async (nodeId) => {
    const { executeNode } = get();
    const workflowStore = useWorkflowStore.getState();

    // Reset node status
    workflowStore.updateNodeData(nodeId, {
      status: NODE_STATUS.idle,
      error: undefined,
    });

    await executeNode(nodeId);
  },

  addJob: (nodeId, predictionId) => {
    set((state) => {
      const newJobs = new Map(state.jobs);
      newJobs.set(predictionId, {
        nodeId,
        predictionId,
        status: 'pending',
        progress: 0,
        output: null,
        error: null,
        createdAt: new Date().toISOString(),
      });
      return { jobs: newJobs };
    });
  },

  updateJob: (predictionId, updates) => {
    set((state) => {
      const newJobs = new Map(state.jobs);
      const job = newJobs.get(predictionId);
      if (job) {
        newJobs.set(predictionId, { ...job, ...updates });
      }
      return { jobs: newJobs };
    });
  },

  getJobByNodeId: (nodeId) => {
    const { jobs } = get();
    for (const job of jobs.values()) {
      if (job.nodeId === nodeId) return job;
    }
    return undefined;
  },

  getExecutionOrder: () => {
    const workflowStore = useWorkflowStore.getState();
    return topologicalSort(workflowStore.nodes, workflowStore.edges);
  },

  resetExecution: () => {
    set({
      completedNodes: new Set(),
      jobs: new Map(),
      currentNodeId: null,
      executionQueue: [],
      actualCost: 0,
    });

    // Reset all node statuses
    const workflowStore = useWorkflowStore.getState();
    for (const node of workflowStore.nodes) {
      workflowStore.updateNodeData(node.id, {
        status: NODE_STATUS.idle,
        error: undefined,
        progress: undefined,
      });
    }
  },
}));

// Helper function to poll for job completion
async function pollJob(
  predictionId: string,
  nodeId: string,
  workflowStore: ReturnType<typeof useWorkflowStore.getState>,
  executionStore: ReturnType<typeof useExecutionStore.getState>
): Promise<void> {
  const maxAttempts = 120; // 10 minutes max
  const pollInterval = 5000; // 5 seconds

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`/api/status/${predictionId}`);
    const data = await response.json();

    executionStore.updateJob(predictionId, {
      status: data.status,
      progress: data.progress ?? 0,
      output: data.output,
      error: data.error,
    });

    // Update node progress
    workflowStore.updateNodeData(nodeId, {
      progress: data.progress ?? 0,
    });

    if (data.status === 'succeeded') {
      const node = workflowStore.getNodeById(nodeId);
      if (node) {
        updateNodeOutput(nodeId, node.type, data.output, workflowStore);
      }
      return;
    }

    if (data.status === 'failed' || data.status === 'canceled') {
      throw new Error(data.error ?? 'Job failed');
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error('Job timed out');
}

// Output field mappings by node type
const IMAGE_OUTPUT_NODES = ['imageGen', 'lumaReframeImage', 'topazImageUpscale'];
const VIDEO_OUTPUT_NODES = [
  'videoGen',
  'animation',
  'videoStitch',
  'lumaReframeVideo',
  'topazVideoUpscale',
];

// Helper function to update node output based on type
function updateNodeOutput(
  nodeId: string,
  nodeType: string,
  output: unknown,
  workflowStore: ReturnType<typeof useWorkflowStore.getState>
): void {
  const updates: Record<string, unknown> = { status: NODE_STATUS.complete };

  if (IMAGE_OUTPUT_NODES.includes(nodeType)) {
    updates.outputImage = output;
  } else if (VIDEO_OUTPUT_NODES.includes(nodeType)) {
    updates.outputVideo = output;
  } else if (nodeType === 'llm') {
    updates.outputText = output;
  } else if (nodeType === 'resize') {
    updates.outputMedia = output;
  }

  workflowStore.updateNodeData(nodeId, updates);
}
