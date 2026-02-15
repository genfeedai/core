import type { EdgeStyle, NodeGroup, WorkflowFile } from '@genfeedai/types';

/**
 * Workflow export format — structurally equivalent to WorkflowFile
 * but uses looser node/edge types for portable JSON export.
 */
export interface WorkflowExport {
  name: string;
  description: string;
  version: number;
  nodes: WorkflowExportNode[];
  edges: WorkflowExportEdge[];
  edgeStyle: EdgeStyle | string;
  groups?: NodeGroup[];
  createdAt?: string;
  updatedAt?: string;
  metadata?: {
    exportedAt?: string;
    exportedFrom?: string;
    originalId?: string;
  };
}

export interface WorkflowExportNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface WorkflowExportEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
}

// Current export format version
export const WORKFLOW_EXPORT_VERSION = 1;

/**
 * Compile-time check: every key of WorkflowFile (minus nodes/edges) must exist
 * on WorkflowExport. WorkflowExport intentionally widens some field types
 * (e.g. optional dates, `EdgeStyle | string`), so we verify key coverage
 * rather than strict assignability.
 */
type _WorkflowFileKeys = keyof Omit<WorkflowFile, 'nodes' | 'edges'>;
type _ExportKeys = keyof WorkflowExport;
type _AssertKeyCoverage = _WorkflowFileKeys extends _ExportKeys ? true : never;
const _: _AssertKeyCoverage = true;
