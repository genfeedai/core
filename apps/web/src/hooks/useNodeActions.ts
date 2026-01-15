import type { WorkflowNode } from '@genfeedai/types';
import { useCallback, useState } from 'react';
import { useWorkflowStore } from '@/store/workflowStore';

interface ClipboardData {
  nodes: WorkflowNode[];
  isCut: boolean;
}

export function useNodeActions() {
  const { nodes, removeNode, duplicateNode } = useWorkflowStore();
  const [clipboard, setClipboard] = useState<ClipboardData | null>(null);

  const deleteNode = useCallback(
    (nodeId: string) => {
      removeNode(nodeId);
    },
    [removeNode]
  );

  const duplicate = useCallback(
    (nodeId: string) => {
      return duplicateNode(nodeId);
    },
    [duplicateNode]
  );

  const copyNode = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        setClipboard({ nodes: [node], isCut: false });
      }
    },
    [nodes]
  );

  const cutNode = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        setClipboard({ nodes: [node], isCut: true });
        removeNode(nodeId);
      }
    },
    [nodes, removeNode]
  );

  const deleteMultipleNodes = useCallback(
    (nodeIds: string[]) => {
      for (const nodeId of nodeIds) {
        removeNode(nodeId);
      }
    },
    [removeNode]
  );

  const duplicateMultipleNodes = useCallback(
    (nodeIds: string[]) => {
      const newIds: string[] = [];
      for (const nodeId of nodeIds) {
        const newId = duplicateNode(nodeId);
        if (newId) {
          newIds.push(newId);
        }
      }
      return newIds;
    },
    [duplicateNode]
  );

  return {
    clipboard,
    deleteNode,
    duplicate,
    copyNode,
    cutNode,
    deleteMultipleNodes,
    duplicateMultipleNodes,
  };
}
