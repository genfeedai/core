import { NODE_STATUS } from '@genfeedai/types';
import type { StateCreator } from 'zustand';
import { apiClient } from '@/lib/api/client';
import { logger } from '@/lib/logger';
import { useWorkflowStore } from '@/store/workflowStore';
import { getOutputUpdate } from '../helpers/outputHelpers';
import { pollPrediction } from '../helpers/pollPrediction';
import { createExecutionSubscription } from '../helpers/sseSubscription';
import type { ExecutionData, ExecutionStore } from '../types';

export interface ExecutionSlice {
  executeWorkflow: () => Promise<void>;
  executeSelectedNodes: () => Promise<void>;
  executeNode: (nodeId: string) => Promise<void>;
  resumeFromFailed: () => Promise<void>;
  stopExecution: () => void;
  clearValidationErrors: () => void;
  resetExecution: () => void;
  canResumeFromFailed: () => boolean;
  setEstimatedCost: (cost: number) => void;
}

export const createExecutionSlice: StateCreator<ExecutionStore, [], [], ExecutionSlice> = (
  set,
  get
) => ({
  executeWorkflow: async () => {
    const { isRunning, resetExecution } = get();
    if (isRunning) return;

    const workflowStore = useWorkflowStore.getState();

    const validation = workflowStore.validateWorkflow();
    if (!validation.isValid) {
      set({ validationErrors: validation });
      return;
    }

    set({ validationErrors: null });
    resetExecution();

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

    for (const node of workflowStore.nodes) {
      workflowStore.updateNodeData(node.id, {
        status: NODE_STATUS.idle,
        error: undefined,
        progress: undefined,
      });
    }

    try {
      const execution = await apiClient.post<ExecutionData>(`/workflows/${workflowId}/execute`);
      const executionId = execution._id;

      set({ executionId });

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

  executeNode: async (nodeId: string) => {
    const workflowStore = useWorkflowStore.getState();
    const node = workflowStore.getNodeById(nodeId);
    if (!node) return;

    set({ currentNodeId: nodeId });
    workflowStore.updateNodeData(nodeId, { status: NODE_STATUS.processing });

    try {
      const inputs = workflowStore.getConnectedInputs(nodeId);
      const inputsObj = Object.fromEntries(inputs);

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
        workflowStore.updateNodeData(nodeId, { status: NODE_STATUS.complete });
        set({ currentNodeId: null });
        return;
      }

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

    set({ validationErrors: null });
    resetExecution();

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

    for (const nodeId of selectedNodeIds) {
      workflowStore.updateNodeData(nodeId, {
        status: NODE_STATUS.idle,
        error: undefined,
        progress: undefined,
      });
    }

    try {
      const execution = await apiClient.post<ExecutionData>(`/workflows/${workflowId}/execute`);
      const executionId = execution._id;

      set({ executionId });

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

    workflowStore.updateNodeData(lastFailedNodeId, {
      status: NODE_STATUS.idle,
      error: undefined,
      progress: undefined,
    });

    try {
      const execution = await apiClient.post<ExecutionData>(`/workflows/${workflowId}/execute`);
      const newExecutionId = execution._id;

      set({ executionId: newExecutionId, lastFailedNodeId: null });

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

    if (eventSource) {
      eventSource.close();
    }

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
});
