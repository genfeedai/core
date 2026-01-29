import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JOB_STATUS } from '@/queue/queue.constants';

// Mock BullMQ WorkerHost
vi.mock('@nestjs/bullmq', () => ({
  Processor: () => vi.fn(),
  WorkerHost: class {},
  OnWorkerEvent: () => vi.fn(),
}));

// Mock @genfeedai/core
vi.mock('@genfeedai/core', () => ({
  buildDependencyMap: vi.fn().mockReturnValue(
    new Map([
      ['node-2', ['node-1']],
      ['node-3', ['node-2']],
    ])
  ),
  detectCycles: vi.fn().mockReturnValue(false),
  topologicalSort: vi.fn().mockReturnValue(['node-1', 'node-2', 'node-3']),
}));

// Mock passthrough node types to empty so test nodes are not skipped
vi.mock('@/queue/queue.constants', async () => {
  const actual =
    await vi.importActual<typeof import('@/queue/queue.constants')>('@/queue/queue.constants');
  return {
    ...actual,
    PASSTHROUGH_NODE_TYPES: [],
  };
});

import { buildDependencyMap, detectCycles, topologicalSort } from '@genfeedai/core';
import { WorkflowProcessor } from '@/processors/workflow.processor';

describe('WorkflowProcessor', () => {
  let processor: WorkflowProcessor;
  let mockQueueManager: {
    updateJobStatus: ReturnType<typeof vi.fn>;
    enqueueNode: ReturnType<typeof vi.fn>;
  };
  let mockExecutionsService: {
    updateExecutionStatus: ReturnType<typeof vi.fn>;
    updateNodeResult: ReturnType<typeof vi.fn>;
    setPendingNodes: ReturnType<typeof vi.fn>;
    removeFromPendingNodes: ReturnType<typeof vi.fn>;
  };
  let mockWorkflowsService: {
    findOne: ReturnType<typeof vi.fn>;
  };
  let mockWorkflowInterfaceService: Record<string, never>;

  const mockExecutionId = new Types.ObjectId().toString();
  const mockWorkflowId = new Types.ObjectId().toString();

  const mockWorkflow = {
    _id: mockWorkflowId,
    name: 'Test Workflow',
    nodes: [
      { id: 'node-1', type: 'imageGen', data: { prompt: 'test 1' } },
      { id: 'node-2', type: 'llm', data: { prompt: 'test 2' } },
      { id: 'node-3', type: 'videoGen', data: { model: 'test' } },
    ],
    edges: [
      { source: 'node-1', target: 'node-2' },
      { source: 'node-2', target: 'node-3' },
    ],
  };

  const createMockJob = (overrides = {}) => ({
    id: 'job-123',
    data: {
      executionId: mockExecutionId,
      workflowId: mockWorkflowId,
      timestamp: new Date().toISOString(),
    },
    updateProgress: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockQueueManager = {
      updateJobStatus: vi.fn().mockResolvedValue(undefined),
      enqueueNode: vi.fn().mockResolvedValue('enqueued-job-id'),
    };

    mockExecutionsService = {
      updateExecutionStatus: vi.fn().mockResolvedValue(undefined),
      updateNodeResult: vi.fn().mockResolvedValue(undefined),
      setPendingNodes: vi.fn().mockResolvedValue(undefined),
      removeFromPendingNodes: vi.fn().mockResolvedValue(undefined),
    };

    mockWorkflowsService = {
      findOne: vi.fn().mockResolvedValue(mockWorkflow),
    };

    mockWorkflowInterfaceService = {};

    processor = new WorkflowProcessor(
      mockQueueManager as never,
      mockExecutionsService as never,
      mockWorkflowsService as never,
      mockWorkflowInterfaceService as never
    );
  });

  describe('process', () => {
    it('should update execution status to running', async () => {
      const job = createMockJob();

      await processor.process(job as never);

      expect(mockExecutionsService.updateExecutionStatus).toHaveBeenCalledWith(
        mockExecutionId,
        'running'
      );
    });

    it('should update job status to ACTIVE', async () => {
      const job = createMockJob();

      await processor.process(job as never);

      expect(mockQueueManager.updateJobStatus).toHaveBeenCalledWith('job-123', JOB_STATUS.ACTIVE);
    });

    it('should retrieve workflow definition', async () => {
      const job = createMockJob();

      await processor.process(job as never);

      expect(mockWorkflowsService.findOne).toHaveBeenCalledWith(mockWorkflowId);
    });

    it('should check for cycles in workflow', async () => {
      const job = createMockJob();

      await processor.process(job as never);

      expect(detectCycles).toHaveBeenCalledWith(mockWorkflow.nodes, mockWorkflow.edges);
    });

    it('should throw error when workflow has cycles', async () => {
      vi.mocked(detectCycles).mockReturnValueOnce(true);
      const job = createMockJob();

      await expect(processor.process(job as never)).rejects.toThrow('Workflow contains cycles');
    });

    it('should topologically sort nodes', async () => {
      const job = createMockJob();

      await processor.process(job as never);

      expect(topologicalSort).toHaveBeenCalledWith(mockWorkflow.nodes, mockWorkflow.edges);
    });

    it('should build dependency map', async () => {
      const job = createMockJob();

      await processor.process(job as never);

      expect(buildDependencyMap).toHaveBeenCalledWith(mockWorkflow.nodes, mockWorkflow.edges);
    });

    it('should set pending nodes and enqueue only the first ready node', async () => {
      const job = createMockJob();

      await processor.process(job as never);

      // All 3 nodes should be in pending nodes
      expect(mockExecutionsService.setPendingNodes).toHaveBeenCalledWith(mockExecutionId, [
        { nodeId: 'node-1', nodeType: 'imageGen', nodeData: { prompt: 'test 1' }, dependsOn: [] },
        {
          nodeId: 'node-2',
          nodeType: 'llm',
          nodeData: { prompt: 'test 2' },
          dependsOn: ['node-1'],
        },
        {
          nodeId: 'node-3',
          nodeType: 'videoGen',
          nodeData: { model: 'test' },
          dependsOn: ['node-2'],
        },
      ]);

      // Sequential execution: only the first ready node (node-1) is enqueued
      expect(mockQueueManager.enqueueNode).toHaveBeenCalledTimes(1);
      expect(mockQueueManager.enqueueNode).toHaveBeenCalledWith(
        mockExecutionId,
        mockWorkflowId,
        'node-1',
        'imageGen',
        { prompt: 'test 1' },
        [],
        { nodes: mockWorkflow.nodes, edges: mockWorkflow.edges },
        { debugMode: undefined }
      );

      // First node should be removed from pending after enqueue
      expect(mockExecutionsService.removeFromPendingNodes).toHaveBeenCalledWith(
        mockExecutionId,
        'node-1'
      );
    });

    it('should update job status to COMPLETED after success', async () => {
      const job = createMockJob();

      await processor.process(job as never);

      expect(mockQueueManager.updateJobStatus).toHaveBeenCalledWith(
        'job-123',
        JOB_STATUS.COMPLETED
      );
    });

    it('should update job status to FAILED on error', async () => {
      mockWorkflowsService.findOne.mockRejectedValue(new Error('Workflow not found'));
      const job = createMockJob();

      await expect(processor.process(job as never)).rejects.toThrow('Workflow not found');

      expect(mockQueueManager.updateJobStatus).toHaveBeenCalledWith('job-123', JOB_STATUS.FAILED, {
        error: 'Workflow not found',
      });
    });

    it('should update execution status to failed on error', async () => {
      mockWorkflowsService.findOne.mockRejectedValue(new Error('Test error'));
      const job = createMockJob();

      await expect(processor.process(job as never)).rejects.toThrow();

      expect(mockExecutionsService.updateExecutionStatus).toHaveBeenCalledWith(
        mockExecutionId,
        'failed',
        'Test error'
      );
    });

    it('should skip nodes not found in workflow', async () => {
      vi.mocked(topologicalSort).mockReturnValueOnce(['node-1', 'nonexistent-node']);
      const job = createMockJob();

      await processor.process(job as never);

      // Only node-1 should be in pending and enqueued (nonexistent is skipped)
      expect(mockQueueManager.enqueueNode).toHaveBeenCalledTimes(1);
    });
  });

  describe('onCompleted', () => {
    it('should log completion', () => {
      const job = createMockJob();
      // This is a simple logging method, just verify it doesn't throw
      expect(() => processor.onCompleted(job as never)).not.toThrow();
    });
  });

  describe('onFailed', () => {
    it('should log failure', () => {
      const job = createMockJob();
      const error = new Error('Test error');
      // This is a simple logging method, just verify it doesn't throw
      expect(() => processor.onFailed(job as never, error)).not.toThrow();
    });
  });
});
