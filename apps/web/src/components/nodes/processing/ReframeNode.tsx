'use client';

import type {
  GridPosition,
  LumaAspectRatio,
  LumaReframeModel,
  ReframeNodeData,
} from '@genfeedai/types';
import { NODE_STATUS } from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { Loader2, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { memo, useCallback, useRef, useState } from 'react';
import { BaseNode } from '@/components/nodes/BaseNode';
import { GridPositionSelector } from '@/components/ui/grid-position-selector';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useExecutionStore } from '@/store/executionStore';
import { useWorkflowStore } from '@/store/workflowStore';

const MODELS: { value: LumaReframeModel; label: string; price: string }[] = [
  { value: 'photon-flash-1', label: 'Photon Flash', price: '$0.01' },
  { value: 'photon-1', label: 'Photon', price: '$0.03' },
];

const ASPECT_RATIOS: { value: LumaAspectRatio; label: string }[] = [
  { value: '9:16', label: '9:16 (TikTok/Reels)' },
  { value: '16:9', label: '16:9 (YouTube)' },
  { value: '1:1', label: '1:1 (Square)' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
  { value: '9:21', label: '9:21' },
  { value: '21:9', label: '21:9 (Ultrawide)' },
];

function ReframeNodeComponent(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as ReframeNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const executeNode = useExecutionStore((state) => state.executeNode);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Determine input type based on what's connected
  const inputType =
    nodeData.inputType ?? (nodeData.inputImage ? 'image' : nodeData.inputVideo ? 'video' : null);
  const hasInput = inputType !== null;
  const hasOutput = inputType === 'image' ? !!nodeData.outputImage : !!nodeData.outputVideo;

  const handleModelChange = useCallback(
    (value: string) => {
      updateNodeData<ReframeNodeData>(id, {
        model: value as LumaReframeModel,
      });
    },
    [id, updateNodeData]
  );

  const handleAspectRatioChange = useCallback(
    (value: string) => {
      updateNodeData<ReframeNodeData>(id, {
        aspectRatio: value as LumaAspectRatio,
      });
    },
    [id, updateNodeData]
  );

  const handlePromptChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData<ReframeNodeData>(id, { prompt: e.target.value });
    },
    [id, updateNodeData]
  );

  const handlePositionChange = useCallback(
    (position: GridPosition) => {
      updateNodeData<ReframeNodeData>(id, { gridPosition: position });
    },
    [id, updateNodeData]
  );

  const handleProcess = useCallback(() => {
    updateNodeData(id, { status: NODE_STATUS.processing });
    executeNode(id);
  }, [id, executeNode, updateNodeData]);

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

        {/* Model Selection (only for images) */}
        {inputType === 'image' && (
          <div className="space-y-1.5">
            <Label className="text-xs">Model</Label>
            <Select value={nodeData.model} onValueChange={handleModelChange}>
              <SelectTrigger className="nodrag h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label} - {model.price}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Aspect Ratio */}
        <div className="space-y-1.5">
          <Label className="text-xs">Target Aspect Ratio</Label>
          <Select value={nodeData.aspectRatio} onValueChange={handleAspectRatioChange}>
            <SelectTrigger className="nodrag h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASPECT_RATIOS.map((ratio) => (
                <SelectItem key={ratio.value} value={ratio.value}>
                  {ratio.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

        {/* Video Limits Notice */}
        {inputType === 'video' && (
          <div className="text-[10px] text-muted-foreground bg-secondary/50 rounded px-2 py-1">
            Max: 10 seconds, 100MB. Output: 720p @ $0.06/sec
          </div>
        )}

        {/* Output Preview - Image */}
        {inputType === 'image' && nodeData.outputImage && (
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

        {/* Output Preview - Video */}
        {inputType === 'video' && nodeData.outputVideo && (
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
        {!hasOutput && (
          <button
            onClick={handleProcess}
            disabled={!hasInput || nodeData.status === 'processing'}
            className="mt-1 w-full py-2 rounded-md text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            style={{ backgroundColor: 'var(--node-color)', color: 'var(--background)' }}
          >
            {nodeData.status === 'processing' && <Loader2 className="h-4 w-4 animate-spin" />}
            {nodeData.status === 'processing'
              ? 'Reframing...'
              : `Reframe ${inputType === 'video' ? 'Video' : inputType === 'image' ? 'Image' : 'Media'}`}
          </button>
        )}
      </div>
    </BaseNode>
  );
}

export const ReframeNode = memo(ReframeNodeComponent);
