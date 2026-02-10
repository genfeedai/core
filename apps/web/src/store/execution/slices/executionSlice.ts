import { NodeStatusEnum } from '@genfeedai/types';
import type { StateCreator } from 'zustand';
import { apiClient } from '@/lib/api/client';
import { logger } from '@/lib/logger';
import { useSettingsStore } from '@/store/settingsStore';
import { useUIStore } from '@genfeedai/workflow-ui/stores';
import { useWorkflowStore } from '@/store/workflowStore';
import {
  createExecutionSubscription,
  createNodeExecutionSubscription,
} from '../helpers/sseSubscription';
import type { ExecutionData, ExecutionStore, NodeExecution } from '../types';

export interface ExecutionSlice {
  executeWorkflow: () => Promise<void>;
  executeSelectedNodes: () => Promise<void>;
  executeNode: (nodeId: string) => Promise<void>;
  resumeFromFailed: () => Promise<void>;
  stopExecution: () => void;
  stopNodeExecution: (nodeId: string) => void;
  isNodeExecuting: (nodeId: string) => boolean;
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
    const debugMode = useSettingsStore.getState().debugMode;

    const validation = workflowStore.validateWorkflow();
    if (!validation.isValid) {
      set({ validationErrors: validation });
      return;
    }

    set({ validationErrors: null });
    resetExecution();

    // Open debug panel if debug mode is active
    if (debugMode) {
      useUIStore.getState().setShowDebugPanel(true);
    }

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
        status: NodeStatusEnum.IDLE,
        error: undefined,
        progress: undefined,
      });
    }

    try {
      const execution = await apiClient.post<ExecutionData>(`/workflows/${workflowId}/execute`, {
        debugMode,
      });
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
    const debugMode = useSettingsStore.getState().debugMode;

    // Save workflow if dirty (idempotent if already saving)
    if (workflowStore.isDirty || !workflowStore.workflowId) {
      try {
        await workflowStore.saveWorkflow();
      } catch (error) {
        logger.error('Failed to save workflow before node execution', error, {
          context: 'ExecutionStore',
        });
        workflowStore.updateNodeData(nodeId, {
          status: NodeStatusEnum.ERROR,
          error: 'Failed to save workflow',
        });
        return;
      }
    }

    const workflowId = workflowStore.workflowId;
    if (!workflowId) {
      workflowStore.updateNodeData(nodeId, {
        status: NodeStatusEnum.ERROR,
        error: 'Workflow must be saved first',
      });
      return;
    }

    if (debugMode) {
      useUIStore.getState().setShowDebugPanel(true);
    }

    try {
      const execution = await apiClient.post<ExecutionData>(`/workflows/${workflowId}/execute`, {
        debugMode,
        selectedNodeIds: [nodeId],
      });
      const executionId = execution._id;

      const eventSource = createNodeExecutionSubscription(executionId, nodeId, set, get);

      const nodeExecution: NodeExecution = {
        executionId,
        nodeIds: [nodeId],
        eventSource,
      };

      set((state) => {
        const newMap = new Map(state.activeNodeExecutions);
        newMap.set(nodeId, nodeExecution);
        return { activeNodeExecutions: newMap };
      });
    } catch (error) {
      logger.error('Failed to start node execution', error, { context: 'ExecutionStore' });
      workflowStore.updateNodeData(nodeId, {
        status: NodeStatusEnum.ERROR,
        error: error instanceof Error ? error.message : 'Node execution failed',
      });
    }
  },

  executeSelectedNodes: async () => {
    const { isRunning, resetExecution } = get();
    if (isRunning) return;

    const workflowStore = useWorkflowStore.getState();
    const debugMode = useSettingsStore.getState().debugMode;
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

    // Track which nodes are being executed for edge highlighting
    set({ isRunning: true, executingNodeIds: selectedNodeIds });

    // Open debug panel if debug mode is active
    if (debugMode) {
      useUIStore.getState().setShowDebugPanel(true);
    }

    for (const nodeId of selectedNodeIds) {
      workflowStore.updateNodeData(nodeId, {
        status: NodeStatusEnum.IDLE,
        error: undefined,
        progress: undefined,
      });
    }

    try {
      const execution = await apiClient.post<ExecutionData>(`/workflows/${workflowId}/execute`, {
        debugMode,
        selectedNodeIds,
      });
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
    const debugMode = useSettingsStore.getState().debugMode;
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

    // Open debug panel if debug mode is active
    if (debugMode) {
      useUIStore.getState().setShowDebugPanel(true);
    }

    workflowStore.updateNodeData(lastFailedNodeId, {
      status: NodeStatusEnum.IDLE,
      error: undefined,
      progress: undefined,
    });

    try {
      const execution = await apiClient.post<ExecutionData>(`/workflows/${workflowId}/execute`, {
        debugMode,
      });
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

  stopNodeExecution: (nodeId: string) => {
    const { activeNodeExecutions } = get();
    const nodeExecution = activeNodeExecutions.get(nodeId);

    if (nodeExecution) {
      nodeExecution.eventSource.close();

      apiClient.post(`/executions/${nodeExecution.executionId}/stop`).catch((error) => {
        logger.error('Failed to stop node execution', error, { context: 'ExecutionStore' });
      });

      set((state) => {
        const newMap = new Map(state.activeNodeExecutions);
        newMap.delete(nodeId);
        return { activeNodeExecutions: newMap };
      });
    }

    const workflowStore = useWorkflowStore.getState();
    workflowStore.updateNodeData(nodeId, { status: NodeStatusEnum.IDLE, error: undefined });
  },

  isNodeExecuting: (nodeId: string) => {
    const { activeNodeExecutions } = get();
    return activeNodeExecutions.has(nodeId);
  },

  clearValidationErrors: () => {
    set({ validationErrors: null });
  },

  resetExecution: () => {
    const { eventSource, activeNodeExecutions } = get();

    if (eventSource) {
      eventSource.close();
    }

    // Close all active node execution SSE connections
    for (const nodeExecution of activeNodeExecutions.values()) {
      nodeExecution.eventSource.close();
    }

    set({
      isRunning: false,
      jobs: new Map(),
      executionId: null,
      currentNodeId: null,
      executingNodeIds: [],
      eventSource: null,
      actualCost: 0,
      lastFailedNodeId: null,
      debugPayloads: [],
      activeNodeExecutions: new Map(),
    });

    const workflowStore = useWorkflowStore.getState();
    for (const node of workflowStore.nodes) {
      workflowStore.updateNodeData(node.id, {
        status: NodeStatusEnum.IDLE,
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
