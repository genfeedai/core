import type { StateCreator } from 'zustand';
import type { ExecutionStore, Job } from '../types';

export interface JobSlice {
  addJob: (nodeId: string, predictionId: string) => void;
  updateJob: (predictionId: string, updates: Partial<Job>) => void;
  getJobByNodeId: (nodeId: string) => Job | undefined;
}

export const createJobSlice: StateCreator<ExecutionStore, [], [], JobSlice> = (set, get) => ({
  addJob: (nodeId, predictionId) => {
    set((state) => {
      const newJobs = new Map(state.jobs);
      newJobs.set(predictionId, {
        nodeId,
        predictionId,
        status: 'pending',
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
});
