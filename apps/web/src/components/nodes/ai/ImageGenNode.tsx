'use client';

import type { ImageGenNodeData, ImageModel } from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { AlertCircle, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { memo, useCallback, useMemo, useState } from 'react';
import { ModelBrowserModal } from '@/components/models/ModelBrowserModal';
import { BaseNode } from '@/components/nodes/BaseNode';
import { SchemaInputs } from '@/components/nodes/SchemaInputs';
import { Button } from '@/components/ui/button';
import { useModelSelection } from '@/hooks/useModelSelection';
import { useRequiredInputs } from '@/hooks/useRequiredInputs';
import { extractEnumValues, supportsImageInput } from '@/lib/utils/schemaUtils';
import { useExecutionStore } from '@/store/executionStore';
import { useWorkflowStore } from '@/store/workflowStore';

const MODELS: { value: ImageModel; label: string }[] = [
  { value: 'nano-banana', label: 'Nano Banana' },
  { value: 'nano-banana-pro', label: 'Nano Banana Pro' },
];

const IMAGE_MODEL_MAP: Record<string, ImageModel> = {
  'google/nano-banana': 'nano-banana',
  'google/nano-banana-pro': 'nano-banana-pro',
};

function ImageGenNodeComponent(props: NodeProps) {
  const { id, type, data } = props;
  const nodeData = data as ImageGenNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const executeNode = useExecutionStore((state) => state.executeNode);
  const { hasRequiredInputs } = useRequiredInputs(id, type as 'imageGen');

  const [isModelBrowserOpen, setIsModelBrowserOpen] = useState(false);

  // Use shared hook for model selection
  const { handleModelSelect } = useModelSelection<ImageModel, ImageGenNodeData>({
    nodeId: id,
    modelMap: IMAGE_MODEL_MAP,
    fallbackModel: 'nano-banana-pro',
  });

  // Get schema properties from selected model
  const schemaProperties = useMemo(() => {
    const schema = nodeData.selectedModel?.inputSchema as
      | {
          properties?: Record<string, unknown>;
        }
      | undefined;
    return schema?.properties as Record<string, unknown> | undefined;
  }, [nodeData.selectedModel?.inputSchema]);

  // Extract enum values from component schemas for SchemaInputs
  const enumValues = useMemo(
    () =>
      extractEnumValues(
        nodeData.selectedModel?.componentSchemas as
          | Record<string, { enum?: unknown[]; type?: string }>
          | undefined
      ),
    [nodeData.selectedModel?.componentSchemas]
  );

  // Check if model supports image input
  const modelSupportsImageInput = useMemo(
    () => supportsImageInput(nodeData.selectedModel?.inputSchema),
    [nodeData.selectedModel?.inputSchema]
  );

  const handleSchemaParamChange = useCallback(
    (key: string, value: unknown) => {
      // Get fresh state to avoid stale closure issues with rapid changes
      const currentNode = useWorkflowStore.getState().getNodeById(id);
      const currentData = currentNode?.data as ImageGenNodeData | undefined;
      updateNodeData<ImageGenNodeData>(id, {
        schemaParams: {
          ...(currentData?.schemaParams ?? {}),
          [key]: value,
        },
      });
    },
    [id, updateNodeData]
  );

  const handleGenerate = useCallback(() => {
    executeNode(id);
  }, [id, executeNode]);

  const modelDisplayName =
    nodeData.selectedModel?.displayName ||
    MODELS.find((m) => m.value === nodeData.model)?.label ||
    nodeData.model;

  const headerActions = useMemo(
    () => (
      <>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsModelBrowserOpen(true)}
          className="h-5 px-2 text-[10px]"
        >
          Browse
        </Button>
        {nodeData.outputImage && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleGenerate}
            disabled={nodeData.status === 'processing'}
            className="h-5 w-5"
            title="Regenerate"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </>
    ),
    [nodeData.outputImage, nodeData.status, handleGenerate]
  );

  return (
    <BaseNode
      {...props}
      title={modelDisplayName}
      headerActions={headerActions}
      disabledInputs={modelSupportsImageInput ? undefined : ['images']}
    >
      <div className="flex-1 flex flex-col gap-3 min-h-0">
        {/* Dynamic Schema Inputs */}
        {schemaProperties && (
          <SchemaInputs
            schema={schemaProperties}
            values={nodeData.schemaParams ?? {}}
            onChange={handleSchemaParamChange}
            enumValues={enumValues}
            componentSchemas={
              nodeData.selectedModel?.componentSchemas as
                | Record<string, { enum?: unknown[]; type?: string }>
                | undefined
            }
          />
        )}

        {/* Hint when model doesn't support image input */}
        {!modelSupportsImageInput && nodeData.inputImages.length > 0 && (
          <div className="text-xs text-amber-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            This model doesn&apos;t use image inputs
          </div>
        )}

        {/* Output Preview */}
        {nodeData.outputImage && (
          <div className="relative aspect-[4/3] w-full mt-1 overflow-hidden rounded-md bg-black/20">
            <Image
              src={nodeData.outputImage}
              alt="Generated image"
              fill
              sizes="300px"
              className="object-contain cursor-pointer"
              unoptimized
            />
            {/* Processing overlay spinner */}
            {nodeData.status === 'processing' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-xs text-white/80">Generating...</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Generate Button (when no output) */}
        {!nodeData.outputImage && nodeData.status !== 'processing' && (
          <button
            onClick={handleGenerate}
            disabled={!hasRequiredInputs}
            className="mt-1 w-full py-2 rounded-md text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            style={{ backgroundColor: 'var(--node-color)', color: 'var(--background)' }}
          >
            <Sparkles className="h-4 w-4" />
            Generate Image
          </button>
        )}

        {/* Help text for required inputs */}
        {!hasRequiredInputs && nodeData.status !== 'processing' && (
          <div className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Connect a prompt to generate
          </div>
        )}
      </div>

      {/* Model Browser Modal */}
      <ModelBrowserModal
        isOpen={isModelBrowserOpen}
        onClose={() => setIsModelBrowserOpen(false)}
        onSelect={handleModelSelect}
        capabilities={['text-to-image', 'image-to-image']}
        title="Select Image Model"
      />
    </BaseNode>
  );
}

export const ImageGenNode = memo(ImageGenNodeComponent);
