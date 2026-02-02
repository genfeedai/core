import type { SelectedModel, WorkflowNodeData } from '@genfeedai/types';
import type { SchemaInputs } from '@/components/nodes/SchemaInputs';
import { extractEnumValues, supportsImageInput } from '@/lib/utils/schemaUtils';
import { useWorkflowStore } from '@/store/workflowStore';
import { useCallback, useMemo } from 'react';

interface UseAIGenNodeOptions {
  nodeId: string;
  selectedModel: SelectedModel | undefined;
  schemaParams: Record<string, unknown> | undefined;
}

export function useAIGenNode<TNodeData extends WorkflowNodeData>({
  nodeId,
  selectedModel,
  schemaParams,
}: UseAIGenNodeOptions) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  const schemaProperties = useMemo(() => {
    const schema = selectedModel?.inputSchema as
      | { properties?: Record<string, unknown> }
      | undefined;
    return schema?.properties as Parameters<typeof SchemaInputs>[0]['schema'];
  }, [selectedModel?.inputSchema]);

  const enumValues = useMemo(
    () =>
      extractEnumValues(
        selectedModel?.componentSchemas as
          | Record<string, { enum?: unknown[]; type?: string }>
          | undefined
      ),
    [selectedModel?.componentSchemas]
  );

  const modelSupportsImageInput = useMemo(
    () => supportsImageInput(selectedModel?.inputSchema),
    [selectedModel?.inputSchema]
  );

  const componentSchemas = selectedModel?.componentSchemas as
    | Record<string, { enum?: unknown[]; type?: string }>
    | undefined;

  const handleSchemaParamChange = useCallback(
    (key: string, value: unknown) => {
      // Get fresh state to avoid stale closure issues with rapid changes
      const currentNode = useWorkflowStore.getState().getNodeById(nodeId);
      const currentData = currentNode?.data as TNodeData | undefined;
      updateNodeData<TNodeData>(nodeId, {
        schemaParams: {
          ...(((currentData as Record<string, unknown> | undefined)?.schemaParams as
            | Record<string, unknown>
            | undefined) ?? {}),
          [key]: value,
        },
      } as Partial<TNodeData>);
    },
    [nodeId, updateNodeData]
  );

  return {
    schemaProperties,
    enumValues,
    modelSupportsImageInput,
    handleSchemaParamChange,
    componentSchemas,
  };
}
