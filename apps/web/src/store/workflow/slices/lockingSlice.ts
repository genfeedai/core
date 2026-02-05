import type { StateCreator } from 'zustand';
import { getNodeOutput } from '../helpers/propagation';
import type { WorkflowStore } from '../types';

export interface LockingSlice {
  _setNodeLockState: (predicate: (nodeId: string) => boolean, lock: boolean) => void;
  toggleNodeLock: (nodeId: string) => void;
  lockNode: (nodeId: string) => void;
  unlockNode: (nodeId: string) => void;
  lockMultipleNodes: (nodeIds: string[]) => void;
  unlockMultipleNodes: (nodeIds: string[]) => void;
  unlockAllNodes: () => void;
  isNodeLocked: (nodeId: string) => boolean;
}

export const createLockingSlice: StateCreator<WorkflowStore, [], [], LockingSlice> = (
  set,
  get
) => ({
  _setNodeLockState: (predicate, lock) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        predicate(n.id)
          ? {
              ...n,
              draggable: !lock,
              data: {
                ...n.data,
                isLocked: lock,
                lockTimestamp: lock ? Date.now() : undefined,
                ...(lock && { cachedOutput: getNodeOutput(n) }),
              },
            }
          : n
      ),
      isDirty: true,
    }));
  },

  toggleNodeLock: (nodeId) => {
    const node = get().getNodeById(nodeId);
    if (!node) return;
    const shouldLock = !(node.data.isLocked ?? false);
    get()._setNodeLockState((id) => id === nodeId, shouldLock);
  },

  lockNode: (nodeId) => {
    const node = get().getNodeById(nodeId);
    if (!node || node.data.isLocked) return;
    get()._setNodeLockState((id) => id === nodeId, true);
  },

  unlockNode: (nodeId) => {
    get()._setNodeLockState((id) => id === nodeId, false);
  },

  lockMultipleNodes: (nodeIds) => {
    get()._setNodeLockState((id) => nodeIds.includes(id), true);
  },

  unlockMultipleNodes: (nodeIds) => {
    get()._setNodeLockState((id) => nodeIds.includes(id), false);
  },

  unlockAllNodes: () => {
    get()._setNodeLockState(() => true, false);
  },

  isNodeLocked: (nodeId) => {
    const { nodes, groups } = get();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return false;

    if (node.data.isLocked) return true;

    return groups.some((group) => group.isLocked && group.nodeIds.includes(nodeId));
  },
});
