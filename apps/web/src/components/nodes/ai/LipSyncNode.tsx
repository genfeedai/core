'use client';

import { BaseNode } from '@/components/nodes/BaseNode';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useExecutionStore } from '@/store/executionStore';
import { useUIStore } from '@/store/uiStore';
import { useWorkflowStore } from '@/store/workflowStore';
import type { LipSyncMode, LipSyncModel, LipSyncNodeData } from '@genfeedai/types';
import { NODE_STATUS } from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { Expand, Loader2, Mic, RefreshCw, Video } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';

const MODELS: { value: LipSyncModel; label: string; supportsImage: boolean }[] = [
  { value: 'bytedance/omni-human', label: 'OmniHuman (Image)', supportsImage: true },
  { value: 'veed/fabric-1.0', label: 'VEED Fabric (Image)', supportsImage: true },
  { value: 'sync/lipsync-2-pro', label: 'Sync Labs Pro (Video)', supportsImage: false },
  { value: 'sync/lipsync-2', label: 'Sync Labs (Video)', supportsImage: false },
  { value: 'pixverse/lipsync', label: 'Pixverse', supportsImage: true },
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
    (value: string) => {
      updateNodeData<LipSyncNodeData>(id, { model: value as LipSyncModel });
    },
    [id, updateNodeData]
  );

  const handleSyncModeChange = useCallback(
    (value: string) => {
      updateNodeData<LipSyncNodeData>(id, { syncMode: value as LipSyncMode });
    },
    [id, updateNodeData]
  );

  const handleTemperatureChange = useCallback(
    ([value]: number[]) => {
      updateNodeData<LipSyncNodeData>(id, { temperature: value });
    },
    [id, updateNodeData]
  );

  const handleActiveSpeakerChange = useCallback(
    (checked: boolean | 'indeterminate') => {
      if (typeof checked === 'boolean') {
        updateNodeData<LipSyncNodeData>(id, { activeSpeaker: checked });
      }
    },
    [id, updateNodeData]
  );

  const handleGenerate = useCallback(() => {
    updateNodeData(id, { status: NODE_STATUS.processing });
    executeNode(id);
  }, [id, executeNode, updateNodeData]);

  const handleExpand = useCallback(() => {
    openNodeDetailModal(id, 'preview');
  }, [id, openNodeDetailModal]);

  const currentModel = MODELS.find((m) => m.value === nodeData.model);
  const isSyncModel = nodeData.model.startsWith('sync/');
  const supportsImage = currentModel?.supportsImage ?? false;

  // Image-native models need audio + image; video models need audio + video (or image which gets converted)
  const hasRequiredInputs = nodeData.inputAudio && (nodeData.inputImage || nodeData.inputVideo);

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
          <Select value={nodeData.model} onValueChange={handleModelChange}>
            <SelectTrigger className="nodrag h-8 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODELS.map((model) => (
                <SelectItem key={model.value} value={model.value}>
                  {model.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sync Mode (only for Sync Labs models) */}
        {isSyncModel && (
          <div>
            <label className="text-xs text-[var(--muted-foreground)]">Sync Mode</label>
            <Select value={nodeData.syncMode} onValueChange={handleSyncModeChange}>
              <SelectTrigger className="nodrag h-8 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SYNC_MODES.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Temperature Slider */}
        <div>
          <label className="text-xs text-[var(--muted-foreground)]">
            Temperature: {nodeData.temperature.toFixed(2)}
          </label>
          <Slider
            value={[nodeData.temperature]}
            min={0}
            max={1}
            step={0.05}
            onValueChange={handleTemperatureChange}
            className="nodrag w-full"
          />
        </div>

        {/* Active Speaker Toggle (only for Sync Labs models) */}
        {isSyncModel && (
          <div className="flex items-center gap-2 nodrag">
            <Checkbox
              id={`active-speaker-${id}`}
              checked={nodeData.activeSpeaker}
              onCheckedChange={handleActiveSpeakerChange}
            />
            <label
              htmlFor={`active-speaker-${id}`}
              className="text-xs text-[var(--muted-foreground)] cursor-pointer"
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
        {!nodeData.outputVideo && (
          <button
            onClick={handleGenerate}
            disabled={!hasRequiredInputs || nodeData.status === 'processing'}
            className="w-full py-2 bg-[var(--primary)] text-white rounded text-sm font-medium hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {nodeData.status === 'processing' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Video className="w-4 h-4" />
            )}
            {nodeData.status === 'processing' ? 'Generating...' : 'Generate Lip Sync'}
          </button>
        )}

        {/* Help text for required inputs */}
        {!hasRequiredInputs && nodeData.status !== 'processing' && (
          <div className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
            <Mic className="w-3 h-3" />
            {supportsImage
              ? 'Connect audio + image to generate'
              : 'Connect audio + video to generate'}
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export const LipSyncNode = memo(LipSyncNodeComponent);
