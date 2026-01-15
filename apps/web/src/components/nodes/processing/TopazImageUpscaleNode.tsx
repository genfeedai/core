'use client';

import type {
  TopazEnhanceModel,
  TopazImageUpscaleNodeData,
  TopazUpscaleFactor,
} from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { RefreshCw, SplitSquareHorizontal } from 'lucide-react';
import Image from 'next/image';
import { memo, useCallback } from 'react';
import { ComparisonSlider } from '@/components/ui/comparison-slider';
import { Label } from '@/components/ui/label';
import { useExecutionStore } from '@/store/executionStore';
import { useWorkflowStore } from '@/store/workflowStore';
import { BaseNode } from '../BaseNode';

const ENHANCE_MODELS: { value: TopazEnhanceModel; label: string }[] = [
  { value: 'Standard V2', label: 'Standard V2' },
  { value: 'Low Resolution V2', label: 'Low Resolution V2' },
  { value: 'CGI', label: 'CGI' },
  { value: 'High Fidelity V2', label: 'High Fidelity V2' },
  { value: 'Text Refine', label: 'Text Refine' },
];

const UPSCALE_FACTORS: { value: TopazUpscaleFactor; label: string }[] = [
  { value: 'None', label: 'None (enhance only)' },
  { value: '2x', label: '2x' },
  { value: '4x', label: '4x' },
  { value: '6x', label: '6x' },
];

function TopazImageUpscaleNodeComponent(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as TopazImageUpscaleNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const executeNode = useExecutionStore((state) => state.executeNode);

  const handleModelChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData<TopazImageUpscaleNodeData>(id, {
        enhanceModel: e.target.value as TopazEnhanceModel,
      });
    },
    [id, updateNodeData]
  );

  const handleFactorChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData<TopazImageUpscaleNodeData>(id, {
        upscaleFactor: e.target.value as TopazUpscaleFactor,
      });
    },
    [id, updateNodeData]
  );

  const handleFormatChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData<TopazImageUpscaleNodeData>(id, {
        outputFormat: e.target.value as 'jpg' | 'png',
      });
    },
    [id, updateNodeData]
  );

  const handleFaceEnhancementToggle = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData<TopazImageUpscaleNodeData>(id, {
        faceEnhancement: e.target.checked,
      });
    },
    [id, updateNodeData]
  );

  const handleStrengthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData<TopazImageUpscaleNodeData>(id, {
        faceEnhancementStrength: parseInt(e.target.value, 10),
      });
    },
    [id, updateNodeData]
  );

  const handleCreativityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData<TopazImageUpscaleNodeData>(id, {
        faceEnhancementCreativity: parseInt(e.target.value, 10),
      });
    },
    [id, updateNodeData]
  );

  const handleComparisonToggle = useCallback(() => {
    updateNodeData<TopazImageUpscaleNodeData>(id, {
      showComparison: !nodeData.showComparison,
    });
  }, [id, nodeData.showComparison, updateNodeData]);

  const handleComparisonPositionChange = useCallback(
    (position: number) => {
      updateNodeData<TopazImageUpscaleNodeData>(id, { comparisonPosition: position });
    },
    [id, updateNodeData]
  );

  const handleProcess = useCallback(() => {
    executeNode(id);
  }, [id, executeNode]);

  return (
    <BaseNode {...props}>
      <div className="flex flex-col gap-3">
        {/* Enhance Model */}
        <div className="space-y-1.5">
          <Label className="text-xs">Enhance Model</Label>
          <select
            value={nodeData.enhanceModel}
            onChange={handleModelChange}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {ENHANCE_MODELS.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>
        </div>

        {/* Upscale Factor */}
        <div className="space-y-1.5">
          <Label className="text-xs">Upscale Factor</Label>
          <select
            value={nodeData.upscaleFactor}
            onChange={handleFactorChange}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {UPSCALE_FACTORS.map((factor) => (
              <option key={factor.value} value={factor.value}>
                {factor.label}
              </option>
            ))}
          </select>
        </div>

        {/* Output Format */}
        <div className="space-y-1.5">
          <Label className="text-xs">Output Format</Label>
          <select
            value={nodeData.outputFormat}
            onChange={handleFormatChange}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="png">PNG</option>
            <option value="jpg">JPG</option>
          </select>
        </div>

        {/* Face Enhancement */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`${id}-face-enhance`}
              checked={nodeData.faceEnhancement}
              onChange={handleFaceEnhancementToggle}
              className="rounded border-input"
            />
            <Label htmlFor={`${id}-face-enhance`} className="text-xs cursor-pointer">
              Face Enhancement
            </Label>
          </div>

          {nodeData.faceEnhancement && (
            <div className="space-y-2 pl-1">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <Label className="text-[10px]">Strength</Label>
                  <span className="text-[10px] text-muted-foreground">
                    {nodeData.faceEnhancementStrength}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={nodeData.faceEnhancementStrength}
                  onChange={handleStrengthChange}
                  className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <Label className="text-[10px]">Creativity</Label>
                  <span className="text-[10px] text-muted-foreground">
                    {nodeData.faceEnhancementCreativity}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={nodeData.faceEnhancementCreativity}
                  onChange={handleCreativityChange}
                  className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Output with Comparison */}
        {nodeData.outputImage && (
          <div className="mt-1">
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs">Result</Label>
              {nodeData.originalPreview && (
                <button
                  onClick={handleComparisonToggle}
                  className="p-1 rounded hover:bg-secondary transition-colors"
                  title={nodeData.showComparison ? 'Show result only' : 'Compare before/after'}
                >
                  <SplitSquareHorizontal className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {nodeData.showComparison && nodeData.originalPreview ? (
              <ComparisonSlider
                beforeSrc={nodeData.originalPreview}
                afterSrc={nodeData.outputImage}
                beforeLabel="Original"
                afterLabel="Upscaled"
                position={nodeData.comparisonPosition}
                onPositionChange={handleComparisonPositionChange}
                height={128}
              />
            ) : (
              <div className="relative">
                <Image
                  src={nodeData.outputImage}
                  alt="Upscaled image"
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
            Upscale Image
          </button>
        )}
      </div>
    </BaseNode>
  );
}

export const TopazImageUpscaleNode = memo(TopazImageUpscaleNodeComponent);
