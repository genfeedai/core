'use client';

import type { VideoGenNodeData, VideoModel } from '@genfeedai/types';
import { NODE_STATUS } from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { AlertCircle, Expand, ImageIcon, Loader2, Play, RefreshCw, Video } from 'lucide-react';
import Image from 'next/image';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ModelBrowserModal } from '@/components/models/ModelBrowserModal';
import { BaseNode } from '@/components/nodes/BaseNode';
import { SchemaInputs } from '@/components/nodes/SchemaInputs';
import { Button } from '@/components/ui/button';
import { useModelSelection } from '@/hooks/useModelSelection';
import { useRequiredInputs } from '@/hooks/useRequiredInputs';
import { extractEnumValues, supportsImageInput } from '@/lib/utils/schemaUtils';
import { useExecutionStore } from '@/store/executionStore';
import { useUIStore } from '@/store/uiStore';
import { useWorkflowStore } from '@/store/workflowStore';

const MODELS: { value: VideoModel; label: string; description: string }[] = [
  { value: 'veo-3.1-fast', label: 'Veo 3.1 Fast', description: 'Fast' },
  { value: 'veo-3.1', label: 'Veo 3.1', description: 'High quality' },
];

const VIDEO_MODEL_MAP: Record<string, VideoModel> = {
  'google/veo-3.1-fast': 'veo-3.1-fast',
  'google/veo-3.1': 'veo-3.1',
};

// Reverse map: internal model type -> API model ID
const INTERNAL_TO_MODEL_ID: Record<VideoModel, string> = {
  'veo-3.1-fast': 'google/veo-3.1-fast',
  'veo-3.1': 'google/veo-3.1',
};

function VideoGenNodeComponent(props: NodeProps) {
  const { id, type, data } = props;
  const nodeData = data as VideoGenNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const executeNode = useExecutionStore((state) => state.executeNode);
  const openNodeDetailModal = useUIStore((state) => state.openNodeDetailModal);
  const { hasRequiredInputs } = useRequiredInputs(id, type as 'videoGen');

  const [isModelBrowserOpen, setIsModelBrowserOpen] = useState(false);

  // Use shared hook for model selection
  const { handleModelSelect } = useModelSelection<VideoModel, VideoGenNodeData>({
    nodeId: id,
    modelMap: VIDEO_MODEL_MAP,
    fallbackModel: 'veo-3.1-fast',
  });

  // Track if we've already attempted to load the default model schema
  const hasAttemptedSchemaLoad = useRef(false);

  // Auto-load schema for default model if selectedModel is not set
  useEffect(() => {
    // Only run once per node, and only if we have a model but no selectedModel
    if (hasAttemptedSchemaLoad.current || nodeData.selectedModel || !nodeData.model) {
      return;
    }

    hasAttemptedSchemaLoad.current = true;

    const modelId = INTERNAL_TO_MODEL_ID[nodeData.model];
    if (!modelId) return;

    const controller = new AbortController();

    const loadSchema = async () => {
      try {
        const response = await fetch(`/api/providers/models?query=${encodeURIComponent(modelId)}`, {
          signal: controller.signal,
        });

        if (!response.ok) return;

        const data = await response.json();
        const model = data.models?.find((m: { id: string }) => m.id === modelId);

        if (model) {
          handleModelSelect(model);
        }
      } catch {
        // Ignore abort errors and other failures
      }
    };

    loadSchema();

    return () => controller.abort();
  }, [nodeData.model, nodeData.selectedModel, handleModelSelect]);

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
    updateNodeData(id, { status: NODE_STATUS.processing });
    executeNode(id);
  }, [id, executeNode, updateNodeData]);

  const handleExpand = useCallback(() => {
    openNodeDetailModal(id, 'preview');
  }, [id, openNodeDetailModal]);

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
        {nodeData.outputVideo && (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleExpand}
              className="h-5 w-5"
              title="Expand preview"
            >
              <Expand className="h-3 w-3" />
            </Button>
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
          </>
        )}
      </>
    ),
    [nodeData.outputVideo, nodeData.status, handleGenerate, handleExpand]
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
                </div>
              </div>
            )}
          </div>
        )}

        {/* Generate Button */}
        {!nodeData.outputVideo && (
          <button
            onClick={handleGenerate}
            disabled={!hasRequiredInputs || nodeData.status === 'processing'}
            className="w-full py-2 rounded-md text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            style={{ backgroundColor: 'var(--node-color)', color: 'var(--background)' }}
          >
            {nodeData.status === 'processing' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {nodeData.status === 'processing' ? 'Generating...' : 'Generate Video'}
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
