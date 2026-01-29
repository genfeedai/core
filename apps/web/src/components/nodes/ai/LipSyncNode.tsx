'use client';

import { BaseNode } from '@/components/nodes/BaseNode';
import { Button } from '@/components/ui/button';
import { useExecutionStore } from '@/store/executionStore';
import { useUIStore } from '@/store/uiStore';
import { useWorkflowStore } from '@/store/workflowStore';
import type { LipSyncMode, LipSyncModel, LipSyncNodeData } from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { Expand, Mic, RefreshCw, Video } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';

const MODELS: { value: LipSyncModel; label: string }[] = [
  { value: 'sync/lipsync-2-pro', label: 'Sync Labs Pro' },
  { value: 'sync/lipsync-2', label: 'Sync Labs' },
  { value: 'pixverse/lipsync', label: 'Pixverse' },
];

const SYNC_MODES: { value: LipSyncMode; label: string }[] = [
  { value: 'loop', label: 'Loop' },
  { value: 'bounce', label: 'Bounce' },
  { value: 'cut_off', label: 'Cut Off' },
  { value: 'silence', label: 'Silence' },
  { value: 'remap', label: 'Remap' },
];

function LipSyncNodeComponent(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as LipSyncNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const executeNode = useExecutionStore((state) => state.executeNode);
  const openNodeDetailModal = useUIStore((state) => state.openNodeDetailModal);

  const handleModelChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData<LipSyncNodeData>(id, { model: e.target.value as LipSyncModel });
    },
    [id, updateNodeData]
  );

  const handleSyncModeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData<LipSyncNodeData>(id, { syncMode: e.target.value as LipSyncMode });
    },
    [id, updateNodeData]
  );

  const handleTemperatureChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData<LipSyncNodeData>(id, { temperature: parseFloat(e.target.value) });
    },
    [id, updateNodeData]
  );

  const handleActiveSpeakerChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData<LipSyncNodeData>(id, { activeSpeaker: e.target.checked });
    },
    [id, updateNodeData]
  );

  const handleGenerate = useCallback(() => {
    executeNode(id);
  }, [id, executeNode]);

  const handleExpand = useCallback(() => {
    openNodeDetailModal(id, 'preview');
  }, [id, openNodeDetailModal]);

  const hasRequiredInputs = nodeData.inputAudio && (nodeData.inputImage || nodeData.inputVideo);
  const isSyncModel = nodeData.model.startsWith('sync/');

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
                {model.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sync Mode (only for Sync Labs models) */}
        {isSyncModel && (
          <div>
            <label className="text-xs text-[var(--muted-foreground)]">Sync Mode</label>
            <select
              value={nodeData.syncMode}
              onChange={handleSyncModeChange}
              className="w-full px-2 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            >
              {SYNC_MODES.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Temperature Slider */}
        <div>
          <label className="text-xs text-[var(--muted-foreground)]">
            Temperature: {nodeData.temperature.toFixed(2)}
          </label>

          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={nodeData.temperature}
            onChange={handleTemperatureChange}
            className="nodrag w-full h-2 bg-[var(--secondary)] rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Active Speaker Toggle (only for Sync Labs models) */}
        {isSyncModel && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`active-speaker-${id}`}
              checked={nodeData.activeSpeaker}
              onChange={handleActiveSpeakerChange}
              className="w-4 h-4 rounded border-[var(--border)]"
            />
            <label
              htmlFor={`active-speaker-${id}`}
              className="text-xs text-[var(--muted-foreground)]"
            >
              Active speaker detection
            </label>
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
              onClick={handleGenerate}
              disabled={nodeData.status === 'processing' || !hasRequiredInputs}
              className="absolute top-1 right-1 p-1 bg-black/50 rounded-full hover:bg-black/70 transition disabled:opacity-50"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Generate Button */}
        {!nodeData.outputVideo && nodeData.status !== 'processing' && (
          <button
            onClick={handleGenerate}
            disabled={!hasRequiredInputs}
            className="w-full py-2 bg-[var(--primary)] text-white rounded text-sm font-medium hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Video className="w-4 h-4" />
            Generate Lip Sync
          </button>
        )}

        {/* Help text for required inputs */}
        {!hasRequiredInputs && nodeData.status !== 'processing' && (
          <div className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
            <Mic className="w-3 h-3" />
            Connect audio + image/video to generate
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export const LipSyncNode = memo(LipSyncNodeComponent);
