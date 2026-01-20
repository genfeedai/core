'use client';

import type { OutputNodeData } from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { CheckCircle, Download } from 'lucide-react';
import Image from 'next/image';
import { memo, useCallback } from 'react';
import { BaseNode } from '@/components/nodes/BaseNode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWorkflowStore } from '@/store/workflowStore';

function OutputNodeComponent(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as OutputNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  const getFileExtension = () => {
    if (nodeData.inputType === 'video') return 'mp4';
    if (nodeData.inputType === 'image') return 'png';
    return 'txt';
  };

  const handleFilenameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData<OutputNodeData>(id, { outputName: e.target.value });
    },
    [id, updateNodeData]
  );

  const handleDownload = () => {
    if (!nodeData.inputMedia) return;

    const link = document.createElement('a');
    link.href = nodeData.inputMedia;
    link.download = `${nodeData.outputName || 'output'}.${getFileExtension()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <BaseNode {...props}>
      <div className="space-y-3">
        {nodeData.inputMedia ? (
          <>
            {/* Preview */}
            {nodeData.inputType === 'video' ? (
              <video
                src={nodeData.inputMedia}
                className="h-20 w-full rounded-md object-cover cursor-pointer"
                autoPlay
                muted
                loop
                playsInline
              />
            ) : nodeData.inputType === 'image' ? (
              <Image
                src={nodeData.inputMedia}
                alt="Output"
                width={200}
                height={80}
                className="h-20 w-full rounded-md object-cover cursor-pointer"
                unoptimized
              />
            ) : (
              <div className="max-h-20 overflow-y-auto rounded-md border border-border bg-background p-2 text-sm">
                {String(nodeData.inputMedia)}
              </div>
            )}

            {/* Editable filename */}
            <div className="flex items-center gap-1">
              <Input
                value={nodeData.outputName || 'output'}
                onChange={handleFilenameChange}
                className="h-8 flex-1 text-sm"
                placeholder="filename"
              />
              <span className="text-xs text-muted-foreground">.{getFileExtension()}</span>
            </div>

            {/* Download button */}
            <Button className="w-full" onClick={handleDownload}>
              <Download className="h-4 w-4" />
              Download
            </Button>
          </>
        ) : (
          <div className="flex h-20 flex-col items-center justify-center text-muted-foreground">
            <CheckCircle className="mb-2 h-6 w-6 opacity-30" />
            <span className="text-xs">Waiting for input...</span>
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export const OutputNode = memo(OutputNodeComponent);
