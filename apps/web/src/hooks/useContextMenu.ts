import { useCallback, useMemo } from 'react';
import type { ContextMenuItemConfig } from '@/components/context-menu';
import {
  getEdgeMenuItems,
  getNodeMenuItems,
  getPaneMenuItems,
  getSelectionMenuItems,
} from '@/components/context-menu/menus';
import { useContextMenuStore } from '@/store/contextMenuStore';
import { useWorkflowStore } from '@/store/workflowStore';
import { useNodeActions } from './useNodeActions';
import { usePaneActions } from './usePaneActions';

export function useContextMenu() {
  const {
    isOpen,
    position,
    menuType,
    targetId,
    targetIds,
    openNodeMenu,
    openEdgeMenu,
    openPaneMenu,
    openSelectionMenu,
    close,
  } = useContextMenuStore();

  const { nodes, removeEdge, toggleNodeLock, createGroup } = useWorkflowStore();
  const {
    clipboard,
    deleteNode,
    duplicate,
    copyNode,
    cutNode,
    deleteMultipleNodes,
    duplicateMultipleNodes,
  } = useNodeActions();
  const { addNodeAtPosition, selectAll, fitView } = usePaneActions();

  const lockNode = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (node && !node.data.locked) {
        toggleNodeLock(nodeId);
      }
    },
    [nodes, toggleNodeLock]
  );

  const unlockNode = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (node?.data.locked) {
        toggleNodeLock(nodeId);
      }
    },
    [nodes, toggleNodeLock]
  );

  const groupNodes = useCallback(
    (nodeIds: string[]) => {
      if (nodeIds.length > 1) {
        createGroup(nodeIds);
      }
    },
    [createGroup]
  );

  const lockAllNodes = useCallback(
    (nodeIds: string[]) => {
      for (const nodeId of nodeIds) {
        const node = nodes.find((n) => n.id === nodeId);
        if (node && !node.data.locked) {
          toggleNodeLock(nodeId);
        }
      }
    },
    [nodes, toggleNodeLock]
  );

  const unlockAllNodes = useCallback(
    (nodeIds: string[]) => {
      for (const nodeId of nodeIds) {
        const node = nodes.find((n) => n.id === nodeId);
        if (node?.data.locked) {
          toggleNodeLock(nodeId);
        }
      }
    },
    [nodes, toggleNodeLock]
  );

  const alignNodesHorizontally = useCallback((_nodeIds: string[]) => {
    // TODO: Implement horizontal alignment
  }, []);

  const alignNodesVertically = useCallback((_nodeIds: string[]) => {
    // TODO: Implement vertical alignment
  }, []);

  const pasteNodes = useCallback(() => {
    // TODO: Implement paste from clipboard
  }, []);

  const getMenuItems = useCallback((): ContextMenuItemConfig[] => {
    if (!menuType) return [];

    switch (menuType) {
      case 'node': {
        if (!targetId) return [];
        const node = nodes.find((n) => n.id === targetId);
        const isLocked = Boolean(node?.data.locked);
        return getNodeMenuItems({
          nodeId: targetId,
          isLocked,
          onDuplicate: duplicate,
          onLock: lockNode,
          onUnlock: unlockNode,
          onCut: cutNode,
          onCopy: copyNode,
          onDelete: deleteNode,
        });
      }

      case 'edge':
        if (!targetId) return [];
        return getEdgeMenuItems({
          edgeId: targetId,
          onDelete: removeEdge,
        });

      case 'pane':
        return getPaneMenuItems({
          screenX: position.x,
          screenY: position.y,
          hasClipboard: !!clipboard,
          onAddNode: addNodeAtPosition,
          onPaste: pasteNodes,
          onSelectAll: selectAll,
          onFitView: fitView,
        });

      case 'selection':
        if (!targetIds || targetIds.length === 0) return [];
        return getSelectionMenuItems({
          nodeIds: targetIds,
          onGroup: groupNodes,
          onDuplicateAll: duplicateMultipleNodes,
          onLockAll: lockAllNodes,
          onUnlockAll: unlockAllNodes,
          onAlignHorizontal: alignNodesHorizontally,
          onAlignVertical: alignNodesVertically,
          onDeleteAll: deleteMultipleNodes,
        });

      default:
        return [];
    }
  }, [
    menuType,
    targetId,
    targetIds,
    nodes,
    position,
    clipboard,
    duplicate,
    lockNode,
    unlockNode,
    cutNode,
    copyNode,
    deleteNode,
    removeEdge,
    addNodeAtPosition,
    pasteNodes,
    selectAll,
    fitView,
    groupNodes,
    duplicateMultipleNodes,
    lockAllNodes,
    unlockAllNodes,
    alignNodesHorizontally,
    alignNodesVertically,
    deleteMultipleNodes,
  ]);

  const menuItems = useMemo(() => getMenuItems(), [getMenuItems]);

  return {
    isOpen,
    position,
    menuType,
    menuItems,
    openNodeMenu,
    openEdgeMenu,
    openPaneMenu,
    openSelectionMenu,
    close,
  };
}
