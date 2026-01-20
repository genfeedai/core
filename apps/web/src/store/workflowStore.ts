import type {
  EdgeStyle,
  HandleType,
  NodeType,
  ValidationResult,
  WorkflowEdge,
  WorkflowFile,
  WorkflowNode,
  WorkflowNodeData,
} from '@genfeedai/types';
import { CONNECTION_RULES, NODE_DEFINITIONS } from '@genfeedai/types';
import type { Connection, EdgeChange, NodeChange, XYPosition } from '@xyflow/react';
import { applyEdgeChanges, applyNodeChanges, addEdge as rfAddEdge } from '@xyflow/react';
import { nanoid } from 'nanoid';
import { create } from 'zustand';
import { type WorkflowData, workflowsApi } from '@/lib/api';
import type { GroupColor, NodeGroup } from '@/types/groups';
import { DEFAULT_GROUP_COLORS } from '@/types/groups';

// Utility for unique IDs
function generateId(): string {
  return nanoid(8);
}

// Helper to extract output from a node for caching
function getNodeOutput(node: WorkflowNode): unknown {
  const data = node.data as WorkflowNodeData & {
    outputImage?: string;
    outputVideo?: string;
    outputText?: string;
    outputMedia?: string;
    image?: string;
    prompt?: string;
    extractedTweet?: string;
    audio?: string;
  };

  // Return the first available output
  return (
    data.outputImage ??
    data.outputVideo ??
    data.outputText ??
    data.outputMedia ??
    data.image ??
    data.prompt ??
    data.extractedTweet ??
    data.audio ??
    null
  );
}

interface WorkflowStore {
  // State
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  edgeStyle: EdgeStyle;
  workflowName: string;
  workflowId: string | null;
  isDirty: boolean;
  isSaving: boolean;
  isLoading: boolean;
  groups: NodeGroup[];
  selectedNodeIds: string[];

  // Node operations
  addNode: (type: NodeType, position: XYPosition) => string;
  updateNodeData: <T extends WorkflowNodeData>(nodeId: string, data: Partial<T>) => void;
  removeNode: (nodeId: string) => void;
  duplicateNode: (nodeId: string) => string | null;

  // React Flow handlers
  onNodesChange: (changes: NodeChange<WorkflowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<WorkflowEdge>[]) => void;
  onConnect: (connection: Connection) => void;

  // Edge operations
  removeEdge: (edgeId: string) => void;
  setEdgeStyle: (style: EdgeStyle) => void;

  // Node locking operations
  _setNodeLockState: (predicate: (nodeId: string) => boolean, lock: boolean) => void;
  toggleNodeLock: (nodeId: string) => void;
  lockNode: (nodeId: string) => void;
  unlockNode: (nodeId: string) => void;
  lockMultipleNodes: (nodeIds: string[]) => void;
  unlockMultipleNodes: (nodeIds: string[]) => void;
  unlockAllNodes: () => void;
  isNodeLocked: (nodeId: string) => boolean;

  // Group operations
  createGroup: (nodeIds: string[], name?: string) => string;
  deleteGroup: (groupId: string) => void;
  addToGroup: (groupId: string, nodeIds: string[]) => void;
  removeFromGroup: (groupId: string, nodeIds: string[]) => void;
  toggleGroupLock: (groupId: string) => void;
  renameGroup: (groupId: string, name: string) => void;
  setGroupColor: (groupId: string, color: GroupColor) => void;
  getGroupByNodeId: (nodeId: string) => NodeGroup | undefined;
  getGroupById: (groupId: string) => NodeGroup | undefined;

  // Multi-selection
  setSelectedNodeIds: (nodeIds: string[]) => void;
  addToSelection: (nodeId: string) => void;
  removeFromSelection: (nodeId: string) => void;
  clearSelection: () => void;

  // Workflow operations (local)
  loadWorkflow: (workflow: WorkflowFile) => void;
  clearWorkflow: () => void;
  exportWorkflow: () => WorkflowFile;

  // API operations
  saveWorkflow: (signal?: AbortSignal) => Promise<WorkflowData>;
  loadWorkflowById: (id: string, signal?: AbortSignal) => Promise<void>;
  listWorkflows: (signal?: AbortSignal) => Promise<WorkflowData[]>;
  deleteWorkflow: (id: string, signal?: AbortSignal) => Promise<void>;
  duplicateWorkflowApi: (id: string, signal?: AbortSignal) => Promise<WorkflowData>;
  createNewWorkflow: (signal?: AbortSignal) => Promise<string>;
  setWorkflowName: (name: string) => void;

  // Helpers
  getNodeById: (id: string) => WorkflowNode | undefined;
  getConnectedInputs: (nodeId: string) => Map<string, string | string[]>;
  validateWorkflow: () => ValidationResult;
  isValidConnection: (connection: Connection) => boolean;
  findCompatibleHandle: (
    sourceNodeId: string,
    sourceHandleId: string | null,
    targetNodeId: string
  ) => string | null;
  setDirty: (dirty: boolean) => void;
}

// Helper to get handle type from node type and handle id
function getHandleType(
  nodeType: NodeType,
  handleId: string | null,
  direction: 'source' | 'target'
): HandleType | null {
  const nodeDef = NODE_DEFINITIONS[nodeType];
  if (!nodeDef) return null;

  const handles = direction === 'source' ? nodeDef.outputs : nodeDef.inputs;
  const handle = handles.find((h) => h.id === handleId);

  return handle?.type ?? null;
}

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  nodes: [],
  edges: [],
  edgeStyle: 'bezier',
  workflowName: 'Untitled Workflow',
  workflowId: null,
  isDirty: false,
  isSaving: false,
  isLoading: false,
  groups: [],
  selectedNodeIds: [],

  addNode: (type, position) => {
    const nodeDef = NODE_DEFINITIONS[type];
    if (!nodeDef) return '';

    const id = generateId();
    const newNode: WorkflowNode = {
      id,
      type,
      position,
      data: {
        ...nodeDef.defaultData,
        label: nodeDef.label,
        status: 'idle',
      } as WorkflowNodeData,
    };

    set((state) => ({
      nodes: [...state.nodes, newNode],
      isDirty: true,
    }));

    return id;
  },

  updateNodeData: (nodeId, data) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
      ),
      isDirty: true,
    }));
  },

  removeNode: (nodeId) => {
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== nodeId),
      edges: state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      isDirty: true,
    }));
  },

  duplicateNode: (nodeId) => {
    const { nodes } = get();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return null;

    const newId = generateId();
    const newNode: WorkflowNode = {
      ...node,
      id: newId,
      position: {
        x: node.position.x + 50,
        y: node.position.y + 50,
      },
      data: {
        ...node.data,
        status: 'idle',
        jobId: null,
      } as WorkflowNodeData,
    };

    set((state) => ({
      nodes: [...state.nodes, newNode],
      isDirty: true,
    }));

    return newId;
  },

  onNodesChange: (changes) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes) as WorkflowNode[],
      isDirty: true,
    }));
  },

  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges) as WorkflowEdge[],
      isDirty: true,
    }));
  },

  onConnect: (connection) => {
    const { isValidConnection } = get();
    if (!isValidConnection(connection)) return;

    set((state) => ({
      edges: rfAddEdge(
        {
          ...connection,
          id: generateId(),
          type: state.edgeStyle,
        },
        state.edges
      ) as WorkflowEdge[],
      isDirty: true,
    }));
  },

  removeEdge: (edgeId) => {
    set((state) => ({
      edges: state.edges.filter((edge) => edge.id !== edgeId),
      isDirty: true,
    }));
  },

  setEdgeStyle: (style) => {
    set((state) => ({
      edgeStyle: style,
      edges: state.edges.map((edge) => ({ ...edge, type: style })),
      isDirty: true,
    }));
  },

  // Node locking operations - internal helper
  // Updates lock state for nodes matching the predicate
  _setNodeLockState: (predicate: (nodeId: string) => boolean, lock: boolean) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        predicate(n.id)
          ? {
              ...n,
              draggable: !lock,
              data: {
                ...n.data,
                isLocked: lock,
                lockTimestamp: lock ? Date.now() : undefined,
                ...(lock && { cachedOutput: getNodeOutput(n) }),
              },
            }
          : n
      ),
      isDirty: true,
    }));
  },

  toggleNodeLock: (nodeId) => {
    const node = get().getNodeById(nodeId);
    if (!node) return;
    const shouldLock = !(node.data.isLocked ?? false);
    get()._setNodeLockState((id) => id === nodeId, shouldLock);
  },

  lockNode: (nodeId) => {
    const node = get().getNodeById(nodeId);
    if (!node || node.data.isLocked) return;
    get()._setNodeLockState((id) => id === nodeId, true);
  },

  unlockNode: (nodeId) => {
    get()._setNodeLockState((id) => id === nodeId, false);
  },

  lockMultipleNodes: (nodeIds) => {
    get()._setNodeLockState((id) => nodeIds.includes(id), true);
  },

  unlockMultipleNodes: (nodeIds) => {
    get()._setNodeLockState((id) => nodeIds.includes(id), false);
  },

  unlockAllNodes: () => {
    get()._setNodeLockState(() => true, false);
  },

  isNodeLocked: (nodeId) => {
    const { nodes, groups } = get();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return false;

    // Check individual lock
    if (node.data.isLocked) return true;

    // Check if in any locked group
    return groups.some((group) => group.isLocked && group.nodeIds.includes(nodeId));
  },

  // Group operations
  createGroup: (nodeIds, name) => {
    if (nodeIds.length === 0) return '';

    const groupId = generateId();
    const { groups } = get();
    const colorIndex = groups.length % DEFAULT_GROUP_COLORS.length;

    const newGroup: NodeGroup = {
      id: groupId,
      name: name ?? `Group ${groups.length + 1}`,
      nodeIds,
      isLocked: false,
      color: DEFAULT_GROUP_COLORS[colorIndex],
    };

    set((state) => ({
      groups: [...state.groups, newGroup],
      isDirty: true,
    }));

    return groupId;
  },

  deleteGroup: (groupId) => {
    set((state) => ({
      groups: state.groups.filter((g) => g.id !== groupId),
      isDirty: true,
    }));
  },

  addToGroup: (groupId, nodeIds) => {
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId ? { ...g, nodeIds: [...new Set([...g.nodeIds, ...nodeIds])] } : g
      ),
      isDirty: true,
    }));
  },

  removeFromGroup: (groupId, nodeIds) => {
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId ? { ...g, nodeIds: g.nodeIds.filter((id) => !nodeIds.includes(id)) } : g
      ),
      isDirty: true,
    }));
  },

  toggleGroupLock: (groupId) => {
    const { groups, lockMultipleNodes, unlockMultipleNodes } = get();
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    // Update group lock state
    set((state) => ({
      groups: state.groups.map((g) => (g.id === groupId ? { ...g, isLocked: !g.isLocked } : g)),
      isDirty: true,
    }));

    // Also lock/unlock all nodes in the group
    if (!group.isLocked) {
      lockMultipleNodes(group.nodeIds);
    } else {
      unlockMultipleNodes(group.nodeIds);
    }
  },

  renameGroup: (groupId, name) => {
    set((state) => ({
      groups: state.groups.map((g) => (g.id === groupId ? { ...g, name } : g)),
      isDirty: true,
    }));
  },

  setGroupColor: (groupId, color) => {
    set((state) => ({
      groups: state.groups.map((g) => (g.id === groupId ? { ...g, color } : g)),
      isDirty: true,
    }));
  },

  getGroupByNodeId: (nodeId) => {
    return get().groups.find((g) => g.nodeIds.includes(nodeId));
  },

  getGroupById: (groupId) => {
    return get().groups.find((g) => g.id === groupId);
  },

  // Multi-selection
  setSelectedNodeIds: (nodeIds) => {
    set({ selectedNodeIds: nodeIds });
  },

  addToSelection: (nodeId) => {
    set((state) => ({
      selectedNodeIds: state.selectedNodeIds.includes(nodeId)
        ? state.selectedNodeIds
        : [...state.selectedNodeIds, nodeId],
    }));
  },

  removeFromSelection: (nodeId) => {
    set((state) => ({
      selectedNodeIds: state.selectedNodeIds.filter((id) => id !== nodeId),
    }));
  },

  clearSelection: () => {
    set({ selectedNodeIds: [] });
  },

  loadWorkflow: (workflow) => {
    set({
      nodes: workflow.nodes,
      edges: workflow.edges,
      edgeStyle: workflow.edgeStyle,
      workflowName: workflow.name,
      workflowId: null, // Reset ID when loading from file/template
      isDirty: true, // Mark as dirty since it's a new unsaved workflow
      groups: workflow.groups ?? [],
      selectedNodeIds: [],
    });
  },

  clearWorkflow: () => {
    set({
      nodes: [],
      edges: [],
      workflowName: 'Untitled Workflow',
      workflowId: null,
      isDirty: false,
      groups: [],
      selectedNodeIds: [],
    });
  },

  exportWorkflow: () => {
    const { nodes, edges, edgeStyle, workflowName, groups } = get();
    return {
      version: 1,
      name: workflowName,
      description: '',
      nodes,
      edges,
      edgeStyle,
      groups,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  getNodeById: (id) => {
    return get().nodes.find((node) => node.id === id);
  },

  getConnectedInputs: (nodeId) => {
    const { nodes, edges } = get();
    const inputs = new Map<string, string | string[]>();

    const incomingEdges = edges.filter((edge) => edge.target === nodeId);

    for (const edge of incomingEdges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      if (!sourceNode) continue;

      const handleId = edge.targetHandle;
      if (!handleId) continue;

      // Get the output value from source node based on handle
      const sourceData = sourceNode.data as WorkflowNodeData & {
        outputImage?: string;
        outputVideo?: string;
        outputText?: string;
        prompt?: string;
        image?: string;
      };

      let value: string | null = null;

      // Determine which output to use based on source handle
      if (edge.sourceHandle === 'image') {
        value = sourceData.outputImage ?? sourceData.image ?? null;
      } else if (edge.sourceHandle === 'video') {
        value = sourceData.outputVideo ?? null;
      } else if (edge.sourceHandle === 'text') {
        value = sourceData.outputText ?? sourceData.prompt ?? null;
      }

      if (value) {
        const existing = inputs.get(handleId);
        if (existing) {
          // Multiple connections - create array
          if (Array.isArray(existing)) {
            inputs.set(handleId, [...existing, value]);
          } else {
            inputs.set(handleId, [existing, value]);
          }
        } else {
          inputs.set(handleId, value);
        }
      }
    }

    return inputs;
  },

  validateWorkflow: () => {
    const { nodes, edges } = get();
    const errors: { nodeId: string; message: string; severity: 'error' | 'warning' }[] = [];
    const warnings: { nodeId: string; message: string; severity: 'error' | 'warning' }[] = [];

    // Check for empty workflow
    if (nodes.length === 0) {
      errors.push({
        nodeId: '',
        message: 'Workflow is empty - add some nodes first',
        severity: 'error',
      });
      return { isValid: false, errors, warnings };
    }

    // Check for no connections (unless single input node)
    if (edges.length === 0 && nodes.length > 1) {
      errors.push({
        nodeId: '',
        message: 'No connections - connect your nodes together',
        severity: 'error',
      });
      return { isValid: false, errors, warnings };
    }

    // Helper to check if a node has output data
    const hasNodeOutput = (node: WorkflowNode): boolean => {
      const data = node.data as WorkflowNodeData & {
        prompt?: string;
        image?: string;
        video?: string;
        audio?: string;
        templateId?: string;
        outputImage?: string;
        outputVideo?: string;
        outputText?: string;
      };

      switch (node.type as NodeType) {
        case 'prompt':
          return Boolean(data.prompt?.trim());
        case 'imageInput':
          return Boolean(data.image);
        case 'videoInput':
          return Boolean(data.video);
        case 'audioInput':
          return Boolean(data.audio);
        case 'template':
          return Boolean(data.templateId);
        default:
          return true; // AI/processing nodes will produce output when executed
      }
    };

    // Check for disconnected required inputs AND empty source data
    for (const node of nodes) {
      const nodeDef = NODE_DEFINITIONS[node.type as NodeType];
      if (!nodeDef) continue;

      const incomingEdges = edges.filter((e) => e.target === node.id);

      for (const input of nodeDef.inputs) {
        if (input.required) {
          const connectionEdge = incomingEdges.find((e) => e.targetHandle === input.id);
          if (!connectionEdge) {
            errors.push({
              nodeId: node.id,
              message: `Missing required input: ${input.label}`,
              severity: 'error',
            });
          } else {
            // Check if source node has actual data
            const sourceNode = nodes.find((n) => n.id === connectionEdge.source);
            if (sourceNode && !hasNodeOutput(sourceNode)) {
              errors.push({
                nodeId: sourceNode.id,
                message: `${(sourceNode.data as WorkflowNodeData).label} is empty`,
                severity: 'error',
              });
            }
          }
        }
      }
    }

    // Check for cycles
    const visited = new Set<string>();
    const recStack = new Set<string>();

    function hasCycle(nodeId: string): boolean {
      if (recStack.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;

      visited.add(nodeId);
      recStack.add(nodeId);

      const outgoing = edges.filter((e) => e.source === nodeId);
      for (const edge of outgoing) {
        if (hasCycle(edge.target)) return true;
      }

      recStack.delete(nodeId);
      return false;
    }

    for (const node of nodes) {
      if (hasCycle(node.id)) {
        errors.push({
          nodeId: node.id,
          message: 'Workflow contains a cycle',
          severity: 'error',
        });
        break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  },

  isValidConnection: (connection) => {
    const { nodes } = get();

    const sourceNode = nodes.find((n) => n.id === connection.source);
    const targetNode = nodes.find((n) => n.id === connection.target);

    if (!sourceNode || !targetNode) return false;

    const sourceType = getHandleType(
      sourceNode.type as NodeType,
      connection.sourceHandle ?? null,
      'source'
    );
    const targetType = getHandleType(
      targetNode.type as NodeType,
      connection.targetHandle ?? null,
      'target'
    );

    if (!sourceType || !targetType) return false;

    return CONNECTION_RULES[sourceType]?.includes(targetType) ?? false;
  },

  findCompatibleHandle: (sourceNodeId, sourceHandleId, targetNodeId) => {
    const { nodes, edges } = get();

    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    const targetNode = nodes.find((n) => n.id === targetNodeId);

    if (!sourceNode || !targetNode) return null;

    const sourceType = getHandleType(sourceNode.type as NodeType, sourceHandleId, 'source');

    if (!sourceType) return null;

    const targetDef = NODE_DEFINITIONS[targetNode.type as NodeType];
    if (!targetDef) return null;

    // Find existing connections to target node
    const existingTargetHandles = new Set(
      edges.filter((e) => e.target === targetNodeId).map((e) => e.targetHandle)
    );

    // Find first compatible input handle that isn't already connected
    for (const input of targetDef.inputs) {
      if (existingTargetHandles.has(input.id)) continue;
      if (CONNECTION_RULES[sourceType]?.includes(input.type)) {
        return input.id;
      }
    }

    return null;
  },

  setDirty: (dirty) => {
    set({ isDirty: dirty });
  },

  setWorkflowName: (name) => {
    set({ workflowName: name, isDirty: true });
  },

  // API Operations
  saveWorkflow: async (signal) => {
    const { nodes, edges, edgeStyle, workflowName, workflowId, groups } = get();
    set({ isSaving: true });

    try {
      let workflow: WorkflowData;

      if (workflowId) {
        // Update existing workflow
        workflow = await workflowsApi.update(
          workflowId,
          { name: workflowName, nodes, edges, edgeStyle, groups },
          signal
        );
      } else {
        // Create new workflow
        workflow = await workflowsApi.create(
          { name: workflowName, nodes, edges, edgeStyle, groups },
          signal
        );
      }

      set({
        workflowId: workflow._id,
        isDirty: false,
        isSaving: false,
      });

      return workflow;
    } catch (error) {
      set({ isSaving: false });
      throw error;
    }
  },

  loadWorkflowById: async (id, signal) => {
    set({ isLoading: true });

    try {
      const workflow = await workflowsApi.getById(id, signal);

      set({
        nodes: workflow.nodes as WorkflowNode[],
        edges: workflow.edges as WorkflowEdge[],
        edgeStyle: workflow.edgeStyle as EdgeStyle,
        workflowName: workflow.name,
        workflowId: workflow._id,
        groups: workflow.groups ?? [],
        isDirty: false,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  listWorkflows: async (signal) => {
    return workflowsApi.getAll(signal);
  },

  deleteWorkflow: async (id, signal) => {
    await workflowsApi.delete(id, signal);

    // If we deleted the current workflow, clear the state
    const { workflowId } = get();
    if (workflowId === id) {
      set({
        nodes: [],
        edges: [],
        workflowName: 'Untitled Workflow',
        workflowId: null,
        isDirty: false,
      });
    }
  },

  duplicateWorkflowApi: (id, signal) => workflowsApi.duplicate(id, signal),

  createNewWorkflow: async (signal) => {
    const { edgeStyle } = get();

    const workflow = await workflowsApi.create(
      {
        name: 'Untitled Workflow',
        nodes: [],
        edges: [],
        edgeStyle,
        groups: [],
      },
      signal
    );

    set({
      nodes: [],
      edges: [],
      workflowName: workflow.name,
      workflowId: workflow._id,
      isDirty: false,
      groups: [],
      selectedNodeIds: [],
    });

    return workflow._id;
  },
}));
