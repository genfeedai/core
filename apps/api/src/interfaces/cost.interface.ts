/**
 * Cost types — defined locally because they are API-specific
 * and not exported by @genfeedai/types.
 */

/**
 * Per-node cost estimate used in workflow cost breakdowns
 */
export interface NodeCostEstimate {
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  model: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  duration?: number;
  withAudio?: boolean;
}

/**
 * Full workflow cost breakdown with itemised per-node estimates
 */
export interface CostBreakdown {
  breakdown: NodeCostEstimate[];
  total: number;
}

/**
 * Execution-level cost summary (estimated vs actual)
 */
export interface CostSummary {
  estimated: number;
  actual: number;
  variance: number;
}

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
  summary: CostSummary;
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
