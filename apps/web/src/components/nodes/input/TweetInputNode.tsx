'use client';

import type { TweetInputNodeData } from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { Link, Loader2, Type } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { useWorkflowStore } from '@/store/workflowStore';
import { BaseNode } from '../BaseNode';

function TweetInputNodeComponent(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as TweetInputNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const [isFetching, setIsFetching] = useState(false);

  const handleModeChange = useCallback(
    (mode: 'url' | 'text') => {
      updateNodeData<TweetInputNodeData>(id, { inputMode: mode });
    },
    [id, updateNodeData]
  );

  const handleUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData<TweetInputNodeData>(id, { tweetUrl: e.target.value });
    },
    [id, updateNodeData]
  );

  const handleRawTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData<TweetInputNodeData>(id, {
        rawText: e.target.value,
        extractedTweet: e.target.value,
      });
    },
    [id, updateNodeData]
  );

  const handleFetchTweet = useCallback(async () => {
    if (!nodeData.tweetUrl) return;

    setIsFetching(true);
    try {
      const response = await fetch('/api/tweet/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: nodeData.tweetUrl }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch tweet');
      }

      const { text, authorHandle } = await response.json();
      updateNodeData<TweetInputNodeData>(id, {
        extractedTweet: text,
        authorHandle,
        status: 'complete',
      });
    } catch (error) {
      updateNodeData<TweetInputNodeData>(id, {
        error: error instanceof Error ? error.message : 'Failed to fetch',
        status: 'error',
      });
    } finally {
      setIsFetching(false);
    }
  }, [id, nodeData.tweetUrl, updateNodeData]);

  return (
    <BaseNode {...props}>
      <div className="space-y-3">
        {/* Mode Toggle */}
        <div className="flex gap-1 p-1 bg-[var(--background)] rounded-lg">
          <button
            onClick={() => handleModeChange('url')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition ${
              nodeData.inputMode === 'url'
                ? 'bg-[var(--primary)] text-white'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <Link className="w-3 h-3" />
            URL
          </button>
          <button
            onClick={() => handleModeChange('text')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition ${
              nodeData.inputMode === 'text'
                ? 'bg-[var(--primary)] text-white'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <Type className="w-3 h-3" />
            Text
          </button>
        </div>

        {/* URL Input */}
        {nodeData.inputMode === 'url' && (
          <div className="space-y-2">
            <input
              type="url"
              value={nodeData.tweetUrl || ''}
              onChange={handleUrlChange}
              placeholder="https://twitter.com/user/status/..."
              className="w-full px-2 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
            <button
              onClick={handleFetchTweet}
              disabled={!nodeData.tweetUrl || isFetching}
              className="w-full py-1.5 bg-[var(--primary)] text-white rounded text-xs font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isFetching ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Fetching...
                </>
              ) : (
                'Fetch Tweet'
              )}
            </button>
          </div>
        )}

        {/* Raw Text Input */}
        {nodeData.inputMode === 'text' && (
          <textarea
            value={nodeData.rawText || ''}
            onChange={handleRawTextChange}
            placeholder="Paste tweet text here..."
            className="w-full h-20 px-2 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded resize-none focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
        )}

        {/* Extracted Tweet Preview */}
        {nodeData.extractedTweet && (
          <div className="p-2 bg-[var(--background)] border border-[var(--border)] rounded">
            {nodeData.authorHandle && (
              <div className="text-xs text-[var(--muted-foreground)] mb-1">
                @{nodeData.authorHandle}
              </div>
            )}
            <div className="text-sm text-[var(--foreground)]">{nodeData.extractedTweet}</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-1">
              {nodeData.extractedTweet.length} characters
            </div>
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export const TweetInputNode = memo(TweetInputNodeComponent);
