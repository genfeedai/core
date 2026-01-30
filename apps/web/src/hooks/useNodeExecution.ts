import { NODE_STATUS } from '@genfeedai/types';
import { useCallback } from 'react';
import { useExecutionStore } from '@/store/executionStore';
import { useWorkflowStore } from '@/store/workflowStore';

/**
 * Hook for triggering and stopping node execution
 *
 * Encapsulates the common pattern of:
 * 1. Setting node status to processing
 * 2. Triggering execution
 * 3. Stopping execution and resetting status
 *
 * @param nodeId - The ID of the node to execute
 * @returns handleGenerate - Callback to trigger node execution
 * @returns handleStop - Callback to stop node execution
 */
export function useNodeExecution(nodeId: string) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const executeNode = useExecutionStore((state) => state.executeNode);
  const stopExecution = useExecutionStore((state) => state.stopExecution);

  const handleGenerate = useCallback(() => {
    updateNodeData(nodeId, { status: NODE_STATUS.processing });
    executeNode(nodeId);
  }, [nodeId, executeNode, updateNodeData]);

  const handleStop = useCallback(() => {
    stopExecution();
    updateNodeData(nodeId, { status: NODE_STATUS.idle });
  }, [nodeId, stopExecution, updateNodeData]);

  return { handleGenerate, handleStop };
}
