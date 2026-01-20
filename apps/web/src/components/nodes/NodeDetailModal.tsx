'use client';

import type {
  ImageGenNodeData,
  ImageInputNodeData,
  NodeType,
  OutputNodeData,
  VideoGenNodeData,
  VideoInputNodeData,
  WorkflowNodeData,
} from '@genfeedai/types';
import { NODE_DEFINITIONS } from '@genfeedai/types';
import { Download, X, ZoomIn, ZoomOut } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { NodeDetailTab } from '@/store/uiStore';
import { useUIStore } from '@/store/uiStore';
import { useWorkflowStore } from '@/store/workflowStore';

// Extract media URL and type from node data
function getMediaFromNode(
  nodeType: NodeType,
  data: WorkflowNodeData
): { url: string | null; type: 'image' | 'video' | null } {
  switch (nodeType) {
    case 'imageGen': {
      const imgData = data as ImageGenNodeData;
      return { url: imgData.outputImage, type: imgData.outputImage ? 'image' : null };
    }
    case 'videoGen': {
      const vidData = data as VideoGenNodeData;
      return { url: vidData.outputVideo, type: vidData.outputVideo ? 'video' : null };
    }
    case 'imageInput': {
      const inputData = data as ImageInputNodeData;
      return { url: inputData.image, type: inputData.image ? 'image' : null };
    }
    case 'videoInput': {
      const vidInputData = data as VideoInputNodeData;
      return { url: vidInputData.video, type: vidInputData.video ? 'video' : null };
    }
    case 'output': {
      const outData = data as OutputNodeData;
      const mediaType = outData.inputType === 'text' ? null : outData.inputType;
      return { url: outData.inputMedia, type: mediaType };
    }
    default:
      return { url: null, type: null };
  }
}

// Tab button component
function TabButton({
  tab,
  activeTab,
  onClick,
  children,
}: {
  tab: NodeDetailTab;
  activeTab: NodeDetailTab;
  onClick: (tab: NodeDetailTab) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={() => onClick(tab)}
      className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
        activeTab === tab
          ? 'bg-card text-foreground border-b-2 border-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
      }`}
    >
      {children}
    </button>
  );
}

export function NodeDetailModal() {
  const {
    activeModal,
    nodeDetailNodeId,
    nodeDetailActiveTab,
    closeNodeDetailModal,
    setNodeDetailTab,
  } = useUIStore();
  const { getNodeById } = useWorkflowStore();

  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Get the node being displayed
  const node = useMemo(() => {
    if (!nodeDetailNodeId) return null;
    return getNodeById(nodeDetailNodeId);
  }, [nodeDetailNodeId, getNodeById]);

  // Get media info
  const mediaInfo = useMemo(() => {
    if (!node) return { url: null, type: null };
    return getMediaFromNode(node.type as NodeType, node.data as WorkflowNodeData);
  }, [node]);

  // Get node definition
  const nodeDef = useMemo(() => {
    if (!node) return null;
    return NODE_DEFINITIONS[node.type as NodeType];
  }, [node]);

  // Get history of outputs from same node type (simple implementation)
  const outputHistory = useMemo(() => {
    if (!node || !mediaInfo.url) return [];
    // For now, just return current output - history could be stored in node data
    return [mediaInfo.url];
  }, [node, mediaInfo.url]);

  // Reset zoom and pan when node changes
  useEffect(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeModal !== 'nodeDetail') return;

      if (e.key === 'Escape') {
        closeNodeDetailModal();
      }
      if (e.key === '+' || e.key === '=') {
        setZoomLevel((prev) => Math.min(prev + 0.25, 4));
      }
      if (e.key === '-') {
        setZoomLevel((prev) => Math.max(prev - 0.25, 0.25));
      }
      if (e.key === '0') {
        setZoomLevel(1);
        setPanOffset({ x: 0, y: 0 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModal, closeNodeDetailModal]);

  // Pan handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoomLevel > 1) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      }
    },
    [zoomLevel, panOffset]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setPanOffset({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        });
      }
    },
    [isPanning, panStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Download handler
  const handleDownload = useCallback(() => {
    if (!mediaInfo.url) return;

    const link = document.createElement('a');
    link.href = mediaInfo.url;
    link.download = `${node?.data.label || 'output'}.${mediaInfo.type === 'video' ? 'mp4' : 'png'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [mediaInfo, node]);

  if (activeModal !== 'nodeDetail' || !node || !nodeDef) {
    return null;
  }

  const nodeData = node.data as WorkflowNodeData;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/80" onClick={closeNodeDetailModal} />

      {/* Modal */}
      <div className="fixed inset-4 z-50 flex flex-col bg-card rounded-lg border border-border shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-medium text-foreground">{nodeData.label}</h2>
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
              {nodeDef.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {mediaInfo.url && (
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            )}
            <button
              onClick={closeNodeDetailModal}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        {outputHistory.length > 1 && (
          <div className="flex items-center gap-1 px-4 pt-2 border-b border-border bg-background">
            <TabButton tab="preview" activeTab={nodeDetailActiveTab} onClick={setNodeDetailTab}>
              Preview
            </TabButton>
            <TabButton tab="history" activeTab={nodeDetailActiveTab} onClick={setNodeDetailTab}>
              History ({outputHistory.length})
            </TabButton>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {/* Preview Tab */}
          {nodeDetailActiveTab === 'preview' && (
            <div
              className="relative w-full h-full flex items-center justify-center bg-background overflow-hidden"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ cursor: zoomLevel > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
            >
              {mediaInfo.url ? (
                <div
                  className="transition-transform duration-100"
                  style={{
                    transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
                  }}
                >
                  {mediaInfo.type === 'image' && (
                    <Image
                      src={mediaInfo.url}
                      alt={nodeData.label}
                      width={800}
                      height={600}
                      className="max-h-[calc(100vh-200px)] max-w-[calc(100vw-100px)] object-contain rounded-lg"
                      unoptimized
                    />
                  )}
                  {mediaInfo.type === 'video' && (
                    <video
                      src={mediaInfo.url}
                      controls
                      autoPlay
                      loop
                      className="max-h-[calc(100vh-200px)] max-w-[calc(100vw-100px)] rounded-lg"
                    />
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground text-center">
                  <p className="text-lg">No preview available</p>
                  <p className="text-sm mt-2">Generate content to see the preview</p>
                </div>
              )}

              {/* Zoom controls */}
              {mediaInfo.url && mediaInfo.type === 'image' && (
                <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-card border border-border rounded-lg p-1">
                  <button
                    onClick={() => setZoomLevel((prev) => Math.max(prev - 0.25, 0.25))}
                    className="p-2 hover:bg-secondary rounded transition-colors"
                    title="Zoom out (-)"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-muted-foreground w-12 text-center">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomLevel((prev) => Math.min(prev + 0.25, 4))}
                    className="p-2 hover:bg-secondary rounded transition-colors"
                    title="Zoom in (+)"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setZoomLevel(1);
                      setPanOffset({ x: 0, y: 0 });
                    }}
                    className="px-2 py-1 text-xs hover:bg-secondary rounded transition-colors"
                    title="Reset zoom (0)"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {nodeDetailActiveTab === 'history' && outputHistory.length > 0 && (
            <div className="p-6 overflow-y-auto h-full">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {outputHistory.map((url, index) => (
                  <div
                    key={index}
                    className="relative aspect-square rounded-lg overflow-hidden border border-border hover:border-primary transition-colors cursor-pointer"
                  >
                    {mediaInfo.type === 'image' ? (
                      <Image
                        src={url}
                        alt={`History ${index + 1}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <video src={url} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <span className="text-xs text-white">Version {index + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
