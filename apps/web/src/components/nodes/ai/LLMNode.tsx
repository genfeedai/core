'use client';

import type { LLMNodeData } from '@genfeedai/types';
import { NODE_STATUS } from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { AlertCircle, Expand, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { memo, useCallback } from 'react';
import { BaseNode } from '@/components/nodes/BaseNode';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useRequiredInputs } from '@/hooks/useRequiredInputs';
import { useExecutionStore } from '@/store/executionStore';
import { useUIStore } from '@/store/uiStore';
import { useWorkflowStore } from '@/store/workflowStore';

function LLMNodeComponent(props: NodeProps) {
  const { id, type, data } = props;
  const nodeData = data as LLMNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const executeNode = useExecutionStore((state) => state.executeNode);
  const openNodeDetailModal = useUIStore((state) => state.openNodeDetailModal);
  const { hasRequiredInputs } = useRequiredInputs(id, type as 'llm');

  const handleSystemPromptChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData<LLMNodeData>(id, { systemPrompt: e.target.value });
    },
    [id, updateNodeData]
  );

  const handleTemperatureChange = useCallback(
    ([value]: number[]) => {
      updateNodeData<LLMNodeData>(id, { temperature: value });
    },
    [id, updateNodeData]
  );

  const handleMaxTokensChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData<LLMNodeData>(id, { maxTokens: parseInt(e.target.value, 10) });
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

  const headerActions = nodeData.outputText ? (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={handleExpand}
      title="Expand preview"
      className="h-6 w-6"
    >
      <Expand className="h-3.5 w-3.5" />
    </Button>
  ) : null;

  return (
    <BaseNode {...props} headerActions={headerActions}>
      <div className="space-y-3">
        {/* Model Info */}
        <div className="text-xs text-[var(--muted-foreground)]">
          Using: meta-llama-3.1-405b-instruct
        </div>

        {/* System Prompt */}
        <div>
          <label className="text-xs text-[var(--muted-foreground)]">System Prompt</label>
          <textarea
            value={nodeData.systemPrompt}
            onChange={handleSystemPromptChange}
            placeholder="Define the AI's behavior..."
            className="w-full h-16 px-2 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded resize-none focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
        </div>

        {/* Temperature */}
        <div>
          <label className="text-xs text-[var(--muted-foreground)]">
            Temperature: {nodeData.temperature.toFixed(2)}
          </label>
          <Slider
            value={[nodeData.temperature]}
            min={0}
            max={2}
            step={0.1}
            onValueChange={handleTemperatureChange}
            className="nodrag w-full"
          />
          <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
            <span>Precise</span>
            <span>Creative</span>
          </div>
        </div>

        {/* Max Tokens */}
        <div>
          <label className="text-xs text-[var(--muted-foreground)]">Max Tokens</label>
          <input
            type="number"
            min="64"
            max="4096"
            value={nodeData.maxTokens}
            onChange={handleMaxTokensChange}
            className="w-full px-2 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
        </div>

        {/* Output Text */}
        {nodeData.outputText && (
          <div className="relative">
            <div className="p-2 bg-[var(--background)] border border-[var(--border)] rounded text-sm max-h-32 overflow-y-auto">
              {nodeData.outputText}
            </div>
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
        {!nodeData.outputText && (
          <button
            onClick={handleGenerate}
            disabled={!hasRequiredInputs || nodeData.status === 'processing'}
            className="w-full py-2 bg-[var(--primary)] text-white rounded text-sm font-medium hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {nodeData.status === 'processing' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {nodeData.status === 'processing' ? 'Generating...' : 'Generate Text'}
          </button>
        )}

        {/* Help text for required inputs */}
        {!hasRequiredInputs && nodeData.status !== 'processing' && (
          <div className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Connect a prompt to generate
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export const LLMNode = memo(LLMNodeComponent);
