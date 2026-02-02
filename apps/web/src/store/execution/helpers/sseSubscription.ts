import { logger } from '@/lib/logger';
import { useUIStore } from '@/store/uiStore';
import { useWorkflowStore } from '@/store/workflowStore';
import { NODE_STATUS } from '@genfeedai/types';
import type { StoreApi } from 'zustand';
import type { DebugPayload, ExecutionData, ExecutionStore, Job } from '../types';
import { getOutputUpdate } from './outputHelpers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://local.genfeed.ai:3001/api';

/**
 * Status map for converting execution statuses to node statuses
 */
const statusMap: Record<string, (typeof NODE_STATUS)[keyof typeof NODE_STATUS]> = {
  pending: NODE_STATUS.idle,
  processing: NODE_STATUS.processing,
  complete: NODE_STATUS.complete,
  succeeded: NODE_STATUS.complete,
  error: NODE_STATUS.error,
};

/**
 * Fetch the final execution state via REST and reconcile all node statuses.
 * This recovers from missed SSE deltas (e.g. dropped connections, race conditions).
 */
async function reconcileNodeStatuses(executionId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/executions/${executionId}`);
    if (!response.ok) return;

    const execution = await response.json();
    const workflowStore = useWorkflowStore.getState();

    for (const nodeResult of execution.nodeResults || []) {
      const nodeStatus = statusMap[nodeResult.status] ?? NODE_STATUS.idle;
      const isSuccess = nodeResult.status === 'complete' || nodeResult.status === 'succeeded';

      workflowStore.updateNodeData(nodeResult.nodeId, {
        status: nodeStatus,
        error: isSuccess ? undefined : nodeResult.error,
        ...(nodeResult.output &&
          getOutputUpdate(nodeResult.nodeId, nodeResult.output, workflowStore)),
      });

      if (isSuccess && nodeResult.output) {
        workflowStore.propagateOutputsDownstream(nodeResult.nodeId);
      }
    }
  } catch {
    // Silent fail — best effort reconciliation
  }
}

/**
 * Create an SSE subscription for execution updates
 */
export function createExecutionSubscription(
  executionId: string,
  set: StoreApi<ExecutionStore>['setState']
): EventSource {
  const eventSource = new EventSource(`${API_BASE_URL}/executions/${executionId}/stream`);

  // Track nodes that have already propagated to prevent duplicate cascades
  const propagatedNodeIds = new Set<string>();

  set({ eventSource });

  eventSource.onmessage = (event) => {
    void (async () => {
      try {
        const data = JSON.parse(event.data) as ExecutionData;
        const workflowStore = useWorkflowStore.getState();

        // Update node statuses from execution data
        // Only process changed nodeResults if delta updates are available
        const nodeResults = data.nodeResults || [];
        for (const nodeResult of nodeResults) {
          const nodeStatus = statusMap[nodeResult.status] ?? NODE_STATUS.idle;
          const isSuccess = nodeResult.status === 'complete' || nodeResult.status === 'succeeded';

          workflowStore.updateNodeData(nodeResult.nodeId, {
            status: nodeStatus,
            // Clear error on success, otherwise pass the error
            error: isSuccess ? undefined : nodeResult.error,
            ...(nodeResult.output &&
              getOutputUpdate(nodeResult.nodeId, nodeResult.output, workflowStore)),
          });

          // Propagate output to downstream nodes when complete
          // Only propagate if this node hasn't been propagated yet in this execution
          if (
            (nodeResult.status === 'complete' || nodeResult.status === 'succeeded') &&
            nodeResult.output &&
            !propagatedNodeIds.has(nodeResult.nodeId)
          ) {
            propagatedNodeIds.add(nodeResult.nodeId);
            workflowStore.propagateOutputsDownstream(nodeResult.nodeId);
          }

          // Track failed node for resume capability
          if (nodeResult.status === 'error') {
            set({ lastFailedNodeId: nodeResult.nodeId });
          }
        }

        // Update job statuses and extract debug payloads
        if (data.jobs) {
          set((state) => {
            const newJobs = new Map(state.jobs);
            const newDebugPayloads: DebugPayload[] = [];

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

              // Extract debug payload if present in job result
              if (job.result?.debugPayload) {
                const node = workflowStore.getNodeById(job.nodeId);
                newDebugPayloads.push({
                  nodeId: job.nodeId,
                  nodeName: String(node?.data?.label || node?.data?.name || job.nodeId),
                  nodeType: node?.type || 'unknown',
                  model: job.result.debugPayload.model,
                  input: job.result.debugPayload.input,
                  timestamp: job.result.debugPayload.timestamp,
                });
              }
            }

            // Open debug panel if we have new debug payloads
            if (newDebugPayloads.length > 0 && data.debugMode) {
              useUIStore.getState().setShowDebugPanel(true);
            }

            return {
              jobs: newJobs,
              // Merge new debug payloads with existing ones (avoiding duplicates by nodeId)
              debugPayloads: [
                ...state.debugPayloads.filter(
                  (existing) => !newDebugPayloads.some((newP) => newP.nodeId === existing.nodeId)
                ),
                ...newDebugPayloads,
              ],
            };
          });
        }

        // Check if execution is complete (support multiple status formats)
        const isComplete = ['completed', 'failed', 'cancelled', 'error'].includes(data.status);

        // Also check if any node failed and no more nodes are pending
        const hasFailedNode = (data.nodeResults || []).some((r) => r.status === 'error');
        const hasPendingNodes = (data.pendingNodes || []).length > 0;
        const hasProcessingNodes = (data.nodeResults || []).some((r) => r.status === 'processing');

        // Execution is done when: explicitly complete OR (has failed node with nothing pending/processing)
        const isDone = isComplete || (hasFailedNode && !hasPendingNodes && !hasProcessingNodes);

        if (isDone) {
          // Clear propagated nodes tracking when execution completes
          propagatedNodeIds.clear();
          eventSource.close();

          // Reconcile final state to catch any missed SSE deltas
          await reconcileNodeStatuses(executionId);

          set({ isRunning: false, eventSource: null, currentNodeId: null, jobs: new Map() });

          if (data.status === 'failed' || hasFailedNode) {
            logger.error('Workflow execution failed', new Error('Execution failed'), {
              context: 'ExecutionStore',
            });
          }
        }
      } catch (error) {
        logger.error('Failed to parse SSE message', error, { context: 'ExecutionStore' });
      }
    })();
  };

  eventSource.onerror = (error) => {
    logger.error('SSE connection error', error, { context: 'ExecutionStore' });
    eventSource.close();
    // Reconcile: fetch final execution state to recover any missed updates
    void reconcileNodeStatuses(executionId).then(() => {
      set({ isRunning: false, eventSource: null });
    });
  };

  return eventSource;
}

/**
 * Create a node-scoped SSE subscription for independent node execution.
 * Does NOT set global isRunning/eventSource state — only manages per-node state
 * via the activeNodeExecutions map.
 */
export function createNodeExecutionSubscription(
  executionId: string,
  nodeId: string,
  set: StoreApi<ExecutionStore>['setState'],
  get: StoreApi<ExecutionStore>['getState']
): EventSource {
  const eventSource = new EventSource(`${API_BASE_URL}/executions/${executionId}/stream`);
  const propagatedNodeIds = new Set<string>();

  eventSource.onmessage = (event) => {
    void (async () => {
      try {
        const data = JSON.parse(event.data) as ExecutionData;
        const workflowStore = useWorkflowStore.getState();

        const nodeResults = data.nodeResults || [];
        for (const nodeResult of nodeResults) {
          const nodeStatus = statusMap[nodeResult.status] ?? NODE_STATUS.idle;
          const isSuccess = nodeResult.status === 'complete' || nodeResult.status === 'succeeded';

          workflowStore.updateNodeData(nodeResult.nodeId, {
            status: nodeStatus,
            error: isSuccess ? undefined : nodeResult.error,
            ...(nodeResult.output &&
              getOutputUpdate(nodeResult.nodeId, nodeResult.output, workflowStore)),
          });

          if (
            (nodeResult.status === 'complete' || nodeResult.status === 'succeeded') &&
            nodeResult.output &&
            !propagatedNodeIds.has(nodeResult.nodeId)
          ) {
            propagatedNodeIds.add(nodeResult.nodeId);
            workflowStore.propagateOutputsDownstream(nodeResult.nodeId);
          }

          if (nodeResult.status === 'error') {
            set({ lastFailedNodeId: nodeResult.nodeId });
          }
        }

        // Update job statuses and extract debug payloads
        if (data.jobs) {
          set((state) => {
            const newJobs = new Map(state.jobs);
            const newDebugPayloads: DebugPayload[] = [];

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

              if (job.result?.debugPayload) {
                const node = workflowStore.getNodeById(job.nodeId);
                newDebugPayloads.push({
                  nodeId: job.nodeId,
                  nodeName: String(node?.data?.label || node?.data?.name || job.nodeId),
                  nodeType: node?.type || 'unknown',
                  model: job.result.debugPayload.model,
                  input: job.result.debugPayload.input,
                  timestamp: job.result.debugPayload.timestamp,
                });
              }
            }

            if (newDebugPayloads.length > 0 && data.debugMode) {
              useUIStore.getState().setShowDebugPanel(true);
            }

            return {
              jobs: newJobs,
              debugPayloads: [
                ...state.debugPayloads.filter(
                  (existing) => !newDebugPayloads.some((newP) => newP.nodeId === existing.nodeId)
                ),
                ...newDebugPayloads,
              ],
            };
          });
        }

        const isComplete = ['completed', 'failed', 'cancelled', 'error'].includes(data.status);
        const hasFailedNode = (data.nodeResults || []).some((r) => r.status === 'error');
        const hasPendingNodes = (data.pendingNodes || []).length > 0;
        const hasProcessingNodes = (data.nodeResults || []).some((r) => r.status === 'processing');
        const isDone = isComplete || (hasFailedNode && !hasPendingNodes && !hasProcessingNodes);

        if (isDone) {
          propagatedNodeIds.clear();
          eventSource.close();

          await reconcileNodeStatuses(executionId);

          // Remove this node execution from the active map
          set((state) => {
            const newMap = new Map(state.activeNodeExecutions);
            newMap.delete(nodeId);
            return { activeNodeExecutions: newMap };
          });
        }
      } catch (error) {
        logger.error('Failed to parse SSE message (node execution)', error, {
          context: 'ExecutionStore',
        });
      }
    })();
  };

  eventSource.onerror = (error) => {
    logger.error('SSE connection error (node execution)', error, { context: 'ExecutionStore' });
    eventSource.close();
    void reconcileNodeStatuses(executionId).then(() => {
      set((state) => {
        const newMap = new Map(state.activeNodeExecutions);
        newMap.delete(nodeId);
        return { activeNodeExecutions: newMap };
      });
    });
  };

  return eventSource;
}
