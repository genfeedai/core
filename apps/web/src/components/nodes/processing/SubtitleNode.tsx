'use client';

import type { SubtitleNodeData, SubtitlePosition, SubtitleStyle } from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { RefreshCw, Subtitles } from 'lucide-react';
import { memo, useCallback } from 'react';
import { BaseNode } from '@/components/nodes/BaseNode';
import { useExecutionStore } from '@/store/executionStore';
import { useWorkflowStore } from '@/store/workflowStore';

const STYLE_OPTIONS: { value: SubtitleStyle; label: string }[] = [
  { value: 'modern', label: 'Modern' },
  { value: 'default', label: 'Default' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'bold', label: 'Bold' },
];

const POSITION_OPTIONS: { value: SubtitlePosition; label: string }[] = [
  { value: 'bottom', label: 'Bottom' },
  { value: 'center', label: 'Center' },
  { value: 'top', label: 'Top' },
];

function SubtitleNodeComponent(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as SubtitleNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const executeNode = useExecutionStore((state) => state.executeNode);

  const handleStyleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value as SubtitleStyle;
      updateNodeData<SubtitleNodeData>(id, { style: value });
    },
    [id, updateNodeData]
  );

  const handlePositionChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value as SubtitlePosition;
      updateNodeData<SubtitleNodeData>(id, { position: value });
    },
    [id, updateNodeData]
  );

  const handleFontSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number.parseInt(e.target.value, 10);
      if (!Number.isNaN(value) && value > 0 && value <= 72) {
        updateNodeData<SubtitleNodeData>(id, { fontSize: value });
      }
    },
    [id, updateNodeData]
  );

  const handleFontColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData<SubtitleNodeData>(id, { fontColor: e.target.value });
    },
    [id, updateNodeData]
  );

  const handleProcess = useCallback(() => {
    executeNode(id);
  }, [id, executeNode]);

  const hasRequiredInputs = nodeData.inputVideo && nodeData.inputText;

  return (
    <BaseNode {...props}>
      <div className="space-y-3">
        {/* Input Status */}
        <div className="text-xs text-[var(--muted-foreground)]">
          {hasRequiredInputs ? 'Ready to burn subtitles' : 'Connect video and subtitle text'}
        </div>

        {/* Style Selection */}
        <div>
          <label className="text-xs text-[var(--muted-foreground)] block mb-1">Style</label>
          <select
            value={nodeData.style}
            onChange={handleStyleChange}
            className="w-full px-2 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          >
            {STYLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Position Selection */}
        <div>
          <label className="text-xs text-[var(--muted-foreground)] block mb-1">Position</label>
          <select
            value={nodeData.position}
            onChange={handlePositionChange}
            className="w-full px-2 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          >
            {POSITION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Font Size */}
        <div>
          <label className="text-xs text-[var(--muted-foreground)] block mb-1">
            Font Size: {nodeData.fontSize}px
          </label>
          <input
            type="range"
            min="12"
            max="72"
            value={nodeData.fontSize}
            onChange={handleFontSizeChange}
            className="nodrag w-full"
          />
        </div>

        {/* Font Color */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--muted-foreground)]">Color</label>
          <input
            type="color"
            value={nodeData.fontColor}
            onChange={handleFontColorChange}
            className="w-8 h-8 rounded border border-[var(--border)] cursor-pointer"
          />
          <span className="text-xs text-[var(--muted-foreground)]">{nodeData.fontColor}</span>
        </div>

        {/* Output Preview */}
        {nodeData.outputVideo && (
          <div className="relative">
            <video src={nodeData.outputVideo} className="w-full h-20 object-cover rounded" muted />
            <button
              type="button"
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
            type="button"
            onClick={handleProcess}
            disabled={!hasRequiredInputs}
            className="w-full py-2 bg-[var(--primary)] text-white rounded text-sm font-medium hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Subtitles className="w-4 h-4" />
            Burn Subtitles
          </button>
        )}
      </div>
    </BaseNode>
  );
}

export const SubtitleNode = memo(SubtitleNodeComponent);
