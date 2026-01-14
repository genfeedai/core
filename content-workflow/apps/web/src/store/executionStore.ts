import { create } from "zustand";
import type { NodeType, NodeStatus } from "@/types/nodes";
import { useWorkflowStore } from "./workflowStore";

export interface Job {
  nodeId: string;
  predictionId: string;
  status: "pending" | "processing" | "succeeded" | "failed" | "canceled";
  progress: number;
  output: unknown | null;
  error: string | null;
  createdAt: string;
}

interface ExecutionStore {
  // State
  isRunning: boolean;
  currentNodeId: string | null;
  executionQueue: string[];
  completedNodes: Set<string>;

  // Job tracking
  jobs: Map<string, Job>;

  // Cost tracking
  estimatedCost: number;
  actualCost: number;

  // Actions
  executeWorkflow: () => Promise<void>;
  executeNode: (nodeId: string) => Promise<void>;
  stopExecution: () => void;
  retryNode: (nodeId: string) => Promise<void>;

  // Job management
  addJob: (nodeId: string, predictionId: string) => void;
  updateJob: (predictionId: string, updates: Partial<Job>) => void;
  getJobByNodeId: (nodeId: string) => Job | undefined;

  // Helpers
  getExecutionOrder: () => string[];
  resetExecution: () => void;
}

// Topological sort for execution order
function topologicalSort(
  nodes: { id: string }[],
  edges: { source: string; target: string }[]
): string[] {
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  // Initialize
  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjList.set(node.id, []);
  }

  // Build adjacency list and in-degree count
  for (const edge of edges) {
    adjList.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  // Find all nodes with no incoming edges
  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  const result: string[] = [];

  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);

    for (const neighbor of adjList.get(node) ?? []) {
      inDegree.set(neighbor, (inDegree.get(neighbor) ?? 1) - 1);
      if (inDegree.get(neighbor) === 0) {
        queue.push(neighbor);
      }
    }
  }

  return result;
}

export const useExecutionStore = create<ExecutionStore>((set, get) => ({
  isRunning: false,
  currentNodeId: null,
  executionQueue: [],
  completedNodes: new Set(),
  jobs: new Map(),
  estimatedCost: 0,
  actualCost: 0,

  executeWorkflow: async () => {
    const { isRunning, getExecutionOrder, executeNode, resetExecution } = get();
    if (isRunning) return;

    resetExecution();
    const order = getExecutionOrder();

    set({
      isRunning: true,
      executionQueue: order,
    });

    for (const nodeId of order) {
      const { isRunning: stillRunning } = get();
      if (!stillRunning) break;

      try {
        await executeNode(nodeId);
      } catch (error) {
        console.error(`Error executing node ${nodeId}:`, error);
        // Continue with other nodes or stop based on error type
      }
    }

    set({ isRunning: false, currentNodeId: null });
  },

  executeNode: async (nodeId) => {
    const workflowStore = useWorkflowStore.getState();
    const node = workflowStore.getNodeById(nodeId);
    if (!node) return;

    set({ currentNodeId: nodeId });

    // Update node status to processing
    workflowStore.updateNodeData(nodeId, { status: "processing" as NodeStatus });

    try {
      // Get connected inputs
      const inputs = workflowStore.getConnectedInputs(nodeId);

      // Execute based on node type
      const nodeType = node.type as NodeType;

      switch (nodeType) {
        case "imageGen":
        case "videoGen":
        case "llm": {
          // These require API calls - handled separately
          const response = await fetch(`/api/replicate/${nodeType}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nodeId,
              inputs: Object.fromEntries(inputs),
              config: node.data,
            }),
          });

          if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
          }

          const result = await response.json();

          if (result.predictionId) {
            // Async job - poll for completion
            get().addJob(nodeId, result.predictionId);
            await pollJob(result.predictionId, nodeId, workflowStore, get());
          } else if (result.output) {
            // Sync result
            updateNodeOutput(nodeId, nodeType, result.output, workflowStore);
          }
          break;
        }

        case "prompt":
        case "imageInput":
        case "template": {
          // Input nodes don't need processing, just mark complete
          workflowStore.updateNodeData(nodeId, {
            status: "complete" as NodeStatus,
          });
          break;
        }

        case "animation":
        case "videoStitch":
        case "resize": {
          // Processing nodes - call processing API
          const response = await fetch(`/api/video/process`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nodeId,
              nodeType,
              inputs: Object.fromEntries(inputs),
              config: node.data,
            }),
          });

          if (!response.ok) {
            throw new Error(`Processing error: ${response.statusText}`);
          }

          const result = await response.json();
          updateNodeOutput(nodeId, nodeType, result.output, workflowStore);
          break;
        }

        case "output":
        case "preview":
        case "download": {
          // Output nodes just receive data from inputs
          const inputMedia = inputs.get("media");
          workflowStore.updateNodeData(nodeId, {
            inputMedia: inputMedia as string,
            status: "complete" as NodeStatus,
          });
          break;
        }
      }

      set((state) => ({
        completedNodes: new Set([...state.completedNodes, nodeId]),
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      workflowStore.updateNodeData(nodeId, {
        status: "error" as NodeStatus,
        error: errorMessage,
      });
      throw error;
    }
  },

  stopExecution: () => {
    set({
      isRunning: false,
      currentNodeId: null,
      executionQueue: [],
    });
  },

  retryNode: async (nodeId) => {
    const { executeNode } = get();
    const workflowStore = useWorkflowStore.getState();

    // Reset node status
    workflowStore.updateNodeData(nodeId, {
      status: "idle" as NodeStatus,
      error: undefined,
    });

    await executeNode(nodeId);
  },

  addJob: (nodeId, predictionId) => {
    set((state) => {
      const newJobs = new Map(state.jobs);
      newJobs.set(predictionId, {
        nodeId,
        predictionId,
        status: "pending",
        progress: 0,
        output: null,
        error: null,
        createdAt: new Date().toISOString(),
      });
      return { jobs: newJobs };
    });
  },

  updateJob: (predictionId, updates) => {
    set((state) => {
      const newJobs = new Map(state.jobs);
      const job = newJobs.get(predictionId);
      if (job) {
        newJobs.set(predictionId, { ...job, ...updates });
      }
      return { jobs: newJobs };
    });
  },

  getJobByNodeId: (nodeId) => {
    const { jobs } = get();
    for (const job of jobs.values()) {
      if (job.nodeId === nodeId) return job;
    }
    return undefined;
  },

  getExecutionOrder: () => {
    const workflowStore = useWorkflowStore.getState();
    return topologicalSort(workflowStore.nodes, workflowStore.edges);
  },

  resetExecution: () => {
    set({
      completedNodes: new Set(),
      jobs: new Map(),
      currentNodeId: null,
      executionQueue: [],
      actualCost: 0,
    });

    // Reset all node statuses
    const workflowStore = useWorkflowStore.getState();
    for (const node of workflowStore.nodes) {
      workflowStore.updateNodeData(node.id, {
        status: "idle" as NodeStatus,
        error: undefined,
        progress: undefined,
      });
    }
  },
}));

// Helper function to poll for job completion
async function pollJob(
  predictionId: string,
  nodeId: string,
  workflowStore: ReturnType<typeof useWorkflowStore.getState>,
  executionStore: ReturnType<typeof useExecutionStore.getState>
): Promise<void> {
  const maxAttempts = 120; // 10 minutes max
  const pollInterval = 5000; // 5 seconds

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`/api/status/${predictionId}`);
    const data = await response.json();

    executionStore.updateJob(predictionId, {
      status: data.status,
      progress: data.progress ?? 0,
      output: data.output,
      error: data.error,
    });

    // Update node progress
    workflowStore.updateNodeData(nodeId, {
      progress: data.progress ?? 0,
    });

    if (data.status === "succeeded") {
      const node = workflowStore.getNodeById(nodeId);
      if (node) {
        updateNodeOutput(nodeId, node.type as NodeType, data.output, workflowStore);
      }
      return;
    }

    if (data.status === "failed" || data.status === "canceled") {
      throw new Error(data.error ?? "Job failed");
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error("Job timed out");
}

// Helper function to update node output based on type
function updateNodeOutput(
  nodeId: string,
  nodeType: NodeType,
  output: unknown,
  workflowStore: ReturnType<typeof useWorkflowStore.getState>
): void {
  const updates: Record<string, unknown> = {
    status: "complete" as NodeStatus,
  };

  switch (nodeType) {
    case "imageGen":
      updates.outputImage = output;
      break;
    case "videoGen":
    case "animation":
    case "videoStitch":
      updates.outputVideo = output;
      break;
    case "llm":
      updates.outputText = output;
      break;
    case "resize":
      updates.outputMedia = output;
      break;
  }

  workflowStore.updateNodeData(nodeId, updates);
}
