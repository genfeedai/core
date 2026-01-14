import { apiClient } from "./client";

export interface NodeResult {
  nodeId: string;
  status: "pending" | "processing" | "complete" | "error";
  output?: Record<string, unknown>;
  error?: string;
  cost: number;
  startedAt?: string;
  completedAt?: string;
}

export interface ExecutionData {
  _id: string;
  workflowId: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  startedAt?: string;
  completedAt?: string;
  totalCost: number;
  nodeResults: NodeResult[];
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobData {
  _id: string;
  executionId: string;
  nodeId: string;
  predictionId: string;
  status: "pending" | "processing" | "succeeded" | "failed" | "canceled";
  progress: number;
  output?: Record<string, unknown>;
  error?: string;
  cost: number;
  createdAt: string;
  updatedAt: string;
}

export const executionsApi = {
  /**
   * Start a workflow execution
   */
  create: (workflowId: string, signal?: AbortSignal): Promise<ExecutionData> =>
    apiClient.post<ExecutionData>(`/workflows/${workflowId}/execute`, undefined, { signal }),

  /**
   * Get all executions for a workflow
   */
  getByWorkflow: (workflowId: string, signal?: AbortSignal): Promise<ExecutionData[]> =>
    apiClient.get<ExecutionData[]>(`/workflows/${workflowId}/executions`, { signal }),

  /**
   * Get a single execution by ID
   */
  getById: (id: string, signal?: AbortSignal): Promise<ExecutionData> =>
    apiClient.get<ExecutionData>(`/executions/${id}`, { signal }),

  /**
   * Stop a running execution
   */
  stop: (id: string, signal?: AbortSignal): Promise<ExecutionData> =>
    apiClient.post<ExecutionData>(`/executions/${id}/stop`, undefined, { signal }),

  /**
   * Get all jobs for an execution
   */
  getJobs: (executionId: string, signal?: AbortSignal): Promise<JobData[]> =>
    apiClient.get<JobData[]>(`/executions/${executionId}/jobs`, { signal }),

  /**
   * Get a job by prediction ID
   */
  getJobByPredictionId: (predictionId: string, signal?: AbortSignal): Promise<JobData> =>
    apiClient.get<JobData>(`/jobs/${predictionId}`, { signal }),
};
