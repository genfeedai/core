"use client";

import { memo, useCallback } from "react";
import type { NodeProps } from "@xyflow/react";
import { BaseNode } from "../BaseNode";
import type { PromptNodeData } from "@/types/nodes";
import { useWorkflowStore } from "@/store/workflowStore";

function PromptNodeComponent(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as PromptNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  const handlePromptChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData<PromptNodeData>(id, { prompt: e.target.value });
    },
    [id, updateNodeData]
  );

  return (
    <BaseNode {...props}>
      <textarea
        value={nodeData.prompt || ""}
        onChange={handlePromptChange}
        placeholder="Enter your prompt..."
        className="w-full h-20 px-2 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded resize-none focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
      />
    </BaseNode>
  );
}

export const PromptNode = memo(PromptNodeComponent);
