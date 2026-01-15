'use client';

import type {
  AspectRatio,
  ImageGenNodeData,
  ImageModel,
  OutputFormat,
  ProviderModel,
  Resolution,
} from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { RefreshCw, Search } from 'lucide-react';
import Image from 'next/image';
import { memo, useCallback, useState } from 'react';
import { ModelBrowserModal } from '@/components/models/ModelBrowserModal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useExecutionStore } from '@/store/executionStore';
import { useWorkflowStore } from '@/store/workflowStore';
import { BaseNode } from '../BaseNode';

const MODELS: { value: ImageModel; label: string; description: string }[] = [
  { value: 'nano-banana', label: 'Nano Banana', description: 'Fast, $0.039/image' },
  {
    value: 'nano-banana-pro',
    label: 'Nano Banana Pro',
    description: 'High quality, $0.15-0.30/image',
  },
];

const ASPECT_RATIOS: AspectRatio[] = [
  '1:1',
  '16:9',
  '9:16',
  '4:3',
  '3:4',
  '4:5',
  '5:4',
  '2:3',
  '3:2',
];

const RESOLUTIONS: Resolution[] = ['1K', '2K', '4K'];

const OUTPUT_FORMATS: OutputFormat[] = ['jpg', 'png', 'webp'];

function ImageGenNodeComponent(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as ImageGenNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const executeNode = useExecutionStore((state) => state.executeNode);

  const [isModelBrowserOpen, setIsModelBrowserOpen] = useState(false);

  const handleModelSelect = useCallback(
    (model: ProviderModel) => {
      // Map provider model to our internal model format
      const modelMap: Record<string, ImageModel> = {
        'google/nano-banana': 'nano-banana',
        'google/nano-banana-pro': 'nano-banana-pro',
      };

      const internalModel = modelMap[model.id];
      if (internalModel) {
        updateNodeData<ImageGenNodeData>(id, {
          model: internalModel,
          provider: model.provider,
          selectedModel: {
            provider: model.provider,
            modelId: model.id,
            displayName: model.displayName,
          },
        });
      }
    },
    [id, updateNodeData]
  );

  const handleModelChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData<ImageGenNodeData>(id, { model: e.target.value as ImageModel });
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

  return (
    <BaseNode {...props}>
      <div className="flex flex-col gap-3">
        {/* Model Selection */}
        <div className="space-y-1.5">
          <Label className="text-xs">Model</Label>
          <div className="flex gap-2">
            <select
              value={nodeData.model}
              onChange={handleModelChange}
              className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {MODELS.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label} - {model.description}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setIsModelBrowserOpen(true)}
              title="Browse models"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Aspect Ratio */}
        <div className="space-y-1.5">
          <Label className="text-xs">Aspect Ratio</Label>
          <select
            value={nodeData.aspectRatio}
            onChange={handleAspectRatioChange}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {ASPECT_RATIOS.map((ratio) => (
              <option key={ratio} value={ratio}>
                {ratio}
              </option>
            ))}
          </select>
        </div>

        {/* Resolution (only for Pro) */}
        {nodeData.model === 'nano-banana-pro' && (
          <div className="space-y-1.5">
            <Label className="text-xs">Resolution</Label>
            <select
              value={nodeData.resolution}
              onChange={handleResolutionChange}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {RESOLUTIONS.map((res) => (
                <option key={res} value={res}>
                  {res}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Output Format */}
        <div className="space-y-1.5">
          <Label className="text-xs">Format</Label>
          <select
            value={nodeData.outputFormat}
            onChange={handleFormatChange}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {OUTPUT_FORMATS.map((format) => (
              <option key={format} value={format}>
                {format.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Output Preview */}
        {nodeData.outputImage && (
          <div className="relative mt-1">
            <Image
              src={nodeData.outputImage}
              alt="Generated image"
              width={200}
              height={128}
              className="h-32 w-full rounded-md object-cover"
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
            className="mt-1 w-full py-2 rounded-md text-sm font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--node-color)', color: 'var(--background)' }}
          >
            Generate Image
          </button>
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
