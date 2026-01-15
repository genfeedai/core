'use client';

import { clsx } from 'clsx';
import {
  ArrowRight,
  Circle,
  MousePointer,
  Pencil,
  Redo,
  Square,
  Trash2,
  Type,
  Undo,
} from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { AnnotationShape, AnnotationTool } from '@/store/annotationStore';
import { useAnnotationStore } from '@/store/annotationStore';
import { useWorkflowStore } from '@/store/workflowStore';

// =============================================================================
// TOOL CONFIG
// =============================================================================

const TOOLS: { tool: AnnotationTool; icon: typeof Square; label: string }[] = [
  { tool: 'select', icon: MousePointer, label: 'Select' },
  { tool: 'rectangle', icon: Square, label: 'Rectangle' },
  { tool: 'circle', icon: Circle, label: 'Circle' },
  { tool: 'arrow', icon: ArrowRight, label: 'Arrow' },
  { tool: 'freehand', icon: Pencil, label: 'Freehand' },
  { tool: 'text', icon: Type, label: 'Text' },
];

const COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#ffffff', // White
  '#000000', // Black
];

const STROKE_WIDTHS = [2, 3, 5, 8];

// =============================================================================
// CANVAS DRAWING (Native Canvas API)
// =============================================================================

interface CanvasState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: AnnotationShape | Partial<AnnotationShape>,
  isSelected: boolean = false
) {
  ctx.strokeStyle = shape.strokeColor ?? '#ef4444';
  ctx.lineWidth = shape.strokeWidth ?? 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (shape.fillColor) {
    ctx.fillStyle = shape.fillColor;
  }

  switch (shape.type) {
    case 'rectangle': {
      const s = shape as { x: number; y: number; width: number; height: number };
      if (shape.fillColor) {
        ctx.fillRect(s.x, s.y, s.width, s.height);
      }
      ctx.strokeRect(s.x, s.y, s.width, s.height);
      break;
    }
    case 'circle': {
      const s = shape as { x: number; y: number; radius: number };
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      if (shape.fillColor) {
        ctx.fill();
      }
      ctx.stroke();
      break;
    }
    case 'arrow': {
      const s = shape as { points: number[] };
      if (s.points.length >= 4) {
        const [x1, y1, x2, y2] = s.points;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Draw arrowhead
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLength = 15;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(
          x2 - headLength * Math.cos(angle - Math.PI / 6),
          y2 - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(x2, y2);
        ctx.lineTo(
          x2 - headLength * Math.cos(angle + Math.PI / 6),
          y2 - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
      }
      break;
    }
    case 'freehand': {
      const s = shape as { points: number[] };
      if (s.points.length >= 4) {
        ctx.beginPath();
        ctx.moveTo(s.points[0], s.points[1]);
        for (let i = 2; i < s.points.length; i += 2) {
          ctx.lineTo(s.points[i], s.points[i + 1]);
        }
        ctx.stroke();
      }
      break;
    }
    case 'text': {
      const s = shape as { x: number; y: number; text: string; fontSize: number };
      ctx.font = `${s.fontSize ?? 16}px sans-serif`;
      ctx.fillStyle = shape.strokeColor ?? '#ef4444';
      ctx.fillText(s.text, s.x, s.y);
      break;
    }
  }

  // Draw selection indicator
  if (isSelected) {
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    const bounds = getShapeBounds(shape);
    if (bounds) {
      ctx.strokeRect(bounds.x - 5, bounds.y - 5, bounds.width + 10, bounds.height + 10);
    }
    ctx.setLineDash([]);
  }
}

function getShapeBounds(
  shape: AnnotationShape | Partial<AnnotationShape>
): { x: number; y: number; width: number; height: number } | null {
  switch (shape.type) {
    case 'rectangle': {
      const s = shape as { x: number; y: number; width: number; height: number };
      return { x: s.x, y: s.y, width: s.width, height: s.height };
    }
    case 'circle': {
      const s = shape as { x: number; y: number; radius: number };
      return { x: s.x - s.radius, y: s.y - s.radius, width: s.radius * 2, height: s.radius * 2 };
    }
    case 'arrow':
    case 'freehand': {
      const s = shape as { points: number[] };
      if (!s.points || s.points.length < 2) return null;
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      for (let i = 0; i < s.points.length; i += 2) {
        minX = Math.min(minX, s.points[i]);
        maxX = Math.max(maxX, s.points[i]);
        minY = Math.min(minY, s.points[i + 1]);
        maxY = Math.max(maxY, s.points[i + 1]);
      }
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
    case 'text': {
      const s = shape as { x: number; y: number; text: string; fontSize: number };
      return {
        x: s.x,
        y: s.y - (s.fontSize ?? 16),
        width: s.text.length * 10,
        height: s.fontSize ?? 16,
      };
    }
    default:
      return null;
  }
}

function isPointInShape(
  x: number,
  y: number,
  shape: AnnotationShape | Partial<AnnotationShape>
): boolean {
  const bounds = getShapeBounds(shape);
  if (!bounds) return false;
  const padding = 10;
  return (
    x >= bounds.x - padding &&
    x <= bounds.x + bounds.width + padding &&
    y >= bounds.y - padding &&
    y <= bounds.y + bounds.height + padding
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

function AnnotationModalComponent() {
  const {
    isOpen,
    sourceImage,
    shapes,
    selectedShapeId,
    currentTool,
    toolOptions,
    isDrawing,
    drawingShape,
    closeAnnotation,
    saveAndClose,
    setTool,
    setToolOptions,
    startDrawing,
    updateDrawing,
    finishDrawing,
    selectShape,
    deleteShape,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useAnnotationStore();

  const { updateNodeData } = useWorkflowStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [canvasState, setCanvasState] = useState<CanvasState>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState<{ x: number; y: number } | null>(null);

  // Load image and initialize canvas
  useEffect(() => {
    if (!sourceImage || !canvasRef.current || !containerRef.current) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);

      // Calculate scale to fit image in container
      const container = containerRef.current;
      if (!container) return;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const scale = Math.min(containerWidth / img.width, containerHeight / img.height, 1);
      const offsetX = (containerWidth - img.width * scale) / 2;
      const offsetY = (containerHeight - img.height * scale) / 2;

      setCanvasState({ scale, offsetX, offsetY });

      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = containerWidth;
        canvas.height = containerHeight;
      }
    };
    img.src = sourceImage;

    return () => {
      imageRef.current = null;
      setImageLoaded(false);
    };
  }, [sourceImage]);

  // Render canvas
  useEffect(() => {
    if (!canvasRef.current || !imageLoaded || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background image
    ctx.save();
    ctx.translate(canvasState.offsetX, canvasState.offsetY);
    ctx.scale(canvasState.scale, canvasState.scale);
    ctx.drawImage(imageRef.current, 0, 0);

    // Draw all shapes
    for (const shape of shapes) {
      drawShape(ctx, shape, shape.id === selectedShapeId);
    }

    // Draw shape being drawn
    if (isDrawing && drawingShape) {
      drawShape(ctx, drawingShape);
    }

    ctx.restore();
  }, [shapes, selectedShapeId, isDrawing, drawingShape, canvasState, imageLoaded]);

  // Convert screen coordinates to image coordinates
  const screenToImage = useCallback(
    (clientX: number, clientY: number) => {
      if (!canvasRef.current) return { x: 0, y: 0 };
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (clientX - rect.left - canvasState.offsetX) / canvasState.scale;
      const y = (clientY - rect.top - canvasState.offsetY) / canvasState.scale;
      return { x, y };
    },
    [canvasState]
  );

  // Mouse handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const { x, y } = screenToImage(e.clientX, e.clientY);

      if (currentTool === 'select') {
        // Check if clicking on a shape
        for (let i = shapes.length - 1; i >= 0; i--) {
          if (isPointInShape(x, y, shapes[i])) {
            selectShape(shapes[i].id);
            return;
          }
        }
        selectShape(null);
        return;
      }

      if (currentTool === 'text') {
        setTextPosition({ x, y });
        return;
      }

      // Start drawing
      const baseShape = {
        type: currentTool,
        strokeColor: toolOptions.strokeColor,
        strokeWidth: toolOptions.strokeWidth,
        fillColor: toolOptions.fillColor,
      };

      switch (currentTool) {
        case 'rectangle':
          startDrawing({ ...baseShape, type: 'rectangle', x, y, width: 0, height: 0 });
          break;
        case 'circle':
          startDrawing({ ...baseShape, type: 'circle', x, y, radius: 0 });
          break;
        case 'arrow':
          startDrawing({ ...baseShape, type: 'arrow', points: [x, y, x, y] });
          break;
        case 'freehand':
          startDrawing({ ...baseShape, type: 'freehand', points: [x, y] });
          break;
      }
    },
    [currentTool, toolOptions, shapes, screenToImage, startDrawing, selectShape]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDrawing || !drawingShape) return;

      const { x, y } = screenToImage(e.clientX, e.clientY);

      switch (drawingShape.type) {
        case 'rectangle': {
          const startX = (drawingShape as { x: number }).x;
          const startY = (drawingShape as { y: number }).y;
          updateDrawing({ width: x - startX, height: y - startY });
          break;
        }
        case 'circle': {
          const startX = (drawingShape as { x: number }).x;
          const startY = (drawingShape as { y: number }).y;
          updateDrawing({ radius: Math.hypot(x - startX, y - startY) });
          break;
        }
        case 'arrow': {
          const points = (drawingShape as { points: number[] }).points;
          updateDrawing({ points: [points[0], points[1], x, y] });
          break;
        }
        case 'freehand': {
          const points = (drawingShape as { points: number[] }).points ?? [];
          updateDrawing({ points: [...points, x, y] });
          break;
        }
      }
    },
    [isDrawing, drawingShape, screenToImage, updateDrawing]
  );

  const handleMouseUp = useCallback(() => {
    if (isDrawing) {
      finishDrawing();
    }
  }, [isDrawing, finishDrawing]);

  // Text input handler
  const handleTextSubmit = useCallback(() => {
    if (!textInput.trim() || !textPosition) return;

    const shape: AnnotationShape = {
      id: `text-${Date.now()}`,
      type: 'text',
      x: textPosition.x,
      y: textPosition.y,
      text: textInput,
      fontSize: toolOptions.fontSize,
      strokeColor: toolOptions.strokeColor,
      strokeWidth: toolOptions.strokeWidth,
      fillColor: null,
    };

    useAnnotationStore.getState().addShape(shape);
    setTextInput('');
    setTextPosition(null);
  }, [textInput, textPosition, toolOptions]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;

      // Undo
      if (e.key === 'z' && isMod && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Redo
      if ((e.key === 'z' && isMod && e.shiftKey) || (e.key === 'y' && isMod)) {
        e.preventDefault();
        redo();
      }

      // Delete selected shape
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedShapeId && !textPosition) {
        e.preventDefault();
        deleteShape(selectedShapeId);
      }

      // Escape to close text input or deselect
      if (e.key === 'Escape') {
        if (textPosition) {
          setTextPosition(null);
          setTextInput('');
        } else if (selectedShapeId) {
          selectShape(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedShapeId, textPosition, undo, redo, deleteShape, selectShape]);

  // Handle save
  const handleSave = useCallback(() => {
    const result = saveAndClose();
    if (result) {
      // Update the node with annotation data
      updateNodeData(result.nodeId, {
        annotations: result.shapes,
        hasAnnotations: result.shapes.length > 0,
      });
    }
  }, [saveAndClose, updateNodeData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <h2 className="text-lg font-semibold text-foreground">Edit Annotations</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={closeAnnotation}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Annotations</Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Toolbar */}
        <div className="flex w-14 flex-col gap-1 border-r border-border bg-card p-2">
          {/* Tool buttons */}
          {TOOLS.map(({ tool, icon: Icon, label }) => (
            <button
              key={tool}
              onClick={() => setTool(tool)}
              className={clsx(
                'flex h-10 w-10 items-center justify-center rounded-lg transition',
                currentTool === tool
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
              title={label}
            >
              <Icon className="h-5 w-5" />
            </button>
          ))}

          <div className="my-2 h-px bg-border" />

          {/* Undo/Redo */}
          <button
            onClick={undo}
            disabled={!canUndo()}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-30"
            title="Undo (Ctrl+Z)"
          >
            <Undo className="h-5 w-5" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo()}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-30"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo className="h-5 w-5" />
          </button>

          {/* Delete selected */}
          {selectedShapeId && (
            <>
              <div className="my-2 h-px bg-border" />
              <button
                onClick={() => deleteShape(selectedShapeId)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-destructive transition hover:bg-destructive/10"
                title="Delete selected (Del)"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        {/* Canvas */}
        <div ref={containerRef} className="relative flex-1 overflow-hidden bg-neutral-900">
          <canvas
            ref={canvasRef}
            className="cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />

          {/* Text input overlay */}
          {textPosition && (
            <div
              className="absolute"
              style={{
                left: textPosition.x * canvasState.scale + canvasState.offsetX,
                top: textPosition.y * canvasState.scale + canvasState.offsetY,
              }}
            >
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTextSubmit();
                  if (e.key === 'Escape') {
                    setTextPosition(null);
                    setTextInput('');
                  }
                }}
                className="rounded border border-primary bg-black/50 px-2 py-1 text-white outline-none"
                style={{
                  fontSize: toolOptions.fontSize,
                  color: toolOptions.strokeColor,
                }}
                placeholder="Type text..."
              />
            </div>
          )}
        </div>

        {/* Options Panel */}
        <div className="flex w-48 flex-col gap-4 border-l border-border bg-card p-4">
          {/* Colors */}
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">Color</label>
            <div className="grid grid-cols-5 gap-1.5">
              {COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setToolOptions({ strokeColor: color })}
                  className={clsx(
                    'h-7 w-7 rounded-md border-2 transition',
                    toolOptions.strokeColor === color ? 'border-primary' : 'border-transparent'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Stroke Width */}
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">
              Stroke Width
            </label>
            <div className="flex gap-2">
              {STROKE_WIDTHS.map((width) => (
                <button
                  key={width}
                  onClick={() => setToolOptions({ strokeWidth: width })}
                  className={clsx(
                    'flex h-8 w-8 items-center justify-center rounded-md border transition',
                    toolOptions.strokeWidth === width
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-muted-foreground'
                  )}
                >
                  <div
                    className="rounded-full bg-foreground"
                    style={{ width: width * 2, height: width * 2 }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Fill Toggle */}
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">Fill</label>
            <button
              onClick={() =>
                setToolOptions({
                  fillColor: toolOptions.fillColor ? null : `${toolOptions.strokeColor}40`,
                })
              }
              className={clsx(
                'w-full rounded-md border px-3 py-2 text-sm transition',
                toolOptions.fillColor
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border text-muted-foreground hover:border-muted-foreground'
              )}
            >
              {toolOptions.fillColor ? 'Filled' : 'No Fill'}
            </button>
          </div>

          {/* Font Size (for text tool) */}
          {currentTool === 'text' && (
            <div>
              <label className="mb-2 block text-xs font-medium text-muted-foreground">
                Font Size
              </label>
              <select
                value={toolOptions.fontSize}
                onChange={(e) => setToolOptions({ fontSize: parseInt(e.target.value, 10) })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {[12, 14, 16, 20, 24, 32, 48].map((size) => (
                  <option key={size} value={size}>
                    {size}px
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const AnnotationModal = memo(AnnotationModalComponent);
