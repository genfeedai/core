'use client';

import type { OutputNodeData } from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { CheckCircle, Download } from 'lucide-react';
import Image from 'next/image';
import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { BaseNode } from '../BaseNode';

function OutputNodeComponent(props: NodeProps) {
  const { data } = props;
  const nodeData = data as OutputNodeData;

  const handleDownload = () => {
    if (!nodeData.inputMedia) return;

    const link = document.createElement('a');
    link.href = nodeData.inputMedia;
    link.download = `${nodeData.outputName || 'output'}.${nodeData.inputType === 'video' ? 'mp4' : 'png'}`;
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
                className="h-32 w-full rounded-md object-cover"
                controls
              />
            ) : nodeData.inputType === 'image' ? (
              <Image
                src={nodeData.inputMedia}
                alt="Output"
                width={200}
                height={128}
                className="h-32 w-full rounded-md object-cover"
                unoptimized
              />
            ) : (
              <div className="max-h-32 overflow-y-auto rounded-md border border-border bg-background p-2 text-sm">
                {String(nodeData.inputMedia)}
              </div>
            )}

            {/* Success indicator */}
            <div className="flex items-center gap-2 text-chart-2">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Output Ready</span>
            </div>

            {/* Download button */}
            <Button className="w-full" onClick={handleDownload}>
              <Download className="h-4 w-4" />
              Download
            </Button>
          </>
        ) : (
          <div className="flex h-32 flex-col items-center justify-center text-muted-foreground">
            <CheckCircle className="mb-2 h-8 w-8 opacity-30" />
            <span className="text-sm">Waiting for input...</span>
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export const OutputNode = memo(OutputNodeComponent);
