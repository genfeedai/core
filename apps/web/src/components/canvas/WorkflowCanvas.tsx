'use client';

import {
  Background,
  BackgroundVariant,
  type Connection,
  Controls,
  MiniMap,
  type Node,
  ReactFlow,
  SelectionMode,
} from '@xyflow/react';
import { useCallback, useEffect } from 'react';
import '@xyflow/react/dist/style.css';

import type { NodeType, WorkflowEdge, WorkflowNode } from '@genfeedai/types';
import { GroupOverlay } from '@/components/canvas/GroupOverlay';
import { ContextMenu } from '@/components/context-menu';
import { nodeTypes } from '@/components/nodes';
import { useContextMenu } from '@/hooks/useContextMenu';
import { useSettingsStore } from '@/store/settingsStore';
import { useUIStore } from '@/store/uiStore';
import { useWorkflowStore } from '@/store/workflowStore';

export function WorkflowCanvas() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    isValidConnection,
    addNode,
    selectedNodeIds,
    setSelectedNodeIds,
    toggleNodeLock,
    createGroup,
    deleteGroup,
    unlockAllNodes,
    groups,
  } = useWorkflowStore();

  const { showMinimap, selectNode } = useUIStore();
  const { edgeStyle } = useSettingsStore();

  const {
    isOpen: isContextMenuOpen,
    position: contextMenuPosition,
    menuItems: contextMenuItems,
    openNodeMenu,
    openEdgeMenu,
    openPaneMenu,
    openSelectionMenu,
    close: closeContextMenu,
  } = useContextMenu();

  // Keyboard shortcuts for lock/group operations
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isMod = e.ctrlKey || e.metaKey;

      // L - Toggle lock on selected nodes
      if (e.key === 'l' && !isMod && !e.shiftKey) {
        e.preventDefault();
        for (const nodeId of selectedNodeIds) {
          toggleNodeLock(nodeId);
        }
      }

      // Ctrl+G - Create group from selected nodes
      if (e.key === 'g' && isMod && !e.shiftKey) {
        e.preventDefault();
        if (selectedNodeIds.length > 1) {
          createGroup(selectedNodeIds);
        }
      }

      // Ctrl+Shift+G - Ungroup (delete group containing selected nodes)
      if (e.key === 'g' && isMod && e.shiftKey) {
        e.preventDefault();
        for (const nodeId of selectedNodeIds) {
          const group = groups.find((g) => g.nodeIds.includes(nodeId));
          if (group) {
            deleteGroup(group.id);
            break;
          }
        }
      }

      // Ctrl+Shift+L - Unlock all nodes
      if (e.key === 'l' && isMod && e.shiftKey) {
        e.preventDefault();
        unlockAllNodes();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeIds, toggleNodeLock, createGroup, deleteGroup, unlockAllNodes, groups]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: WorkflowNode) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const handlePaneClick = useCallback(() => {
    selectNode(null);
    setSelectedNodeIds([]);
  }, [selectNode, setSelectedNodeIds]);

  // Handle selection change for multi-select support
  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: WorkflowNode[] }) => {
      setSelectedNodeIds(selectedNodes.map((n) => n.id));
    },
    [setSelectedNodeIds]
  );

  // Context menu handlers
  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      // Check if this node is part of a multi-selection
      if (selectedNodeIds.length > 1 && selectedNodeIds.includes(node.id)) {
        openSelectionMenu(selectedNodeIds, event.clientX, event.clientY);
      } else {
        openNodeMenu(node.id, event.clientX, event.clientY);
      }
    },
    [selectedNodeIds, openNodeMenu, openSelectionMenu]
  );

  const handleEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: WorkflowEdge) => {
      event.preventDefault();
      openEdgeMenu(edge.id, event.clientX, event.clientY);
    },
    [openEdgeMenu]
  );

  const handlePaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();
      openPaneMenu(event.clientX, event.clientY);
    },
    [openPaneMenu]
  );

  const handleSelectionContextMenu = useCallback(
    (event: React.MouseEvent, selectedNodes: Node[]) => {
      event.preventDefault();
      const nodeIds = selectedNodes.map((n) => n.id);
      openSelectionMenu(nodeIds, event.clientX, event.clientY);
    },
    [openSelectionMenu]
  );

  // Handle drop from node palette
  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData('nodeType') as NodeType;
      if (!nodeType) return;

      // Get the position relative to the canvas
      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      addNode(nodeType, position);
    },
    [addNode]
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Wrapper for isValidConnection that handles both Connection and Edge types
  const checkValidConnection = useCallback(
    (connection: Connection | WorkflowEdge): boolean => {
      // Extract connection properties, handling both Connection and Edge types
      const conn: Connection = {
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? null,
        targetHandle: connection.targetHandle ?? null,
      };
      return isValidConnection(conn);
    },
    [isValidConnection]
  );

  return (
    <div className="w-full h-full" onDrop={handleDrop} onDragOver={handleDragOver}>
      <ReactFlow<WorkflowNode, WorkflowEdge>
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onSelectionChange={handleSelectionChange}
        onNodeContextMenu={handleNodeContextMenu}
        onEdgeContextMenu={handleEdgeContextMenu}
        onPaneContextMenu={handlePaneContextMenu}
        onSelectionContextMenu={handleSelectionContextMenu}
        isValidConnection={checkValidConnection}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        selectionMode={SelectionMode.Partial}
        selectionOnDrag
        panOnDrag={[1, 2]} // Middle/right mouse for pan
        deleteKeyCode={['Backspace', 'Delete']}
        defaultEdgeOptions={{
          type: edgeStyle,
          animated: false,
        }}
        edgesFocusable
        edgesReconnectable
        proOptions={{ hideAttribution: true }}
      >
        <GroupOverlay />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls />
        {showMinimap && (
          <MiniMap nodeStrokeWidth={3} zoomable pannable className="!bg-[var(--card)]" />
        )}
      </ReactFlow>
      {isContextMenuOpen && (
        <ContextMenu
          x={contextMenuPosition.x}
          y={contextMenuPosition.y}
          items={contextMenuItems}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
}
