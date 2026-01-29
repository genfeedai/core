'use client';

import type { HandleDefinition, NodeStatus, NodeType, WorkflowNodeData } from '@genfeedai/types';
import { NODE_DEFINITIONS, NODE_STATUS } from '@genfeedai/types';
import { Handle, type NodeProps, NodeResizer, Position } from '@xyflow/react';
import { clsx } from 'clsx';
import {
  AlertCircle,
  ArrowLeftFromLine,
  ArrowRightToLine,
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
  GitBranch,
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
import { memo, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { PreviewTooltip } from '@/components/nodes/PreviewTooltip';
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
  // Composition icons
  ArrowRightToLine,
  ArrowLeftFromLine,
  GitBranch,
};

// Handle color CSS variables (used inline for guaranteed override)
const HANDLE_COLORS: Record<string, string> = {
  image: 'var(--handle-image)',
  video: 'var(--handle-video)',
  text: 'var(--handle-text)',
  number: 'var(--handle-number)',
  audio: 'var(--handle-audio)',
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
  headerActions?: ReactNode;
  title?: string;
  titleElement?: ReactNode;
  /** Input handle IDs that should appear disabled (reduced opacity) when model doesn't support them */
  disabledInputs?: string[];
}

// Hover delay for showing preview tooltip (ms)
const HOVER_DELAY = 300;

function BaseNodeComponent({
  id,
  type,
  data,
  selected,
  children,
  headerActions,
  title,
  titleElement,
  width,
  height,
  disabledInputs,
}: BaseNodeProps) {
  // Check if node has been manually resized (has explicit dimensions)
  const isResized = width !== undefined || height !== undefined;
  const { selectNode, selectedNodeId, highlightedNodeIds } = useUIStore();
  const { toggleNodeLock, isNodeLocked, updateNodeData } = useWorkflowStore();
  const { executeNode, isRunning } = useExecutionStore();
  const nodeDef = NODE_DEFINITIONS[type as NodeType];
  const nodeData = data as WorkflowNodeData;

  // Hover preview tooltip state
  const nodeRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  // Determine if this node should be highlighted (no selection = all highlighted)
  const isHighlighted = highlightedNodeIds.length === 0 || highlightedNodeIds.includes(id);

  // Use static handle order from node definition
  // Auto-layout handles node positioning to minimize edge crossings
  const sortedInputs = nodeDef?.inputs ?? [];

  const handleRetry = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isRunning) {
        // Clear error and set to processing before retrying
        updateNodeData(id, { error: null, status: NODE_STATUS.processing });
        executeNode(id);
      }
    },
    [id, isRunning, executeNode, updateNodeData]
  );

  // Hover handlers for preview tooltip
  const handleMouseEnter = useCallback(() => {
    // Start delay timer
    hoverTimeoutRef.current = setTimeout(() => {
      if (nodeRef.current) {
        setAnchorRect(nodeRef.current.getBoundingClientRect());
      }
      setShowTooltip(true);
    }, HOVER_DELAY);
  }, []);

  const handleMouseLeave = useCallback(() => {
    // Clear timeout if not yet shown
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setShowTooltip(false);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  if (!nodeDef) return null;

  const Icon = ICON_MAP[nodeDef.icon] ?? Sparkles;
  const isSelected = selected || selectedNodeId === id;
  const isLocked = isNodeLocked(id);

  const handleLockToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleNodeLock(id);
  };

  // Category CSS variables (for processing glow, resizer handles)
  const categoryCssVars: Record<string, string> = {
    input: 'var(--category-input)',
    ai: 'var(--category-ai)',
    processing: 'var(--category-processing)',
    output: 'var(--category-output)',
    composition: 'var(--category-composition)',
  };

  const categoryColor = categoryCssVars[nodeDef.category] ?? categoryCssVars.input;

  const isProcessing = nodeData.status === 'processing';

  return (
    <>
      {/* Resizer - only shown when selected and not locked */}
      <NodeResizer
        isVisible={isSelected && !isLocked}
        minWidth={220}
        minHeight={100}
        maxWidth={500}
        lineClassName="!border-transparent"
        handleClassName="!w-2.5 !h-2.5 !border-0 !rounded-sm"
        handleStyle={{ backgroundColor: categoryColor }}
      />
      <div
        ref={nodeRef}
        className={clsx(
          'relative flex flex-col rounded-lg border border-border bg-card shadow-lg transition-all duration-200',
          // Only apply min/max width if node hasn't been manually resized
          !isResized && 'min-w-[220px] max-w-[320px]',
          isSelected && 'ring-2 ring-primary',
          isLocked && 'opacity-60',
          isProcessing && 'node-processing',
          !isHighlighted && !isSelected && 'opacity-40'
        )}
        style={
          {
            // Category color used for processing glow animation
            '--node-color': categoryColor,
            // When resized, use explicit dimensions
            ...(isResized && {
              width: width ? `${width}px` : undefined,
              height: height ? `${height}px` : undefined,
            }),
          } as React.CSSProperties
        }
        onClick={() => selectNode(id)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Input Handles - sorted to minimize edge crossings */}
        {sortedInputs.map((input: HandleDefinition, index: number) => {
          const isDisabled = disabledInputs?.includes(input.id);
          return (
            <Handle
              key={input.id}
              type="target"
              position={Position.Left}
              id={input.id}
              className={clsx('!w-3 !h-3', isDisabled && 'opacity-30')}
              style={{
                top: `${((index + 1) / (sortedInputs.length + 1)) * 100}%`,
                background: HANDLE_COLORS[input.type],
              }}
            />
          );
        })}

        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
          <Icon className="h-4 w-4 text-foreground" />
          {titleElement ?? (
            <span className="flex-1 truncate text-sm font-medium text-left text-foreground">
              {title ?? nodeData.label}
            </span>
          )}
          {headerActions}
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
        <div className="flex-1 flex flex-col p-3 min-h-0">
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

        {/* Output Handles - always cyan */}
        {nodeDef.outputs.map((output: HandleDefinition, index: number) => (
          <Handle
            key={output.id}
            type="source"
            position={Position.Right}
            id={output.id}
            className="!w-3 !h-3 handle-output"
            style={{ top: `${((index + 1) / (nodeDef.outputs.length + 1)) * 100}%` }}
          />
        ))}
      </div>

      {/* Preview Tooltip - shows on hover after delay */}
      <PreviewTooltip
        nodeType={type as NodeType}
        nodeData={nodeData}
        anchorRect={anchorRect}
        isVisible={showTooltip && !isSelected}
      />
    </>
  );
}

export const BaseNode = memo(BaseNodeComponent);
