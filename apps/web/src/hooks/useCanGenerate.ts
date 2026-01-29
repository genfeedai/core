import type { NodeType, WorkflowEdge, WorkflowNode } from '@genfeedai/types';
import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { CONNECTION_FIELDS, validateRequiredSchemaFields } from '@/lib/utils/schemaValidation';
import { useWorkflowStore } from '@/store/workflowStore';
import { useRequiredInputs } from './useRequiredInputs';

interface MissingItem {
  type: 'connection' | 'data' | 'schema';
  field: string;
  message: string;
}

interface CanGenerateResult {
  /** Whether all validation passes and generation can proceed */
  canGenerate: boolean;
  /** List of missing items with details */
  missingItems: MissingItem[];
  /** Whether all required connections exist */
  hasRequiredConnections: boolean;
  /** Whether all connected nodes have actual data */
  hasConnectedData: boolean;
  /** Whether all required schema fields are filled */
  hasRequiredSchemaFields: boolean;
}

interface UseCanGenerateOptions {
  /** The node ID to validate */
  nodeId: string;
  /** The node type (to look up required inputs from NODE_DEFINITIONS) */
  nodeType: NodeType;
  /** The model's input schema with required array */
  inputSchema?: Record<string, unknown>;
  /** Current schema parameter values */
  schemaParams?: Record<string, unknown>;
}

/**
 * Extract output value from a node based on handle type.
 */
function extractOutputValue(
  node: WorkflowNode,
  handleType: string | null | undefined
): string | undefined {
  const data = node.data as Record<string, unknown>;
  if (handleType === 'text') {
    return (data.outputText ?? data.prompt) as string | undefined;
  } else if (handleType === 'image') {
    return (data.outputImage ?? data.image) as string | undefined;
  } else if (handleType === 'video') {
    return data.outputVideo as string | undefined;
  } else if (handleType === 'audio') {
    return (data.outputAudio ?? data.audio) as string | undefined;
  }
  return undefined;
}

/**
 * Hook that performs comprehensive validation for the Generate button.
 *
 * Validates:
 * 1. Required connections exist (from NODE_DEFINITIONS)
 * 2. Connected nodes have actual data values (not just edges)
 * 3. Required schema fields from model inputSchema are filled
 *
 * @returns Object with canGenerate boolean and detailed breakdown
 */
export function useCanGenerate({
  nodeId,
  nodeType,
  inputSchema,
  schemaParams,
}: UseCanGenerateOptions): CanGenerateResult {
  const { hasRequiredInputs, missingInputs } = useRequiredInputs(nodeId, nodeType);
  const getConnectedInputs = useWorkflowStore((state) => state.getConnectedInputs);

  // Optimized selector: only get edges targeting this node
  // Uses useShallow to prevent re-renders when unrelated edges change
  const incomingEdgesSelector = useCallback(
    (state: { edges: WorkflowEdge[] }) => state.edges.filter((e) => e.target === nodeId),
    [nodeId]
  );
  const incomingEdges = useWorkflowStore(useShallow(incomingEdgesSelector));

  // Optimized selector: only get source nodes connected to this node
  // Returns a stable object with just the output data we need
  const connectedOutputsSelector = useCallback(
    (state: { nodes: WorkflowNode[] }) => {
      const outputs: Record<string, string | undefined> = {};
      for (const edge of incomingEdges) {
        const sourceNode = state.nodes.find((n) => n.id === edge.source);
        if (sourceNode) {
          outputs[edge.source] = extractOutputValue(sourceNode, edge.sourceHandle);
        }
      }
      return outputs;
    },
    [incomingEdges]
  );
  const _connectedNodeData = useWorkflowStore(useShallow(connectedOutputsSelector));

  return useMemo(() => {
    const missingItems: MissingItem[] = [];

    // 1. Check required connections exist
    for (const inputId of missingInputs) {
      missingItems.push({
        type: 'connection',
        field: inputId,
        message: `Missing connection: ${inputId}`,
      });
    }

    // 2. Check connected nodes have actual data
    const connectedInputs = getConnectedInputs(nodeId);
    let hasConnectedData = true;

    // If we have required connections but they don't have data, that's a problem
    // We need to check if any handle that IS connected has empty data
    if (hasRequiredInputs) {
      for (const edge of incomingEdges) {
        const handleId = edge.targetHandle;
        if (!handleId) continue;

        // Check if this connected input has data
        if (!connectedInputs.has(handleId)) {
          hasConnectedData = false;
          missingItems.push({
            type: 'data',
            field: handleId,
            message: `Connected ${handleId} has no data`,
          });
        }
      }
    }

    // 3. Validate required schema fields
    const schemaValidation = validateRequiredSchemaFields(
      inputSchema,
      schemaParams ?? {},
      CONNECTION_FIELDS
    );

    for (const field of schemaValidation.missingFields) {
      missingItems.push({
        type: 'schema',
        field,
        message: `Required field: ${field}`,
      });
    }

    const canGenerate = hasRequiredInputs && hasConnectedData && schemaValidation.isValid;

    return {
      canGenerate,
      missingItems,
      hasRequiredConnections: hasRequiredInputs,
      hasConnectedData,
      hasRequiredSchemaFields: schemaValidation.isValid,
    };
  }, [
    nodeId,
    hasRequiredInputs,
    missingInputs,
    inputSchema,
    schemaParams,
    getConnectedInputs,
    incomingEdges,
  ]);
}
