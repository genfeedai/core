import { NODE_STATUS } from '@genfeedai/types';
import { apiClient } from '@/lib/api/client';
import type { useWorkflowStore } from '@/store/workflowStore';
import type { Job, useExecutionStore } from '../executionStore';
import { getOutputUpdate } from './outputHelpers';

/**
 * Poll for prediction completion (used for individual node execution)
 */
export async function pollPrediction(
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
