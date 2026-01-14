"use client";

import { memo, useCallback } from "react";
import type { NodeProps } from "@xyflow/react";
import { RefreshCw } from "lucide-react";
import { BaseNode } from "../BaseNode";
import type { ImageGenNodeData, ImageModel, AspectRatio, Resolution, OutputFormat } from "@/types/nodes";
import { useWorkflowStore } from "@/store/workflowStore";
import { useExecutionStore } from "@/store/executionStore";

const MODELS: { value: ImageModel; label: string; description: string }[] = [
  { value: "nano-banana", label: "Nano Banana", description: "Fast, $0.039/image" },
  { value: "nano-banana-pro", label: "Nano Banana Pro", description: "High quality, $0.15-0.30/image" },
];

const ASPECT_RATIOS: AspectRatio[] = ["1:1", "16:9", "9:16", "4:3", "3:4", "4:5", "5:4", "2:3", "3:2"];

const RESOLUTIONS: Resolution[] = ["1K", "2K", "4K"];

const OUTPUT_FORMATS: OutputFormat[] = ["jpg", "png", "webp"];

function ImageGenNodeComponent(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as ImageGenNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const executeNode = useExecutionStore((state) => state.executeNode);

  const handleModelChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData<ImageGenNodeData>(id, { model: e.target.value as ImageModel });
    },
    [id, updateNodeData]
  );

  const handleAspectRatioChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData<ImageGenNodeData>(id, { aspectRatio: e.target.value as AspectRatio });
    },
    [id, updateNodeData]
  );

  const handleResolutionChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData<ImageGenNodeData>(id, { resolution: e.target.value as Resolution });
    },
    [id, updateNodeData]
  );

  const handleFormatChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData<ImageGenNodeData>(id, { outputFormat: e.target.value as OutputFormat });
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

        {/* Resolution (only for Pro) */}
        {nodeData.model === "nano-banana-pro" && (
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
        )}

        {/* Output Format */}
        <div>
          <label className="text-xs text-[var(--muted-foreground)]">Format</label>
          <select
            value={nodeData.outputFormat}
            onChange={handleFormatChange}
            className="w-full px-2 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          >
            {OUTPUT_FORMATS.map((format) => (
              <option key={format} value={format}>
                {format.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Output Preview */}
        {nodeData.outputImage && (
          <div className="relative">
            <img
              src={nodeData.outputImage}
              alt="Generated image"
              className="w-full h-32 object-cover rounded"
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

        {/* Generate Button (when no output) */}
        {!nodeData.outputImage && nodeData.status !== "processing" && (
          <button
            onClick={handleGenerate}
            className="w-full py-2 bg-[var(--primary)] text-white rounded text-sm font-medium hover:opacity-90 transition"
          >
            Generate Image
          </button>
        )}
      </div>
    </BaseNode>
  );
}

export const ImageGenNode = memo(ImageGenNodeComponent);
