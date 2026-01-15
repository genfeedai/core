'use client';

import type { VideoInputNodeData } from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { Upload, X } from 'lucide-react';
import { memo, useCallback, useRef } from 'react';
import { useWorkflowStore } from '@/store/workflowStore';
import { BaseNode } from '../BaseNode';

function VideoInputNodeComponent(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as VideoInputNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const video = document.createElement('video');
        video.onloadedmetadata = () => {
          updateNodeData<VideoInputNodeData>(id, {
            video: event.target?.result as string,
            filename: file.name,
            duration: video.duration,
            dimensions: { width: video.videoWidth, height: video.videoHeight },
            source: 'upload',
          });
        };
        video.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    },
    [id, updateNodeData]
  );

  const handleRemoveVideo = useCallback(() => {
    updateNodeData<VideoInputNodeData>(id, {
      video: null,
      filename: null,
      duration: null,
      dimensions: null,
    });
  }, [id, updateNodeData]);

  const handleUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData<VideoInputNodeData>(id, {
        url: e.target.value,
        source: 'url',
      });
    },
    [id, updateNodeData]
  );

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <BaseNode {...props}>
      <div className="space-y-2">
        {nodeData.video ? (
          <div className="relative">
            <video src={nodeData.video} className="w-full h-32 object-cover rounded" muted />
            <button
              onClick={handleRemoveVideo}
              className="absolute top-1 right-1 p-1 bg-black/50 rounded-full hover:bg-black/70 transition"
            >
              <X className="w-3 h-3" />
            </button>
            <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-black/50 rounded text-xs">
              {nodeData.dimensions?.width}x{nodeData.dimensions?.height}
              {nodeData.duration && ` • ${formatDuration(nodeData.duration)}`}
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-24 border-2 border-dashed border-[var(--border)] rounded flex flex-col items-center justify-center gap-1 hover:border-[var(--primary)] transition"
          >
            <Upload className="w-5 h-5 text-[var(--muted-foreground)]" />
            <span className="text-xs text-[var(--muted-foreground)]">Upload Video</span>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="text-xs text-[var(--muted-foreground)]">Or paste URL:</div>
        <input
          type="url"
          value={nodeData.url || ''}
          onChange={handleUrlChange}
          placeholder="https://..."
          className="w-full px-2 py-1.5 text-xs bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
        />
      </div>
    </BaseNode>
  );
}

export const VideoInputNode = memo(VideoInputNodeComponent);
