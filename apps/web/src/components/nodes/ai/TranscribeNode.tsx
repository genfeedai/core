'use client';

import type { TranscribeLanguage, TranscribeNodeData } from '@genfeedai/types';
import { NODE_STATUS } from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { AlertCircle, Expand, FileText, Loader2, RefreshCw } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
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
import { useRequiredInputs } from '@/hooks/useRequiredInputs';
import { useExecutionStore } from '@/store/executionStore';
import { useUIStore } from '@/store/uiStore';
import { useWorkflowStore } from '@/store/workflowStore';

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
  const { id, type, data } = props;
  const nodeData = data as TranscribeNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const executeNode = useExecutionStore((state) => state.executeNode);
  const openNodeDetailModal = useUIStore((state) => state.openNodeDetailModal);
  const { connectionStatus } = useRequiredInputs(id, type as 'transcribe');

  // Transcribe needs at least video OR audio connected
  const hasInput = connectionStatus.get('video') || connectionStatus.get('audio');

  const handleLanguageChange = useCallback(
    (value: string) => {
      updateNodeData<TranscribeNodeData>(id, { language: value as TranscribeLanguage });
    },
    [id, updateNodeData]
  );

  const handleTimestampsChange = useCallback(
    (checked: boolean | 'indeterminate') => {
      if (typeof checked === 'boolean') {
        updateNodeData<TranscribeNodeData>(id, { timestamps: checked });
      }
    },
    [id, updateNodeData]
  );

  const handleTranscribe = useCallback(() => {
    updateNodeData(id, { status: NODE_STATUS.processing });
    executeNode(id);
  }, [id, executeNode, updateNodeData]);

  const handleExpand = useCallback(() => {
    openNodeDetailModal(id, 'preview');
  }, [id, openNodeDetailModal]);

  const headerActions = useMemo(
    () =>
      nodeData.outputText ? (
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
    [nodeData.outputText, handleExpand]
  );

  return (
    <BaseNode {...props} headerActions={headerActions}>
      <div className="space-y-3">
        {/* Model Info */}
        <div className="text-xs text-[var(--muted-foreground)]">Using: Whisper Large V3</div>

        {/* Language Selection */}
        <div>
          <label className="text-xs text-[var(--muted-foreground)]">Language</label>
          <Select value={nodeData.language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="nodrag h-8 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Timestamps Toggle */}
        <div className="flex items-center gap-2 nodrag">
          <Checkbox
            id={`timestamps-${id}`}
            checked={nodeData.timestamps}
            onCheckedChange={handleTimestampsChange}
          />
          <label
            htmlFor={`timestamps-${id}`}
            className="text-xs text-[var(--muted-foreground)] cursor-pointer"
          >
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
        {!nodeData.outputText && (
          <button
            onClick={handleTranscribe}
            disabled={!hasInput || nodeData.status === 'processing'}
            className="w-full py-2 bg-[var(--primary)] text-white rounded text-sm font-medium hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {nodeData.status === 'processing' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            {nodeData.status === 'processing' ? 'Transcribing...' : 'Transcribe'}
          </button>
        )}

        {/* Help text for required inputs */}
        {!hasInput && nodeData.status !== 'processing' && (
          <div className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Connect video or audio to transcribe
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export const TranscribeNode = memo(TranscribeNodeComponent);
