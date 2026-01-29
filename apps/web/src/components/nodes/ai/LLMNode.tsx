'use client';

import type { LLMNodeData } from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { AlertCircle, Expand, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { BaseNode } from '@/components/nodes/BaseNode';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useCanGenerate } from '@/hooks/useCanGenerate';
import { useNodeExecution } from '@/hooks/useNodeExecution';
import { useUIStore } from '@/store/uiStore';
import { useWorkflowStore } from '@/store/workflowStore';

function LLMNodeComponent(props: NodeProps) {
  const { id, type, data } = props;
  const nodeData = data as LLMNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const openNodeDetailModal = useUIStore((state) => state.openNodeDetailModal);
  const { handleGenerate } = useNodeExecution(id);
  const { canGenerate } = useCanGenerate({
    nodeId: id,
    nodeType: type as 'llm',
  });

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

  const handleExpand = useCallback(() => {
    openNodeDetailModal(id, 'preview');
  }, [id, openNodeDetailModal]);

  const headerActions = useMemo(
    () =>
      nodeData.outputText ? (
        <Button variant="ghost" size="icon-sm" onClick={handleExpand} title="Expand preview">
          <Expand className="h-3.5 w-3.5" />
        </Button>
      ) : null,
    [nodeData.outputText, handleExpand]
  );

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
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleGenerate}
              disabled={nodeData.status === 'processing'}
              className="absolute top-1 right-1 h-6 w-6 bg-black/50 hover:bg-black/70"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
        )}

        {/* Generate Button */}
        {!nodeData.outputText && (
          <Button
            variant={canGenerate ? 'default' : 'secondary'}
            size="sm"
            onClick={handleGenerate}
            disabled={!canGenerate || nodeData.status === 'processing'}
            className="w-full"
          >
            {nodeData.status === 'processing' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {nodeData.status === 'processing' ? 'Generating...' : 'Generate Text'}
          </Button>
        )}

        {/* Help text for required inputs */}
        {!canGenerate && nodeData.status !== 'processing' && (
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
