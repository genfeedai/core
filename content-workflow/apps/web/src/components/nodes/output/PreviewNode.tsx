"use client";

import { memo, useCallback, useRef } from "react";
import type { NodeProps } from "@xyflow/react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { BaseNode } from "../BaseNode";
import type { PreviewNodeData } from "@/types/nodes";
import { useWorkflowStore } from "@/store/workflowStore";

function PreviewNodeComponent(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as PreviewNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (nodeData.isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      updateNodeData<PreviewNodeData>(id, { isPlaying: !nodeData.isPlaying });
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
          <>
            {nodeData.inputType === "video" ? (
              <div className="relative">
                <video
                  ref={videoRef}
                  src={nodeData.inputMedia}
                  className="w-full h-32 object-cover rounded"
                  loop
                  onPlay={() => updateNodeData<PreviewNodeData>(id, { isPlaying: true })}
                  onPause={() => updateNodeData<PreviewNodeData>(id, { isPlaying: false })}
                />
                <div className="absolute bottom-1 left-1 right-1 flex gap-1">
                  <button
                    onClick={handlePlayPause}
                    className="p-1.5 bg-black/70 rounded hover:bg-black/90 transition"
                  >
                    {nodeData.isPlaying ? (
                      <Pause className="w-3 h-3" />
                    ) : (
                      <Play className="w-3 h-3" />
                    )}
                  </button>
                  <button
                    onClick={handleVolumeToggle}
                    className="p-1.5 bg-black/70 rounded hover:bg-black/90 transition"
                  >
                    {nodeData.volume > 0 ? (
                      <Volume2 className="w-3 h-3" />
                    ) : (
                      <VolumeX className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <img
                src={nodeData.inputMedia}
                alt="Preview"
                className="w-full h-32 object-cover rounded"
              />
            )}
          </>
        ) : (
          <div className="h-32 flex items-center justify-center text-[var(--muted-foreground)] text-sm">
            No preview available
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export const PreviewNode = memo(PreviewNodeComponent);
