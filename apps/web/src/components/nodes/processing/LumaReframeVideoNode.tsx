'use client';

import type { GridPosition, LumaAspectRatio, LumaReframeVideoNodeData } from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { RefreshCw } from 'lucide-react';
import { memo, useCallback, useRef, useState } from 'react';
import { GridPositionSelector } from '@/components/ui/grid-position-selector';
import { Label } from '@/components/ui/label';
import { useExecutionStore } from '@/store/executionStore';
import { useWorkflowStore } from '@/store/workflowStore';
import { BaseNode } from '../BaseNode';

const ASPECT_RATIOS: { value: LumaAspectRatio; label: string }[] = [
  { value: '9:16', label: '9:16 (TikTok/Reels)' },
  { value: '16:9', label: '16:9 (YouTube)' },
  { value: '1:1', label: '1:1 (Square)' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
  { value: '9:21', label: '9:21' },
  { value: '21:9', label: '21:9 (Ultrawide)' },
];

function LumaReframeVideoNodeComponent(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as LumaReframeVideoNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const executeNode = useExecutionStore((state) => state.executeNode);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleAspectRatioChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData<LumaReframeVideoNodeData>(id, {
        aspectRatio: e.target.value as LumaAspectRatio,
      });
    },
    [id, updateNodeData]
  );

  const handlePromptChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData<LumaReframeVideoNodeData>(id, { prompt: e.target.value });
    },
    [id, updateNodeData]
  );

  const handlePositionChange = useCallback(
    (position: GridPosition) => {
      updateNodeData<LumaReframeVideoNodeData>(id, { gridPosition: position });
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

  return (
    <BaseNode {...props}>
      <div className="flex flex-col gap-3">
        {/* Aspect Ratio */}
        <div className="space-y-1.5">
          <Label className="text-xs">Target Aspect Ratio</Label>
          <select
            value={nodeData.aspectRatio}
            onChange={handleAspectRatioChange}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {ASPECT_RATIOS.map((ratio) => (
              <option key={ratio.value} value={ratio.value}>
                {ratio.label}
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

        {/* Limits Notice */}
        <div className="text-[10px] text-muted-foreground bg-secondary/50 rounded px-2 py-1">
          Max: 10 seconds, 100MB. Output: 720p @ $0.06/sec
        </div>

        {/* Output Preview */}
        {nodeData.outputVideo && (
          <div className="relative mt-1">
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

        {/* Process Button */}
        {!nodeData.outputVideo && nodeData.status !== 'processing' && (
          <button
            onClick={handleProcess}
            disabled={!nodeData.inputVideo}
            className="mt-1 w-full py-2 rounded-md text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--node-color)', color: 'var(--background)' }}
          >
            Reframe Video
          </button>
        )}
      </div>
    </BaseNode>
  );
}

export const LumaReframeVideoNode = memo(LumaReframeVideoNodeComponent);
