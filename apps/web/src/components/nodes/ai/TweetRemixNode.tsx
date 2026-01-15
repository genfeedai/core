'use client';

import type { TweetRemixNodeData, TweetTone } from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { Check, RefreshCw, Sparkles } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useExecutionStore } from '@/store/executionStore';
import { useWorkflowStore } from '@/store/workflowStore';
import { BaseNode } from '../BaseNode';

const TONE_OPTIONS: { value: TweetTone; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'witty', label: 'Witty' },
  { value: 'viral', label: 'Viral' },
];

function TweetRemixNodeComponent(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as TweetRemixNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const executeNode = useExecutionStore((state) => state.executeNode);

  const handleToneChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData<TweetRemixNodeData>(id, { tone: e.target.value as TweetTone });
    },
    [id, updateNodeData]
  );

  const handleMaxLengthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData<TweetRemixNodeData>(id, { maxLength: parseInt(e.target.value, 10) });
    },
    [id, updateNodeData]
  );

  const handleSelectVariation = useCallback(
    (index: number) => {
      const variation = nodeData.variations[index];
      updateNodeData<TweetRemixNodeData>(id, {
        selectedIndex: index,
        outputTweet: variation?.text || null,
      });
    },
    [id, nodeData.variations, updateNodeData]
  );

  const handleGenerate = useCallback(() => {
    executeNode(id);
  }, [id, executeNode]);

  return (
    <BaseNode {...props}>
      <div className="space-y-3">
        {/* Tone Selector */}
        <div>
          <label className="text-xs text-[var(--muted-foreground)]">Tone</label>
          <select
            value={nodeData.tone}
            onChange={handleToneChange}
            className="w-full px-2 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          >
            {TONE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Max Length Slider */}
        <div>
          <label className="text-xs text-[var(--muted-foreground)]">
            Max Length: {nodeData.maxLength}
          </label>
          <input
            type="range"
            min="100"
            max="280"
            step="10"
            value={nodeData.maxLength}
            onChange={handleMaxLengthChange}
            className="w-full h-2 bg-[var(--border)] rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Input Tweet Preview */}
        {nodeData.inputTweet && (
          <div className="p-2 bg-[var(--background)] border border-[var(--border)] rounded">
            <div className="text-xs text-[var(--muted-foreground)] mb-1">Original</div>
            <div className="text-sm text-[var(--foreground)] line-clamp-2">
              {nodeData.inputTweet}
            </div>
          </div>
        )}

        {/* Variations */}
        {nodeData.variations.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-[var(--muted-foreground)]">Select a variation</div>
            {nodeData.variations.map((variation, index) => (
              <button
                key={variation.id}
                onClick={() => handleSelectVariation(index)}
                className={`w-full p-2 text-left rounded border transition ${
                  nodeData.selectedIndex === index
                    ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                    : 'border-[var(--border)] bg-[var(--background)] hover:border-[var(--primary)]/50'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                      nodeData.selectedIndex === index
                        ? 'border-[var(--primary)] bg-[var(--primary)]'
                        : 'border-[var(--border)]'
                    }`}
                  >
                    {nodeData.selectedIndex === index && (
                      <Check className="w-2.5 h-2.5 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-[var(--foreground)]">{variation.text}</div>
                    <div className="text-xs text-[var(--muted-foreground)] mt-1">
                      {variation.charCount} characters
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Generate / Regenerate Button */}
        {nodeData.status !== 'processing' && (
          <button
            onClick={handleGenerate}
            className="w-full py-2 bg-[var(--primary)] text-white rounded text-sm font-medium hover:opacity-90 transition flex items-center justify-center gap-2"
          >
            {nodeData.variations.length > 0 ? (
              <>
                <RefreshCw className="w-4 h-4" />
                Regenerate
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Variations
              </>
            )}
          </button>
        )}
      </div>
    </BaseNode>
  );
}

export const TweetRemixNode = memo(TweetRemixNodeComponent);
