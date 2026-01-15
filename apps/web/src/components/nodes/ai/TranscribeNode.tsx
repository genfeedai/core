'use client';

import type { TranscribeLanguage, TranscribeNodeData } from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { FileText, RefreshCw } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useExecutionStore } from '@/store/executionStore';
import { useWorkflowStore } from '@/store/workflowStore';
import { BaseNode } from '../BaseNode';

const LANGUAGES: { value: TranscribeLanguage; label: string }[] = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ko', label: 'Korean' },
  { value: 'pt', label: 'Portuguese' },
];

function TranscribeNodeComponent(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as TranscribeNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const executeNode = useExecutionStore((state) => state.executeNode);

  const handleLanguageChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData<TranscribeNodeData>(id, { language: e.target.value as TranscribeLanguage });
    },
    [id, updateNodeData]
  );

  const handleTimestampsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData<TranscribeNodeData>(id, { timestamps: e.target.checked });
    },
    [id, updateNodeData]
  );

  const handleTranscribe = useCallback(() => {
    executeNode(id);
  }, [id, executeNode]);

  return (
    <BaseNode {...props}>
      <div className="space-y-3">
        {/* Model Info */}
        <div className="text-xs text-[var(--muted-foreground)]">Using: Whisper Large V3</div>

        {/* Language Selection */}
        <div>
          <label className="text-xs text-[var(--muted-foreground)]">Language</label>
          <select
            value={nodeData.language}
            onChange={handleLanguageChange}
            className="w-full px-2 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* Timestamps Toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`timestamps-${id}`}
            checked={nodeData.timestamps}
            onChange={handleTimestampsChange}
            className="w-4 h-4 rounded border-[var(--border)]"
          />
          <label htmlFor={`timestamps-${id}`} className="text-xs text-[var(--muted-foreground)]">
            Include timestamps
          </label>
        </div>

        {/* Output Transcript */}
        {nodeData.outputText && (
          <div className="relative">
            <div className="p-2 bg-[var(--background)] border border-[var(--border)] rounded text-sm max-h-32 overflow-y-auto whitespace-pre-wrap">
              {nodeData.outputText}
            </div>
            <button
              onClick={handleTranscribe}
              disabled={nodeData.status === 'processing'}
              className="absolute top-1 right-1 p-1 bg-black/50 rounded-full hover:bg-black/70 transition disabled:opacity-50"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Transcribe Button */}
        {!nodeData.outputText && nodeData.status !== 'processing' && (
          <button
            onClick={handleTranscribe}
            className="w-full py-2 bg-[var(--primary)] text-white rounded text-sm font-medium hover:opacity-90 transition flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Transcribe
          </button>
        )}
      </div>
    </BaseNode>
  );
}

export const TranscribeNode = memo(TranscribeNodeComponent);
