'use client';

import type { SocialPlatform, SocialPublishNodeData, SocialVisibility } from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { ExternalLink, Share2 } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useExecutionStore } from '@/store/executionStore';
import { useWorkflowStore } from '@/store/workflowStore';
import { BaseNode } from '../BaseNode';

const PLATFORMS: { value: SocialPlatform; label: string; icon: string }[] = [
  { value: 'youtube', label: 'YouTube', icon: 'yt' },
  { value: 'tiktok', label: 'TikTok', icon: 'tt' },
  { value: 'instagram', label: 'Instagram', icon: 'ig' },
  { value: 'twitter', label: 'X / Twitter', icon: 'x' },
];

const VISIBILITY_OPTIONS: { value: SocialVisibility; label: string }[] = [
  { value: 'public', label: 'Public' },
  { value: 'private', label: 'Private' },
  { value: 'unlisted', label: 'Unlisted' },
];

function SocialPublishNodeComponent(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as SocialPublishNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const executeNode = useExecutionStore((state) => state.executeNode);

  const handlePlatformChange = useCallback(
    (platform: SocialPlatform) => {
      updateNodeData<SocialPublishNodeData>(id, { platform });
    },
    [id, updateNodeData]
  );

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData<SocialPublishNodeData>(id, { title: e.target.value });
    },
    [id, updateNodeData]
  );

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData<SocialPublishNodeData>(id, { description: e.target.value });
    },
    [id, updateNodeData]
  );

  const handleTagsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const tags = e.target.value
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      updateNodeData<SocialPublishNodeData>(id, { tags });
    },
    [id, updateNodeData]
  );

  const handleVisibilityChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData<SocialPublishNodeData>(id, { visibility: e.target.value as SocialVisibility });
    },
    [id, updateNodeData]
  );

  const handlePublish = useCallback(() => {
    executeNode(id);
  }, [id, executeNode]);

  return (
    <BaseNode {...props}>
      <div className="space-y-3">
        {/* Platform Selection */}
        <div className="flex gap-1 p-1 bg-[var(--background)] rounded">
          {PLATFORMS.map((p) => (
            <button
              key={p.value}
              onClick={() => handlePlatformChange(p.value)}
              className={`flex-1 py-1.5 px-1 text-xs rounded transition ${
                nodeData.platform === p.value
                  ? 'bg-[var(--primary)] text-white'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--border)]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Title */}
        <div>
          <label className="text-xs text-[var(--muted-foreground)]">Title</label>
          <input
            type="text"
            value={nodeData.title}
            onChange={handleTitleChange}
            placeholder="Video title..."
            className="w-full px-2 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-[var(--muted-foreground)]">Description</label>
          <textarea
            value={nodeData.description}
            onChange={handleDescriptionChange}
            placeholder="Video description..."
            className="w-full h-16 px-2 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded resize-none focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="text-xs text-[var(--muted-foreground)]">Tags (comma-separated)</label>
          <input
            type="text"
            value={nodeData.tags.join(', ')}
            onChange={handleTagsChange}
            placeholder="tag1, tag2, tag3"
            className="w-full px-2 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
        </div>

        {/* Visibility */}
        <div>
          <label className="text-xs text-[var(--muted-foreground)]">Visibility</label>
          <select
            value={nodeData.visibility}
            onChange={handleVisibilityChange}
            className="w-full px-2 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          >
            {VISIBILITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Published URL */}
        {nodeData.publishedUrl && (
          <a
            href={nodeData.publishedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/20 rounded text-green-400 text-sm hover:bg-green-500/20 transition"
          >
            <ExternalLink className="w-4 h-4" />
            View Published Video
          </a>
        )}

        {/* Publish Button */}
        {!nodeData.publishedUrl && nodeData.status !== 'processing' && (
          <button
            onClick={handlePublish}
            disabled={!nodeData.inputVideo}
            className="w-full py-2 bg-[var(--primary)] text-white rounded text-sm font-medium hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Share2 className="w-4 h-4" />
            Publish to {PLATFORMS.find((p) => p.value === nodeData.platform)?.label}
          </button>
        )}

        {/* No Input Warning */}
        {!nodeData.inputVideo && (
          <div className="text-xs text-[var(--muted-foreground)] text-center">
            Connect a video to publish
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export const SocialPublishNode = memo(SocialPublishNodeComponent);
