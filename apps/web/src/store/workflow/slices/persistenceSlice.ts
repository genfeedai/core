import type {
  EdgeStyle,
  NodeType,
  ValidationResult,
  WorkflowEdge,
  WorkflowFile,
  WorkflowNode,
  WorkflowNodeData,
  WorkflowRefNodeData,
} from '@genfeedai/types';
import { NODE_DEFINITIONS } from '@genfeedai/types';
import type { StateCreator } from 'zustand';
import { type WorkflowData, workflowsApi } from '@/lib/api';
import { calculateWorkflowCost } from '@/lib/replicate/client';
import { hydrateWorkflowNodes } from '@/lib/utils/nodeHydration';
import { useExecutionStore } from '@/store/executionStore';
import type { WorkflowStore } from '../types';

/**
 * Normalize edges loaded from storage to use React Flow edge types.
 * Migrates legacy 'bezier' type to 'default'.
 */
function normalizeEdgeTypes(edges: WorkflowEdge[]): WorkflowEdge[] {
  return edges.map((edge) => ({
    ...edge,
    type: edge.type === 'bezier' ? 'default' : edge.type,
  }));
}

export interface PersistenceSlice {
  loadWorkflow: (workflow: WorkflowFile) => void;
  clearWorkflow: () => void;
  exportWorkflow: () => WorkflowFile;
  saveWorkflow: (signal?: AbortSignal) => Promise<WorkflowData>;
  loadWorkflowById: (id: string, signal?: AbortSignal) => Promise<void>;
  listWorkflows: (signal?: AbortSignal) => Promise<WorkflowData[]>;
  deleteWorkflow: (id: string, signal?: AbortSignal) => Promise<void>;
  duplicateWorkflowApi: (id: string, signal?: AbortSignal) => Promise<WorkflowData>;
  createNewWorkflow: (signal?: AbortSignal) => Promise<string>;
  setWorkflowName: (name: string) => void;
  getNodeById: (id: string) => WorkflowNode | undefined;
  getConnectedInputs: (nodeId: string) => Map<string, string | string[]>;
  getConnectedNodeIds: (nodeIds: string[]) => string[];
  validateWorkflow: () => ValidationResult;
  setDirty: (dirty: boolean) => void;
  getNodesWithComments: () => WorkflowNode[];
  markCommentViewed: (nodeId: string) => void;
  setNavigationTarget: (nodeId: string | null) => void;
  getUnviewedCommentCount: () => number;
}

export const createPersistenceSlice: StateCreator<WorkflowStore, [], [], PersistenceSlice> = (
  set,
  get
) => ({
  loadWorkflow: (workflow) => {
    const hydratedNodes = hydrateWorkflowNodes(workflow.nodes);

    set({
      nodes: hydratedNodes,
      edges: normalizeEdgeTypes(workflow.edges),
      edgeStyle: workflow.edgeStyle,
      workflowName: workflow.name,
      workflowId: null,
      isDirty: true,
      groups: workflow.groups ?? [],
      selectedNodeIds: [],
    });

    const estimatedCost = calculateWorkflowCost(hydratedNodes);
    useExecutionStore.getState().setEstimatedCost(estimatedCost);

    // Propagate existing outputs to downstream nodes after load
    // Includes both output fields from generation nodes and values from input nodes
    const { propagateOutputsDownstream } = get();
    for (const node of hydratedNodes) {
      const data = node.data as Record<string, unknown>;
      const hasOutput =
        data.outputImage ||
        data.outputVideo ||
        data.outputAudio ||
        data.outputText ||
        data.prompt || // Prompt node
        data.image || // Image node
        data.audio; // Audio node
      if (hasOutput) {
        propagateOutputsDownstream(node.id);
      }
    }

    // Propagation after load is idempotent; don't trigger save cycle
    set({ isDirty: false });
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

      const sourceData = sourceNode.data as WorkflowNodeData & {
        outputImage?: string;
        outputVideo?: string;
        outputText?: string;
        outputAudio?: string;
        prompt?: string;
        image?: string;
        video?: string;
        audio?: string;
      };

      let value: string | null = null;

      if (edge.sourceHandle === 'image') {
        value = sourceData.outputImage ?? sourceData.image ?? null;
      } else if (edge.sourceHandle === 'video') {
        value = sourceData.outputVideo ?? sourceData.video ?? null;
      } else if (edge.sourceHandle === 'text') {
        value = sourceData.outputText ?? sourceData.prompt ?? null;
      } else if (edge.sourceHandle === 'audio') {
        value = sourceData.outputAudio ?? sourceData.audio ?? null;
      }

      if (value) {
        const existing = inputs.get(handleId);
        if (existing) {
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

  getConnectedNodeIds: (nodeIds) => {
    const { edges } = get();
    const connected = new Set<string>(nodeIds);
    const visited = new Set<string>();

    // Traverse UPSTREAM only - find all nodes that feed into the selected nodes
    // This way selecting a node shows its dependencies, not what depends on it
    const queue = [...nodeIds];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const upstreamEdges = edges.filter((e) => e.target === currentId);
      for (const edge of upstreamEdges) {
        if (!connected.has(edge.source)) {
          connected.add(edge.source);
          queue.push(edge.source);
        }
      }
    }

    return Array.from(connected);
  },

  validateWorkflow: () => {
    const { nodes, edges } = get();
    const errors: { nodeId: string; message: string; severity: 'error' | 'warning' }[] = [];
    const warnings: { nodeId: string; message: string; severity: 'error' | 'warning' }[] = [];

    if (nodes.length === 0) {
      errors.push({
        nodeId: '',
        message: 'Workflow is empty - add some nodes first',
        severity: 'error',
      });
      return { isValid: false, errors, warnings };
    }

    if (edges.length === 0 && nodes.length > 1) {
      errors.push({
        nodeId: '',
        message: 'No connections - connect your nodes together',
        severity: 'error',
      });
      return { isValid: false, errors, warnings };
    }

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
          return true;
      }
    };

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

    for (const node of nodes) {
      if (node.type === 'workflowRef') {
        const refData = node.data as WorkflowRefNodeData;
        if (!refData.referencedWorkflowId) {
          errors.push({
            nodeId: node.id,
            message: 'Subworkflow node must reference a workflow',
            severity: 'error',
          });
        } else if (!refData.cachedInterface) {
          warnings.push({
            nodeId: node.id,
            message: 'Subworkflow interface not loaded - refresh to update handles',
            severity: 'warning',
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  },

  setDirty: (dirty) => {
    set({ isDirty: dirty });
  },

  setWorkflowName: (name) => {
    set({ workflowName: name, isDirty: true });
  },

  saveWorkflow: async (signal) => {
    const { nodes, edges, edgeStyle, workflowName, workflowId, groups } = get();
    set({ isSaving: true });

    try {
      let workflow: WorkflowData;

      if (workflowId) {
        workflow = await workflowsApi.update(
          workflowId,
          { name: workflowName, nodes, edges, edgeStyle, groups },
          signal
        );
      } else {
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
      const nodes = hydrateWorkflowNodes(workflow.nodes as WorkflowNode[]);

      set({
        nodes,
        edges: normalizeEdgeTypes(workflow.edges as WorkflowEdge[]),
        edgeStyle: workflow.edgeStyle as EdgeStyle,
        workflowName: workflow.name,
        workflowId: workflow._id,
        groups: workflow.groups ?? [],
        isDirty: false,
        isLoading: false,
      });

      const estimatedCost = calculateWorkflowCost(nodes);
      useExecutionStore.getState().setEstimatedCost(estimatedCost);

      // Propagate existing outputs to downstream nodes after load
      // Includes both output fields from generation nodes and values from input nodes
      const { propagateOutputsDownstream } = get();
      for (const node of nodes) {
        const data = node.data as Record<string, unknown>;
        const hasOutput =
          data.outputImage ||
          data.outputVideo ||
          data.outputAudio ||
          data.outputText ||
          data.prompt || // Prompt node
          data.image || // Image node
          data.audio; // Audio node
        if (hasOutput) {
          propagateOutputsDownstream(node.id);
        }
      }

      // Propagation after load is idempotent; don't trigger save cycle
      set({ isDirty: false });
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

  getNodesWithComments: () => {
    const { nodes } = get();
    return nodes
      .filter((node) => {
        const data = node.data as WorkflowNodeData;
        return data.comment?.trim();
      })
      .sort((a, b) => {
        if (Math.abs(a.position.y - b.position.y) < 50) {
          return a.position.x - b.position.x;
        }
        return a.position.y - b.position.y;
      });
  },

  markCommentViewed: (nodeId: string) => {
    set((state) => {
      const newSet = new Set(state.viewedCommentIds);
      newSet.add(nodeId);
      return { viewedCommentIds: newSet };
    });
  },

  setNavigationTarget: (nodeId: string | null) => {
    set({ navigationTargetId: nodeId });
  },

  getUnviewedCommentCount: () => {
    const { nodes, viewedCommentIds } = get();
    return nodes.filter((node) => {
      const data = node.data as WorkflowNodeData;
      return data.comment?.trim() && !viewedCommentIds.has(node.id);
    }).length;
  },
});
