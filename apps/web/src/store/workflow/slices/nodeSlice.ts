import type { NodeType, WorkflowEdge, WorkflowNode, WorkflowNodeData } from '@genfeedai/types';
import { NODE_DEFINITIONS } from '@genfeedai/types';
import type { XYPosition } from '@xyflow/react';
import type { StateCreator } from 'zustand';
import { generateId } from '../helpers/nodeHelpers';
import {
  getNodeOutput,
  computeDownstreamUpdates,
  hasStateChanged,
  applyNodeUpdates,
} from '../helpers/propagation';
import type { WorkflowStore } from '../types';

export interface NodeSlice {
  addNode: (type: NodeType, position: XYPosition) => string;
  updateNodeData: <T extends WorkflowNodeData>(nodeId: string, data: Partial<T>) => void;
  removeNode: (nodeId: string) => void;
  duplicateNode: (nodeId: string) => string | null;
  propagateOutputsDownstream: (sourceNodeId: string, outputValue?: string) => void;
}

export const createNodeSlice: StateCreator<WorkflowStore, [], [], NodeSlice> = (set, get) => ({
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
      ...(type === 'download' && { width: 280, height: 320 }),
    };

    set((state) => ({
      nodes: [...state.nodes, newNode],
      isDirty: true,
    }));

    return id;
  },

  updateNodeData: (nodeId, data) => {
    const { nodes, propagateOutputsDownstream } = get();
    const node = nodes.find((n) => n.id === nodeId);

    const TRANSIENT_KEYS = new Set(['status', 'progress', 'error', 'jobId']);
    const dataKeys = Object.keys(data as Record<string, unknown>);
    const hasPersistedChange = dataKeys.some((key) => !TRANSIENT_KEYS.has(key));

    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n)),
      ...(hasPersistedChange && { isDirty: true }),
    }));

    const inputNodeTypes = [
      'prompt',
      'image',
      'imageInput',
      'video',
      'videoInput',
      'audio',
      'audioInput',
      'tweetParser',
    ];
    const hasOutputUpdate =
      'outputImage' in data ||
      'outputImages' in data ||
      'outputVideo' in data ||
      'outputAudio' in data ||
      'outputText' in data;

    if (node && (inputNodeTypes.includes(node.type as string) || hasOutputUpdate)) {
      if (hasOutputUpdate) {
        const dataRecord = data as Record<string, unknown>;
        if ('outputImages' in dataRecord) {
          propagateOutputsDownstream(nodeId);
        } else {
          const outputValue =
            dataRecord.outputImage ??
            dataRecord.outputVideo ??
            dataRecord.outputAudio ??
            dataRecord.outputText;
          if (typeof outputValue === 'string') {
            propagateOutputsDownstream(nodeId, outputValue);
          }
        }
      } else {
        propagateOutputsDownstream(nodeId);
      }
    }
  },

  removeNode: (nodeId) => {
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== nodeId),
      edges: state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      isDirty: true,
    }));
  },

  duplicateNode: (nodeId) => {
    const { nodes, edges, edgeStyle, propagateOutputsDownstream } = get();
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

    const incomingEdges = edges.filter((e) => e.target === nodeId && e.source !== nodeId);
    const clonedEdges: WorkflowEdge[] = incomingEdges.map((edge) => ({
      ...edge,
      id: generateId(),
      target: newId,
      type: edgeStyle,
    }));

    set((state) => ({
      nodes: [...state.nodes, newNode],
      edges: [...state.edges, ...clonedEdges],
      isDirty: true,
    }));

    const sourcesNotified = new Set<string>();
    for (const edge of incomingEdges) {
      if (!sourcesNotified.has(edge.source)) {
        sourcesNotified.add(edge.source);
        propagateOutputsDownstream(edge.source);
      }
    }

    return newId;
  },

  propagateOutputsDownstream: (sourceNodeId, outputValue?) => {
    const { nodes, edges } = get();
    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode) return;

    const output = outputValue ?? getNodeOutput(sourceNode);
    if (!output) return;

    const updates = computeDownstreamUpdates(sourceNodeId, output, nodes, edges);
    if (updates.size === 0) return;
    if (!hasStateChanged(updates, nodes)) return;

    set((state) => ({
      nodes: applyNodeUpdates(state.nodes, updates),
      isDirty: true,
    }));
  },
});
