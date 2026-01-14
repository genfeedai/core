"use client";

import { memo, useCallback } from "react";
import type { NodeProps } from "@xyflow/react";
import { RefreshCw, Play } from "lucide-react";
import { BaseNode } from "../BaseNode";
import type {
  VideoGenNodeData,
  VideoModel,
  AspectRatio,
  VideoResolution,
  VideoDuration,
} from "@/types/nodes";
import { useWorkflowStore } from "@/store/workflowStore";
import { useExecutionStore } from "@/store/executionStore";

const MODELS: { value: VideoModel; label: string; description: string }[] = [
  { value: "veo-3.1-fast", label: "Veo 3.1 Fast", description: "Fast, $0.10-0.15/sec" },
  { value: "veo-3.1", label: "Veo 3.1", description: "High quality, $0.20-0.40/sec" },
];

const ASPECT_RATIOS: AspectRatio[] = ["16:9", "9:16"];

const RESOLUTIONS: VideoResolution[] = ["720p", "1080p"];

const DURATIONS: VideoDuration[] = [4, 6, 8];

function VideoGenNodeComponent(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as VideoGenNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const executeNode = useExecutionStore((state) => state.executeNode);

  const handleModelChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData<VideoGenNodeData>(id, { model: e.target.value as VideoModel });
    },
    [id, updateNodeData]
  );

  const handleAspectRatioChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData<VideoGenNodeData>(id, { aspectRatio: e.target.value as AspectRatio });
    },
    [id, updateNodeData]
  );

  const handleResolutionChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData<VideoGenNodeData>(id, { resolution: e.target.value as VideoResolution });
    },
    [id, updateNodeData]
  );

  const handleDurationChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData<VideoGenNodeData>(id, { duration: parseInt(e.target.value) as VideoDuration });
    },
    [id, updateNodeData]
  );

  const handleAudioToggle = useCallback(() => {
    updateNodeData<VideoGenNodeData>(id, { generateAudio: !nodeData.generateAudio });
  }, [id, nodeData.generateAudio, updateNodeData]);

  const handleNegativePromptChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData<VideoGenNodeData>(id, { negativePrompt: e.target.value });
    },
    [id, updateNodeData]
  );

  const handleGenerate = useCallback(() => {
    executeNode(id);
  }, [id, executeNode]);

  return (
    <BaseNode {...props}>
      <div className="space-y-3">
        {/* Model Selection */}
        <div>
          <label className="text-xs text-[var(--muted-foreground)]">Model</label>
          <select
            value={nodeData.model}
            onChange={handleModelChange}
            className="w-full px-2 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          >
            {MODELS.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label} - {model.description}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Duration */}
          <div>
            <label className="text-xs text-[var(--muted-foreground)]">Duration</label>
            <select
              value={nodeData.duration}
              onChange={handleDurationChange}
              className="w-full px-2 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {d}s
                </option>
              ))}
            </select>
          </div>

          {/* Resolution */}
          <div>
            <label className="text-xs text-[var(--muted-foreground)]">Resolution</label>
            <select
              value={nodeData.resolution}
              onChange={handleResolutionChange}
              className="w-full px-2 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            >
              {RESOLUTIONS.map((res) => (
                <option key={res} value={res}>
                  {res}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Aspect Ratio */}
        <div>
          <label className="text-xs text-[var(--muted-foreground)]">Aspect Ratio</label>
          <select
            value={nodeData.aspectRatio}
            onChange={handleAspectRatioChange}
            className="w-full px-2 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          >
            {ASPECT_RATIOS.map((ratio) => (
              <option key={ratio} value={ratio}>
                {ratio}
              </option>
            ))}
          </select>
        </div>

        {/* Audio Toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={nodeData.generateAudio}
            onChange={handleAudioToggle}
            className="w-4 h-4 rounded border-[var(--border)] bg-[var(--background)] text-[var(--primary)] focus:ring-[var(--primary)]"
          />
          <span className="text-sm text-[var(--foreground)]">Generate Audio</span>
        </label>

        {/* Negative Prompt */}
        <div>
          <label className="text-xs text-[var(--muted-foreground)]">Negative Prompt</label>
          <input
            type="text"
            value={nodeData.negativePrompt}
            onChange={handleNegativePromptChange}
            placeholder="What to exclude..."
            className="w-full px-2 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
        </div>

        {/* Output Preview */}
        {nodeData.outputVideo && (
          <div className="relative">
            <video
              src={nodeData.outputVideo}
              className="w-full h-32 object-cover rounded"
              controls
            />
            <button
              onClick={handleGenerate}
              disabled={nodeData.status === "processing"}
              className="absolute top-1 right-1 p-1 bg-black/50 rounded-full hover:bg-black/70 transition disabled:opacity-50"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Generate Button */}
        {!nodeData.outputVideo && nodeData.status !== "processing" && (
          <button
            onClick={handleGenerate}
            className="w-full py-2 bg-[var(--primary)] text-white rounded text-sm font-medium hover:opacity-90 transition flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            Generate Video
          </button>
        )}
      </div>
    </BaseNode>
  );
}

export const VideoGenNode = memo(VideoGenNodeComponent);
