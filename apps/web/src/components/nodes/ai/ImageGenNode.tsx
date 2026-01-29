'use client';

import type { ImageGenNodeData, ImageModel } from '@genfeedai/types';
import { NODE_STATUS } from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import {
  AlertCircle,
  Download,
  Expand,
  ImageIcon,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
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

const MODELS: { value: ImageModel; label: string }[] = [
  { value: 'nano-banana', label: 'Nano Banana' },
  { value: 'nano-banana-pro', label: 'Nano Banana Pro' },
];

const IMAGE_MODEL_MAP: Record<string, ImageModel> = {
  'google/nano-banana': 'nano-banana',
  'google/nano-banana-pro': 'nano-banana-pro',
};

// Reverse map: internal model type -> API model ID
const INTERNAL_TO_MODEL_ID: Record<ImageModel, string> = {
  'nano-banana': 'google/nano-banana',
  'nano-banana-pro': 'google/nano-banana-pro',
};

function ImageGenNodeComponent(props: NodeProps) {
  const { id, type, data } = props;
  const nodeData = data as ImageGenNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const executeNode = useExecutionStore((state) => state.executeNode);
  const openNodeDetailModal = useUIStore((state) => state.openNodeDetailModal);
  const { hasRequiredInputs } = useRequiredInputs(id, type as 'imageGen');

  const [isModelBrowserOpen, setIsModelBrowserOpen] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<number | null>(null);

  // Download handlers for multi-image gallery
  const handleDownload = useCallback(
    (index: number) => {
      const images = nodeData.outputImages ?? [];
      const image = images[index];
      if (!image) return;

      const link = document.createElement('a');
      link.href = image;
      link.download = `generated_${index + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [nodeData.outputImages]
  );

  const handleDownloadAll = useCallback(() => {
    const images = nodeData.outputImages ?? [];
    images.forEach((_, index) => {
      setTimeout(() => handleDownload(index), index * 100);
    });
  }, [nodeData.outputImages, handleDownload]);

  // Use shared hook for model selection
  const { handleModelSelect } = useModelSelection<ImageModel, ImageGenNodeData>({
    nodeId: id,
    modelMap: IMAGE_MODEL_MAP,
    fallbackModel: 'nano-banana-pro',
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
        {nodeData.outputImage && (
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
    [nodeData.outputImage, nodeData.status, handleGenerate, handleExpand]
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

        {/* Output Preview - Multi-image gallery or single image */}
        {(nodeData.outputImages?.length ?? 0) > 1 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Generated ({nodeData.outputImages.length} images)
              </span>
              <button
                onClick={handleDownloadAll}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                Download All
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {nodeData.outputImages.map((img, i) => (
                <div
                  key={i}
                  className="relative group aspect-square rounded overflow-hidden border border-border cursor-pointer"
                  onClick={() => setSelectedPreview(selectedPreview === i ? null : i)}
                >
                  <Image
                    src={img}
                    alt={`Generated ${i + 1}`}
                    fill
                    sizes="150px"
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(i);
                      }}
                      className="p-1 bg-white/20 rounded hover:bg-white/30"
                    >
                      <Download className="w-3 h-3 text-white" />
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] text-center py-0.5">
                    {i + 1}
                  </div>
                </div>
              ))}
            </div>
            {/* Enlarged preview */}
            {selectedPreview !== null && nodeData.outputImages[selectedPreview] && (
              <div className="relative aspect-[4/3] rounded overflow-hidden">
                <Image
                  src={nodeData.outputImages[selectedPreview]}
                  alt={`Preview ${selectedPreview + 1}`}
                  fill
                  sizes="300px"
                  className="object-contain"
                  unoptimized
                />
                <button
                  onClick={() => setSelectedPreview(null)}
                  className="absolute top-1 right-1 p-1 bg-black/50 rounded text-white text-xs"
                >
                  ×
                </button>
              </div>
            )}
            {/* Processing overlay */}
            {nodeData.status === 'processing' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-md">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-xs text-white/80">Generating...</span>
                </div>
              </div>
            )}
          </div>
        ) : nodeData.outputImage ? (
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-black/20">
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
        ) : (
          <div className="relative flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border/50 bg-secondary/20">
            <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
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

        {/* Generate Button (when no output) */}
        {!nodeData.outputImage && !(nodeData.outputImages?.length > 0) && (
          <button
            onClick={handleGenerate}
            disabled={!hasRequiredInputs || nodeData.status === 'processing'}
            className="w-full py-2 rounded-md text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            style={{ backgroundColor: 'var(--node-color)', color: 'var(--background)' }}
          >
            {nodeData.status === 'processing' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {nodeData.status === 'processing' ? 'Generating...' : 'Generate Image'}
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
