'use client';

import type { IPromptLibraryItem, PromptNodeData } from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { Expand, Save } from 'lucide-react';
import { memo, useCallback } from 'react';
import { BaseNode } from '@/components/nodes/BaseNode';
import { PromptPicker } from '@/components/prompt-library';
import { usePromptEditorStore } from '@/store/promptEditorStore';
import { usePromptLibraryStore } from '@/store/promptLibraryStore';
import { useWorkflowStore } from '@/store/workflowStore';

function PromptNodeComponent(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as PromptNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const { openCreateModal } = usePromptLibraryStore();
  const { openEditor } = usePromptEditorStore();

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

  const handleExpand = useCallback(() => {
    openEditor(id, nodeData.prompt ?? '');
  }, [id, nodeData.prompt, openEditor]);

  const titleElement = <PromptPicker onSelect={handleSelectFromLibrary} label="Prompt" />;

  const headerActions = (
    <>
      <button
        onClick={handleExpand}
        className="p-1 hover:bg-secondary rounded transition text-muted-foreground hover:text-foreground"
        title="Expand editor"
      >
        <Expand className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={handleSaveToLibrary}
        disabled={!nodeData.prompt}
        className="p-1 hover:bg-secondary rounded transition text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        title="Save to library"
      >
        <Save className="w-3.5 h-3.5" />
      </button>
    </>
  );

  return (
    <BaseNode {...props} titleElement={titleElement} headerActions={headerActions}>
      <textarea
        value={nodeData.prompt || ''}
        onChange={handlePromptChange}
        placeholder="Enter your prompt..."
        className="w-full h-20 px-2 py-1.5 text-sm bg-background border border-border rounded resize-none focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </BaseNode>
  );
}

export const PromptNode = memo(PromptNodeComponent);
