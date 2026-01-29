import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useExecutionStore } from './executionStore';

// Mock the workflowStore
vi.mock('./workflowStore', () => ({
  useWorkflowStore: {
    getState: vi.fn(() => ({
      nodes: [],
      edges: [],
      validateWorkflow: vi.fn(() => ({ isValid: true, errors: [], warnings: [] })),
      getNodeById: vi.fn(),
      updateNodeData: vi.fn(),
      getConnectedInputs: vi.fn(() => new Map()),
      isNodeLocked: vi.fn(() => false),
    })),
  },
}));

// Mock fetch with preconnect
const mockFetch = Object.assign(vi.fn(), { preconnect: vi.fn() }) as typeof fetch;
global.fetch = mockFetch;

describe('useExecutionStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset store to initial state
    useExecutionStore.setState({
      isRunning: false,
      executionId: null,
      currentNodeId: null,
      validationErrors: null,
      eventSource: null,
      lastFailedNodeId: null,
      jobs: new Map(),
      estimatedCost: 0,
      actualCost: 0,
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useExecutionStore.getState();

      expect(state.isRunning).toBe(false);
      expect(state.executionId).toBeNull();
      expect(state.currentNodeId).toBeNull();
      expect(state.validationErrors).toBeNull();
      expect(state.lastFailedNodeId).toBeNull();
      expect(state.jobs.size).toBe(0);
      expect(state.estimatedCost).toBe(0);
      expect(state.actualCost).toBe(0);
    });
  });

  describe('addJob', () => {
    it('should add a job to the jobs map', () => {
      const { addJob } = useExecutionStore.getState();

      addJob('node-1', 'prediction-123');

      const state = useExecutionStore.getState();
      expect(state.jobs.size).toBe(1);

      const job = state.jobs.get('prediction-123');
      expect(job).toBeDefined();
      expect(job?.nodeId).toBe('node-1');
      expect(job?.predictionId).toBe('prediction-123');
      expect(job?.status).toBe('pending');
      expect(job?.progress).toBe(0);
      expect(job?.output).toBeNull();
      expect(job?.error).toBeNull();
    });

    it('should add multiple jobs', () => {
      const { addJob } = useExecutionStore.getState();

      addJob('node-1', 'prediction-1');
      addJob('node-2', 'prediction-2');
      addJob('node-3', 'prediction-3');

      expect(useExecutionStore.getState().jobs.size).toBe(3);
    });
  });

  describe('updateJob', () => {
    it('should update job status', () => {
      const { addJob, updateJob } = useExecutionStore.getState();

      addJob('node-1', 'prediction-123');
      updateJob('prediction-123', { status: 'processing', progress: 50 });

      const job = useExecutionStore.getState().jobs.get('prediction-123');
      expect(job?.status).toBe('processing');
      expect(job?.progress).toBe(50);
    });

    it('should update job output', () => {
      const { addJob, updateJob } = useExecutionStore.getState();

      addJob('node-1', 'prediction-123');
      updateJob('prediction-123', {
        status: 'succeeded',
        output: 'https://example.com/output.png',
      });

      const job = useExecutionStore.getState().jobs.get('prediction-123');
      expect(job?.status).toBe('succeeded');
      expect(job?.output).toBe('https://example.com/output.png');
    });

    it('should update job error', () => {
      const { addJob, updateJob } = useExecutionStore.getState();

      addJob('node-1', 'prediction-123');
      updateJob('prediction-123', {
        status: 'failed',
        error: 'API error: Rate limited',
      });

      const job = useExecutionStore.getState().jobs.get('prediction-123');
      expect(job?.status).toBe('failed');
      expect(job?.error).toBe('API error: Rate limited');
    });

    it('should not fail for non-existent job', () => {
      const { updateJob } = useExecutionStore.getState();

      // Should not throw
      updateJob('non-existent', { status: 'processing' });

      expect(useExecutionStore.getState().jobs.size).toBe(0);
    });
  });

  describe('getJobByNodeId', () => {
    it('should return job by node ID', () => {
      const { addJob, getJobByNodeId } = useExecutionStore.getState();

      addJob('node-1', 'prediction-1');
      addJob('node-2', 'prediction-2');

      const job = getJobByNodeId('node-1');

      expect(job).toBeDefined();
      expect(job?.predictionId).toBe('prediction-1');
    });

    it('should return undefined for non-existent node', () => {
      const { addJob, getJobByNodeId } = useExecutionStore.getState();

      addJob('node-1', 'prediction-1');

      const job = getJobByNodeId('non-existent');

      expect(job).toBeUndefined();
    });
  });

  describe('stopExecution', () => {
    it('should stop execution', () => {
      useExecutionStore.setState({
        isRunning: true,
        currentNodeId: 'node-2',
        executionId: 'exec-123',
      });

      const { stopExecution } = useExecutionStore.getState();
      stopExecution();

      const state = useExecutionStore.getState();
      expect(state.isRunning).toBe(false);
      expect(state.currentNodeId).toBeNull();
    });
  });

  describe('clearValidationErrors', () => {
    it('should clear validation errors', () => {
      useExecutionStore.setState({
        validationErrors: {
          isValid: false,
          errors: [{ nodeId: 'node-1', message: 'Error', severity: 'error' }],
          warnings: [],
        },
      });

      const { clearValidationErrors } = useExecutionStore.getState();
      clearValidationErrors();

      expect(useExecutionStore.getState().validationErrors).toBeNull();
    });
  });

  describe('resetExecution', () => {
    it('should reset execution state', () => {
      useExecutionStore.setState({
        jobs: new Map([
          [
            'pred-1',
            {
              nodeId: 'node-1',
              predictionId: 'pred-1',
              status: 'succeeded',
              progress: 100,
              output: null,
              error: null,
              createdAt: '',
            },
          ],
        ]),
        currentNodeId: 'node-3',
        executionId: 'exec-123',
        actualCost: 1.5,
        lastFailedNodeId: 'node-2',
      });

      const { resetExecution } = useExecutionStore.getState();
      resetExecution();

      const state = useExecutionStore.getState();
      expect(state.jobs.size).toBe(0);
      expect(state.currentNodeId).toBeNull();
      expect(state.executionId).toBeNull();
      expect(state.actualCost).toBe(0);
      expect(state.lastFailedNodeId).toBeNull();
    });
  });

  describe('canResumeFromFailed', () => {
    it('should return true when there is a failed node and executionId', () => {
      useExecutionStore.setState({
        executionId: 'exec-123',
        lastFailedNodeId: 'node-1',
        isRunning: false,
      });

      const { canResumeFromFailed } = useExecutionStore.getState();
      expect(canResumeFromFailed()).toBe(true);
    });

    it('should return false when no failed node', () => {
      useExecutionStore.setState({
        executionId: 'exec-123',
        lastFailedNodeId: null,
        isRunning: false,
      });

      const { canResumeFromFailed } = useExecutionStore.getState();
      expect(canResumeFromFailed()).toBe(false);
    });

    it('should return false when still running', () => {
      useExecutionStore.setState({
        executionId: 'exec-123',
        lastFailedNodeId: 'node-1',
        isRunning: true,
      });

      const { canResumeFromFailed } = useExecutionStore.getState();
      expect(canResumeFromFailed()).toBe(false);
    });

    it('should return false when no executionId', () => {
      useExecutionStore.setState({
        executionId: null,
        lastFailedNodeId: 'node-1',
        isRunning: false,
      });

      const { canResumeFromFailed } = useExecutionStore.getState();
      expect(canResumeFromFailed()).toBe(false);
    });
  });

  describe('setEstimatedCost', () => {
    it('should set estimated cost', () => {
      const { setEstimatedCost } = useExecutionStore.getState();

      setEstimatedCost(2.5);

      expect(useExecutionStore.getState().estimatedCost).toBe(2.5);
    });
  });
});
