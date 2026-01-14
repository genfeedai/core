import { create } from "zustand";
import { nanoid } from "nanoid";
import type {
  Connection,
  EdgeChange,
  NodeChange,
  XYPosition,
} from "@xyflow/react";
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge as rfAddEdge,
} from "@xyflow/react";
import type {
  WorkflowNode,
  WorkflowEdge,
  NodeType,
  WorkflowNodeData,
  HandleType,
} from "@/types/nodes";
import {
  NODE_DEFINITIONS,
  CONNECTION_RULES,
} from "@/types/nodes";
import type { EdgeStyle, WorkflowFile, ValidationResult } from "@/types/workflow";
import { workflowsApi, type WorkflowData } from "@/lib/api";

// Utility for unique IDs
function generateId(): string {
  return nanoid(8);
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

  // Node operations
  addNode: (type: NodeType, position: XYPosition) => string;
  updateNodeData: <T extends WorkflowNodeData>(
    nodeId: string,
    data: Partial<T>
  ) => void;
  removeNode: (nodeId: string) => void;
  duplicateNode: (nodeId: string) => string | null;

  // React Flow handlers
  onNodesChange: (changes: NodeChange<WorkflowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<WorkflowEdge>[]) => void;
  onConnect: (connection: Connection) => void;

  // Edge operations
  removeEdge: (edgeId: string) => void;
  setEdgeStyle: (style: EdgeStyle) => void;

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
  setWorkflowName: (name: string) => void;

  // Helpers
  getNodeById: (id: string) => WorkflowNode | undefined;
  getConnectedInputs: (nodeId: string) => Map<string, string | string[]>;
  validateWorkflow: () => ValidationResult;
  isValidConnection: (connection: Connection) => boolean;
  setDirty: (dirty: boolean) => void;
}

// Helper to get handle type from node type and handle id
function getHandleType(
  nodeType: NodeType,
  handleId: string | null,
  direction: "source" | "target"
): HandleType | null {
  const nodeDef = NODE_DEFINITIONS[nodeType];
  if (!nodeDef) return null;

  const handles = direction === "source" ? nodeDef.outputs : nodeDef.inputs;
  const handle = handles.find((h) => h.id === handleId);

  return handle?.type ?? null;
}

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  nodes: [],
  edges: [],
  edgeStyle: "bezier",
  workflowName: "Untitled Workflow",
  workflowId: null,
  isDirty: false,
  isSaving: false,
  isLoading: false,

  addNode: (type, position) => {
    const nodeDef = NODE_DEFINITIONS[type];
    if (!nodeDef) return "";

    const id = generateId();
    const newNode: WorkflowNode = {
      id,
      type,
      position,
      data: {
        ...nodeDef.defaultData,
        label: nodeDef.label,
        status: "idle",
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
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      ),
      isDirty: true,
    }));
  },

  removeNode: (nodeId) => {
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== nodeId),
      edges: state.edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      ),
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
        status: "idle",
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

  loadWorkflow: (workflow) => {
    set({
      nodes: workflow.nodes,
      edges: workflow.edges,
      edgeStyle: workflow.edgeStyle,
      workflowName: workflow.name,
      workflowId: null, // Reset ID when loading from file/template
      isDirty: true, // Mark as dirty since it's a new unsaved workflow
    });
  },

  clearWorkflow: () => {
    set({
      nodes: [],
      edges: [],
      workflowName: "Untitled Workflow",
      workflowId: null,
      isDirty: false,
    });
  },

  exportWorkflow: () => {
    const { nodes, edges, edgeStyle, workflowName } = get();
    return {
      version: 1,
      name: workflowName,
      description: "",
      nodes,
      edges,
      edgeStyle,
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
      if (edge.sourceHandle === "image") {
        value = sourceData.outputImage ?? sourceData.image ?? null;
      } else if (edge.sourceHandle === "video") {
        value = sourceData.outputVideo ?? null;
      } else if (edge.sourceHandle === "text") {
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
    const errors: { nodeId: string; message: string; severity: "error" | "warning" }[] = [];
    const warnings: { nodeId: string; message: string; severity: "error" | "warning" }[] = [];

    // Check for disconnected required inputs
    for (const node of nodes) {
      const nodeDef = NODE_DEFINITIONS[node.type as NodeType];
      if (!nodeDef) continue;

      const incomingEdges = edges.filter((e) => e.target === node.id);

      for (const input of nodeDef.inputs) {
        if (input.required) {
          const hasConnection = incomingEdges.some(
            (e) => e.targetHandle === input.id
          );
          if (!hasConnection) {
            errors.push({
              nodeId: node.id,
              message: `Missing required input: ${input.label}`,
              severity: "error",
            });
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
          message: "Workflow contains a cycle",
          severity: "error",
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
      "source"
    );
    const targetType = getHandleType(
      targetNode.type as NodeType,
      connection.targetHandle ?? null,
      "target"
    );

    if (!sourceType || !targetType) return false;

    return CONNECTION_RULES[sourceType]?.includes(targetType) ?? false;
  },

  setDirty: (dirty) => {
    set({ isDirty: dirty });
  },

  setWorkflowName: (name) => {
    set({ workflowName: name, isDirty: true });
  },

  // API Operations
  saveWorkflow: async (signal) => {
    const { nodes, edges, edgeStyle, workflowName, workflowId } = get();
    set({ isSaving: true });

    try {
      let workflow: WorkflowData;

      if (workflowId) {
        // Update existing workflow
        workflow = await workflowsApi.update(
          workflowId,
          { name: workflowName, nodes, edges, edgeStyle },
          signal,
        );
      } else {
        // Create new workflow
        workflow = await workflowsApi.create(
          { name: workflowName, nodes, edges, edgeStyle },
          signal,
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
        workflowName: "Untitled Workflow",
        workflowId: null,
        isDirty: false,
      });
    }
  },

  duplicateWorkflowApi: async (id, signal) => {
    const workflow = await workflowsApi.duplicate(id, signal);
    return workflow;
  },
}));
