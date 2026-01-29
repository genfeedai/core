'use client';

import type { AnimationNodeData, EasingPreset } from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { AlertCircle, Expand, RefreshCw, Wand2 } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { BaseNode } from '@/components/nodes/BaseNode';
import { Button } from '@/components/ui/button';
import { useRequiredInputs } from '@/hooks/useRequiredInputs';
import { EASING_PRESETS } from '@/lib/easing/presets';
import { useExecutionStore } from '@/store/executionStore';
import { useUIStore } from '@/store/uiStore';
import { useWorkflowStore } from '@/store/workflowStore';

const PRESET_OPTIONS: { value: EasingPreset; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'easeIn', label: 'Ease In' },
  { value: 'easeOut', label: 'Ease Out' },
  { value: 'easeInOut', label: 'Ease In Out' },
  { value: 'easeInQuad', label: 'Ease In Quad' },
  { value: 'easeOutQuad', label: 'Ease Out Quad' },
  { value: 'easeInOutQuad', label: 'Ease In Out Quad' },
  { value: 'easeInCubic', label: 'Ease In Cubic' },
  { value: 'easeOutCubic', label: 'Ease Out Cubic' },
  { value: 'easeInOutCubic', label: 'Ease In Out Cubic' },
  { value: 'easeInExpo', label: 'Ease In Expo' },
  { value: 'easeOutExpo', label: 'Ease Out Expo' },
  { value: 'easeInOutExpo', label: 'Ease In Out Expo' },
];

function AnimationNodeComponent(props: NodeProps) {
  const { id, type, data } = props;
  const nodeData = data as AnimationNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const executeNode = useExecutionStore((state) => state.executeNode);
  const openNodeDetailModal = useUIStore((state) => state.openNodeDetailModal);
  const { hasRequiredInputs } = useRequiredInputs(id, type as 'animation');

  const handleCurveTypeChange = useCallback(
    (type: 'preset' | 'custom') => {
      updateNodeData<AnimationNodeData>(id, { curveType: type });
    },
    [id, updateNodeData]
  );

  const handlePresetChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const preset = e.target.value as EasingPreset;
      updateNodeData<AnimationNodeData>(id, {
        preset,
        customCurve: EASING_PRESETS[preset],
      });
    },
    [id, updateNodeData]
  );

  const handleSpeedChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData<AnimationNodeData>(id, {
        speedMultiplier: parseFloat(e.target.value),
      });
    },
    [id, updateNodeData]
  );

  const handleProcess = useCallback(() => {
    executeNode(id);
  }, [id, executeNode]);

  const handleExpand = useCallback(() => {
    openNodeDetailModal(id, 'preview');
  }, [id, openNodeDetailModal]);

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

  // SVG curve preview - fallback to easeInOutCubic if customCurve is undefined
  const curve = nodeData.customCurve ?? [0.645, 0.045, 0.355, 1];
  const pathD = `M 0 100 C ${curve[0] * 100} ${100 - curve[1] * 100}, ${curve[2] * 100} ${100 - curve[3] * 100}, 100 0`;

  return (
    <BaseNode {...props} headerActions={headerActions}>
      <div className="space-y-3">
        {/* Curve Type Toggle */}
        <div className="flex gap-1 p-1 bg-[var(--background)] rounded">
          <button
            onClick={() => handleCurveTypeChange('preset')}
            className={`flex-1 py-1 px-2 text-xs rounded transition ${
              nodeData.curveType === 'preset'
                ? 'bg-[var(--primary)] text-white'
                : 'text-[var(--muted-foreground)] hover:bg-[var(--border)]'
            }`}
          >
            Preset
          </button>
          <button
            onClick={() => handleCurveTypeChange('custom')}
            className={`flex-1 py-1 px-2 text-xs rounded transition ${
              nodeData.curveType === 'custom'
                ? 'bg-[var(--primary)] text-white'
                : 'text-[var(--muted-foreground)] hover:bg-[var(--border)]'
            }`}
          >
            Custom
          </button>
        </div>

        {/* Preset Selector */}
        {nodeData.curveType === 'preset' && (
          <div>
            <label className="text-xs text-[var(--muted-foreground)]">Easing Preset</label>
            <select
              value={nodeData.preset}
              onChange={handlePresetChange}
              className="w-full px-2 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            >
              {PRESET_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Custom Bezier Editor Link */}
        {nodeData.curveType === 'custom' && (
          <div className="text-xs text-[var(--muted-foreground)]">
            Bezier: [{curve.map((v) => v.toFixed(2)).join(', ')}]
            <div className="mt-1 text-[var(--primary)] cursor-pointer hover:underline">
              Edit in panel →
            </div>
          </div>
        )}

        {/* Curve Preview */}
        <div className="h-20 bg-[var(--background)] rounded border border-[var(--border)] p-2">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <path d={pathD} fill="none" stroke="var(--primary)" strokeWidth="2" />
            <circle cx="0" cy="100" r="3" fill="var(--foreground)" />
            <circle cx="100" cy="0" r="3" fill="var(--foreground)" />
            <circle cx={curve[0] * 100} cy={100 - curve[1] * 100} r="2" fill="var(--accent)" />
            <circle cx={curve[2] * 100} cy={100 - curve[3] * 100} r="2" fill="var(--accent)" />
          </svg>
        </div>

        {/* Speed Multiplier */}
        <div>
          <label className="text-xs text-[var(--muted-foreground)]">
            Speed: {nodeData.speedMultiplier.toFixed(1)}x
          </label>
          <input
            type="range"
            min="0.25"
            max="4"
            step="0.25"
            value={nodeData.speedMultiplier}
            onChange={handleSpeedChange}
            className="nodrag w-full h-2 bg-[var(--border)] rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
            <span>0.25x</span>
            <span>4x</span>
          </div>
        </div>

        {/* Output Preview */}
        {nodeData.outputVideo && (
          <div className="relative">
            <video
              src={nodeData.outputVideo}
              className="w-full h-20 object-cover rounded"
              controls
            />
            <button
              onClick={handleProcess}
              disabled={nodeData.status === 'processing'}
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
            className="w-full py-2 rounded text-sm font-medium hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--node-color)', color: 'var(--background)' }}
          >
            <Wand2 className="w-4 h-4" />
            Apply Animation
          </button>
        )}

        {/* Help text for required inputs */}
        {!hasRequiredInputs && nodeData.status !== 'processing' && (
          <div className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Connect a video to animate
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export const AnimationNode = memo(AnimationNodeComponent);
