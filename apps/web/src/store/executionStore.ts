import { NODE_STATUS, type NodeStatus, type ValidationResult } from '@genfeedai/types';
import { create, type StoreApi } from 'zustand';
import { apiClient } from '@/lib/api/client';
import { logger } from '@/lib/logger';
import { useWorkflowStore } from './workflowStore';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * Status map for converting execution statuses to node statuses
 */
const STATUS_MAP: Record<string, NodeStatus> = {
  pending: NODE_STATUS.idle,
  processing: NODE_STATUS.processing,
  complete: NODE_STATUS.complete,
  error: NODE_STATUS.error,
};

/**
 * Create an SSE subscription for execution updates
 * Extracts duplicated subscription logic from executeWorkflow, executeSelectedNodes, resumeFromFailed
 */
function createExecutionSubscription(
  executionId: string,
  set: StoreApi<ExecutionStore>['setState']
): EventSource {
  const eventSource = new EventSource(`${API_BASE_URL}/executions/${executionId}/stream`);

  set({ eventSource });

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as ExecutionData;
      const workflowStore = useWorkflowStore.getState();

      // Update node statuses from execution data
      for (const nodeResult of data.nodeResults || []) {
        const nodeStatus = STATUS_MAP[nodeResult.status] ?? NODE_STATUS.idle;

        workflowStore.updateNodeData(nodeResult.nodeId, {
          status: nodeStatus,
          error: nodeResult.error,
          ...(nodeResult.output &&
            getOutputUpdate(nodeResult.nodeId, nodeResult.output, workflowStore)),
        });

        // Track failed node for resume capability
        if (nodeResult.status === 'error') {
          set({ lastFailedNodeId: nodeResult.nodeId });
        }
      }

      // Update job statuses
      if (data.jobs) {
        set((state) => {
          const newJobs = new Map(state.jobs);
          for (const job of data.jobs || []) {
            newJobs.set(job.predictionId, {
              nodeId: job.nodeId,
              predictionId: job.predictionId,
              status: job.status as Job['status'],
              progress: 0,
              output: job.output ?? null,
              error: job.error ?? null,
              createdAt: new Date().toISOString(),
            });
          }
          return { jobs: newJobs };
        });
      }

      // Check if execution is complete
      if (['completed', 'failed', 'cancelled'].includes(data.status)) {
        eventSource.close();
        set({ isRunning: false, eventSource: null });

        if (data.status === 'failed') {
          logger.error('Workflow execution failed', new Error('Execution failed'), {
            context: 'ExecutionStore',
          });
        }
      }
    } catch (error) {
      logger.error('Failed to parse SSE message', error, { context: 'ExecutionStore' });
    }
  };

  eventSource.onerror = (error) => {
    logger.error('SSE connection error', error, { context: 'ExecutionStore' });
    eventSource.close();
    set({ isRunning: false, eventSource: null });
  };

  return eventSource;
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

interface NodeResult {
  nodeId: string;
  status: string;
  output?: Record<string, unknown>;
  error?: string;
  cost?: number;
}

interface ExecutionData {
  _id: string;
  workflowId: string;
  status: string;
  nodeResults: NodeResult[];
  jobs?: Array<{
    nodeId: string;
    predictionId: string;
    status: string;
    output?: Record<string, unknown>;
    error?: string;
  }>;
}

interface ExecutionStore {
  // State
  isRunning: boolean;
  executionId: string | null;
  currentNodeId: string | null;
  validationErrors: ValidationResult | null;
  eventSource: EventSource | null;
  lastFailedNodeId: string | null;

  // Job tracking
  jobs: Map<string, Job>;

  // Cost tracking
  estimatedCost: number;
  actualCost: number;

  // Actions
  executeWorkflow: () => Promise<void>;
  executeSelectedNodes: () => Promise<void>;
  executeNode: (nodeId: string) => Promise<void>;
  resumeFromFailed: () => Promise<void>;
  stopExecution: () => void;
  clearValidationErrors: () => void;

  // Job management
  addJob: (nodeId: string, predictionId: string) => void;
  updateJob: (predictionId: string, updates: Partial<Job>) => void;
  getJobByNodeId: (nodeId: string) => Job | undefined;

  // Helpers
  resetExecution: () => void;
  canResumeFromFailed: () => boolean;

  // Cost management
  setEstimatedCost: (cost: number) => void;
}

export const useExecutionStore = create<ExecutionStore>((set, get) => ({
  isRunning: false,
  executionId: null,
  currentNodeId: null,
  validationErrors: null,
  eventSource: null,
  lastFailedNodeId: null,
  jobs: new Map(),
  estimatedCost: 0,
  actualCost: 0,

  executeWorkflow: async () => {
    const { isRunning, resetExecution } = get();
    if (isRunning) return;

    const workflowStore = useWorkflowStore.getState();

    // Validate workflow before execution
    const validation = workflowStore.validateWorkflow();
    if (!validation.isValid) {
      set({ validationErrors: validation });
      return;
    }

    // Clear any previous validation errors and reset state
    set({ validationErrors: null });
    resetExecution();

    // Save workflow first if dirty
    if (workflowStore.isDirty || !workflowStore.workflowId) {
      try {
        await workflowStore.saveWorkflow();
      } catch (error) {
        logger.error('Failed to save workflow before execution', error, {
          context: 'ExecutionStore',
        });
        set({
          validationErrors: {
            isValid: false,
            errors: [{ nodeId: '', message: 'Failed to save workflow', severity: 'error' }],
            warnings: [],
          },
        });
        return;
      }
    }

    const workflowId = workflowStore.workflowId;
    if (!workflowId) {
      set({
        validationErrors: {
          isValid: false,
          errors: [{ nodeId: '', message: 'Workflow must be saved first', severity: 'error' }],
          warnings: [],
        },
      });
      return;
    }

    set({ isRunning: true });

    // Mark all nodes as pending
    for (const node of workflowStore.nodes) {
      workflowStore.updateNodeData(node.id, {
        status: NODE_STATUS.idle,
        error: undefined,
        progress: undefined,
      });
    }

    try {
      // Submit workflow execution to backend queue
      const execution = await apiClient.post<ExecutionData>(`/workflows/${workflowId}/execute`);
      const executionId = execution._id;

      set({ executionId });

      // Subscribe to SSE stream for real-time updates
      createExecutionSubscription(executionId, set);
    } catch (error) {
      logger.error('Failed to start workflow execution', error, { context: 'ExecutionStore' });
      set({
        isRunning: false,
        validationErrors: {
          isValid: false,
          errors: [
            {
              nodeId: '',
              message: error instanceof Error ? error.message : 'Execution failed',
              severity: 'error',
            },
          ],
          warnings: [],
        },
      });
    }
  },

  /**
   * Execute a single node directly via API (for testing/preview)
   * This bypasses the queue and executes immediately
   */
  executeNode: async (nodeId: string) => {
    const workflowStore = useWorkflowStore.getState();
    const node = workflowStore.getNodeById(nodeId);
    if (!node) return;

    set({ currentNodeId: nodeId });
    workflowStore.updateNodeData(nodeId, { status: NODE_STATUS.processing });

    try {
      // Get connected inputs
      const inputs = workflowStore.getConnectedInputs(nodeId);
      const inputsObj = Object.fromEntries(inputs);

      // Call appropriate API based on node type
      const nodeType = node.type;
      let result: { predictionId?: string; output?: unknown; status?: string };

      if (['imageGen', 'videoGen', 'llm'].includes(nodeType)) {
        const endpoint =
          nodeType === 'imageGen' ? 'image' : nodeType === 'videoGen' ? 'video' : 'llm';
        result = await apiClient.post(`/replicate/${endpoint}`, {
          nodeId,
          ...node.data,
          ...inputsObj,
        });
      } else if (
        ['reframe', 'upscale', 'lipSync', 'voiceChange', 'textToSpeech'].includes(nodeType)
      ) {
        result = await apiClient.post('/replicate/processing', {
          nodeId,
          nodeType,
          ...node.data,
          ...inputsObj,
        });
      } else {
        // For other node types, just mark as complete
        workflowStore.updateNodeData(nodeId, { status: NODE_STATUS.complete });
        set({ currentNodeId: null });
        return;
      }

      // If we got a prediction ID, poll for completion
      if (result.predictionId) {
        get().addJob(nodeId, result.predictionId);
        await pollPrediction(result.predictionId, nodeId, workflowStore, get());
      } else if (result.output) {
        const outputUpdate = getOutputUpdate(
          nodeId,
          result.output as Record<string, unknown>,
          workflowStore
        );
        workflowStore.updateNodeData(nodeId, { status: NODE_STATUS.complete, ...outputUpdate });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      workflowStore.updateNodeData(nodeId, {
        status: NODE_STATUS.error,
        error: errorMessage,
      });
      logger.error(`Error executing node ${nodeId}`, error, { context: 'ExecutionStore' });
    } finally {
      set({ currentNodeId: null });
    }
  },

  /**
   * Execute only selected nodes (partial execution)
   */
  executeSelectedNodes: async () => {
    const { isRunning, resetExecution } = get();
    if (isRunning) return;

    const workflowStore = useWorkflowStore.getState();
    const { selectedNodeIds } = workflowStore;

    if (selectedNodeIds.length === 0) {
      set({
        validationErrors: {
          isValid: false,
          errors: [{ nodeId: '', message: 'No nodes selected', severity: 'error' }],
          warnings: [],
        },
      });
      return;
    }

    // Clear any previous validation errors and reset state
    set({ validationErrors: null });
    resetExecution();

    // Save workflow first if dirty
    if (workflowStore.isDirty || !workflowStore.workflowId) {
      try {
        await workflowStore.saveWorkflow();
      } catch (error) {
        logger.error('Failed to save workflow before execution', error, {
          context: 'ExecutionStore',
        });
        set({
          validationErrors: {
            isValid: false,
            errors: [{ nodeId: '', message: 'Failed to save workflow', severity: 'error' }],
            warnings: [],
          },
        });
        return;
      }
    }

    const workflowId = workflowStore.workflowId;
    if (!workflowId) {
      set({
        validationErrors: {
          isValid: false,
          errors: [{ nodeId: '', message: 'Workflow must be saved first', severity: 'error' }],
          warnings: [],
        },
      });
      return;
    }

    set({ isRunning: true });

    // Mark selected nodes as pending
    for (const nodeId of selectedNodeIds) {
      workflowStore.updateNodeData(nodeId, {
        status: NODE_STATUS.idle,
        error: undefined,
        progress: undefined,
      });
    }

    try {
      // Submit partial execution to backend
      const execution = await apiClient.post<ExecutionData>(
        `/workflows/${workflowId}/execute/partial`,
        { nodeIds: selectedNodeIds }
      );
      const executionId = execution._id;

      set({ executionId });

      // Subscribe to SSE stream for real-time updates
      createExecutionSubscription(executionId, set);
    } catch (error) {
      logger.error('Failed to start partial execution', error, { context: 'ExecutionStore' });
      set({
        isRunning: false,
        validationErrors: {
          isValid: false,
          errors: [
            {
              nodeId: '',
              message: error instanceof Error ? error.message : 'Partial execution failed',
              severity: 'error',
            },
          ],
          warnings: [],
        },
      });
    }
  },

  /**
   * Resume execution from the last failed node
   */
  resumeFromFailed: async () => {
    const { isRunning, executionId, lastFailedNodeId } = get();
    if (isRunning || !executionId || !lastFailedNodeId) return;

    const workflowStore = useWorkflowStore.getState();
    const workflowId = workflowStore.workflowId;

    if (!workflowId) {
      set({
        validationErrors: {
          isValid: false,
          errors: [{ nodeId: '', message: 'Workflow must be saved first', severity: 'error' }],
          warnings: [],
        },
      });
      return;
    }

    set({ isRunning: true, validationErrors: null });

    // Reset the failed node status
    workflowStore.updateNodeData(lastFailedNodeId, {
      status: NODE_STATUS.idle,
      error: undefined,
      progress: undefined,
    });

    try {
      // Resume execution from failed node
      const execution = await apiClient.post<ExecutionData>(
        `/workflows/${workflowId}/execute/resume/${executionId}`
      );
      const newExecutionId = execution._id;

      set({ executionId: newExecutionId, lastFailedNodeId: null });

      // Subscribe to SSE stream for real-time updates
      createExecutionSubscription(newExecutionId, set);
    } catch (error) {
      logger.error('Failed to resume execution', error, { context: 'ExecutionStore' });
      set({
        isRunning: false,
        validationErrors: {
          isValid: false,
          errors: [
            {
              nodeId: '',
              message: error instanceof Error ? error.message : 'Resume failed',
              severity: 'error',
            },
          ],
          warnings: [],
        },
      });
    }
  },

  stopExecution: () => {
    const { eventSource, executionId } = get();

    // Close SSE connection
    if (eventSource) {
      eventSource.close();
    }

    // Cancel execution on backend
    if (executionId) {
      apiClient.post(`/executions/${executionId}/stop`).catch((error) => {
        logger.error('Failed to stop execution', error, { context: 'ExecutionStore' });
      });
    }

    set({
      isRunning: false,
      eventSource: null,
      currentNodeId: null,
    });
  },

  clearValidationErrors: () => {
    set({ validationErrors: null });
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

  resetExecution: () => {
    const { eventSource } = get();

    if (eventSource) {
      eventSource.close();
    }

    set({
      jobs: new Map(),
      executionId: null,
      currentNodeId: null,
      eventSource: null,
      actualCost: 0,
      lastFailedNodeId: null,
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

  canResumeFromFailed: () => {
    const { executionId, lastFailedNodeId, isRunning } = get();
    return !isRunning && Boolean(executionId) && Boolean(lastFailedNodeId);
  },

  setEstimatedCost: (cost: number) => {
    set({ estimatedCost: cost });
  },
}));

/**
 * Poll for prediction completion (used for individual node execution)
 */
async function pollPrediction(
  predictionId: string,
  nodeId: string,
  workflowStore: ReturnType<typeof useWorkflowStore.getState>,
  executionStore: ReturnType<typeof useExecutionStore.getState>
): Promise<void> {
  const maxAttempts = 120; // 10 minutes max
  const pollInterval = 5000; // 5 seconds

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const data = await apiClient.get<{
      id: string;
      status: string;
      output: unknown;
      error?: string;
      progress?: number;
    }>(`/replicate/predictions/${predictionId}`);

    executionStore.updateJob(predictionId, {
      status: data.status as Job['status'],
      progress: data.progress ?? 0,
      output: data.output,
      error: data.error ?? null,
    });

    workflowStore.updateNodeData(nodeId, {
      progress: data.progress ?? 0,
    });

    if (data.status === 'succeeded') {
      const outputUpdate = getOutputUpdate(
        nodeId,
        data.output as Record<string, unknown>,
        workflowStore
      );
      workflowStore.updateNodeData(nodeId, { status: NODE_STATUS.complete, ...outputUpdate });
      return;
    }

    if (data.status === 'failed' || data.status === 'canceled') {
      workflowStore.updateNodeData(nodeId, {
        status: NODE_STATUS.error,
        error: data.error ?? 'Job failed',
      });
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  workflowStore.updateNodeData(nodeId, {
    status: NODE_STATUS.error,
    error: 'Job timed out',
  });
}

// Helper to map output to correct node data field
function getOutputUpdate(
  nodeId: string,
  output: Record<string, unknown>,
  workflowStore: ReturnType<typeof useWorkflowStore.getState>
): Record<string, unknown> {
  const node = workflowStore.getNodeById(nodeId);
  if (!node) return {};

  const nodeType = node.type;

  // Image output nodes (note: reframe/upscale can be either - check inputType)
  if (['imageGen'].includes(nodeType)) {
    return { outputImage: output };
  }

  // Unified nodes - output type matches input type
  if (['reframe', 'upscale'].includes(nodeType)) {
    const inputType = (node.data as { inputType?: string }).inputType;
    if (inputType === 'video') {
      return { outputVideo: output };
    }
    return { outputImage: output };
  }

  // Video output nodes
  if (['videoGen', 'animation', 'videoStitch', 'lipSync', 'voiceChange'].includes(nodeType)) {
    return { outputVideo: output };
  }

  // Audio output nodes
  if (nodeType === 'textToSpeech') {
    return { outputAudio: output };
  }

  // LLM nodes
  if (nodeType === 'llm') {
    return { outputText: output };
  }

  // Resize nodes
  if (nodeType === 'resize') {
    return { outputMedia: output };
  }

  return { output };
}
