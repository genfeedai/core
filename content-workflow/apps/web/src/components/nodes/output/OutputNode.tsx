"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { CheckCircle, Download } from "lucide-react";
import { BaseNode } from "../BaseNode";
import type { OutputNodeData } from "@/types/nodes";

function OutputNodeComponent(props: NodeProps) {
  const { data } = props;
  const nodeData = data as OutputNodeData;

  const handleDownload = () => {
    if (!nodeData.inputMedia) return;

    const link = document.createElement("a");
    link.href = nodeData.inputMedia;
    link.download = `${nodeData.outputName || "output"}.${nodeData.inputType === "video" ? "mp4" : "png"}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <BaseNode {...props}>
      <div className="space-y-3">
        {nodeData.inputMedia ? (
          <>
            {/* Preview */}
            {nodeData.inputType === "video" ? (
              <video
                src={nodeData.inputMedia}
                className="w-full h-32 object-cover rounded"
                controls
              />
            ) : nodeData.inputType === "image" ? (
              <img
                src={nodeData.inputMedia}
                alt="Output"
                className="w-full h-32 object-cover rounded"
              />
            ) : (
              <div className="p-2 bg-[var(--background)] rounded border border-[var(--border)] text-sm max-h-32 overflow-y-auto">
                {String(nodeData.inputMedia)}
              </div>
            )}

            {/* Success indicator */}
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Output Ready</span>
            </div>

            {/* Download button */}
            <button
              onClick={handleDownload}
              className="w-full py-2 bg-[var(--accent)] text-white rounded text-sm font-medium hover:opacity-90 transition flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </>
        ) : (
          <div className="h-32 flex flex-col items-center justify-center text-[var(--muted-foreground)]">
            <CheckCircle className="w-8 h-8 mb-2 opacity-30" />
            <span className="text-sm">Waiting for input...</span>
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export const OutputNode = memo(OutputNodeComponent);
