import type { NodeType } from '@genfeedai/types';
import { useEffect } from 'react';
import type { NodeGroup } from '@/types/groups';
import { useWorkflowStore } from '@/store/workflowStore';

interface UseCanvasKeyboardShortcutsParams {
  selectedNodeIds: string[];
  groups: NodeGroup[];
  toggleNodeLock: (nodeId: string) => void;
  createGroup: (nodeIds: string[]) => string;
  deleteGroup: (groupId: string) => void;
  unlockAllNodes: () => void;
  addNode: (type: NodeType, position: { x: number; y: number }) => string;
  togglePalette: () => void;
}

/**
 * Hook that handles keyboard shortcuts for the workflow canvas
 *
 * Shortcuts:
 * - M: Toggle sidebar/palette
 * - L: Toggle lock on selected nodes
 * - Ctrl/Cmd+G: Create group from selection
 * - Ctrl/Cmd+Shift+G: Ungroup selected nodes
 * - Ctrl/Cmd+Shift+L: Unlock all nodes
 * - Shift+I: Add image generator node
 * - Shift+V: Add video generator node
 * - Shift+P: Add prompt node
 * - Shift+L: Add LLM node
 * - Ctrl/Cmd+Z: Undo
 * - Ctrl/Cmd+Shift+Z: Redo
 */
export function useCanvasKeyboardShortcuts({
  selectedNodeIds,
  groups,
  toggleNodeLock,
  createGroup,
  deleteGroup,
  unlockAllNodes,
  addNode,
  togglePalette,
}: UseCanvasKeyboardShortcutsParams) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isMod = e.ctrlKey || e.metaKey;

      // M - Toggle sidebar (Todoist style)
      if (e.key === 'm' && !isMod && !e.shiftKey) {
        e.preventDefault();
        togglePalette();
      }

      // L - Toggle lock on selected nodes
      if (e.key === 'l' && !isMod && !e.shiftKey) {
        e.preventDefault();
        for (const nodeId of selectedNodeIds) {
          toggleNodeLock(nodeId);
        }
      }

      // Ctrl+G - Create group from selected nodes
      if (e.key === 'g' && isMod && !e.shiftKey) {
        e.preventDefault();
        if (selectedNodeIds.length > 1) {
          createGroup(selectedNodeIds);
        }
      }

      // Ctrl+Shift+G - Ungroup (delete group containing selected nodes)
      if (e.key === 'g' && isMod && e.shiftKey) {
        e.preventDefault();
        for (const nodeId of selectedNodeIds) {
          const group = groups.find((g) => g.nodeIds.includes(nodeId));
          if (group) {
            deleteGroup(group.id);
            break;
          }
        }
      }

      // Ctrl+Shift+L - Unlock all nodes
      if (e.key === 'l' && isMod && e.shiftKey) {
        e.preventDefault();
        unlockAllNodes();
      }

      // Shift+I - Add image generator node at viewport center
      if (e.key === 'I' && e.shiftKey && !isMod) {
        e.preventDefault();
        const position = { x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 150 };
        addNode('imageGen', position);
      }

      // Shift+V - Add video generator node at viewport center
      if (e.key === 'V' && e.shiftKey && !isMod) {
        e.preventDefault();
        const position = { x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 150 };
        addNode('videoGen', position);
      }

      // Shift+P - Add prompt node at viewport center
      if (e.key === 'P' && e.shiftKey && !isMod) {
        e.preventDefault();
        const position = { x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 150 };
        addNode('prompt', position);
      }

      // Shift+L - Add LLM node at viewport center
      if ((e.key === 'L' || e.key === 'l') && e.shiftKey && !isMod) {
        e.preventDefault();
        const position = { x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 150 };
        addNode('llm', position);
      }

      // Cmd/Ctrl+Z - Undo
      if (e.key === 'z' && isMod && !e.shiftKey) {
        e.preventDefault();
        useWorkflowStore.temporal.getState().undo();
      }

      // Cmd/Ctrl+Shift+Z - Redo
      if (e.key === 'z' && isMod && e.shiftKey) {
        e.preventDefault();
        useWorkflowStore.temporal.getState().redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedNodeIds,
    toggleNodeLock,
    createGroup,
    deleteGroup,
    unlockAllNodes,
    groups,
    addNode,
    togglePalette,
  ]);
}
