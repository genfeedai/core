import { create } from 'zustand';
import { createEdgeSlice } from './slices/edgeSlice';
import { createGroupSlice } from './slices/groupSlice';
import { createLockingSlice } from './slices/lockingSlice';
import { createNodeSlice } from './slices/nodeSlice';
import { createPersistenceSlice } from './slices/persistenceSlice';
import { createSelectionSlice } from './slices/selectionSlice';
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
 */
export const useWorkflowStore = create<WorkflowStore>()((...args) => ({
  // Initial state
  nodes: [],
  edges: [],
  edgeStyle: 'bezier',
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
}));
