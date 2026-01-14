"use client";

import { memo, type ReactNode } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { clsx } from "clsx";
import {
  Image,
  MessageSquare,
  FileText,
  Sparkles,
  Video,
  Brain,
  Maximize2,
  Wand2,
  Layers,
  CheckCircle,
  Eye,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import type {
  NodeType,
  WorkflowNodeData,
  HandleDefinition,
  NodeStatus,
} from "@/types/nodes";
import { NODE_DEFINITIONS } from "@/types/nodes";
import { useUIStore } from "@/store/uiStore";

// Icon mapping
const ICON_MAP: Record<string, typeof Image> = {
  Image,
  MessageSquare,
  FileText,
  Sparkles,
  Video,
  Brain,
  Maximize2,
  Wand2,
  Layers,
  CheckCircle,
  Eye,
  Download,
};

// Handle color classes
const HANDLE_COLORS: Record<string, string> = {
  image: "handle-image",
  video: "handle-video",
  text: "handle-text",
  number: "handle-number",
};

// Status indicator component
function StatusIndicator({ status }: { status: NodeStatus }) {
  switch (status) {
    case "processing":
      return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
    case "complete":
      return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    case "error":
      return <AlertCircle className="w-4 h-4 text-red-400" />;
    default:
      return null;
  }
}

interface BaseNodeProps extends NodeProps {
  children?: ReactNode;
}

function BaseNodeComponent({ id, type, data, selected, children }: BaseNodeProps) {
  const { selectNode, selectedNodeId } = useUIStore();
  const nodeDef = NODE_DEFINITIONS[type as NodeType];
  const nodeData = data as WorkflowNodeData;

  if (!nodeDef) return null;

  const Icon = ICON_MAP[nodeDef.icon] ?? Sparkles;
  const isSelected = selected || selectedNodeId === id;

  // Category colors
  const categoryColors: Record<string, string> = {
    input: "border-emerald-500/50 bg-emerald-500/10",
    ai: "border-purple-500/50 bg-purple-500/10",
    processing: "border-blue-500/50 bg-blue-500/10",
    output: "border-amber-500/50 bg-amber-500/10",
  };

  return (
    <div
      className={clsx(
        "min-w-[200px] rounded-lg border-2 shadow-lg transition-all",
        "bg-[var(--card)]",
        categoryColors[nodeDef.category],
        isSelected && "ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--background)]"
      )}
      onClick={() => selectNode(id)}
    >
      {/* Input Handles */}
      {nodeDef.inputs.map((input: HandleDefinition, index: number) => (
        <Handle
          key={input.id}
          type="target"
          position={Position.Left}
          id={input.id}
          className={clsx("!w-3 !h-3", HANDLE_COLORS[input.type])}
          style={{ top: `${((index + 1) / (nodeDef.inputs.length + 1)) * 100}%` }}
        />
      ))}

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)]">
        <Icon className="w-4 h-4 text-[var(--foreground)]" />
        <span className="text-sm font-medium text-[var(--foreground)] flex-1 truncate">
          {nodeData.label}
        </span>
        <StatusIndicator status={nodeData.status} />
      </div>

      {/* Content */}
      <div className="p-3">
        {children}

        {/* Progress bar */}
        {nodeData.status === "processing" && nodeData.progress !== undefined && (
          <div className="mt-2">
            <div className="h-1 bg-[var(--border)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--primary)] transition-all duration-300"
                style={{ width: `${nodeData.progress}%` }}
              />
            </div>
            <span className="text-xs text-[var(--muted-foreground)] mt-1">
              {nodeData.progress}%
            </span>
          </div>
        )}

        {/* Error message */}
        {nodeData.error && (
          <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
            {nodeData.error}
          </div>
        )}
      </div>

      {/* Output Handles */}
      {nodeDef.outputs.map((output: HandleDefinition, index: number) => (
        <Handle
          key={output.id}
          type="source"
          position={Position.Right}
          id={output.id}
          className={clsx("!w-3 !h-3", HANDLE_COLORS[output.type])}
          style={{ top: `${((index + 1) / (nodeDef.outputs.length + 1)) * 100}%` }}
        />
      ))}
    </div>
  );
}

export const BaseNode = memo(BaseNodeComponent);
