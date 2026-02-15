// Shared cost types — re-exported from @genfeedai/types
export type { CostBreakdown, CostSummary, NodeCostEstimate } from '@genfeedai/types';

/**
 * Job cost breakdown stored on a job document
 */
export interface JobCostBreakdown {
  model: string;
  resolution?: string;
  duration?: number;
  withAudio?: boolean;
  unitPrice: number;
  quantity: number;
}

/**
 * Cost details for a single job in an execution
 */
export interface JobCostDetail {
  nodeId: string;
  predictionId: string;
  cost: number;
  breakdown?: JobCostBreakdown;
  predictTime?: number;
}

/**
 * Full execution cost details returned by API
 */
export interface ExecutionCostDetails {
  summary: import('@genfeedai/types').CostSummary;
  jobs: JobCostDetail[];
}

/**
 * Workflow node data relevant for cost calculation
 */
export interface NodeDataForCost {
  model?: string;
  duration?: number;
  generateAudio?: boolean;
  resolution?: string;
  inputType?: 'image' | 'video';
  targetResolution?: string;
  targetFps?: number;
  upscaleFactor?: string;
}

/**
 * Workflow node structure for cost calculation
 */
export interface WorkflowNodeForCost {
  id: string;
  type: string;
  data: NodeDataForCost;
}
