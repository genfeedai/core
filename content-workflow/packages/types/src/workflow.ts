import type { WorkflowNode, WorkflowEdge, NodeType } from "./nodes";

export type EdgeStyle = "bezier" | "smoothstep" | "straight";

export interface WorkflowFile {
  version: number;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  edgeStyle: EdgeStyle;
  createdAt: string;
  updatedAt: string;
}

export interface ValidationError {
  nodeId: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface ExecutionResult {
  success: boolean;
  outputs: Map<string, unknown>;
  errors: Map<string, string>;
  duration: number;
}

export interface CostEstimate {
  model: string;
  count: number;
  unitCost: number;
  totalCost: number;
}

export interface WorkflowCostEstimate {
  items: CostEstimate[];
  totalCost: number;
}
