'use client';

import { useReactFlow, useViewport, ViewportPortal } from '@xyflow/react';
import { clsx } from 'clsx';
import { Lock, Palette, Trash2, Unlock } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useWorkflowStore } from '@/store/workflowStore';
import type { GroupColor, NodeGroup } from '@/types/groups';
import { DEFAULT_GROUP_COLORS, GROUP_COLORS } from '@/types/groups';

interface GroupBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

function calculateGroupBounds(
  nodeIds: string[],
  getNode: (
    id: string
  ) =>
    | { position: { x: number; y: number }; measured?: { width?: number; height?: number } }
    | undefined
): GroupBounds | null {
  if (nodeIds.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const nodeId of nodeIds) {
    const node = getNode(nodeId);
    if (!node) continue;

    const width = node.measured?.width ?? 200;
    const height = node.measured?.height ?? 100;

    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + width);
    maxY = Math.max(maxY, node.position.y + height);
  }

  if (minX === Infinity) return null;

  const padding = 24;
  const headerHeight = 32;
  return {
    x: minX - padding,
    y: minY - padding - headerHeight,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2 + headerHeight,
  };
}

interface GroupBackgroundProps {
  group: NodeGroup;
}

/**
 * Group background - renders BELOW nodes
 * Uses flow coordinates directly (ViewportPortal handles transform)
 */
function GroupBackground({ group }: GroupBackgroundProps) {
  const { getNode } = useReactFlow();

  const bounds = useMemo(
    () => calculateGroupBounds(group.nodeIds, getNode),
    [group.nodeIds, getNode]
  );

  if (!bounds) return null;

  const colors = GROUP_COLORS[group.color ?? 'purple'];

  return (
    <div
      className={clsx(
        'absolute rounded-lg border-2 border-dashed',
        colors.bg,
        colors.border,
        group.isLocked && 'opacity-60'
      )}
      style={{
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: bounds.height,
      }}
    />
  );
}

interface GroupControlsProps {
  group: NodeGroup;
  zoom: number;
}

/**
 * Group controls (header with drag, buttons) - renders ABOVE nodes
 * Uses flow coordinates directly (ViewportPortal handles transform)
 */
function GroupControls({ group, zoom }: GroupControlsProps) {
  const { getNode, setNodes } = useReactFlow();
  const { toggleGroupLock, deleteGroup, setGroupColor, setDirty } = useWorkflowStore();
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [nodeStartPositions, setNodeStartPositions] = useState<
    Map<string, { x: number; y: number }>
  >(new Map());

  const bounds = useMemo(
    () => calculateGroupBounds(group.nodeIds, getNode),
    [group.nodeIds, getNode]
  );

  // Handle drag start on group header
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (group.isLocked) return;
      e.preventDefault();
      e.stopPropagation();

      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });

      // Save initial positions of all nodes in group
      const positions = new Map<string, { x: number; y: number }>();
      for (const nodeId of group.nodeIds) {
        const node = getNode(nodeId);
        if (node) {
          positions.set(nodeId, { x: node.position.x, y: node.position.y });
        }
      }
      setNodeStartPositions(positions);
    },
    [group.isLocked, group.nodeIds, getNode]
  );

  // Handle drag move
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      // Convert screen delta to flow coordinates (divide by zoom)
      const deltaX = (e.clientX - dragStart.x) / zoom;
      const deltaY = (e.clientY - dragStart.y) / zoom;

      setNodes((nodes) =>
        nodes.map((node) => {
          const startPos = nodeStartPositions.get(node.id);
          if (!startPos) return node;
          return {
            ...node,
            position: {
              x: startPos.x + deltaX,
              y: startPos.y + deltaY,
            },
          };
        })
      );
    },
    [isDragging, dragStart, zoom, nodeStartPositions, setNodes]
  );

  // Handle drag end
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setDirty(true);
    }
    setIsDragging(false);
  }, [isDragging, setDirty]);

  // Add/remove document listeners for drag
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!bounds) return null;

  const colors = GROUP_COLORS[group.color ?? 'purple'];
  const headerHeight = 32;

  const handleColorSelect = (color: GroupColor) => {
    setGroupColor(group.id, color);
    setShowColorPicker(false);
  };

  return (
    <>
      {/* Group Header - draggable */}
      <div
        onMouseDown={handleMouseDown}
        className={clsx(
          'absolute flex items-center justify-between px-3 rounded-t-lg select-none pointer-events-auto',
          colors.bg,
          colors.border,
          'border-2 border-b-0 border-dashed',
          !group.isLocked && 'cursor-grab',
          isDragging && 'cursor-grabbing',
          group.isLocked && 'opacity-60'
        )}
        style={{
          left: bounds.x,
          top: bounds.y,
          width: bounds.width,
          height: headerHeight,
        }}
      >
        <span className={clsx('font-medium truncate', colors.text)} style={{ fontSize: 14 }}>
          {group.name}
        </span>
        <div className="flex items-center gap-1">
          {/* Color Picker */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowColorPicker(!showColorPicker);
              }}
              className={clsx('p-1 rounded hover:bg-white/10 transition-colors', colors.text)}
              title="Change group color"
            >
              <Palette className="w-4 h-4" />
            </button>
            {showColorPicker && (
              <div className="absolute top-8 right-0 z-50 bg-card border border-border rounded-lg shadow-lg p-2 flex gap-1 flex-wrap w-[120px]">
                {DEFAULT_GROUP_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleColorSelect(color);
                    }}
                    className={clsx(
                      'w-6 h-6 rounded-md border-2 transition-transform hover:scale-110',
                      GROUP_COLORS[color].bg,
                      color === group.color ? 'border-white' : 'border-transparent'
                    )}
                    title={color}
                  />
                ))}
              </div>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleGroupLock(group.id);
            }}
            className={clsx('p-1 rounded hover:bg-white/10 transition-colors', colors.text)}
            title={group.isLocked ? 'Unlock group' : 'Lock group'}
          >
            {group.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteGroup(group.id);
            }}
            className={clsx('p-1 rounded hover:bg-white/10 transition-colors', colors.text)}
            title="Delete group"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Lock Badge */}
      {group.isLocked && (
        <div
          className={clsx(
            'absolute px-2 py-0.5 rounded text-xs font-medium pointer-events-none',
            colors.bg,
            colors.text
          )}
          style={{
            left: bounds.x + 12,
            top: bounds.y + headerHeight + 8,
          }}
        >
          LOCKED
        </div>
      )}
    </>
  );
}

/**
 * Renders group backgrounds BELOW nodes (z-index: -1)
 * Must be placed inside ReactFlow component
 */
function GroupBackgroundsPortalComponent() {
  const { groups } = useWorkflowStore();

  if (groups.length === 0) return null;

  return (
    <ViewportPortal>
      <div style={{ position: 'absolute', top: 0, left: 0, zIndex: -1, pointerEvents: 'none' }}>
        {groups.map((group) => (
          <GroupBackground key={group.id} group={group} />
        ))}
      </div>
    </ViewportPortal>
  );
}

/**
 * Renders group headers/controls ABOVE nodes (z-index: 1000)
 * Must be placed inside ReactFlow component
 */
function GroupControlsOverlayComponent() {
  const { groups } = useWorkflowStore();
  const { zoom } = useViewport();

  if (groups.length === 0) return null;

  return (
    <ViewportPortal>
      <div style={{ position: 'absolute', top: 0, left: 0, zIndex: 1000, pointerEvents: 'none' }}>
        {groups.map((group) => (
          <GroupControls key={group.id} group={group} zoom={zoom} />
        ))}
      </div>
    </ViewportPortal>
  );
}

export const GroupBackgroundsPortal = memo(GroupBackgroundsPortalComponent);
export const GroupControlsOverlay = memo(GroupControlsOverlayComponent);

// Legacy export for backwards compatibility - combines both portals
function GroupOverlayComponent() {
  return (
    <>
      <GroupBackgroundsPortal />
      <GroupControlsOverlay />
    </>
  );
}

export const GroupOverlay = memo(GroupOverlayComponent);
