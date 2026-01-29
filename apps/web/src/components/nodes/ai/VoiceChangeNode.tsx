'use client';

import type { VoiceChangeNodeData } from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { AudioLines, Expand, RefreshCw, Video } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { BaseNode } from '@/components/nodes/BaseNode';
import { Button } from '@/components/ui/button';
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
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData<VoiceChangeNodeData>(id, { preserveOriginalAudio: e.target.checked });
    },
    [id, updateNodeData]
  );

  const handleMixLevelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData<VoiceChangeNodeData>(id, { audioMixLevel: parseFloat(e.target.value) });
    },
    [id, updateNodeData]
  );

  const handleProcess = useCallback(() => {
    executeNode(id);
  }, [id, executeNode]);

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
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`preserve-${id}`}
            checked={nodeData.preserveOriginalAudio}
            onChange={handlePreserveOriginalChange}
            className="w-4 h-4 rounded border-[var(--border)]"
          />
          <label htmlFor={`preserve-${id}`} className="text-xs text-[var(--muted-foreground)]">
            Mix with original audio
          </label>
        </div>

        {/* Audio Mix Level (only when preserving original) */}
        {nodeData.preserveOriginalAudio && (
          <div>
            <label className="text-xs text-[var(--muted-foreground)]">
              Mix Level: {Math.round(nodeData.audioMixLevel * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={nodeData.audioMixLevel}
              onChange={handleMixLevelChange}
              className="nodrag w-full h-2 bg-[var(--secondary)] rounded-lg appearance-none cursor-pointer"
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
        {!nodeData.outputVideo && nodeData.status !== 'processing' && (
          <button
            onClick={handleProcess}
            disabled={!hasRequiredInputs}
            className="w-full py-2 bg-[var(--primary)] text-white rounded text-sm font-medium hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Video className="w-4 h-4" />
            {nodeData.preserveOriginalAudio ? 'Mix Audio' : 'Replace Audio'}
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
