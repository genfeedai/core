'use client';

import { LUMA_ASPECT_RATIOS } from '@genfeedai/core';
import type {
  GridPosition,
  LumaAspectRatio,
  LumaReframeImageNodeData,
  LumaReframeModel,
} from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { memo, useCallback } from 'react';
import { GridPositionSelector } from '@/components/ui/grid-position-selector';
import { Label } from '@/components/ui/label';
import { useExecutionStore } from '@/store/executionStore';
import { useWorkflowStore } from '@/store/workflowStore';
import { BaseNode } from '../BaseNode';

const MODELS: { value: LumaReframeModel; label: string; price: string }[] = [
  { value: 'photon-flash-1', label: 'Photon Flash', price: '$0.01' },
  { value: 'photon-1', label: 'Photon', price: '$0.03' },
];

function LumaReframeImageNodeComponent(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as LumaReframeImageNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const executeNode = useExecutionStore((state) => state.executeNode);

  const handleModelChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData<LumaReframeImageNodeData>(id, {
        model: e.target.value as LumaReframeModel,
      });
    },
    [id, updateNodeData]
  );

  const handleAspectRatioChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData<LumaReframeImageNodeData>(id, {
        aspectRatio: e.target.value as LumaAspectRatio,
      });
    },
    [id, updateNodeData]
  );

  const handlePromptChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData<LumaReframeImageNodeData>(id, { prompt: e.target.value });
    },
    [id, updateNodeData]
  );

  const handlePositionChange = useCallback(
    (position: GridPosition) => {
      updateNodeData<LumaReframeImageNodeData>(id, { gridPosition: position });
    },
    [id, updateNodeData]
  );

  const handleProcess = useCallback(() => {
    executeNode(id);
  }, [id, executeNode]);

  return (
    <BaseNode {...props}>
      <div className="flex flex-col gap-3">
        {/* Model Selection */}
        <div className="space-y-1.5">
          <Label className="text-xs">Model</Label>
          <select
            value={nodeData.model}
            onChange={handleModelChange}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {MODELS.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label} - {model.price}
              </option>
            ))}
          </select>
        </div>

        {/* Aspect Ratio */}
        <div className="space-y-1.5">
          <Label className="text-xs">Target Aspect Ratio</Label>
          <select
            value={nodeData.aspectRatio}
            onChange={handleAspectRatioChange}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {LUMA_ASPECT_RATIOS.map((ratio) => (
              <option key={ratio} value={ratio}>
                {ratio}
              </option>
            ))}
          </select>
        </div>

        {/* Grid Position */}
        <GridPositionSelector
          position={nodeData.gridPosition}
          onPositionChange={handlePositionChange}
        />

        {/* Optional Prompt */}
        <div className="space-y-1.5">
          <Label className="text-xs">Prompt (optional)</Label>
          <input
            type="text"
            value={nodeData.prompt}
            onChange={handlePromptChange}
            placeholder="Guide the AI outpainting..."
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        {/* Output Preview */}
        {nodeData.outputImage && (
          <div className="relative mt-1">
            <Image
              src={nodeData.outputImage}
              alt="Reframed image"
              width={200}
              height={128}
              className="h-32 w-full rounded-md object-cover"
              unoptimized
            />
            <button
              onClick={handleProcess}
              disabled={nodeData.status === 'processing'}
              className="absolute right-2 top-2 p-1.5 bg-black/50 rounded-full hover:bg-black/70 transition-colors disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5 text-white" />
            </button>
          </div>
        )}

        {/* Process Button */}
        {!nodeData.outputImage && nodeData.status !== 'processing' && (
          <button
            onClick={handleProcess}
            disabled={!nodeData.inputImage}
            className="mt-1 w-full py-2 rounded-md text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--node-color)', color: 'var(--background)' }}
          >
            Reframe Image
          </button>
        )}
      </div>
    </BaseNode>
  );
}

export const LumaReframeImageNode = memo(LumaReframeImageNodeComponent);
