'use client';

import type { PreviewNodeData } from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import Image from 'next/image';
import { memo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useWorkflowStore } from '@/store/workflowStore';
import { BaseNode } from '../BaseNode';

function PreviewNodeComponent(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as PreviewNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlayPause = useCallback(() => {
    if (!videoRef.current) return;

    if (nodeData.isPlaying) {
      videoRef.current.pause();
      updateNodeData<PreviewNodeData>(id, { isPlaying: false });
    } else {
      videoRef.current
        .play()
        .then(() => {
          updateNodeData<PreviewNodeData>(id, { isPlaying: true });
        })
        .catch(() => {
          // Play failed (e.g., user interaction required, media error)
          updateNodeData<PreviewNodeData>(id, { isPlaying: false });
        });
    }
  }, [id, nodeData.isPlaying, updateNodeData]);

  const handleVolumeToggle = useCallback(() => {
    const newVolume = nodeData.volume > 0 ? 0 : 1;
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    updateNodeData<PreviewNodeData>(id, { volume: newVolume });
  }, [id, nodeData.volume, updateNodeData]);

  return (
    <BaseNode {...props}>
      <div className="space-y-2">
        {nodeData.inputMedia ? (
          nodeData.inputType === 'video' ? (
            <div className="relative">
              <video
                ref={videoRef}
                src={nodeData.inputMedia}
                className="h-32 w-full rounded-md object-cover"
                loop
                onPlay={() => updateNodeData<PreviewNodeData>(id, { isPlaying: true })}
                onPause={() => updateNodeData<PreviewNodeData>(id, { isPlaying: false })}
              />
              <div className="absolute bottom-1.5 left-1.5 right-1.5 flex gap-1">
                <Button variant="secondary" size="icon-sm" onClick={handlePlayPause}>
                  {nodeData.isPlaying ? (
                    <Pause className="h-3 w-3" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                </Button>
                <Button variant="secondary" size="icon-sm" onClick={handleVolumeToggle}>
                  {nodeData.volume > 0 ? (
                    <Volume2 className="h-3 w-3" />
                  ) : (
                    <VolumeX className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <Image
              src={nodeData.inputMedia}
              alt="Preview"
              width={200}
              height={128}
              className="h-32 w-full rounded-md object-cover"
              unoptimized
            />
          )
        ) : (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            No preview available
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export const PreviewNode = memo(PreviewNodeComponent);
