'use client';

import type { VoiceChangeNodeData } from '@genfeedai/types';
import { NODE_STATUS } from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { AudioLines, Expand, Loader2, RefreshCw, Video } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { BaseNode } from '@/components/nodes/BaseNode';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { useExecutionStore } from '@/store/executionStore';
import { useUIStore } from '@/store/uiStore';
import { useWorkflowStore } from '@/store/workflowStore';

function VoiceChangeNodeComponent(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as VoiceChangeNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const executeNode = useExecutionStore((state) => state.executeNode);
  const openNodeDetailModal = useUIStore((state) => state.openNodeDetailModal);

  const handlePreserveOriginalChange = useCallback(
    (checked: boolean | 'indeterminate') => {
      if (typeof checked === 'boolean') {
        updateNodeData<VoiceChangeNodeData>(id, { preserveOriginalAudio: checked });
      }
    },
    [id, updateNodeData]
  );

  const handleMixLevelChange = useCallback(
    ([value]: number[]) => {
      updateNodeData<VoiceChangeNodeData>(id, { audioMixLevel: value });
    },
    [id, updateNodeData]
  );

  const handleProcess = useCallback(() => {
    updateNodeData(id, { status: NODE_STATUS.processing });
    executeNode(id);
  }, [id, executeNode, updateNodeData]);

  const handleExpand = useCallback(() => {
    openNodeDetailModal(id, 'preview');
  }, [id, openNodeDetailModal]);

  const hasRequiredInputs = nodeData.inputVideo && nodeData.inputAudio;

  const headerActions = useMemo(
    () =>
      nodeData.outputVideo ? (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleExpand}
          className="h-5 w-5"
          title="Expand preview"
        >
          <Expand className="h-3 w-3" />
        </Button>
      ) : null,
    [nodeData.outputVideo, handleExpand]
  );

  return (
    <BaseNode {...props} headerActions={headerActions}>
      <div className="space-y-3">
        {/* Preserve Original Audio Toggle */}
        <div className="flex items-center gap-2 nodrag">
          <Checkbox
            id={`preserve-${id}`}
            checked={nodeData.preserveOriginalAudio}
            onCheckedChange={handlePreserveOriginalChange}
          />
          <label
            htmlFor={`preserve-${id}`}
            className="text-xs text-[var(--muted-foreground)] cursor-pointer"
          >
            Mix with original audio
          </label>
        </div>

        {/* Audio Mix Level (only when preserving original) */}
        {nodeData.preserveOriginalAudio && (
          <div>
            <label className="text-xs text-[var(--muted-foreground)]">
              Mix Level: {Math.round(nodeData.audioMixLevel * 100)}%
            </label>
            <Slider
              value={[nodeData.audioMixLevel]}
              min={0}
              max={1}
              step={0.05}
              onValueChange={handleMixLevelChange}
              className="nodrag w-full"
            />
            <div className="flex justify-between text-[10px] text-[var(--muted-foreground)]">
              <span>Original</span>
              <span>New</span>
            </div>
          </div>
        )}

        {/* Output Video Preview */}
        {nodeData.outputVideo && (
          <div className="relative">
            <video
              src={nodeData.outputVideo}
              controls
              className="w-full rounded border border-[var(--border)]"
            />
            <button
              onClick={handleProcess}
              disabled={nodeData.status === 'processing' || !hasRequiredInputs}
              className="absolute top-1 right-1 p-1 bg-black/50 rounded-full hover:bg-black/70 transition disabled:opacity-50"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Process Button */}
        {!nodeData.outputVideo && (
          <button
            onClick={handleProcess}
            disabled={!hasRequiredInputs || nodeData.status === 'processing'}
            className="w-full py-2 bg-[var(--primary)] text-white rounded text-sm font-medium hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {nodeData.status === 'processing' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Video className="w-4 h-4" />
            )}
            {nodeData.status === 'processing'
              ? 'Processing...'
              : nodeData.preserveOriginalAudio
                ? 'Mix Audio'
                : 'Replace Audio'}
          </button>
        )}

        {/* Help text for required inputs */}
        {!hasRequiredInputs && nodeData.status !== 'processing' && (
          <div className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
            <AudioLines className="w-3 h-3" />
            Connect video + new audio
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export const VoiceChangeNode = memo(VoiceChangeNodeComponent);
