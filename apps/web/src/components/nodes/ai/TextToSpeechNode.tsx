'use client';

import type { TextToSpeechNodeData, TTSProvider, TTSVoice } from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { AlertTriangle, AudioLines, Expand, RefreshCw, Volume2 } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { BaseNode } from '@/components/nodes/BaseNode';
import { Button } from '@/components/ui/button';
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

const TTS_ENABLED = process.env.NEXT_PUBLIC_TTS_ENABLED === 'true';

const PROVIDERS: { value: TTSProvider; label: string }[] = [
  { value: 'elevenlabs', label: 'ElevenLabs' },
  { value: 'openai', label: 'OpenAI' },
];

const VOICES: { value: TTSVoice; label: string; description: string }[] = [
  { value: 'rachel', label: 'Rachel', description: 'American female, calm' },
  { value: 'drew', label: 'Drew', description: 'American male, confident' },
  { value: 'clyde', label: 'Clyde', description: 'American male, war veteran' },
  { value: 'paul', label: 'Paul', description: 'American male, narrative' },
  { value: 'domi', label: 'Domi', description: 'American female, assertive' },
  { value: 'dave', label: 'Dave', description: 'British male, conversational' },
  { value: 'fin', label: 'Fin', description: 'Irish male, sailor' },
  { value: 'sarah', label: 'Sarah', description: 'American female, soft' },
  { value: 'antoni', label: 'Antoni', description: 'American male, friendly' },
  { value: 'thomas', label: 'Thomas', description: 'American male, calm' },
  { value: 'charlie', label: 'Charlie', description: 'Australian male, casual' },
  { value: 'emily', label: 'Emily', description: 'American female, calm' },
  { value: 'dorothy', label: 'Dorothy', description: 'British female, pleasant' },
  { value: 'josh', label: 'Josh', description: 'American male, deep' },
  { value: 'arnold', label: 'Arnold', description: 'American male, narrator' },
  { value: 'adam', label: 'Adam', description: 'American male, deep' },
  { value: 'sam', label: 'Sam', description: 'American male, raspy' },
];

function TextToSpeechNodeComponent(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as TextToSpeechNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const executeNode = useExecutionStore((state) => state.executeNode);
  const openNodeDetailModal = useUIStore((state) => state.openNodeDetailModal);

  const handleProviderChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData<TextToSpeechNodeData>(id, { provider: e.target.value as TTSProvider });
    },
    [id, updateNodeData]
  );

  const handleVoiceChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData<TextToSpeechNodeData>(id, { voice: e.target.value as TTSVoice });
    },
    [id, updateNodeData]
  );

  const handleStabilityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData<TextToSpeechNodeData>(id, { stability: parseFloat(e.target.value) });
    },
    [id, updateNodeData]
  );

  const handleSimilarityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData<TextToSpeechNodeData>(id, { similarityBoost: parseFloat(e.target.value) });
    },
    [id, updateNodeData]
  );

  const handleSpeedChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData<TextToSpeechNodeData>(id, { speed: parseFloat(e.target.value) });
    },
    [id, updateNodeData]
  );

  const handleGenerate = useCallback(() => {
    executeNode(id);
  }, [id, executeNode]);

  const handleExpand = useCallback(() => {
    openNodeDetailModal(id, 'preview');
  }, [id, openNodeDetailModal]);

  const hasInput = Boolean(nodeData.inputText);

  const headerActions = useMemo(
    () =>
      nodeData.outputAudio ? (
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
    [nodeData.outputAudio, handleExpand]
  );

  return (
    <BaseNode {...props} headerActions={headerActions}>
      <div className="space-y-3">
        {/* API Key Warning */}
        {!TTS_ENABLED && (
          <div className="flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-amber-500">
              <p className="font-medium">ElevenLabs not configured</p>
              <p className="text-amber-500/80 mt-0.5">
                Set <code className="bg-amber-500/20 px-1 rounded">ELEVENLABS_API_KEY</code> in API
                and{' '}
                <code className="bg-amber-500/20 px-1 rounded">NEXT_PUBLIC_TTS_ENABLED=true</code>{' '}
                in web
              </p>
            </div>
          </div>
        )}

        {/* Provider Selection */}
        <div>
          <label className="text-xs text-[var(--muted-foreground)]">Provider</label>
          <select
            value={nodeData.provider}
            onChange={handleProviderChange}
            className="w-full px-2 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          >
            {PROVIDERS.map((provider) => (
              <option key={provider.value} value={provider.value}>
                {provider.label}
              </option>
            ))}
          </select>
        </div>

        {/* Voice Selection */}
        <div>
          <label className="text-xs text-[var(--muted-foreground)]">Voice</label>
          <select
            value={nodeData.voice}
            onChange={handleVoiceChange}
            className="w-full px-2 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          >
            {VOICES.map((voice) => (
              <option key={voice.value} value={voice.value}>
                {voice.label} - {voice.description}
              </option>
            ))}
          </select>
        </div>

        {/* Stability Slider */}
        <div>
          <label className="text-xs text-[var(--muted-foreground)]">
            Stability: {Math.round(nodeData.stability * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={nodeData.stability}
            onChange={handleStabilityChange}
            className="nodrag w-full h-2 bg-[var(--secondary)] rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-[var(--muted-foreground)]">
            <span>Variable</span>
            <span>Stable</span>
          </div>
        </div>

        {/* Similarity Boost Slider */}
        <div>
          <label className="text-xs text-[var(--muted-foreground)]">
            Clarity: {Math.round(nodeData.similarityBoost * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={nodeData.similarityBoost}
            onChange={handleSimilarityChange}
            className="nodrag w-full h-2 bg-[var(--secondary)] rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-[var(--muted-foreground)]">
            <span>Low</span>
            <span>High</span>
          </div>
        </div>

        {/* Speed Slider */}
        <div>
          <label className="text-xs text-[var(--muted-foreground)]">
            Speed: {nodeData.speed.toFixed(1)}x
          </label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={nodeData.speed}
            onChange={handleSpeedChange}
            className="nodrag w-full h-2 bg-[var(--secondary)] rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Output Audio Player */}
        {nodeData.outputAudio && (
          <div className="relative">
            <audio src={nodeData.outputAudio} controls className="w-full" />
            <button
              onClick={handleGenerate}
              disabled={nodeData.status === 'processing' || !hasInput}
              className="absolute top-1 right-1 p-1 bg-black/50 rounded-full hover:bg-black/70 transition disabled:opacity-50"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Generate Button */}
        {!nodeData.outputAudio && nodeData.status !== 'processing' && (
          <button
            onClick={handleGenerate}
            disabled={!hasInput || !TTS_ENABLED}
            className="w-full py-2 bg-[var(--primary)] text-white rounded text-sm font-medium hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Volume2 className="w-4 h-4" />
            Generate Speech
          </button>
        )}

        {/* Help text for required input */}
        {!hasInput && nodeData.status !== 'processing' && (
          <div className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
            <AudioLines className="w-3 h-3" />
            Connect text input to generate speech
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export const TextToSpeechNode = memo(TextToSpeechNodeComponent);
