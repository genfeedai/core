import type { StateCreator } from 'zustand';
import type { WorkflowStore } from '../types';

export interface SelectionSlice {
  setSelectedNodeIds: (nodeIds: string[]) => void;
  addToSelection: (nodeId: string) => void;
  removeFromSelection: (nodeId: string) => void;
  clearSelection: () => void;
}

export const createSelectionSlice: StateCreator<WorkflowStore, [], [], SelectionSlice> = (set) => ({
  setSelectedNodeIds: (nodeIds) => {
    set({ selectedNodeIds: nodeIds });
  },

  addToSelection: (nodeId) => {
    set((state) => ({
      selectedNodeIds: state.selectedNodeIds.includes(nodeId)
        ? state.selectedNodeIds
        : [...state.selectedNodeIds, nodeId],
    }));
  },

  removeFromSelection: (nodeId) => {
    set((state) => ({
      selectedNodeIds: state.selectedNodeIds.filter((id) => id !== nodeId),
    }));
  },

  clearSelection: () => {
    set({ selectedNodeIds: [] });
  },
});
