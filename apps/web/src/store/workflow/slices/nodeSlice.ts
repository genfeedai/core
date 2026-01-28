import type { NodeType, WorkflowNode, WorkflowNodeData } from '@genfeedai/types';
import { NODE_DEFINITIONS } from '@genfeedai/types';
import type { XYPosition } from '@xyflow/react';
import type { StateCreator } from 'zustand';
import { generateId } from '../helpers/nodeHelpers';
import type { WorkflowStore } from '../types';

export interface NodeSlice {
  addNode: (type: NodeType, position: XYPosition) => string;
  updateNodeData: <T extends WorkflowNodeData>(nodeId: string, data: Partial<T>) => void;
  removeNode: (nodeId: string) => void;
  duplicateNode: (nodeId: string) => string | null;
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
});
