import type { WorkflowMetadata } from '@genfeedai/workflows';

/**
 * Workflow JSON file structure (matches @genfeedai/types WorkflowFile)
 */
export interface WorkflowFile {
  version: number;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  edgeStyle: string;
  groups?: unknown[];
  createdAt: string;
  updatedAt: string;
}

interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

/**
 * Validate workflow JSON structure
 */
export function validateWorkflow(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Workflow must be a valid JSON object'] };
  }

  const workflow = data as Record<string, unknown>;

  // Check required fields
  if (typeof workflow.name !== 'string') {
    errors.push('Missing or invalid "name" field');
  }

  if (typeof workflow.version !== 'number') {
    errors.push('Missing or invalid "version" field');
  }

  if (!Array.isArray(workflow.nodes)) {
    errors.push('Missing or invalid "nodes" array');
  } else {
    // Validate each node
    for (let i = 0; i < workflow.nodes.length; i++) {
      const node = workflow.nodes[i] as Record<string, unknown>;
      if (typeof node.id !== 'string') {
        errors.push(`Node ${i}: missing or invalid "id"`);
      }
      if (typeof node.type !== 'string') {
        errors.push(`Node ${i}: missing or invalid "type"`);
      }
      if (!node.position || typeof node.position !== 'object') {
        errors.push(`Node ${i}: missing or invalid "position"`);
      }
    }
  }

  if (!Array.isArray(workflow.edges)) {
    errors.push('Missing or invalid "edges" array');
  } else {
    // Validate each edge
    for (let i = 0; i < workflow.edges.length; i++) {
      const edge = workflow.edges[i] as Record<string, unknown>;
      if (typeof edge.id !== 'string') {
        errors.push(`Edge ${i}: missing or invalid "id"`);
      }
      if (typeof edge.source !== 'string') {
        errors.push(`Edge ${i}: missing or invalid "source"`);
      }
      if (typeof edge.target !== 'string') {
        errors.push(`Edge ${i}: missing or invalid "target"`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format workflow metadata for display
 */
export function formatWorkflowInfo(metadata: WorkflowMetadata): string[] {
  return [
    `Name: ${metadata.name}`,
    `ID: ${metadata.id}`,
    `Category: ${metadata.category}`,
    `Version: ${metadata.version}`,
    `Description: ${metadata.description}`,
    `Tags: ${metadata.tags.join(', ')}`,
  ];
}
