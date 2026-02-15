/**
 * Shared workflow graph types used across services and processors.
 *
 * Backend services use the base WorkflowNode/WorkflowEdge (no position, optional handles).
 * Frontend validation uses the full variants with position and required handles.
 * Export format uses WorkflowExportNode/WorkflowExportEdge (see workflow-export.interface.ts).
 */

/**
 * Minimal workflow node — used by backend services for execution, input resolution,
 * interface extraction, and orchestration.
 */
export interface WorkflowNode {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

/**
 * Minimal workflow edge — used by backend services for dependency resolution
 * and topological sorting.
 */
export interface WorkflowEdge {
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

/**
 * A complete workflow definition containing nodes and edges.
 * Used for input resolution and execution orchestration.
 */
export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}
