'use client';

import type { VideoTrimNodeData } from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { RefreshCw, Scissors } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useExecutionStore } from '@/store/executionStore';
import { useWorkflowStore } from '@/store/workflowStore';
import { BaseNode } from '../BaseNode';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function parseTime(timeStr: string): number {
  const [mins, secs] = timeStr.split(':').map(Number);
  return (mins || 0) * 60 + (secs || 0);
}

function VideoTrimNodeComponent(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as VideoTrimNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const executeNode = useExecutionStore((state) => state.executeNode);

  const handleStartTimeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseTime(e.target.value);
      updateNodeData<VideoTrimNodeData>(id, { startTime: value });
    },
    [id, updateNodeData]
  );

  const handleEndTimeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseTime(e.target.value);
      updateNodeData<VideoTrimNodeData>(id, { endTime: value });
    },
    [id, updateNodeData]
  );

  const handleStartSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      updateNodeData<VideoTrimNodeData>(id, { startTime: value });
    },
    [id, updateNodeData]
  );

  const handleEndSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      updateNodeData<VideoTrimNodeData>(id, { endTime: value });
    },
    [id, updateNodeData]
  );

  const handleProcess = useCallback(() => {
    executeNode(id);
  }, [id, executeNode]);

  const trimDuration = nodeData.endTime - nodeData.startTime;
  const maxDuration = nodeData.duration || 3600;

  return (
    <BaseNode {...props}>
      <div className="space-y-3">
        {/* Duration Info */}
        <div className="text-xs text-[var(--muted-foreground)]">
          {nodeData.duration
            ? `Source: ${formatTime(nodeData.duration)}`
            : 'Connect video to get duration'}
        </div>

        {/* Start Time */}
        <div>
          <label className="text-xs text-[var(--muted-foreground)]">
            Start: {formatTime(nodeData.startTime)}
          </label>
          <input
            type="range"
            min="0"
            max={maxDuration}
            step="1"
            value={nodeData.startTime}
            onChange={handleStartSliderChange}
            className="w-full h-2 bg-[var(--border)] rounded-lg appearance-none cursor-pointer"
          />
          <input
            type="text"
            value={formatTime(nodeData.startTime)}
            onChange={handleStartTimeChange}
            placeholder="0:00"
            className="w-full mt-1 px-2 py-1 text-xs bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
        </div>

        {/* End Time */}
        <div>
          <label className="text-xs text-[var(--muted-foreground)]">
            End: {formatTime(nodeData.endTime)}
          </label>
          <input
            type="range"
            min="0"
            max={maxDuration}
            step="1"
            value={nodeData.endTime}
            onChange={handleEndSliderChange}
            className="w-full h-2 bg-[var(--border)] rounded-lg appearance-none cursor-pointer"
          />
          <input
            type="text"
            value={formatTime(nodeData.endTime)}
            onChange={handleEndTimeChange}
            placeholder="1:00"
            className="w-full mt-1 px-2 py-1 text-xs bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
        </div>

        {/* Trim Duration Display */}
        <div className="p-2 bg-[var(--background)] border border-[var(--border)] rounded text-center">
          <span className="text-sm font-medium">Clip Length: {formatTime(trimDuration)}</span>
        </div>

        {/* Output Preview */}
        {nodeData.outputVideo && (
          <div className="relative">
            <video
              src={nodeData.outputVideo}
              className="w-full h-20 object-cover rounded"
              controls
            />
            <button
              onClick={handleProcess}
              disabled={nodeData.status === 'processing'}
              className="absolute top-1 right-1 p-1 bg-black/50 rounded-full hover:bg-black/70 transition disabled:opacity-50"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Process Button */}
        {!nodeData.outputVideo && nodeData.status !== 'processing' && (
          <button
            onClick={handleProcess}
            className="w-full py-2 bg-[var(--primary)] text-white rounded text-sm font-medium hover:opacity-90 transition flex items-center justify-center gap-2"
          >
            <Scissors className="w-4 h-4" />
            Trim Video
          </button>
        )}
      </div>
    </BaseNode>
  );
}

export const VideoTrimNode = memo(VideoTrimNodeComponent);
