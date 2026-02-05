'use client';

import type { LLMNodeData, TextModel } from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { AlertCircle, ChevronDown, Expand, Play, RefreshCw, Square } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { ModelBrowserModal } from '@/components/models/ModelBrowserModal';
import { BaseNode } from '@/components/nodes/BaseNode';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useAutoLoadModelSchema } from '@/hooks/useAutoLoadModelSchema';
import { useCanGenerate } from '@/hooks/useCanGenerate';
import { useModelSelection } from '@/hooks/useModelSelection';
import { useNodeExecution } from '@/hooks/useNodeExecution';
import {
  DEFAULT_LLM_MODEL,
  LLM_MODEL_ID_MAP,
  LLM_MODEL_MAP,
  LLM_MODELS,
} from '@/lib/models/registry';
import { useUIStore } from '@/store/uiStore';
import { useWorkflowStore } from '@/store/workflowStore';

function LLMNodeComponent(props: NodeProps) {
  const { id, type, data } = props;
  const nodeData = data as LLMNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const openNodeDetailModal = useUIStore((state) => state.openNodeDetailModal);
  const { handleGenerate, handleStop } = useNodeExecution(id);
  const { canGenerate: hasRequiredConnections } = useCanGenerate({
    nodeId: id,
    nodeType: type as 'llm',
  });

  const hasSystemPrompt = !!nodeData.systemPrompt?.trim();
  const hasInputPrompt = !!nodeData.inputPrompt?.trim();
  const canGenerate = hasRequiredConnections && hasSystemPrompt && hasInputPrompt;

  const [isModelBrowserOpen, setIsModelBrowserOpen] = useState(false);

  const { handleModelSelect } = useModelSelection<TextModel, LLMNodeData>({
    nodeId: id,
    modelMap: LLM_MODEL_MAP,
    fallbackModel: DEFAULT_LLM_MODEL,
  });

  useAutoLoadModelSchema({
    currentModel: nodeData.model,
    selectedModel: nodeData.selectedModel,
    modelIdMap: LLM_MODEL_ID_MAP,
    onModelSelect: handleModelSelect,
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

  const modelDisplayName = useMemo(
    () =>
      nodeData.selectedModel?.displayName ||
      LLM_MODELS.find((m) => m.value === nodeData.model)?.label ||
      nodeData.model ||
      'Llama 3.1 405B',
    [nodeData.selectedModel?.displayName, nodeData.model]
  );

  const isProcessing = nodeData.status === 'processing';

  const titleElement = useMemo(
    () => (
      <button
        className={`flex flex-1 items-center gap-1 text-sm font-medium text-left text-foreground ${isProcessing ? 'opacity-50 cursor-default' : 'hover:text-foreground/80 cursor-pointer'}`}
        onClick={() => !isProcessing && setIsModelBrowserOpen(true)}
        title="Browse models"
        disabled={isProcessing}
      >
        <span className="truncate">{modelDisplayName}</span>
        <ChevronDown className="h-3 w-3 shrink-0" />
      </button>
    ),
    [modelDisplayName, isProcessing]
  );

  const headerActions = useMemo(
    () => (
      <>
        {nodeData.outputText && (
          <Button variant="ghost" size="icon-sm" onClick={handleExpand} title="Expand preview">
            <Expand className="h-3 w-3" />
          </Button>
        )}
        {isProcessing ? (
          <Button variant="destructive" size="sm" onClick={handleStop}>
            <Square className="h-4 w-4 fill-current" />
            Generating
          </Button>
        ) : (
          <Button
            variant={canGenerate ? 'default' : 'secondary'}
            size="sm"
            onClick={handleGenerate}
            disabled={!canGenerate}
          >
            <Play className="h-4 w-4 fill-current" />
            Generate
          </Button>
        )}
      </>
    ),
    [nodeData.outputText, isProcessing, handleGenerate, handleStop, handleExpand, canGenerate]
  );

  return (
    <BaseNode
      {...props}
      titleElement={titleElement}
      headerActions={headerActions}
      hideStatusIndicator
    >
      <div className="space-y-3">
        {nodeData.inputPrompt ? (
          <div>
            <label className="text-xs text-[var(--muted-foreground)]">Input Prompt</label>
            <div className="mt-1 p-2 bg-[var(--secondary)]/30 border border-[var(--border)] rounded text-xs text-[var(--muted-foreground)] max-h-16 overflow-hidden line-clamp-3">
              {nodeData.inputPrompt}
            </div>
          </div>
        ) : (
          !isProcessing && (
            <div className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Connect a prompt to generate
            </div>
          )
        )}

        <div>
          <label className="text-xs text-[var(--muted-foreground)]">
            System Prompt <span className="text-[var(--destructive)]">*</span>
          </label>
          <textarea
            value={nodeData.systemPrompt}
            onChange={handleSystemPromptChange}
            placeholder="Define the AI's behavior..."
            className={`w-full h-16 px-2 py-1.5 text-sm bg-[var(--background)] border rounded resize-none focus:outline-none focus:ring-1 focus:ring-[var(--primary)] ${!hasSystemPrompt ? 'border-[var(--destructive)]/50' : 'border-[var(--border)]'}`}
            disabled={isProcessing}
          />
        </div>

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
            disabled={isProcessing}
          />
          <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
            <span>Precise</span>
            <span>Creative</span>
          </div>
        </div>

        <div>
          <label className="text-xs text-[var(--muted-foreground)]">Max Tokens</label>
          <input
            type="number"
            min="64"
            max="4096"
            value={nodeData.maxTokens}
            onChange={handleMaxTokensChange}
            className="w-full px-2 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            disabled={isProcessing}
          />
        </div>

        {nodeData.outputText && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-[var(--muted-foreground)]">Generated Output</label>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleGenerate}
                  disabled={isProcessing}
                  title="Regenerate"
                  className="h-5 w-5"
                >
                  <RefreshCw className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleExpand}
                  title="Expand preview"
                  className="h-5 w-5"
                >
                  <Expand className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div className="p-2 bg-[var(--primary)]/5 border border-[var(--primary)]/20 rounded text-sm max-h-48 overflow-y-auto whitespace-pre-wrap nodrag nopan nowheel">
              {nodeData.outputText}
            </div>
          </div>
        )}
      </div>

      <ModelBrowserModal
        isOpen={isModelBrowserOpen}
        onClose={() => setIsModelBrowserOpen(false)}
        onSelect={handleModelSelect}
        capabilities={['text-generation']}
        title="Select LLM Model"
      />
    </BaseNode>
  );
}

export const LLMNode = memo(LLMNodeComponent);
