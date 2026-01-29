'use client';

import type { ProviderModel, VideoGenNodeData, VideoModel } from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { AlertCircle, ImageIcon, Loader2, Play, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { memo, useCallback, useMemo, useState } from 'react';
import { ModelBrowserModal } from '@/components/models/ModelBrowserModal';
import { BaseNode } from '@/components/nodes/BaseNode';
import { SchemaInputs } from '@/components/nodes/SchemaInputs';
import { Button } from '@/components/ui/button';
import { useRequiredInputs } from '@/hooks/useRequiredInputs';
import { useExecutionStore } from '@/store/executionStore';
import { useWorkflowStore } from '@/store/workflowStore';

const MODELS: { value: VideoModel; label: string; description: string }[] = [
  { value: 'veo-3.1-fast', label: 'Veo 3.1 Fast', description: 'Fast' },
  { value: 'veo-3.1', label: 'Veo 3.1', description: 'High quality' },
];

/**
 * Extract default values from schema properties
 */
function getSchemaDefaults(schema: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!schema) return {};

  const properties = (schema as { properties?: Record<string, { default?: unknown }> }).properties;
  if (!properties) return {};

  const defaults: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(properties)) {
    if (prop.default !== undefined) {
      defaults[key] = prop.default;
    }
  }
  return defaults;
}

/**
 * Check if the model's schema supports image/video input
 */
function supportsImageInput(schema: Record<string, unknown> | undefined): boolean {
  if (!schema) return true; // Default to true if no schema

  const properties = (schema as { properties?: Record<string, unknown> }).properties;
  if (!properties) return true;

  // Check for common image/video input field names
  return !!(
    properties.image ||
    properties.start_image ||
    properties.first_frame_image ||
    properties.reference_images
  );
}

function VideoGenNodeComponent(props: NodeProps) {
  const { id, type, data } = props;
  const nodeData = data as VideoGenNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const executeNode = useExecutionStore((state) => state.executeNode);
  const { hasRequiredInputs } = useRequiredInputs(id, type as 'videoGen');

  const [isModelBrowserOpen, setIsModelBrowserOpen] = useState(false);

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
  const enumValues = useMemo(() => {
    const componentSchemas = nodeData.selectedModel?.componentSchemas as
      | Record<string, { enum?: unknown[]; type?: string }>
      | undefined;
    if (!componentSchemas) return undefined;

    const result: Record<string, string[]> = {};
    for (const [key, schema] of Object.entries(componentSchemas)) {
      if (schema.enum && Array.isArray(schema.enum)) {
        // Convert all enum values to strings for the dropdown
        result[key] = schema.enum.map((v) => String(v));
      }
    }
    return Object.keys(result).length > 0 ? result : undefined;
  }, [nodeData.selectedModel?.componentSchemas]);

  // Check if model supports image input
  const modelSupportsImageInput = useMemo(
    () => supportsImageInput(nodeData.selectedModel?.inputSchema),
    [nodeData.selectedModel?.inputSchema]
  );

  const handleModelSelect = useCallback(
    (model: ProviderModel) => {
      // Map provider model to our internal model format
      const modelMap: Record<string, VideoModel> = {
        'google/veo-3.1-fast': 'veo-3.1-fast',
        'google/veo-3.1': 'veo-3.1',
      };

      const internalModel = modelMap[model.id] ?? ('veo-3.1-fast' as VideoModel);

      // Extract defaults from the new model's schema
      const schemaDefaults = getSchemaDefaults(model.inputSchema);

      updateNodeData<VideoGenNodeData>(id, {
        model: internalModel,
        provider: model.provider,
        selectedModel: {
          provider: model.provider,
          modelId: model.id,
          displayName: model.displayName,
          inputSchema: model.inputSchema,
          componentSchemas: model.componentSchemas,
        },
        // Initialize schemaParams with defaults from new model
        schemaParams: schemaDefaults,
      });
    },
    [id, updateNodeData]
  );

  const handleSchemaParamChange = useCallback(
    (key: string, value: unknown) => {
      // Get fresh state to avoid stale closure issues with rapid changes
      const currentNode = useWorkflowStore.getState().getNodeById(id);
      const currentData = currentNode?.data as VideoGenNodeData | undefined;
      updateNodeData<VideoGenNodeData>(id, {
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

  const headerActions = (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsModelBrowserOpen(true)}
        className="h-5 px-2 text-[10px]"
      >
        Browse
      </Button>
      {nodeData.outputVideo && (
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
  );

  // Determine which inputs to disable based on model support
  const disabledInputs = useMemo(() => {
    if (modelSupportsImageInput) return undefined;
    return ['image', 'lastFrame'];
  }, [modelSupportsImageInput]);

  return (
    <BaseNode
      {...props}
      title={modelDisplayName}
      headerActions={headerActions}
      disabledInputs={disabledInputs}
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
        {!modelSupportsImageInput && nodeData.inputImage && (
          <div className="text-xs text-amber-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            This model doesn&apos;t use image inputs
          </div>
        )}

        {/* Input Image Preview - shows connected image or empty dropzone */}
        {!nodeData.outputVideo && modelSupportsImageInput && (
          <div className="flex-1 min-h-[100px] rounded-md overflow-hidden bg-black/20">
            {nodeData.inputImage ? (
              <div className="relative w-full h-full min-h-[100px]">
                <Image
                  src={nodeData.inputImage}
                  alt="Input image"
                  fill
                  className="object-contain"
                  unoptimized
                />
                {nodeData.status === 'processing' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="text-xs text-white/80">Generating...</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-full min-h-[100px] w-full flex-col items-center justify-center gap-1 border border-dashed border-border/50 rounded-md">
                <ImageIcon className="h-6 w-6 text-muted-foreground/30" />
                <span className="text-[10px] text-muted-foreground/50">Connect start frame</span>
              </div>
            )}
          </div>
        )}

        {/* Output Preview */}
        {nodeData.outputVideo && (
          <div className="relative aspect-video w-full rounded overflow-hidden bg-black/20">
            <video
              src={nodeData.outputVideo}
              className="absolute inset-0 w-full h-full object-contain cursor-pointer"
              controls
            />
            {/* Processing overlay spinner */}
            {nodeData.status === 'processing' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-xs text-white/80">Generating...</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Generate Button */}
        {!nodeData.outputVideo && nodeData.status !== 'processing' && (
          <button
            onClick={handleGenerate}
            disabled={!hasRequiredInputs}
            className="w-full py-2 rounded-md text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            style={{ backgroundColor: 'var(--node-color)', color: 'var(--background)' }}
          >
            <Play className="w-4 h-4" />
            Generate Video
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
        capabilities={['text-to-video', 'image-to-video']}
        title="Select Video Model"
      />
    </BaseNode>
  );
}

export const VideoGenNode = memo(VideoGenNodeComponent);
