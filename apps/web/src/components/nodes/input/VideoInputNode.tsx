'use client';

import type { VideoInputNodeData } from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { Expand, Link, Loader2, Upload, Video, X } from 'lucide-react';
import { memo, useCallback, useRef, useState } from 'react';
import { BaseNode } from '@/components/nodes/BaseNode';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';
import { useUIStore } from '@/store/uiStore';
import { useWorkflowStore } from '@/store/workflowStore';

interface FileUploadResult {
  filename: string;
  url: string;
  path: string;
  size: number;
  mimeType: string;
}

function VideoInputNodeComponent(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as VideoInputNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const workflowId = useWorkflowStore((state) => state.workflowId);
  const openNodeDetailModal = useUIStore((state) => state.openNodeDetailModal);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState(nodeData.url || '');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Get video metadata
      const getMetadata = (
        src: string
      ): Promise<{ duration: number; dimensions: { width: number; height: number } }> => {
        return new Promise((resolve) => {
          const video = document.createElement('video');
          video.onloadedmetadata = () =>
            resolve({
              duration: video.duration,
              dimensions: { width: video.videoWidth, height: video.videoHeight },
            });
          video.onerror = () => resolve({ duration: 0, dimensions: { width: 0, height: 0 } });
          video.src = src;
        });
      };

      // If workflow is saved (has ID), upload to backend
      if (workflowId) {
        setIsUploading(true);
        try {
          const result = await apiClient.uploadFile<FileUploadResult>(
            `/files/workflows/${workflowId}/input/video`,
            file
          );

          // Get metadata from the uploaded URL
          const metadata = await getMetadata(result.url);

          updateNodeData<VideoInputNodeData>(id, {
            video: result.url,
            filename: result.filename,
            duration: metadata.duration,
            dimensions: metadata.dimensions,
            source: 'upload',
          });
        } catch (_error) {
          // Fallback to Base64 if upload fails
          const reader = new FileReader();
          reader.onload = async (event) => {
            const dataUrl = event.target?.result as string;
            const metadata = await getMetadata(dataUrl);
            updateNodeData<VideoInputNodeData>(id, {
              video: dataUrl,
              filename: file.name,
              duration: metadata.duration,
              dimensions: metadata.dimensions,
              source: 'upload',
            });
          };
          reader.readAsDataURL(file);
        } finally {
          setIsUploading(false);
        }
      } else {
        // Workflow not saved yet - use Base64
        const reader = new FileReader();
        reader.onload = async (event) => {
          const dataUrl = event.target?.result as string;
          const metadata = await getMetadata(dataUrl);
          updateNodeData<VideoInputNodeData>(id, {
            video: dataUrl,
            filename: file.name,
            duration: metadata.duration,
            dimensions: metadata.dimensions,
            source: 'upload',
          });
        };
        reader.readAsDataURL(file);
      }
    },
    [id, updateNodeData, workflowId]
  );

  const handleRemoveVideo = useCallback(() => {
    updateNodeData<VideoInputNodeData>(id, {
      video: null,
      filename: null,
      duration: null,
      dimensions: null,
      url: undefined,
    });
    setUrlValue('');
  }, [id, updateNodeData]);

  const handleUrlSubmit = useCallback(() => {
    if (!urlValue.trim()) return;

    // Create a video to validate and get metadata
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.onloadedmetadata = () => {
      updateNodeData<VideoInputNodeData>(id, {
        video: urlValue,
        filename: urlValue.split('/').pop() || 'url-video',
        duration: video.duration,
        dimensions: { width: video.videoWidth, height: video.videoHeight },
        source: 'url',
        url: urlValue,
      });
      setShowUrlInput(false);
    };
    video.onerror = () => {
      // Still set the URL even if we can't load it (might be CORS)
      updateNodeData<VideoInputNodeData>(id, {
        video: urlValue,
        filename: urlValue.split('/').pop() || 'url-video',
        duration: null,
        dimensions: null,
        source: 'url',
        url: urlValue,
      });
      setShowUrlInput(false);
    };
    video.src = urlValue;
  }, [id, updateNodeData, urlValue]);

  const handleUrlKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleUrlSubmit();
      } else if (e.key === 'Escape') {
        setShowUrlInput(false);
        setUrlValue(nodeData.url || '');
      }
    },
    [handleUrlSubmit, nodeData.url]
  );

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExpand = useCallback(() => {
    openNodeDetailModal(id, 'preview');
  }, [id, openNodeDetailModal]);

  // Header actions - Upload, Link, and Expand buttons
  const headerActions = (
    <div className="flex items-center gap-1">
      {nodeData.video && (
        <Button variant="ghost" size="icon-sm" onClick={handleExpand} title="Expand preview">
          <Expand className="h-3.5 w-3.5" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => fileInputRef.current?.click()}
        title="Upload video"
      >
        <Upload className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setShowUrlInput(!showUrlInput)}
        title="Paste URL"
      >
        <Link className="h-3.5 w-3.5" />
      </Button>
    </div>
  );

  return (
    <BaseNode {...props} headerActions={headerActions}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* URL Input (shown when link button clicked) */}
      {showUrlInput && (
        <div className="mb-3 flex gap-2">
          <input
            type="url"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            onKeyDown={handleUrlKeyDown}
            placeholder="https://..."
            className="flex-1 h-7 px-2 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={handleUrlSubmit}
            disabled={!urlValue.trim()}
            className="h-7 px-2 text-xs"
          >
            Load
          </Button>
        </div>
      )}

      {/* Video Preview or Empty State */}
      {nodeData.video ? (
        <div className="relative max-h-32 overflow-hidden rounded-md bg-black/20">
          <video
            src={nodeData.video}
            className="w-full h-auto max-h-32 object-contain cursor-pointer"
            muted
          />
          <Button
            variant="secondary"
            size="icon-sm"
            onClick={handleRemoveVideo}
            className="absolute right-1.5 top-1.5 h-5 w-5"
          >
            <X className="h-3 w-3" />
          </Button>
          <div className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px]">
            {nodeData.dimensions && `${nodeData.dimensions.width}x${nodeData.dimensions.height}`}
            {nodeData.duration && ` • ${formatDuration(nodeData.duration)}`}
          </div>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex flex-1 min-h-16 w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border/50 bg-secondary/20 transition-colors hover:border-primary/50 hover:bg-secondary/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-5 w-5 text-muted-foreground/50 animate-spin" />
              <span className="text-[10px] text-muted-foreground/70">Uploading...</span>
            </>
          ) : (
            <>
              <Video className="h-5 w-5 text-muted-foreground/50" />
              <span className="text-[10px] text-muted-foreground/70">Drop or click</span>
            </>
          )}
        </button>
      )}
    </BaseNode>
  );
}

export const VideoInputNode = memo(VideoInputNodeComponent);
