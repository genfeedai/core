'use client';

import { ASPECT_RATIOS, OUTPUT_FORMATS, RESOLUTIONS } from '@genfeedai/core';
import type {
  AspectRatio,
  ImageGenNodeData,
  ImageModel,
  OutputFormat,
  ProviderModel,
  Resolution,
} from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { AlertCircle, ChevronDown, RefreshCw, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { memo, useCallback, useState } from 'react';
import { ModelBrowserModal } from '@/components/models/ModelBrowserModal';
import { BaseNode } from '@/components/nodes/BaseNode';
import { Button } from '@/components/ui/button';
import { useRequiredInputs } from '@/hooks/useRequiredInputs';
import { useExecutionStore } from '@/store/executionStore';
import { useWorkflowStore } from '@/store/workflowStore';

const MODELS: { value: ImageModel; label: string }[] = [
  { value: 'nano-banana', label: 'Nano Banana' },
  { value: 'nano-banana-pro', label: 'Nano Banana Pro' },
];

function ImageGenNodeComponent(props: NodeProps) {
  const { id, type, data } = props;
  const nodeData = data as ImageGenNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const executeNode = useExecutionStore((state) => state.executeNode);
  const { hasRequiredInputs } = useRequiredInputs(id, type as 'imageGen');

  const [isModelBrowserOpen, setIsModelBrowserOpen] = useState(false);

  const handleModelSelect = useCallback(
    (model: ProviderModel) => {
      // Map provider model to internal model format where applicable
      const modelMap: Record<string, ImageModel> = {
        'google/nano-banana': 'nano-banana',
        'google/nano-banana-pro': 'nano-banana-pro',
      };

      const internalModel = modelMap[model.id] ?? ('nano-banana-pro' as ImageModel);

      updateNodeData<ImageGenNodeData>(id, {
        model: internalModel,
        provider: model.provider,
        selectedModel: {
          provider: model.provider,
          modelId: model.id,
          displayName: model.displayName,
        },
      });
    },
    [id, updateNodeData]
  );

  const handleAspectRatioChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData<ImageGenNodeData>(id, { aspectRatio: e.target.value as AspectRatio });
    },
    [id, updateNodeData]
  );

  const handleResolutionChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData<ImageGenNodeData>(id, { resolution: e.target.value as Resolution });
    },
    [id, updateNodeData]
  );

  const handleFormatChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData<ImageGenNodeData>(id, { outputFormat: e.target.value as OutputFormat });
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
    <Button
      variant="secondary"
      size="sm"
      onClick={() => setIsModelBrowserOpen(true)}
      className="h-5 px-2 text-[10px]"
    >
      Browse
    </Button>
  );

  return (
    <BaseNode {...props} title={modelDisplayName} headerActions={headerActions}>
      <div className="flex flex-col gap-3">
        {/* Compact Settings Row */}
        <div className="space-y-1.5">
          {/* Labels row */}
          <div className="flex gap-2 text-xs text-muted-foreground">
            <span className="flex-1">Ratio</span>
            {nodeData.model === 'nano-banana-pro' && <span className="flex-1">Resolution</span>}
            <span className="flex-1">Format</span>
          </div>
          {/* Dropdowns row */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <select
                value={nodeData.aspectRatio}
                onChange={handleAspectRatioChange}
                className="appearance-none w-full h-8 rounded-md border border-input bg-background pl-2 pr-7 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {ASPECT_RATIOS.map((ratio) => (
                  <option key={ratio} value={ratio}>
                    {ratio}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-muted-foreground" />
            </div>
            {nodeData.model === 'nano-banana-pro' && (
              <div className="relative flex-1">
                <select
                  value={nodeData.resolution}
                  onChange={handleResolutionChange}
                  className="appearance-none w-full h-8 rounded-md border border-input bg-background pl-2 pr-7 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {RESOLUTIONS.map((res) => (
                    <option key={res} value={res}>
                      {res}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-muted-foreground" />
              </div>
            )}
            <div className="relative flex-1">
              <select
                value={nodeData.outputFormat}
                onChange={handleFormatChange}
                className="appearance-none w-full h-8 rounded-md border border-input bg-background pl-2 pr-7 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {OUTPUT_FORMATS.map((format) => (
                  <option key={format} value={format}>
                    {format.toUpperCase()}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Output Preview */}
        {nodeData.outputImage && (
          <div className="relative mt-1 aspect-[4/3] overflow-hidden rounded-md bg-black/20">
            <Image
              src={nodeData.outputImage}
              alt="Generated image"
              width={280}
              height={210}
              className="w-full h-full object-cover cursor-pointer"
              unoptimized
            />
            <Button
              variant="secondary"
              size="icon-sm"
              onClick={handleGenerate}
              disabled={nodeData.status === 'processing'}
              className="absolute right-2 top-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
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
