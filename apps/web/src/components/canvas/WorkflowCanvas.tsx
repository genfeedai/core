'use client';

import {
  Background,
  BackgroundVariant,
  type Connection,
  ConnectionMode,
  Controls,
  MiniMap,
  type Node,
  ReactFlow,
  SelectionMode,
} from '@xyflow/react';
import { PanelLeft } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '@xyflow/react/dist/style.css';

import type {
  HandleType,
  ImageGenNodeData,
  NodeType,
  VideoGenNodeData,
  WorkflowEdge,
  WorkflowNode,
} from '@genfeedai/types';
import { NODE_DEFINITIONS } from '@genfeedai/types';
import { GroupOverlay } from '@/components/canvas/GroupOverlay';
import { ContextMenu } from '@/components/context-menu';
import { nodeTypes } from '@/components/nodes';
import { NodeDetailModal } from '@/components/nodes/NodeDetailModal';
import { useCanvasKeyboardShortcuts } from '@/hooks/useCanvasKeyboardShortcuts';
import { useContextMenu } from '@/hooks/useContextMenu';
import { DEFAULT_NODE_COLOR } from '@/lib/constants/colors';
import { supportsImageInput } from '@/lib/utils/schemaUtils';
import { useExecutionStore } from '@/store/executionStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useUIStore } from '@/store/uiStore';
import { useWorkflowStore } from '@/store/workflowStore';

/**
 * Get the data type for an edge based on source handle
 * Returns the HandleType which determines edge color
 */
function getEdgeDataType(
  edge: WorkflowEdge,
  nodeMap: Map<string, WorkflowNode>
): HandleType | null {
  const sourceNode = nodeMap.get(edge.source);
  if (!sourceNode) return null;

  const nodeDef = NODE_DEFINITIONS[sourceNode.type as NodeType];
  if (!nodeDef) return null;

  const sourceHandle = nodeDef.outputs.find((h) => h.id === edge.sourceHandle);
  return sourceHandle?.type ?? null;
}

export function WorkflowCanvas() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    isValidConnection,
    findCompatibleHandle,
    addNode,
    selectedNodeIds,
    setSelectedNodeIds,
    toggleNodeLock,
    createGroup,
    deleteGroup,
    unlockAllNodes,
    groups,
    getConnectedNodeIds,
  } = useWorkflowStore();

  const { selectNode, setHighlightedNodeIds, highlightedNodeIds, showPalette, togglePalette } =
    useUIStore();
  const { edgeStyle, showMinimap } = useSettingsStore();
  const isRunning = useExecutionStore((state) => state.isRunning);
  const currentNodeId = useExecutionStore((state) => state.currentNodeId);
  const executingNodeIds = useExecutionStore((state) => state.executingNodeIds);

  // Minimap visibility on pan/zoom (n8n-style)
  const [isMinimapVisible, setIsMinimapVisible] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const MINIMAP_HIDE_DELAY = 1500; // ms after stopping movement

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
  useCanvasKeyboardShortcuts({
    selectedNodeIds,
    groups,
    toggleNodeLock,
    createGroup,
    deleteGroup,
    unlockAllNodes,
    addNode,
    togglePalette,
  });

  // Update highlighted nodes when selection changes
  useEffect(() => {
    if (selectedNodeIds.length === 0) {
      setHighlightedNodeIds([]);
    } else {
      const connectedIds = getConnectedNodeIds(selectedNodeIds);
      setHighlightedNodeIds(connectedIds);
    }
  }, [selectedNodeIds, getConnectedNodeIds, setHighlightedNodeIds]);

  // Create stable node lookup map to avoid recreating callback on every node position change
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  // Check if an edge targets a disabled input on a node
  const isEdgeTargetingDisabledInput = useCallback(
    (edge: WorkflowEdge): boolean => {
      const targetNode = nodeMap.get(edge.target);
      if (!targetNode) return false;

      // Check imageGen nodes - 'images' handle
      if (targetNode.type === 'imageGen' && edge.targetHandle === 'images') {
        const nodeData = targetNode.data as ImageGenNodeData;
        const hasImageSupport = supportsImageInput(nodeData?.selectedModel?.inputSchema);
        return !hasImageSupport;
      }

      // Check videoGen nodes - 'image' or 'lastFrame' handles
      if (targetNode.type === 'videoGen') {
        if (edge.targetHandle === 'image' || edge.targetHandle === 'lastFrame') {
          const nodeData = targetNode.data as VideoGenNodeData;
          const hasImageSupport = supportsImageInput(nodeData?.selectedModel?.inputSchema);
          return !hasImageSupport;
        }
      }

      return false;
    },
    [nodeMap]
  );

  // Compute edges with highlight/dim classes, data type colors, and execution state
  const styledEdges = useMemo(() => {
    // For partial execution, determine which nodes are in the execution scope
    const executionScope = executingNodeIds.length > 0 ? new Set(executingNodeIds) : null;

    return edges.map((edge) => {
      // Get the data type for coloring (based on source handle)
      const dataType = getEdgeDataType(edge, nodeMap);
      const typeClass = dataType ? `edge-${dataType}` : '';

      // Check if this edge targets a disabled input
      const isDisabledTarget = isEdgeTargetingDisabledInput(edge);

      // During execution - show "pipe flow" effect only for relevant edges
      if (isRunning) {
        // For partial execution, only highlight edges connected to executing nodes
        const isInExecutionScope =
          !executionScope || executionScope.has(edge.source) || executionScope.has(edge.target);

        // Edge connected to currently executing node gets stronger highlight
        const isExecutingEdge =
          currentNodeId && (edge.source === currentNodeId || edge.target === currentNodeId);

        // If targeting disabled input, show as disabled even during execution
        if (isDisabledTarget) {
          return {
            ...edge,
            animated: false,
            className: `${typeClass} edge-disabled`.trim(),
          };
        }

        // For partial execution, don't animate edges outside the execution scope
        if (!isInExecutionScope) {
          return {
            ...edge,
            animated: false,
            className: typeClass,
          };
        }

        return {
          ...edge,
          animated: false, // We use CSS animation instead
          className: `${typeClass} ${isExecutingEdge ? 'executing' : 'active-pipe'}`.trim(),
        };
      }

      // If targeting disabled input, always show as disabled
      if (isDisabledTarget) {
        return {
          ...edge,
          className: `${typeClass} edge-disabled`.trim(),
        };
      }

      // Selection highlighting (when not running)
      if (highlightedNodeIds.length > 0) {
        const isConnected =
          highlightedNodeIds.includes(edge.source) && highlightedNodeIds.includes(edge.target);
        return {
          ...edge,
          className: `${typeClass} ${isConnected ? 'highlighted' : 'dimmed'}`.trim(),
        };
      }

      // Default state - just the type color
      return {
        ...edge,
        className: typeClass,
      };
    });
  }, [
    edges,
    nodeMap,
    highlightedNodeIds,
    isRunning,
    currentNodeId,
    executingNodeIds,
    isEdgeTargetingDisabledInput,
  ]);

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

  // Handle connection end - auto-connect when dropping on a node
  const handleConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, connectionState: unknown) => {
      const state = connectionState as {
        fromNode?: { id: string } | null;
        fromHandle?: { id?: string | null } | null;
      };
      const sourceNodeId = state.fromNode?.id;
      const sourceHandleId = state.fromHandle?.id;
      if (!sourceNodeId || !sourceHandleId) return;

      // Get the element under the cursor
      const target = event.target as HTMLElement;
      const nodeElement = target.closest('.react-flow__node');
      if (!nodeElement) return;

      // Get target node ID from the element
      const targetNodeId = nodeElement.getAttribute('data-id');
      if (!targetNodeId || targetNodeId === sourceNodeId) return;

      // Check if we dropped on a handle (let normal connection handling work)
      const droppedOnHandle = target.closest('.react-flow__handle');
      if (droppedOnHandle) return;

      // Find a compatible handle on the target node
      const compatibleHandle = findCompatibleHandle(sourceNodeId, sourceHandleId, targetNodeId);
      if (!compatibleHandle) return;

      // Create the connection
      onConnect({
        source: sourceNodeId,
        sourceHandle: sourceHandleId,
        target: targetNodeId,
        targetHandle: compatibleHandle,
      });
    },
    [findCompatibleHandle, onConnect]
  );

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

  // Show minimap when panning/zooming starts
  const handleMoveStart = useCallback(() => {
    if (!showMinimap) return;

    // Clear any pending hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setIsMinimapVisible(true);
  }, [showMinimap]);

  // Hide minimap after a delay when panning/zooming stops
  const handleMoveEnd = useCallback(() => {
    if (!showMinimap) return;

    // Clear any existing timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }

    // Set timeout to hide minimap
    hideTimeoutRef.current = setTimeout(() => {
      setIsMinimapVisible(false);
      hideTimeoutRef.current = null;
    }, MINIMAP_HIDE_DELAY);
  }, [showMinimap]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="w-full h-full relative" onDrop={handleDrop} onDragOver={handleDragOver}>
      {/* Sidebar toggle button - Todoist style */}
      {!showPalette && (
        <button
          onClick={togglePalette}
          className="absolute top-3 left-3 z-10 p-1.5 bg-[var(--background)] border border-[var(--border)] rounded-md hover:bg-[var(--secondary)] transition-colors group"
          title="Open sidebar (M)"
        >
          <PanelLeft className="w-4 h-4 text-[var(--muted-foreground)] group-hover:text-[var(--foreground)]" />
        </button>
      )}
      <ReactFlow<WorkflowNode, WorkflowEdge>
        nodes={nodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectEnd={handleConnectEnd as never}
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
        connectionMode={ConnectionMode.Loose}
        selectionMode={SelectionMode.Partial}
        selectionOnDrag
        panOnDrag={[1, 2]} // Middle/right mouse for pan
        onMoveStart={handleMoveStart}
        onMoveEnd={handleMoveEnd}
        deleteKeyCode={['Backspace', 'Delete']}
        defaultEdgeOptions={{
          type: edgeStyle,
          animated: false,
        }}
        edgesFocusable
        edgesReconnectable
        proOptions={{ hideAttribution: true }}
        // Enable virtualization for large workflows (only render visible nodes)
        onlyRenderVisibleElements={nodes.length > 50}
      >
        <GroupOverlay />
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1}
          color="rgba(255, 255, 255, 0.08)"
        />
        <Controls />
        {showMinimap && (
          <MiniMap
            nodeStrokeWidth={0}
            nodeColor={() => DEFAULT_NODE_COLOR}
            zoomable
            pannable
            maskColor="rgba(0, 0, 0, 0.8)"
            className={`!bg-transparent !border-[var(--border)] !rounded-lg transition-opacity duration-300 ${
              isMinimapVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          />
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
      <NodeDetailModal />
    </div>
  );
}
