'use client';

import type {
  TopazUpscaleFactor,
  TopazVideoFPS,
  TopazVideoResolution,
  UpscaleModel,
  UpscaleNodeData,
} from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { Expand, RefreshCw, SplitSquareHorizontal } from 'lucide-react';
import Image from 'next/image';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { BaseNode } from '@/components/nodes/BaseNode';
import { Button } from '@/components/ui/button';
import { ComparisonSlider } from '@/components/ui/comparison-slider';
import { Label } from '@/components/ui/label';
import { useExecutionStore } from '@/store/executionStore';
import { useUIStore } from '@/store/uiStore';
import { useWorkflowStore } from '@/store/workflowStore';

// Image upscale models
const IMAGE_MODELS: { value: UpscaleModel; label: string }[] = [
  { value: 'topaz-standard-v2', label: 'Standard V2' },
  { value: 'topaz-low-res-v2', label: 'Low Resolution V2' },
  { value: 'topaz-cgi', label: 'CGI' },
  { value: 'topaz-high-fidelity-v2', label: 'High Fidelity V2' },
  { value: 'topaz-text-refine', label: 'Text Refine' },
];

// Video model (only one option currently)
const VIDEO_MODELS: { value: UpscaleModel; label: string }[] = [
  { value: 'topaz-video', label: 'Topaz Video Upscale' },
];

const UPSCALE_FACTORS: { value: TopazUpscaleFactor; label: string }[] = [
  { value: 'None', label: 'None (enhance only)' },
  { value: '2x', label: '2x' },
  { value: '4x', label: '4x' },
  { value: '6x', label: '6x' },
];

const RESOLUTIONS: { value: TopazVideoResolution; label: string }[] = [
  { value: '720p', label: '720p (HD)' },
  { value: '1080p', label: '1080p (Full HD)' },
  { value: '4k', label: '4K (Ultra HD)' },
];

const FPS_OPTIONS: { value: TopazVideoFPS; label: string }[] = [
  { value: 15, label: '15 fps' },
  { value: 24, label: '24 fps (Film)' },
  { value: 30, label: '30 fps' },
  { value: 60, label: '60 fps (Smooth)' },
];

function UpscaleNodeComponent(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as UpscaleNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const executeNode = useExecutionStore((state) => state.executeNode);
  const openNodeDetailModal = useUIStore((state) => state.openNodeDetailModal);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Determine input type based on what's connected
  const inputType =
    nodeData.inputType ?? (nodeData.inputImage ? 'image' : nodeData.inputVideo ? 'video' : null);
  const hasInput = inputType !== null;
  const hasOutput = inputType === 'image' ? !!nodeData.outputImage : !!nodeData.outputVideo;

  const handleModelChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData<UpscaleNodeData>(id, {
        model: e.target.value as UpscaleModel,
      });
    },
    [id, updateNodeData]
  );

  const handleFactorChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData<UpscaleNodeData>(id, {
        upscaleFactor: e.target.value as TopazUpscaleFactor,
      });
    },
    [id, updateNodeData]
  );

  const handleFormatChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData<UpscaleNodeData>(id, {
        outputFormat: e.target.value as 'jpg' | 'png',
      });
    },
    [id, updateNodeData]
  );

  const handleFaceEnhancementToggle = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData<UpscaleNodeData>(id, {
        faceEnhancement: e.target.checked,
      });
    },
    [id, updateNodeData]
  );

  const handleStrengthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData<UpscaleNodeData>(id, {
        faceEnhancementStrength: parseInt(e.target.value, 10),
      });
    },
    [id, updateNodeData]
  );

  const handleCreativityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData<UpscaleNodeData>(id, {
        faceEnhancementCreativity: parseInt(e.target.value, 10),
      });
    },
    [id, updateNodeData]
  );

  const handleResolutionChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData<UpscaleNodeData>(id, {
        targetResolution: e.target.value as TopazVideoResolution,
      });
    },
    [id, updateNodeData]
  );

  const handleFpsChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData<UpscaleNodeData>(id, {
        targetFps: parseInt(e.target.value, 10) as TopazVideoFPS,
      });
    },
    [id, updateNodeData]
  );

  const handleComparisonToggle = useCallback(() => {
    updateNodeData<UpscaleNodeData>(id, {
      showComparison: !nodeData.showComparison,
    });
  }, [id, nodeData.showComparison, updateNodeData]);

  const handleComparisonPositionChange = useCallback(
    (position: number) => {
      updateNodeData<UpscaleNodeData>(id, { comparisonPosition: position });
    },
    [id, updateNodeData]
  );

  const handleProcess = useCallback(() => {
    executeNode(id);
  }, [id, executeNode]);

  const handleExpand = useCallback(() => {
    openNodeDetailModal(id, 'preview');
  }, [id, openNodeDetailModal]);

  const togglePlayback = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  // Estimate pricing based on resolution and fps (video only)
  const getPriceEstimate = useCallback(() => {
    const priceMap: Record<string, number> = {
      '720p-15': 0.014,
      '720p-24': 0.022,
      '720p-30': 0.027,
      '720p-60': 0.054,
      '1080p-15': 0.051,
      '1080p-24': 0.081,
      '1080p-30': 0.101,
      '1080p-60': 0.203,
      '4k-15': 0.187,
      '4k-24': 0.299,
      '4k-30': 0.373,
      '4k-60': 0.747,
    };
    const key = `${nodeData.targetResolution}-${nodeData.targetFps}`;
    const perFiveSeconds = priceMap[key] ?? 0.101;
    return `~$${perFiveSeconds.toFixed(3)}/5s`;
  }, [nodeData.targetResolution, nodeData.targetFps]);

  const models = inputType === 'video' ? VIDEO_MODELS : IMAGE_MODELS;

  const headerActions = useMemo(
    () =>
      hasOutput ? (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleExpand}
          className="h-5 w-5"
          title="Expand preview"
        >
          <Expand className="h-3 w-3" />
        </Button>
      ) : null,
    [hasOutput, handleExpand]
  );

  return (
    <BaseNode {...props} headerActions={headerActions}>
      <div className="flex flex-col gap-3">
        {/* Input Type Indicator */}
        {!hasInput && (
          <div className="text-[10px] text-muted-foreground bg-secondary/50 rounded px-2 py-1.5 text-center">
            Connect an image or video input
          </div>
        )}

        {hasInput && (
          <div className="text-[10px] text-muted-foreground bg-secondary/50 rounded px-2 py-1">
            Mode: <span className="font-medium capitalize">{inputType}</span>
          </div>
        )}

        {/* Model Selection */}
        <div className="space-y-1.5">
          <Label className="text-xs">Model</Label>
          <select
            value={nodeData.model}
            onChange={handleModelChange}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {models.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>
        </div>

        {/* Image-specific controls */}
        {inputType === 'image' && (
          <>
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
                      className="nodrag w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer"
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
                      className="nodrag w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Video-specific controls */}
        {inputType === 'video' && (
          <>
            {/* Target Resolution */}
            <div className="space-y-1.5">
              <Label className="text-xs">Target Resolution</Label>
              <select
                value={nodeData.targetResolution}
                onChange={handleResolutionChange}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {RESOLUTIONS.map((res) => (
                  <option key={res.value} value={res.value}>
                    {res.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Target FPS */}
            <div className="space-y-1.5">
              <Label className="text-xs">Target Frame Rate</Label>
              <select
                value={nodeData.targetFps}
                onChange={handleFpsChange}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {FPS_OPTIONS.map((fps) => (
                  <option key={fps.value} value={fps.value}>
                    {fps.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Pricing Notice */}
            <div className="text-[10px] text-muted-foreground bg-secondary/50 rounded px-2 py-1">
              Estimated cost: {getPriceEstimate()}
            </div>
          </>
        )}

        {/* Output with Comparison - Image */}
        {inputType === 'image' && nodeData.outputImage && (
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

        {/* Output with Comparison - Video */}
        {inputType === 'video' && nodeData.outputVideo && (
          <div className="mt-1">
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs">Result</Label>
              {nodeData.originalPreview && nodeData.outputPreview && (
                <button
                  onClick={handleComparisonToggle}
                  className="p-1 rounded hover:bg-secondary transition-colors"
                  title={nodeData.showComparison ? 'Show video' : 'Compare frames'}
                >
                  <SplitSquareHorizontal className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {nodeData.showComparison && nodeData.originalPreview && nodeData.outputPreview ? (
              <ComparisonSlider
                beforeSrc={nodeData.originalPreview}
                afterSrc={nodeData.outputPreview}
                beforeLabel="Original"
                afterLabel="Upscaled"
                position={nodeData.comparisonPosition}
                onPositionChange={handleComparisonPositionChange}
                height={128}
              />
            ) : (
              <div className="relative">
                <video
                  ref={videoRef}
                  src={nodeData.outputVideo}
                  className="h-32 w-full rounded-md object-cover cursor-pointer"
                  onClick={togglePlayback}
                  onEnded={() => setIsPlaying(false)}
                  loop
                  muted
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
        {!hasOutput && nodeData.status !== 'processing' && (
          <button
            onClick={handleProcess}
            disabled={!hasInput}
            className="mt-1 w-full py-2 rounded-md text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--node-color)', color: 'var(--background)' }}
          >
            Upscale {inputType === 'video' ? 'Video' : inputType === 'image' ? 'Image' : 'Media'}
          </button>
        )}
      </div>
    </BaseNode>
  );
}

export const UpscaleNode = memo(UpscaleNodeComponent);
