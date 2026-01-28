import type { NodeStatus, ValidationResult } from '@genfeedai/types';

// =============================================================================
// JOB TYPES
// =============================================================================

export interface Job {
  nodeId: string;
  predictionId: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  progress: number;
  output: unknown | null;
  error: string | null;
  createdAt: string;
}

export interface NodeResult {
  nodeId: string;
  status: string;
  output?: Record<string, unknown>;
  error?: string;
  cost?: number;
}

export interface ExecutionData {
  _id: string;
  workflowId: string;
  status: string;
  nodeResults: NodeResult[];
  jobs?: Array<{
    nodeId: string;
    predictionId: string;
    status: string;
    output?: Record<string, unknown>;
    error?: string;
  }>;
}

// =============================================================================
// STORE TYPES
// =============================================================================

export interface ExecutionState {
  isRunning: boolean;
  executionId: string | null;
  currentNodeId: string | null;
  validationErrors: ValidationResult | null;
  eventSource: EventSource | null;
  lastFailedNodeId: string | null;
  jobs: Map<string, Job>;
  estimatedCost: number;
  actualCost: number;
}

export interface ExecutionActions {
  executeWorkflow: () => Promise<void>;
  executeSelectedNodes: () => Promise<void>;
  executeNode: (nodeId: string) => Promise<void>;
  resumeFromFailed: () => Promise<void>;
  stopExecution: () => void;
  clearValidationErrors: () => void;
}

export interface JobActions {
  addJob: (nodeId: string, predictionId: string) => void;
  updateJob: (predictionId: string, updates: Partial<Job>) => void;
  getJobByNodeId: (nodeId: string) => Job | undefined;
}

export interface HelperActions {
  resetExecution: () => void;
  canResumeFromFailed: () => boolean;
  setEstimatedCost: (cost: number) => void;
}

export interface ExecutionStore
  extends ExecutionState,
    ExecutionActions,
    JobActions,
    HelperActions {}

// =============================================================================
// STATUS MAPPING
// =============================================================================

export const STATUS_MAP: Record<string, NodeStatus> = {
  pending: 'idle',
  processing: 'processing',
  complete: 'complete',
  error: 'error',
};
