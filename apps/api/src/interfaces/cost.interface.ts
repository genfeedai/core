/**
 * Cost breakdown for a single item (node/prediction)
 */
export interface CostBreakdownItem {
  nodeId: string;
  nodeType: string;
  model: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  duration?: number;
  withAudio?: boolean;
}

/**
 * Cost estimate for a workflow before execution
 */
export interface CostEstimate {
  total: number;
  breakdown: CostBreakdownItem[];
}

/**
 * Cost summary stored on an execution
 */
export interface CostSummary {
  estimated: number;
  actual: number;
  variance: number; // Percentage: (actual - estimated) / estimated * 100
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
