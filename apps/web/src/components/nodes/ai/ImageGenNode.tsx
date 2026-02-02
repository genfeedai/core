'use client';

import type { ImageGenNodeData, ImageModel } from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { AlertCircle, ChevronDown, Download, Expand, ImageIcon, Play, Square } from 'lucide-react';
import Image from 'next/image';
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
  DEFAULT_IMAGE_MODEL,
  IMAGE_MODEL_ID_MAP,
  IMAGE_MODEL_MAP,
  IMAGE_MODELS,
} from '@/lib/models/registry';
import { useUIStore } from '@/store/uiStore';

function ImageGenNodeComponent(props: NodeProps) {
  const { id, type, data } = props;
  const nodeData = data as ImageGenNodeData;
  const openNodeDetailModal = useUIStore((state) => state.openNodeDetailModal);
  const { handleGenerate, handleStop } = useNodeExecution(id);
  const { canGenerate } = useCanGenerate({
    nodeId: id,
    nodeType: type as 'imageGen',
    inputSchema: nodeData.selectedModel?.inputSchema as Record<string, unknown> | undefined,
    schemaParams: nodeData.schemaParams,
  });

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
    fallbackModel: DEFAULT_IMAGE_MODEL,
  });

  // Auto-load schema for default model if selectedModel is not set
  useAutoLoadModelSchema({
    currentModel: nodeData.model,
    selectedModel: nodeData.selectedModel,
    modelIdMap: IMAGE_MODEL_ID_MAP,
    onModelSelect: handleModelSelect,
  });

  // Shared schema/enum/image-support logic
  const {
    schemaProperties,
    enumValues,
    modelSupportsImageInput,
    handleSchemaParamChange,
    componentSchemas,
  } = useAIGenNode<ImageGenNodeData>({
    nodeId: id,
    selectedModel: nodeData.selectedModel,
    schemaParams: nodeData.schemaParams,
  });

  const handleExpand = useCallback(() => {
    openNodeDetailModal(id, 'preview');
  }, [id, openNodeDetailModal]);

  const modelDisplayName =
    nodeData.selectedModel?.displayName ||
    IMAGE_MODELS.find((m) => m.value === nodeData.model)?.label ||
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
        {nodeData.outputImage && (
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
    [nodeData.outputImage, nodeData.status, handleGenerate, handleStop, handleExpand, canGenerate]
  );

  return (
    <BaseNode
      {...props}
      titleElement={titleElement}
      headerActions={headerActions}
      hideStatusIndicator
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
            componentSchemas={componentSchemas}
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
              <Button variant="link" size="sm" onClick={handleDownloadAll} className="h-auto p-0">
                <Download className="w-3 h-3" />
                Download All
              </Button>
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
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(i);
                      }}
                      className="h-6 w-6 bg-white/20 hover:bg-white/30"
                    >
                      <Download className="w-3 h-3 text-white" />
                    </Button>
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
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setSelectedPreview(null)}
                  className="absolute top-1 right-1 h-5 w-5 bg-black/50 hover:bg-black/70 text-white"
                >
                  x
                </Button>
              </div>
            )}
            {/* Processing overlay */}
            {nodeData.status === 'processing' && <ProcessingOverlay />}
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
            {nodeData.status === 'processing' && <ProcessingOverlay />}
          </div>
        ) : (
          <div className="relative flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border/50 bg-secondary/20">
            <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
            {nodeData.status === 'processing' && <ProcessingOverlay />}
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
        capabilities={['text-to-image', 'image-to-image']}
        title="Select Image Model"
      />
    </BaseNode>
  );
}

export const ImageGenNode = memo(ImageGenNodeComponent);
