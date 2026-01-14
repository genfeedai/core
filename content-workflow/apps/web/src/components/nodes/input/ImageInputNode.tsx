"use client";

import { memo, useCallback, useRef } from "react";
import type { NodeProps } from "@xyflow/react";
import { Upload, X } from "lucide-react";
import { BaseNode } from "../BaseNode";
import type { ImageInputNodeData } from "@/types/nodes";
import { useWorkflowStore } from "@/store/workflowStore";

function ImageInputNodeComponent(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as ImageInputNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new window.Image();
        img.onload = () => {
          updateNodeData<ImageInputNodeData>(id, {
            image: event.target?.result as string,
            filename: file.name,
            dimensions: { width: img.width, height: img.height },
            source: "upload",
          });
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    },
    [id, updateNodeData]
  );

  const handleRemoveImage = useCallback(() => {
    updateNodeData<ImageInputNodeData>(id, {
      image: null,
      filename: null,
      dimensions: null,
    });
  }, [id, updateNodeData]);

  const handleUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData<ImageInputNodeData>(id, {
        url: e.target.value,
        source: "url",
      });
    },
    [id, updateNodeData]
  );

  return (
    <BaseNode {...props}>
      <div className="space-y-2">
        {nodeData.image ? (
          <div className="relative">
            <img
              src={nodeData.image}
              alt={nodeData.filename || "Uploaded image"}
              className="w-full h-32 object-cover rounded"
            />
            <button
              onClick={handleRemoveImage}
              className="absolute top-1 right-1 p-1 bg-black/50 rounded-full hover:bg-black/70 transition"
            >
              <X className="w-3 h-3" />
            </button>
            <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-black/50 rounded text-xs">
              {nodeData.dimensions?.width}x{nodeData.dimensions?.height}
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-24 border-2 border-dashed border-[var(--border)] rounded flex flex-col items-center justify-center gap-1 hover:border-[var(--primary)] transition"
          >
            <Upload className="w-5 h-5 text-[var(--muted-foreground)]" />
            <span className="text-xs text-[var(--muted-foreground)]">
              Upload Image
            </span>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="text-xs text-[var(--muted-foreground)]">
          Or paste URL:
        </div>
        <input
          type="url"
          value={nodeData.url || ""}
          onChange={handleUrlChange}
          placeholder="https://..."
          className="w-full px-2 py-1.5 text-xs bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
        />
      </div>
    </BaseNode>
  );
}

export const ImageInputNode = memo(ImageInputNodeComponent);
