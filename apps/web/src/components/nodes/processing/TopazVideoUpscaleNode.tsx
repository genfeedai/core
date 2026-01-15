'use client';

import type {
  TopazVideoFPS,
  TopazVideoResolution,
  TopazVideoUpscaleNodeData,
} from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { RefreshCw, SplitSquareHorizontal } from 'lucide-react';
import { memo, useCallback, useRef, useState } from 'react';
import { ComparisonSlider } from '@/components/ui/comparison-slider';
import { Label } from '@/components/ui/label';
import { useExecutionStore } from '@/store/executionStore';
import { useWorkflowStore } from '@/store/workflowStore';
import { BaseNode } from '../BaseNode';

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

function TopazVideoUpscaleNodeComponent(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as TopazVideoUpscaleNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const executeNode = useExecutionStore((state) => state.executeNode);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleResolutionChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData<TopazVideoUpscaleNodeData>(id, {
        targetResolution: e.target.value as TopazVideoResolution,
      });
    },
    [id, updateNodeData]
  );

  const handleFpsChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData<TopazVideoUpscaleNodeData>(id, {
        targetFps: parseInt(e.target.value, 10) as TopazVideoFPS,
      });
    },
    [id, updateNodeData]
  );

  const handleComparisonToggle = useCallback(() => {
    updateNodeData<TopazVideoUpscaleNodeData>(id, {
      showComparison: !nodeData.showComparison,
    });
  }, [id, nodeData.showComparison, updateNodeData]);

  const handleComparisonPositionChange = useCallback(
    (position: number) => {
      updateNodeData<TopazVideoUpscaleNodeData>(id, { comparisonPosition: position });
    },
    [id, updateNodeData]
  );

  const handleProcess = useCallback(() => {
    executeNode(id);
  }, [id, executeNode]);

  const togglePlayback = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  // Estimate pricing based on resolution and fps
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

  return (
    <BaseNode {...props}>
      <div className="flex flex-col gap-3">
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

        {/* Output with Comparison */}
        {nodeData.outputVideo && (
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
        {!nodeData.outputVideo && nodeData.status !== 'processing' && (
          <button
            onClick={handleProcess}
            disabled={!nodeData.inputVideo}
            className="mt-1 w-full py-2 rounded-md text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--node-color)', color: 'var(--background)' }}
          >
            Upscale Video
          </button>
        )}
      </div>
    </BaseNode>
  );
}

export const TopazVideoUpscaleNode = memo(TopazVideoUpscaleNodeComponent);
