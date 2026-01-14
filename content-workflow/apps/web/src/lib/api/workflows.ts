import { apiClient } from "./client";
import type { WorkflowNode, WorkflowEdge } from "@content-workflow/types";

export interface WorkflowData {
  _id: string;
  name: string;
  description?: string;
  version: number;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  edgeStyle: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkflowInput {
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  edgeStyle?: string;
}

export interface UpdateWorkflowInput {
  name?: string;
  description?: string;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  edgeStyle?: string;
}

export const workflowsApi = {
  /**
   * Get all workflows
   */
  getAll: (signal?: AbortSignal): Promise<WorkflowData[]> =>
    apiClient.get<WorkflowData[]>("/workflows", { signal }),

  /**
   * Get a single workflow by ID
   */
  getById: (id: string, signal?: AbortSignal): Promise<WorkflowData> =>
    apiClient.get<WorkflowData>(`/workflows/${id}`, { signal }),

  /**
   * Create a new workflow
   */
  create: (data: CreateWorkflowInput, signal?: AbortSignal): Promise<WorkflowData> =>
    apiClient.post<WorkflowData>("/workflows", data, { signal }),

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
};
