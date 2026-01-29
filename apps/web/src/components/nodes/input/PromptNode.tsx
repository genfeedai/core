'use client';

import type { IPrompt, PromptNodeData } from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { Expand, Save } from 'lucide-react';
import { memo, useCallback } from 'react';
import { BaseNode } from '@/components/nodes/BaseNode';
import { PromptPicker } from '@/components/prompt-library';
import { Button } from '@/components/ui/button';
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
    (item: IPrompt) => {
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
      isSystem: false,
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
      <Button variant="ghost" size="icon-sm" onClick={handleExpand} title="Expand editor">
        <Expand className="w-3.5 h-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleSaveToLibrary}
        disabled={!nodeData.prompt}
        title="Save to library"
      >
        <Save className="w-3.5 h-3.5" />
      </Button>
    </>
  );

  return (
    <BaseNode {...props} titleElement={titleElement} headerActions={headerActions}>
      <textarea
        value={nodeData.prompt || ''}
        onChange={handlePromptChange}
        placeholder="Enter your prompt..."
        className="w-full flex-1 min-h-[80px] px-2 py-1.5 text-sm bg-background border border-border rounded resize-none focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </BaseNode>
  );
}

export const PromptNode = memo(PromptNodeComponent);
