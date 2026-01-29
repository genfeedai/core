'use client';

import type { GridOutputFormat, ImageGridSplitNodeData } from '@genfeedai/types';
import { NODE_STATUS } from '@genfeedai/types';
import type { NodeProps } from '@xyflow/react';
import { Download, Grid3X3, Loader2, RefreshCw } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { BaseNode } from '@/components/nodes/BaseNode';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useExecutionStore } from '@/store/executionStore';
import { useWorkflowStore } from '@/store/workflowStore';

const OUTPUT_FORMATS: { value: GridOutputFormat; label: string }[] = [
  { value: 'jpg', label: 'JPEG' },
  { value: 'png', label: 'PNG' },
  { value: 'webp', label: 'WebP' },
];

function ImageGridSplitNodeComponent(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as ImageGridSplitNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const executeNode = useExecutionStore((state) => state.executeNode);
  const [selectedPreview, setSelectedPreview] = useState<number | null>(null);

  const handleRowsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Math.min(10, Math.max(1, Number.parseInt(e.target.value, 10) || 1));
      updateNodeData<ImageGridSplitNodeData>(id, { gridRows: value });
    },
    [id, updateNodeData]
  );

  const handleColsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Math.min(10, Math.max(1, Number.parseInt(e.target.value, 10) || 1));
      updateNodeData<ImageGridSplitNodeData>(id, { gridCols: value });
    },
    [id, updateNodeData]
  );

  const handleInsetChange = useCallback(
    ([value]: number[]) => {
      updateNodeData<ImageGridSplitNodeData>(id, {
        borderInset: value,
      });
    },
    [id, updateNodeData]
  );

  const handleFormatChange = useCallback(
    (value: string) => {
      updateNodeData<ImageGridSplitNodeData>(id, {
        outputFormat: value as GridOutputFormat,
      });
    },
    [id, updateNodeData]
  );

  const handleQualityChange = useCallback(
    ([value]: number[]) => {
      updateNodeData<ImageGridSplitNodeData>(id, {
        quality: value,
      });
    },
    [id, updateNodeData]
  );

  const handleProcess = useCallback(() => {
    updateNodeData(id, { status: NODE_STATUS.processing });
    executeNode(id);
  }, [id, executeNode, updateNodeData]);

  const handleDownload = useCallback(
    (index: number) => {
      const image = nodeData.outputImages[index];
      if (!image) return;

      const link = document.createElement('a');
      link.href = image;
      link.download = `grid_${index + 1}.${nodeData.outputFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [nodeData.outputImages, nodeData.outputFormat]
  );

  const handleDownloadAll = useCallback(() => {
    nodeData.outputImages.forEach((_, index) => {
      setTimeout(() => handleDownload(index), index * 100);
    });
  }, [nodeData.outputImages, handleDownload]);

  const totalCells = nodeData.gridRows * nodeData.gridCols;

  return (
    <BaseNode {...props}>
      <div className="space-y-3">
        {/* Grid Configuration */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-[var(--muted-foreground)]">Rows</label>
            <input
              type="number"
              min="1"
              max="10"
              value={nodeData.gridRows}
              onChange={handleRowsChange}
              className="w-full px-2 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--muted-foreground)]">Columns</label>
            <input
              type="number"
              min="1"
              max="10"
              value={nodeData.gridCols}
              onChange={handleColsChange}
              className="w-full px-2 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
          </div>
        </div>

        {/* Grid Preview Info */}
        <div className="p-2 bg-[var(--background)] rounded border border-[var(--border)]">
          <div className="text-xs text-[var(--muted-foreground)] text-center">
            Output: {totalCells} images ({nodeData.gridRows}×{nodeData.gridCols} grid)
          </div>
          {/* Visual grid preview */}
          <div
            className="mt-2 grid gap-0.5 mx-auto w-20 aspect-square bg-[var(--border)] rounded overflow-hidden"
            style={{
              gridTemplateRows: `repeat(${nodeData.gridRows}, 1fr)`,
              gridTemplateColumns: `repeat(${nodeData.gridCols}, 1fr)`,
            }}
          >
            {Array.from({ length: totalCells }).map((_, i) => (
              <div
                key={i}
                className="bg-[var(--primary)]/20 text-[8px] flex items-center justify-center text-[var(--primary)]"
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Border Inset */}
        <div>
          <label className="text-xs text-[var(--muted-foreground)]">
            Border Inset: {nodeData.borderInset}px
          </label>
          <Slider
            value={[nodeData.borderInset]}
            min={0}
            max={50}
            onValueChange={handleInsetChange}
            className="nodrag w-full"
          />
        </div>

        {/* Output Format */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-[var(--muted-foreground)]">Format</label>
            <Select value={nodeData.outputFormat} onValueChange={handleFormatChange}>
              <SelectTrigger className="nodrag h-8 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OUTPUT_FORMATS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-[var(--muted-foreground)]">
              Quality: {nodeData.quality}%
            </label>
            <Slider
              value={[nodeData.quality]}
              min={1}
              max={100}
              onValueChange={handleQualityChange}
              className="nodrag w-full"
            />
          </div>
        </div>

        {/* Output Preview Gallery */}
        {nodeData.outputImages.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--muted-foreground)]">
                Output ({nodeData.outputImages.length} images)
              </span>
              <button
                onClick={handleDownloadAll}
                className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                Download All
              </button>
            </div>
            <div
              className="grid gap-1"
              style={{
                gridTemplateColumns: `repeat(${Math.min(nodeData.gridCols, 4)}, 1fr)`,
              }}
            >
              {nodeData.outputImages.map((img, index) => (
                <div
                  key={index}
                  className="relative group aspect-square rounded overflow-hidden border border-[var(--border)] cursor-pointer"
                  onClick={() => setSelectedPreview(selectedPreview === index ? null : index)}
                >
                  <img src={img} alt={`Cell ${index + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(index);
                      }}
                      className="p-1 bg-white/20 rounded hover:bg-white/30"
                    >
                      <Download className="w-3 h-3 text-white" />
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] text-center py-0.5">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
            {/* Enlarged preview */}
            {selectedPreview !== null && nodeData.outputImages[selectedPreview] && (
              <div className="relative">
                <img
                  src={nodeData.outputImages[selectedPreview]}
                  alt={`Preview ${selectedPreview + 1}`}
                  className="w-full rounded border border-[var(--border)]"
                />
                <button
                  onClick={() => setSelectedPreview(null)}
                  className="absolute top-1 right-1 p-1 bg-black/50 rounded text-white text-xs"
                >
                  ×
                </button>
              </div>
            )}
            {/* Re-process button */}
            <button
              onClick={handleProcess}
              disabled={nodeData.status === 'processing'}
              className="w-full py-1.5 bg-[var(--muted)] text-[var(--foreground)] rounded text-sm font-medium hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className="w-3 h-3" />
              Re-split
            </button>
          </div>
        )}

        {/* Process Button */}
        {nodeData.outputImages.length === 0 && (
          <button
            onClick={handleProcess}
            disabled={!nodeData.inputImage || nodeData.status === 'processing'}
            className="w-full py-2 bg-[var(--primary)] text-white rounded text-sm font-medium hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {nodeData.status === 'processing' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Grid3X3 className="w-4 h-4" />
            )}
            {nodeData.status === 'processing' ? 'Splitting...' : 'Split Image'}
          </button>
        )}

        {!nodeData.inputImage && nodeData.outputImages.length === 0 && (
          <div className="text-xs text-[var(--muted-foreground)] text-center">
            Connect an image input to split
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export const ImageGridSplitNode = memo(ImageGridSplitNodeComponent);
