'use client';

import type { IPromptLibraryItem, PromptNodeData } from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { Save } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { PromptPicker } from '@/components/prompt-library';
import { usePromptLibraryStore } from '@/store/promptLibraryStore';
import { useWorkflowStore } from '@/store/workflowStore';
import { BaseNode } from '../BaseNode';

function PromptNodeComponent(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as PromptNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const { openCreateModal } = usePromptLibraryStore();
  const [showSaveTooltip, setShowSaveTooltip] = useState(false);

  const handlePromptChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData<PromptNodeData>(id, { prompt: e.target.value });
    },
    [id, updateNodeData]
  );

  const handleSelectFromLibrary = useCallback(
    (item: IPromptLibraryItem) => {
      updateNodeData<PromptNodeData>(id, { prompt: item.promptText });
    },
    [id, updateNodeData]
  );

  const handleSaveToLibrary = useCallback(() => {
    if (!nodeData.prompt) return;
    openCreateModal({
      _id: '',
      name: '',
      description: '',
      promptText: nodeData.prompt,
      styleSettings: {},
      category: 'custom' as never,
      tags: [],
      useCount: 0,
      isFeatured: false,
      isDeleted: false,
      createdAt: '',
      updatedAt: '',
    });
  }, [nodeData.prompt, openCreateModal]);

  return (
    <BaseNode {...props}>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-2">
        <PromptPicker onSelect={handleSelectFromLibrary} />
        <div className="relative">
          <button
            onClick={handleSaveToLibrary}
            onMouseEnter={() => setShowSaveTooltip(true)}
            onMouseLeave={() => setShowSaveTooltip(false)}
            disabled={!nodeData.prompt}
            className="p-1.5 hover:bg-[var(--secondary)] rounded transition text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-50 disabled:cursor-not-allowed"
            title="Save to library"
          >
            <Save className="w-3.5 h-3.5" />
          </button>
          {showSaveTooltip && (
            <div className="absolute right-0 top-full mt-1 px-2 py-1 bg-[var(--card)] border border-[var(--border)] rounded text-[10px] whitespace-nowrap z-10">
              Save to library
            </div>
          )}
        </div>
      </div>
      <textarea
        value={nodeData.prompt || ''}
        onChange={handlePromptChange}
        placeholder="Enter your prompt..."
        className="w-full h-20 px-2 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded resize-none focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
      />
    </BaseNode>
  );
}

export const PromptNode = memo(PromptNodeComponent);
