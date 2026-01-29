import { NODE_STATUS } from '@genfeedai/types';
import { useCallback } from 'react';
import { useExecutionStore } from '@/store/executionStore';
import { useWorkflowStore } from '@/store/workflowStore';

/**
 * Hook for triggering node execution
 *
 * Encapsulates the common pattern of:
 * 1. Setting node status to processing
 * 2. Triggering execution
 *
 * @param nodeId - The ID of the node to execute
 * @returns handleGenerate - Callback to trigger node execution
 */
export function useNodeExecution(nodeId: string) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const executeNode = useExecutionStore((state) => state.executeNode);

  const handleGenerate = useCallback(() => {
    updateNodeData(nodeId, { status: NODE_STATUS.processing });
    executeNode(nodeId);
  }, [nodeId, executeNode, updateNodeData]);

  return { handleGenerate };
}
