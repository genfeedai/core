'use client';

import type { HandleDefinition, NodeStatus, NodeType, WorkflowNodeData } from '@genfeedai/types';
import { NODE_DEFINITIONS } from '@genfeedai/types';
import { Handle, type NodeProps, Position } from '@xyflow/react';
import { clsx } from 'clsx';
import {
  AlertCircle,
  AtSign,
  AudioLines,
  Brain,
  CheckCircle,
  CheckCircle2,
  Crop,
  Download,
  Eye,
  FileText,
  FileVideo,
  Film,
  Image,
  Layers,
  Loader2,
  Lock,
  Maximize,
  Maximize2,
  MessageSquare,
  Mic,
  RefreshCw,
  RotateCcw,
  Scissors,
  Share2,
  Sparkles,
  Unlock,
  Video,
  Volume2,
  Wand2,
} from 'lucide-react';
import { memo, type ReactNode, useCallback } from 'react';
import { useOptimalHandleOrder } from '@/hooks/useOptimalHandleOrder';
import { useExecutionStore } from '@/store/executionStore';
import { useUIStore } from '@/store/uiStore';
import { useWorkflowStore } from '@/store/workflowStore';

// Icon mapping
const ICON_MAP: Record<string, typeof Image> = {
  Image,
  MessageSquare,
  FileText,
  FileVideo,
  Film,
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
  Mic,
  AudioLines,
  Volume2,
};

// Handle color classes
const HANDLE_COLORS: Record<string, string> = {
  image: 'handle-image',
  video: 'handle-video',
  text: 'handle-text',
  number: 'handle-number',
  audio: 'handle-audio',
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
  const { executeNode, isRunning } = useExecutionStore();
  const nodeDef = NODE_DEFINITIONS[type as NodeType];
  const nodeData = data as WorkflowNodeData;

  // Get optimally ordered input handles to minimize edge crossings
  const sortedInputs = useOptimalHandleOrder(id, nodeDef?.inputs ?? []);

  const handleRetry = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isRunning) {
        executeNode(id);
      }
    },
    [id, isRunning, executeNode]
  );

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
      className: 'border-[var(--category-input)] bg-card',
      cssVar: 'var(--category-input)',
    },
    ai: {
      className: 'border-[var(--category-ai)] bg-card',
      cssVar: 'var(--category-ai)',
    },
    processing: {
      className: 'border-[var(--category-processing)] bg-card',
      cssVar: 'var(--category-processing)',
    },
    output: {
      className: 'border-[var(--category-output)] bg-card',
      cssVar: 'var(--category-output)',
    },
  };

  const categoryStyle = categoryStyles[nodeDef.category] ?? categoryStyles.input;

  const isProcessing = nodeData.status === 'processing';

  return (
    <div
      className={clsx(
        'relative min-w-[220px] rounded-lg border shadow-lg transition-all',
        categoryStyle.className,
        isSelected && 'ring-2',
        isLocked && 'opacity-60',
        isProcessing && 'node-processing'
      )}
      style={
        {
          '--node-color': categoryStyle.cssVar,
          ...(isSelected && { '--tw-ring-color': categoryStyle.cssVar }),
        } as React.CSSProperties
      }
      onClick={() => selectNode(id)}
    >
      {/* Input Handles - sorted to minimize edge crossings */}
      {sortedInputs.map((input: HandleDefinition, index: number) => (
        <Handle
          key={input.id}
          type="target"
          position={Position.Left}
          id={input.id}
          className={clsx('!w-3 !h-3', HANDLE_COLORS[input.type])}
          style={{ top: `${((index + 1) / (sortedInputs.length + 1)) * 100}%` }}
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
          <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 p-2">
            <p className="text-xs text-destructive">{nodeData.error}</p>
            <button
              onClick={handleRetry}
              disabled={isRunning}
              className={clsx(
                'mt-2 flex w-full items-center justify-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors',
                isRunning
                  ? 'cursor-not-allowed bg-muted text-muted-foreground'
                  : 'bg-destructive/20 text-destructive hover:bg-destructive/30'
              )}
            >
              <RotateCcw className="h-3 w-3" />
              Retry
            </button>
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
