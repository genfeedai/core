import type { NodeType } from '@genfeedai/types';
import { useMemo } from 'react';
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
      // getConnectedInputs returns a Map of handleId -> value
      // If a connection exists but value is null/undefined/empty, it means the source node has no data
      // We can't directly know which connections are required here, but we can check if
      // any connections that exist have empty data

      // A more robust check: if hasRequiredInputs is true, it means edges exist
      // But we also need to verify those connected source nodes have output data
      // The getConnectedInputs function only returns values for connections that have data
      // So if connectedInputs is empty but hasRequiredInputs is true, data is missing

      // Actually, we need to compare what's connected vs what has data
      // For simplicity, we'll check if any required input handle has no data
      // by looking at the store edges directly

      const { edges } = useWorkflowStore.getState();
      const incomingEdges = edges.filter((e) => e.target === nodeId);

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
  }, [nodeId, hasRequiredInputs, missingInputs, inputSchema, schemaParams, getConnectedInputs]);
}
