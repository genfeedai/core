import { create } from 'zustand';
import { createExecutionSlice } from './slices/executionSlice';
import { createJobSlice } from './slices/jobSlice';
import type { ExecutionStore } from './types';

/**
 * Execution Store
 *
 * Manages workflow execution state including jobs, validation, and SSE subscriptions.
 * Split into slices for maintainability:
 *
 * - executionSlice: Core execution operations (run, stop, resume)
 * - jobSlice: Job tracking and management
 */
export const useExecutionStore = create<ExecutionStore>()((...args) => ({
  // Initial state
  isRunning: false,
  executionId: null,
  currentNodeId: null,
  validationErrors: null,
  eventSource: null,
  lastFailedNodeId: null,
  jobs: new Map(),
  estimatedCost: 0,
  actualCost: 0,

  // Compose slices
  ...createJobSlice(...args),
  ...createExecutionSlice(...args),
}));

// Re-export types for convenience
export type { ExecutionStore, Job } from './types';
