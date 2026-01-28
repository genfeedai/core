'use client';

import type {
  CharacterOrientation,
  KlingQualityMode,
  MotionControlMode,
  MotionControlNodeData,
} from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { AlertCircle, Play, RefreshCw, Video } from 'lucide-react';
import { memo, useCallback } from 'react';
import { BaseNode } from '@/components/nodes/BaseNode';
import { useRequiredInputs } from '@/hooks/useRequiredInputs';
import { useExecutionStore } from '@/store/executionStore';
import { useWorkflowStore } from '@/store/workflowStore';

const QUALITY_MODES: { value: KlingQualityMode; label: string; description: string }[] = [
  { value: 'std', label: 'Standard', description: 'Faster processing' },
  { value: 'pro', label: 'Pro', description: 'Higher quality' },
];

const CHARACTER_ORIENTATIONS: { value: CharacterOrientation; label: string }[] = [
  { value: 'image', label: 'From Image' },
  { value: 'video', label: 'From Video' },
];

const MOTION_MODES: { value: MotionControlMode; label: string; description: string }[] = [
  {
    value: 'video_transfer',
    label: 'Video Transfer',
    description: 'Apply motion from reference video',
  },
  { value: 'camera', label: 'Camera', description: 'Apply camera movements' },
  { value: 'trajectory', label: 'Trajectory', description: 'Define motion path' },
  { value: 'combined', label: 'Combined', description: 'Camera + Trajectory' },
];

const ASPECT_RATIOS: { value: '16:9' | '9:16' | '1:1'; label: string }[] = [
  { value: '16:9', label: '16:9 (Landscape)' },
  { value: '9:16', label: '9:16 (Portrait)' },
  { value: '1:1', label: '1:1 (Square)' },
];

const DURATIONS: { value: 5 | 10; label: string }[] = [
  { value: 5, label: '5 seconds' },
  { value: 10, label: '10 seconds' },
];

function MotionControlNodeComponent(props: NodeProps) {
  const { id, type, data } = props;
  const nodeData = data as MotionControlNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const executeNode = useExecutionStore((state) => state.executeNode);
  const { hasRequiredInputs } = useRequiredInputs(id, type as 'motionControl');

  const handleModeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData<MotionControlNodeData>(id, { mode: e.target.value as MotionControlMode });
    },
    [id, updateNodeData]
  );

  const handleQualityModeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData<MotionControlNodeData>(id, {
        qualityMode: e.target.value as KlingQualityMode,
      });
    },
    [id, updateNodeData]
  );

  const handleCharacterOrientationChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData<MotionControlNodeData>(id, {
        characterOrientation: e.target.value as CharacterOrientation,
      });
    },
    [id, updateNodeData]
  );

  const handleAspectRatioChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData<MotionControlNodeData>(id, {
        aspectRatio: e.target.value as '16:9' | '9:16' | '1:1',
      });
    },
    [id, updateNodeData]
  );

  const handleDurationChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData<MotionControlNodeData>(id, {
        duration: parseInt(e.target.value, 10) as 5 | 10,
      });
    },
    [id, updateNodeData]
  );

  const handleKeepOriginalSoundToggle = useCallback(() => {
    updateNodeData<MotionControlNodeData>(id, { keepOriginalSound: !nodeData.keepOriginalSound });
  }, [id, nodeData.keepOriginalSound, updateNodeData]);

  const handleMotionStrengthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData<MotionControlNodeData>(id, { motionStrength: parseInt(e.target.value, 10) });
    },
    [id, updateNodeData]
  );

  const handleGenerate = useCallback(() => {
    executeNode(id);
  }, [id, executeNode]);

  const isVideoTransferMode = nodeData.mode === 'video_transfer';

  return (
    <BaseNode {...props}>
      <div className="space-y-3">
        {/* Mode Selection */}
        <div>
          <label className="text-xs text-[var(--muted-foreground)]">Mode</label>
          <select
            value={nodeData.mode}
            onChange={handleModeChange}
            className="w-full px-2 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          >
            {MOTION_MODES.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </div>

        {/* Video Transfer specific options */}
        {isVideoTransferMode && (
          <>
            {/* Quality Mode */}
            <div>
              <label className="text-xs text-[var(--muted-foreground)]">Quality</label>
              <select
                value={nodeData.qualityMode}
                onChange={handleQualityModeChange}
                className="w-full px-2 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              >
                {QUALITY_MODES.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label} - {mode.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Character Orientation */}
            <div>
              <label className="text-xs text-[var(--muted-foreground)]">
                Character Orientation
              </label>
              <select
                value={nodeData.characterOrientation}
                onChange={handleCharacterOrientationChange}
                className="w-full px-2 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              >
                {CHARACTER_ORIENTATIONS.map((orientation) => (
                  <option key={orientation.value} value={orientation.value}>
                    {orientation.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Keep Original Sound */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={nodeData.keepOriginalSound}
                onChange={handleKeepOriginalSoundToggle}
                className="w-4 h-4 rounded border-[var(--border)] bg-[var(--background)] text-[var(--primary)] focus:ring-[var(--primary)]"
              />
              <span className="text-sm text-[var(--foreground)]">Keep Original Sound</span>
            </label>
          </>
        )}

        <div className="grid grid-cols-2 gap-2">
          {/* Duration */}
          <div>
            <label className="text-xs text-[var(--muted-foreground)]">Duration</label>
            <select
              value={nodeData.duration}
              onChange={handleDurationChange}
              className="w-full px-2 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            >
              {DURATIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          {/* Aspect Ratio */}
          <div>
            <label className="text-xs text-[var(--muted-foreground)]">Aspect Ratio</label>
            <select
              value={nodeData.aspectRatio}
              onChange={handleAspectRatioChange}
              className="w-full px-2 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            >
              {ASPECT_RATIOS.map((ratio) => (
                <option key={ratio.value} value={ratio.value}>
                  {ratio.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Motion Strength Slider */}
        <div>
          <label className="text-xs text-[var(--muted-foreground)]">
            Motion Strength: {nodeData.motionStrength}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={nodeData.motionStrength}
            onChange={handleMotionStrengthChange}
            className="w-full h-2 bg-[var(--secondary)] rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-[var(--muted-foreground)]">
            <span>Subtle</span>
            <span>Strong</span>
          </div>
        </div>

        {/* Output Preview */}
        {nodeData.outputVideo && (
          <div className="relative">
            <video
              src={nodeData.outputVideo}
              className="w-full h-20 object-cover rounded cursor-pointer"
              controls
            />
            <button
              onClick={handleGenerate}
              disabled={nodeData.status === 'processing'}
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
            <Play className="w-4 h-4" />
            Generate Motion
          </button>
        )}

        {/* Help text for required inputs */}
        {!hasRequiredInputs && nodeData.status !== 'processing' && (
          <div className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {isVideoTransferMode
              ? 'Connect an image and motion video'
              : 'Connect an image to generate'}
          </div>
        )}

        {/* Info about video requirements */}
        {isVideoTransferMode && (
          <div className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
            <Video className="w-3 h-3" />
            Motion video: 3-30 seconds
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export const MotionControlNode = memo(MotionControlNodeComponent);
