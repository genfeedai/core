"use client";

import { memo, useCallback } from "react";
import type { NodeProps } from "@xyflow/react";
import { RefreshCw, Layers } from "lucide-react";
import { BaseNode } from "../BaseNode";
import type { VideoStitchNodeData, TransitionType } from "@/types/nodes";
import { useWorkflowStore } from "@/store/workflowStore";
import { useExecutionStore } from "@/store/executionStore";

const TRANSITIONS: { value: TransitionType; label: string }[] = [
  { value: "cut", label: "Cut (No transition)" },
  { value: "crossfade", label: "Crossfade" },
  { value: "fade", label: "Fade to Black" },
  { value: "wipe", label: "Wipe" },
];

function VideoStitchNodeComponent(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as VideoStitchNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const executeNode = useExecutionStore((state) => state.executeNode);

  const handleTransitionChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData<VideoStitchNodeData>(id, {
        transitionType: e.target.value as TransitionType,
      });
    },
    [id, updateNodeData]
  );

  const handleDurationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData<VideoStitchNodeData>(id, {
        transitionDuration: parseFloat(e.target.value),
      });
    },
    [id, updateNodeData]
  );

  const handleLoopToggle = useCallback(() => {
    updateNodeData<VideoStitchNodeData>(id, {
      seamlessLoop: !nodeData.seamlessLoop,
    });
  }, [id, nodeData.seamlessLoop, updateNodeData]);

  const handleProcess = useCallback(() => {
    executeNode(id);
  }, [id, executeNode]);

  return (
    <BaseNode {...props}>
      <div className="space-y-3">
        {/* Input Videos Info */}
        <div className="p-2 bg-[var(--background)] rounded border border-[var(--border)]">
          <div className="text-xs text-[var(--muted-foreground)]">
            Input Videos: {nodeData.inputVideos.length}
          </div>
          {nodeData.inputVideos.length > 0 && (
            <div className="mt-1 flex gap-1 flex-wrap">
              {nodeData.inputVideos.map((_, index) => (
                <div
                  key={index}
                  className="w-6 h-6 bg-[var(--primary)]/20 rounded text-xs flex items-center justify-center text-[var(--primary)]"
                >
                  {index + 1}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Transition Type */}
        <div>
          <label className="text-xs text-[var(--muted-foreground)]">Transition</label>
          <select
            value={nodeData.transitionType}
            onChange={handleTransitionChange}
            className="w-full px-2 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          >
            {TRANSITIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Transition Duration */}
        {nodeData.transitionType !== "cut" && (
          <div>
            <label className="text-xs text-[var(--muted-foreground)]">
              Duration: {nodeData.transitionDuration.toFixed(1)}s
            </label>
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.1"
              value={nodeData.transitionDuration}
              onChange={handleDurationChange}
              className="w-full h-2 bg-[var(--border)] rounded-lg appearance-none cursor-pointer"
            />
          </div>
        )}

        {/* Seamless Loop Toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={nodeData.seamlessLoop}
            onChange={handleLoopToggle}
            className="w-4 h-4 rounded border-[var(--border)] bg-[var(--background)] text-[var(--primary)] focus:ring-[var(--primary)]"
          />
          <span className="text-sm text-[var(--foreground)]">Seamless Loop</span>
        </label>

        {/* Output Preview */}
        {nodeData.outputVideo && (
          <div className="relative">
            <video
              src={nodeData.outputVideo}
              className="w-full h-20 object-cover rounded"
              controls
              loop={nodeData.seamlessLoop}
            />
            <button
              onClick={handleProcess}
              disabled={nodeData.status === "processing"}
              className="absolute top-1 right-1 p-1 bg-black/50 rounded-full hover:bg-black/70 transition disabled:opacity-50"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Process Button */}
        {!nodeData.outputVideo && nodeData.status !== "processing" && (
          <button
            onClick={handleProcess}
            disabled={nodeData.inputVideos.length < 2}
            className="w-full py-2 bg-[var(--primary)] text-white rounded text-sm font-medium hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Layers className="w-4 h-4" />
            Stitch Videos
          </button>
        )}

        {nodeData.inputVideos.length < 2 && !nodeData.outputVideo && (
          <div className="text-xs text-[var(--muted-foreground)] text-center">
            Connect at least 2 videos to stitch
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export const VideoStitchNode = memo(VideoStitchNodeComponent);
