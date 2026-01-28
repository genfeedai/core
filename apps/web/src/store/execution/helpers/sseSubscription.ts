import { NODE_STATUS } from '@genfeedai/types';
import type { StoreApi } from 'zustand';
import { logger } from '@/lib/logger';
import { useWorkflowStore } from '@/store/workflowStore';
import type { ExecutionData, ExecutionStore, Job } from '../types';
import { getOutputUpdate } from './outputHelpers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * Status map for converting execution statuses to node statuses
 */
const statusMap: Record<string, (typeof NODE_STATUS)[keyof typeof NODE_STATUS]> = {
  pending: NODE_STATUS.idle,
  processing: NODE_STATUS.processing,
  complete: NODE_STATUS.complete,
  error: NODE_STATUS.error,
};

/**
 * Create an SSE subscription for execution updates
 */
export function createExecutionSubscription(
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
        const nodeStatus = statusMap[nodeResult.status] ?? NODE_STATUS.idle;

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
