'use client';

import type { VideoGenNodeData, VideoModel } from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { AlertCircle, ChevronDown, Expand, Play, Square, Video } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { ModelBrowserModal } from '@/components/models/ModelBrowserModal';
import { BaseNode } from '@/components/nodes/BaseNode';
import { ProcessingOverlay } from '@/components/nodes/ProcessingOverlay';
import { SchemaInputs } from '@/components/nodes/SchemaInputs';
import { Button } from '@/components/ui/button';
import { useAIGenNode } from '@/hooks/useAIGenNode';
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
import { useUIStore } from '@/store/uiStore';

function VideoGenNodeComponent(props: NodeProps) {
  const { id, type, data } = props;
  const nodeData = data as VideoGenNodeData;
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

  // Shared schema/enum/image-support logic
  const {
    schemaProperties,
    enumValues,
    modelSupportsImageInput,
    handleSchemaParamChange,
    componentSchemas,
  } = useAIGenNode<VideoGenNodeData>({
    nodeId: id,
    selectedModel: nodeData.selectedModel,
    schemaParams: nodeData.schemaParams,
  });

  const handleExpand = useCallback(() => {
    openNodeDetailModal(id, 'preview');
  }, [id, openNodeDetailModal]);

  const modelDisplayName =
    nodeData.selectedModel?.displayName ||
    VIDEO_MODELS.find((m) => m.value === nodeData.model)?.label ||
    nodeData.model;

  const titleElement = useMemo(
    () => (
      <button
        className="flex flex-1 items-center gap-1 text-sm font-medium text-left text-foreground hover:text-foreground/80 cursor-pointer"
        onClick={() => setIsModelBrowserOpen(true)}
        title="Browse models"
      >
        <span className="truncate">{modelDisplayName}</span>
        <ChevronDown className="h-3 w-3 shrink-0" />
      </button>
    ),
    [modelDisplayName]
  );

  const headerActions = useMemo(
    () => (
      <>
        {nodeData.outputVideo && (
          <Button variant="ghost" size="icon-sm" onClick={handleExpand} title="Expand preview">
            <Expand className="h-3 w-3" />
          </Button>
        )}
        {nodeData.status === 'processing' ? (
          <Button variant="destructive" size="sm" onClick={handleStop}>
            <Square className="h-4 w-4 fill-current" />
            Generating
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
      titleElement={titleElement}
      headerActions={headerActions}
      hideStatusIndicator
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
            componentSchemas={componentSchemas}
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
            {nodeData.status === 'processing' && <ProcessingOverlay onStop={handleStop} />}
          </div>
        ) : (
          <div className="relative flex aspect-video w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border/50 bg-secondary/20">
            <Video className="h-6 w-6 text-muted-foreground/50" />
            {nodeData.status === 'processing' && <ProcessingOverlay onStop={handleStop} />}
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
