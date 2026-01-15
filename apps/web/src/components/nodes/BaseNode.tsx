'use client';

import type { HandleDefinition, NodeStatus, NodeType, WorkflowNodeData } from '@genfeedai/types';
import { NODE_DEFINITIONS } from '@genfeedai/types';
import { Handle, type NodeProps, Position } from '@xyflow/react';
import { clsx } from 'clsx';
import {
  AlertCircle,
  AtSign,
  Brain,
  CheckCircle,
  CheckCircle2,
  Crop,
  Download,
  Eye,
  FileText,
  FileVideo,
  Image,
  Layers,
  Loader2,
  Lock,
  Maximize,
  Maximize2,
  MessageSquare,
  RefreshCw,
  Scissors,
  Share2,
  Sparkles,
  Unlock,
  Video,
  Wand2,
} from 'lucide-react';
import { memo, type ReactNode } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useWorkflowStore } from '@/store/workflowStore';

// Icon mapping
const ICON_MAP: Record<string, typeof Image> = {
  Image,
  MessageSquare,
  FileText,
  FileVideo,
  Sparkles,
  Video,
  Brain,
  Maximize2,
  Wand2,
  Layers,
  Scissors,
  Share2,
  CheckCircle,
  Eye,
  Download,
  AtSign,
  RefreshCw,
  Crop,
  Maximize,
};

// Handle color classes
const HANDLE_COLORS: Record<string, string> = {
  image: 'handle-image',
  video: 'handle-video',
  text: 'handle-text',
  number: 'handle-number',
};

// Status indicator component
function StatusIndicator({ status }: { status: NodeStatus }) {
  switch (status) {
    case 'processing':
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    case 'complete':
      return <CheckCircle2 className="h-4 w-4 text-chart-2" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    default:
      return null;
  }
}

interface BaseNodeProps extends NodeProps {
  children?: ReactNode;
}

function BaseNodeComponent({ id, type, data, selected, children }: BaseNodeProps) {
  const { selectNode, selectedNodeId } = useUIStore();
  const { toggleNodeLock, isNodeLocked } = useWorkflowStore();
  const nodeDef = NODE_DEFINITIONS[type as NodeType];
  const nodeData = data as WorkflowNodeData;

  if (!nodeDef) return null;

  const Icon = ICON_MAP[nodeDef.icon] ?? Sparkles;
  const isSelected = selected || selectedNodeId === id;
  const isLocked = isNodeLocked(id);

  const handleLockToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleNodeLock(id);
  };

  // Category colors - using CSS variables for button access
  const categoryStyles: Record<string, { className: string; cssVar: string }> = {
    input: {
      className:
        'border-[var(--category-input)] bg-[color-mix(in_oklch,var(--category-input)_15%,var(--card))]',
      cssVar: 'var(--category-input)',
    },
    ai: {
      className:
        'border-[var(--category-ai)] bg-[color-mix(in_oklch,var(--category-ai)_15%,var(--card))]',
      cssVar: 'var(--category-ai)',
    },
    processing: {
      className:
        'border-[var(--category-processing)] bg-[color-mix(in_oklch,var(--category-processing)_15%,var(--card))]',
      cssVar: 'var(--category-processing)',
    },
    output: {
      className:
        'border-[var(--category-output)] bg-[color-mix(in_oklch,var(--category-output)_15%,var(--card))]',
      cssVar: 'var(--category-output)',
    },
  };

  const categoryStyle = categoryStyles[nodeDef.category] ?? categoryStyles.input;

  return (
    <div
      className={clsx(
        'relative min-w-[220px] rounded-lg border-2 shadow-lg transition-all',
        categoryStyle.className,
        isSelected && 'ring-2 ring-offset-2 ring-offset-background',
        isLocked && 'opacity-60'
      )}
      style={
        {
          '--node-color': categoryStyle.cssVar,
          ...(isSelected && { '--tw-ring-color': categoryStyle.cssVar }),
        } as React.CSSProperties
      }
      onClick={() => selectNode(id)}
    >
      {/* Input Handles */}
      {nodeDef.inputs.map((input: HandleDefinition, index: number) => (
        <Handle
          key={input.id}
          type="target"
          position={Position.Left}
          id={input.id}
          className={clsx('!w-3 !h-3', HANDLE_COLORS[input.type])}
          style={{ top: `${((index + 1) / (nodeDef.inputs.length + 1)) * 100}%` }}
        />
      ))}

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
        <Icon className="h-4 w-4 text-foreground" />
        <span className="flex-1 truncate text-sm font-medium text-foreground">
          {nodeData.label}
        </span>
        {/* Lock Toggle Button */}
        <button
          onClick={handleLockToggle}
          className={clsx(
            'rounded p-1 transition-colors hover:bg-secondary',
            isLocked ? 'text-chart-3' : 'text-muted-foreground'
          )}
          title={isLocked ? 'Unlock node (L)' : 'Lock node (L)'}
        >
          {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
        </button>
        <StatusIndicator status={nodeData.status} />
      </div>

      {/* Lock Badge */}
      {isLocked && (
        <div className="absolute -right-2 -top-2 rounded bg-chart-3 px-1.5 py-0.5 text-[10px] font-bold text-background">
          LOCKED
        </div>
      )}

      {/* Content */}
      <div className="p-3">
        {children}

        {/* Progress bar */}
        {nodeData.status === 'processing' && nodeData.progress !== undefined && (
          <div className="mt-3">
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${nodeData.progress}%` }}
              />
            </div>
            <span className="mt-1 text-xs text-muted-foreground">{nodeData.progress}%</span>
          </div>
        )}

        {/* Error message */}
        {nodeData.error && (
          <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
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
          className={clsx('!w-3 !h-3', HANDLE_COLORS[output.type])}
          style={{ top: `${((index + 1) / (nodeDef.outputs.length + 1)) * 100}%` }}
        />
      ))}
    </div>
  );
}

export const BaseNode = memo(BaseNodeComponent);
