import { temporal } from 'zundo';
import { create } from 'zustand';
import type { StateCreator } from 'zustand';
import { temporalStateEquals } from './helpers/equality';
import { createChatSlice } from './slices/chatSlice';
import { createEdgeSlice } from './slices/edgeSlice';
import { createGroupSlice } from './slices/groupSlice';
import { createLockingSlice } from './slices/lockingSlice';
import { createNodeSlice } from './slices/nodeSlice';
import { createPersistenceSlice } from './slices/persistenceSlice';
import { createSelectionSlice } from './slices/selectionSlice';
import { createSnapshotSlice } from './slices/snapshotSlice';
import type { WorkflowStore } from './types';

/**
 * Workflow Store
 *
 * Manages workflow state including nodes, edges, groups, and persistence.
 * Split into slices for maintainability:
 *
 * - nodeSlice: Node CRUD operations
 * - edgeSlice: Edge operations and React Flow handlers
 * - lockingSlice: Node locking functionality
 * - groupSlice: Node grouping operations
 * - selectionSlice: Multi-selection state
 * - persistenceSlice: Save/load, validation, and API operations
 *
 * Wrapped with zundo temporal middleware for undo/redo support.
 * Only tracks meaningful state (nodes, edges, groups) - not UI flags.
 */

// Slice composition requires type assertion because createSnapshotSlice and
// createChatSlice return types are lost through the `as unknown` casts needed
// to unify their signatures. The runtime correctly composes all slices.
const storeCreator = ((...args: Parameters<StateCreator<WorkflowStore>>) => ({
  // Initial state
  nodes: [],
  edges: [],
  edgeStyle: 'default',
  workflowName: 'Untitled Workflow',
  workflowId: null,
  isDirty: false,
  isSaving: false,
  isLoading: false,
  groups: [],
  selectedNodeIds: [],
  viewedCommentIds: new Set<string>(),
  navigationTargetId: null,

  // Compose slices
  ...createNodeSlice(...args),
  ...createEdgeSlice(...args),
  ...createLockingSlice(...args),
  ...createGroupSlice(...args),
  ...createSelectionSlice(...args),
  ...createPersistenceSlice(...args),
  ...(createSnapshotSlice as unknown as typeof createNodeSlice)(...args),
  ...(createChatSlice as unknown as typeof createNodeSlice)(...args),
})) as unknown as StateCreator<WorkflowStore, [['temporal', unknown]]>;

export const useWorkflowStore = create<WorkflowStore>()(
  temporal(storeCreator, {
    // Only track meaningful state (not UI flags like isDirty, isSaving, etc.)
    partialize: (state) => ({
      nodes: state.nodes,
      edges: state.edges,
      groups: state.groups,
    }),
    // Limit history to prevent memory issues
    limit: 50,
    // Optimized equality check using shallow comparison instead of JSON.stringify
    equality: temporalStateEquals,
  })
);
