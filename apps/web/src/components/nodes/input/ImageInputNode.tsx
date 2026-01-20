'use client';

import type { ImageInputNodeData } from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { ImageIcon, Link, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { memo, useCallback, useRef, useState } from 'react';
import { BaseNode } from '@/components/nodes/BaseNode';
import { Button } from '@/components/ui/button';
import { useWorkflowStore } from '@/store/workflowStore';

function ImageInputNodeComponent(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as ImageInputNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState(nodeData.url || '');

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new window.Image();
        img.onload = () => {
          updateNodeData<ImageInputNodeData>(id, {
            image: event.target?.result as string,
            filename: file.name,
            dimensions: { width: img.width, height: img.height },
            source: 'upload',
          });
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    },
    [id, updateNodeData]
  );

  const handleRemoveImage = useCallback(() => {
    updateNodeData<ImageInputNodeData>(id, {
      image: null,
      filename: null,
      dimensions: null,
      url: undefined,
    });
    setUrlValue('');
  }, [id, updateNodeData]);

  const handleUrlSubmit = useCallback(() => {
    if (!urlValue.trim()) return;

    // Create an image to validate and get dimensions
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      updateNodeData<ImageInputNodeData>(id, {
        image: urlValue,
        filename: urlValue.split('/').pop() || 'url-image',
        dimensions: { width: img.width, height: img.height },
        source: 'url',
        url: urlValue,
      });
      setShowUrlInput(false);
    };
    img.onerror = () => {
      // Still set the URL even if we can't load it (might be CORS)
      updateNodeData<ImageInputNodeData>(id, {
        image: urlValue,
        filename: urlValue.split('/').pop() || 'url-image',
        dimensions: null,
        source: 'url',
        url: urlValue,
      });
      setShowUrlInput(false);
    };
    img.src = urlValue;
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

  // Header actions - Upload and Link buttons
  const headerActions = (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => fileInputRef.current?.click()}
        title="Upload image"
        className="h-6 w-6"
      >
        <Upload className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setShowUrlInput(!showUrlInput)}
        title="Paste URL"
        className="h-6 w-6"
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
        accept="image/*"
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

      {/* Image Preview or Empty State */}
      {nodeData.image ? (
        <div className="relative">
          <Image
            src={nodeData.image}
            alt={nodeData.filename || 'Image'}
            width={200}
            height={80}
            className="h-20 w-full rounded-md object-cover cursor-pointer"
            unoptimized
          />
          <Button
            variant="secondary"
            size="icon-sm"
            onClick={handleRemoveImage}
            className="absolute right-1.5 top-1.5 h-5 w-5"
          >
            <X className="h-3 w-3" />
          </Button>
          {nodeData.dimensions && (
            <div className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px]">
              {nodeData.dimensions.width}x{nodeData.dimensions.height}
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex h-16 w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border/50 bg-secondary/20 transition-colors hover:border-primary/50 hover:bg-secondary/40"
        >
          <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
          <span className="text-[10px] text-muted-foreground/70">Drop or click</span>
        </button>
      )}
    </BaseNode>
  );
}

export const ImageInputNode = memo(ImageInputNodeComponent);
