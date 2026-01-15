'use client';

import type { ImageInputNodeData } from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { Upload, X } from 'lucide-react';
import Image from 'next/image';
import { memo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWorkflowStore } from '@/store/workflowStore';
import { BaseNode } from '../BaseNode';

function ImageInputNodeComponent(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as ImageInputNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    });
  }, [id, updateNodeData]);

  const handleUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData<ImageInputNodeData>(id, {
        url: e.target.value,
        source: 'url',
      });
    },
    [id, updateNodeData]
  );

  return (
    <BaseNode {...props}>
      <div className="space-y-3">
        {nodeData.image ? (
          <div className="relative">
            <Image
              src={nodeData.image}
              alt={nodeData.filename || 'Uploaded image'}
              width={200}
              height={128}
              className="h-32 w-full rounded-md object-cover"
              unoptimized
            />
            <Button
              variant="secondary"
              size="icon-sm"
              onClick={handleRemoveImage}
              className="absolute right-1.5 top-1.5"
            >
              <X className="h-3 w-3" />
            </Button>
            <div className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-2 py-0.5 text-xs">
              {nodeData.dimensions?.width}x{nodeData.dimensions?.height}
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex h-24 w-full flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-border transition-colors hover:border-primary"
          >
            <Upload className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Upload Image</span>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="space-y-1.5">
          <Label className="text-xs">Or paste URL:</Label>
          <Input
            type="url"
            value={nodeData.url || ''}
            onChange={handleUrlChange}
            placeholder="https://..."
            className="h-8 text-xs"
          />
        </div>
      </div>
    </BaseNode>
  );
}

export const ImageInputNode = memo(ImageInputNodeComponent);
