import type { WorkflowEdge, WorkflowInterface, WorkflowNode } from '@genfeedai/types';
import type { NodeGroup } from '@/types/groups';
import { apiClient } from './client';

export interface WorkflowData {
  _id: string;
  name: string;
  description?: string;
  version: number;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  edgeStyle: string;
  groups?: NodeGroup[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkflowInput {
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  edgeStyle?: string;
  groups?: NodeGroup[];
}

export interface UpdateWorkflowInput {
  name?: string;
  description?: string;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  edgeStyle?: string;
  groups?: NodeGroup[];
}

export const workflowsApi = {
  /**
   * Get all workflows
   */
  getAll: (signal?: AbortSignal): Promise<WorkflowData[]> =>
    apiClient.get<WorkflowData[]>('/workflows', { signal }),

  /**
   * Get a single workflow by ID
   */
  getById: (id: string, signal?: AbortSignal): Promise<WorkflowData> =>
    apiClient.get<WorkflowData>(`/workflows/${id}`, { signal }),

  /**
   * Create a new workflow
   */
  create: (data: CreateWorkflowInput, signal?: AbortSignal): Promise<WorkflowData> =>
    apiClient.post<WorkflowData>('/workflows', data, { signal }),

  /**
   * Update an existing workflow
   */
  update: (id: string, data: UpdateWorkflowInput, signal?: AbortSignal): Promise<WorkflowData> =>
    apiClient.put<WorkflowData>(`/workflows/${id}`, data, { signal }),

  /**
   * Delete a workflow (soft delete)
   */
  delete: (id: string, signal?: AbortSignal): Promise<void> =>
    apiClient.delete<void>(`/workflows/${id}`, { signal }),

  /**
   * Duplicate a workflow
   */
  duplicate: (id: string, signal?: AbortSignal): Promise<WorkflowData> =>
    apiClient.post<WorkflowData>(`/workflows/${id}/duplicate`, undefined, { signal }),

  // Composition endpoints

  /**
   * Get the interface of a workflow (inputs/outputs defined by boundary nodes)
   */
  getInterface: (id: string, signal?: AbortSignal): Promise<WorkflowInterface> =>
    apiClient.get<WorkflowInterface>(`/workflows/${id}/interface`, { signal }),

  /**
   * Get workflows that can be referenced as subworkflows (have defined interface)
   */
  getReferencable: (
    excludeWorkflowId?: string,
    signal?: AbortSignal
  ): Promise<Array<WorkflowData & { interface: WorkflowInterface }>> =>
    apiClient.get<Array<WorkflowData & { interface: WorkflowInterface }>>(
      `/workflows/referencable${excludeWorkflowId ? `?exclude=${excludeWorkflowId}` : ''}`,
      { signal }
    ),

  /**
   * Validate a workflow reference (checks for circular references)
   * Returns the child workflow's interface if valid
   */
  validateReference: (
    parentWorkflowId: string,
    childWorkflowId: string,
    signal?: AbortSignal
  ): Promise<WorkflowInterface> =>
    apiClient.post<WorkflowInterface>(
      `/workflows/${parentWorkflowId}/validate-reference`,
      { childWorkflowId },
      { signal }
    ),
};
