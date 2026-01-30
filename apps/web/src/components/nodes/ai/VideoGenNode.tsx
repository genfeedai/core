'use client';

import type { VideoGenNodeData, VideoModel } from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { AlertCircle, Expand, Loader2, Play, Square, Video } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { ModelBrowserModal } from '@/components/models/ModelBrowserModal';
import { BaseNode } from '@/components/nodes/BaseNode';
import { SchemaInputs } from '@/components/nodes/SchemaInputs';
import { Button } from '@/components/ui/button';
import { useAutoLoadModelSchema } from '@/hooks/useAutoLoadModelSchema';
import { useCanGenerate } from '@/hooks/useCanGenerate';
import { useModelSelection } from '@/hooks/useModelSelection';
import { useNodeExecution } from '@/hooks/useNodeExecution';
import {
  DEFAULT_VIDEO_MODEL,
  VIDEO_MODEL_ID_MAP,
  VIDEO_MODEL_MAP,
  VIDEO_MODELS,
} from '@/lib/models/registry';
import { extractEnumValues, supportsImageInput } from '@/lib/utils/schemaUtils';
import { useUIStore } from '@/store/uiStore';
import { useWorkflowStore } from '@/store/workflowStore';

function VideoGenNodeComponent(props: NodeProps) {
  const { id, type, data } = props;
  const nodeData = data as VideoGenNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const openNodeDetailModal = useUIStore((state) => state.openNodeDetailModal);
  const { handleGenerate, handleStop } = useNodeExecution(id);
  const { canGenerate } = useCanGenerate({
    nodeId: id,
    nodeType: type as 'videoGen',
    inputSchema: nodeData.selectedModel?.inputSchema as Record<string, unknown> | undefined,
    schemaParams: nodeData.schemaParams,
  });

  const [isModelBrowserOpen, setIsModelBrowserOpen] = useState(false);

  // Use shared hook for model selection
  const { handleModelSelect } = useModelSelection<VideoModel, VideoGenNodeData>({
    nodeId: id,
    modelMap: VIDEO_MODEL_MAP,
    fallbackModel: DEFAULT_VIDEO_MODEL,
  });

  // Auto-load schema for default model if selectedModel is not set
  useAutoLoadModelSchema({
    currentModel: nodeData.model,
    selectedModel: nodeData.selectedModel,
    modelIdMap: VIDEO_MODEL_ID_MAP,
    onModelSelect: handleModelSelect,
  });

  // Get schema properties from selected model
  // Type assertion needed because inputSchema comes from API with unknown types
  const schemaProperties = useMemo(() => {
    const schema = nodeData.selectedModel?.inputSchema as
      | {
          properties?: Record<string, unknown>;
        }
      | undefined;
    return schema?.properties as Parameters<typeof SchemaInputs>[0]['schema'];
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

  const handleExpand = useCallback(() => {
    openNodeDetailModal(id, 'preview');
  }, [id, openNodeDetailModal]);

  const modelDisplayName =
    nodeData.selectedModel?.displayName ||
    VIDEO_MODELS.find((m) => m.value === nodeData.model)?.label ||
    nodeData.model;

  const headerActions = useMemo(
    () => (
      <>
        <Button variant="secondary" size="sm" onClick={() => setIsModelBrowserOpen(true)}>
          Browse
        </Button>
        {nodeData.outputVideo && (
          <Button variant="ghost" size="icon-sm" onClick={handleExpand} title="Expand preview">
            <Expand className="h-3 w-3" />
          </Button>
        )}
        {nodeData.status === 'processing' ? (
          <Button variant="destructive" size="sm" onClick={handleStop}>
            <Square className="h-4 w-4 fill-current" />
            Stop
          </Button>
        ) : (
          <Button
            variant={canGenerate ? 'default' : 'secondary'}
            size="sm"
            onClick={handleGenerate}
            disabled={!canGenerate}
          >
            <Play className="h-4 w-4 fill-current" />
            Generate
          </Button>
        )}
      </>
    ),
    [nodeData.outputVideo, nodeData.status, handleGenerate, handleStop, handleExpand, canGenerate]
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

        {/* Output Preview */}
        {nodeData.outputVideo ? (
          <div className="relative aspect-video w-full rounded-md overflow-hidden bg-black/20">
            <video
              src={nodeData.outputVideo}
              className="absolute inset-0 w-full h-full object-contain cursor-pointer"
              controls
            />
            {/* Processing overlay spinner */}
            {nodeData.status === 'processing' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-md">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-xs text-white/80">Generating...</span>
                  <Button variant="destructive" size="sm" onClick={handleStop}>
                    <Square className="h-3 w-3 fill-current" />
                    Stop
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="relative flex aspect-video w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border/50 bg-secondary/20">
            <Video className="h-6 w-6 text-muted-foreground/50" />
            {nodeData.status === 'processing' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-md">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-xs text-white/80">Generating...</span>
                  <Button variant="destructive" size="sm" onClick={handleStop}>
                    <Square className="h-3 w-3 fill-current" />
                    Stop
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Help text for required inputs */}
        {!canGenerate && nodeData.status !== 'processing' && (
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
