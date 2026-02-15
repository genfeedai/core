import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExecutionsController } from '@/controllers/executions.controller';
import type { ExecutionsService } from '@/services/executions.service';
import type { QueueManagerService } from '@/services/queue-manager.service';

describe('ExecutionsController', () => {
  let controller: ExecutionsController;

  const mockWorkflowId = new Types.ObjectId();
  const mockExecutionId = new Types.ObjectId();
  const mockPredictionId = 'prediction-123';

  const mockExecution = {
    _id: mockExecutionId,
    actualCost: 0,
    createdAt: new Date(),
    estimatedCost: 0.15,
    id: mockExecutionId.toString(),
    nodeStatuses: {},
    startedAt: new Date(),
    status: 'pending',
    updatedAt: new Date(),
    workflowId: mockWorkflowId,
  };

  const mockJob = {
    createdAt: new Date(),
    error: null,
    executionId: mockExecutionId,
    nodeId: 'node-1',
    output: null,
    predictionId: mockPredictionId,
    progress: 0,
    status: 'pending',
    updatedAt: new Date(),
  };

  const mockCostDetails = {
    actualCost: 0.15,
    breakdown: [],
    estimatedCost: 0.15,
  };

  const mockService = {
    createExecution: vi.fn().mockResolvedValue(mockExecution),
    findExecution: vi.fn().mockResolvedValue(mockExecution),
    findExecutionsByWorkflow: vi.fn().mockResolvedValue([mockExecution]),
    findJobByPredictionId: vi.fn().mockResolvedValue(mockJob),
    findJobsByExecution: vi.fn().mockResolvedValue([mockJob]),
    getExecutionCostDetails: vi.fn().mockResolvedValue(mockCostDetails),
    getStats: vi.fn().mockResolvedValue({ total: 0 }),
    updateExecutionStatus: vi.fn().mockResolvedValue({ ...mockExecution, status: 'cancelled' }),
    updateJob: vi.fn().mockResolvedValue({ ...mockJob, progress: 100, status: 'completed' }),
  };

  const mockQueueManager = {
    cancelExecution: vi.fn().mockResolvedValue(undefined),
    enqueueWorkflow: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Instantiate controller directly with mocks (bypassing NestJS DI due to type-only imports)
    controller = new ExecutionsController(
      mockService as unknown as ExecutionsService,
      mockQueueManager as unknown as QueueManagerService
    );
  });

  describe('createExecution', () => {
    it('should create a new execution for a workflow', async () => {
      const result = await controller.createExecution(mockWorkflowId.toString(), {});

      expect(result).toEqual(mockExecution);
      expect(mockService.createExecution).toHaveBeenCalledWith(mockWorkflowId.toString(), {
        debugMode: undefined,
        selectedNodeIds: undefined,
      });
      expect(mockQueueManager.enqueueWorkflow).toHaveBeenCalledWith(
        mockExecutionId.toString(),
        mockWorkflowId.toString(),
        { debugMode: undefined, selectedNodeIds: undefined }
      );
    });

    it('should pass debugMode and selectedNodeIds when provided', async () => {
      const body = { debugMode: true, selectedNodeIds: ['node-1', 'node-2'] };

      await controller.createExecution(mockWorkflowId.toString(), body);

      expect(mockService.createExecution).toHaveBeenCalledWith(mockWorkflowId.toString(), {
        debugMode: true,
        selectedNodeIds: ['node-1', 'node-2'],
      });
      expect(mockQueueManager.enqueueWorkflow).toHaveBeenCalledWith(
        mockExecutionId.toString(),
        mockWorkflowId.toString(),
        { debugMode: true, selectedNodeIds: ['node-1', 'node-2'] }
      );
    });
  });

  describe('findByWorkflow', () => {
    it('should return executions for a workflow', async () => {
      const result = await controller.findByWorkflow(mockWorkflowId.toString());

      expect(result).toEqual([mockExecution]);
      expect(mockService.findExecutionsByWorkflow).toHaveBeenCalledWith(mockWorkflowId.toString());
    });
  });

  describe('findOne', () => {
    it('should return a single execution', async () => {
      const result = await controller.findOne(mockExecutionId.toString());

      expect(result).toEqual(mockExecution);
      expect(mockService.findExecution).toHaveBeenCalledWith(mockExecutionId.toString());
    });
  });

  describe('stopExecution', () => {
    it('should cancel an execution', async () => {
      const result = await controller.stopExecution(mockExecutionId.toString());

      expect(result.status).toBe('cancelled');
      expect(mockService.updateExecutionStatus).toHaveBeenCalledWith(
        mockExecutionId.toString(),
        'cancelled'
      );
    });
  });

  describe('findJobsByExecution', () => {
    it('should return jobs for an execution', async () => {
      const result = await controller.findJobsByExecution(mockExecutionId.toString());

      expect(result).toEqual([mockJob]);
      expect(mockService.findJobsByExecution).toHaveBeenCalledWith(mockExecutionId.toString());
    });
  });

  describe('findJobByPredictionId', () => {
    it('should return a job by prediction ID', async () => {
      const result = await controller.findJobByPredictionId(mockPredictionId);

      expect(result).toEqual(mockJob);
      expect(mockService.findJobByPredictionId).toHaveBeenCalledWith(mockPredictionId);
    });
  });

  describe('updateJob', () => {
    it('should update job status', async () => {
      const updates = { progress: 100, status: 'completed' };

      const result = await controller.updateJob(mockPredictionId, updates);

      expect(result.status).toBe('completed');
      expect(result.progress).toBe(100);
      expect(mockService.updateJob).toHaveBeenCalledWith(mockPredictionId, updates);
    });

    it('should update job with error', async () => {
      const updates = { error: 'API error', status: 'failed' };

      await controller.updateJob(mockPredictionId, updates);

      expect(mockService.updateJob).toHaveBeenCalledWith(mockPredictionId, updates);
    });

    it('should update job with output', async () => {
      const updates = { output: { url: 'https://example.com/image.png' }, status: 'completed' };

      await controller.updateJob(mockPredictionId, updates);

      expect(mockService.updateJob).toHaveBeenCalledWith(mockPredictionId, updates);
    });
  });

  describe('getExecutionCosts', () => {
    it('should return cost details for an execution', async () => {
      const result = await controller.getExecutionCosts(mockExecutionId.toString());

      expect(result).toEqual(mockCostDetails);
      expect(mockService.getExecutionCostDetails).toHaveBeenCalledWith(mockExecutionId.toString());
    });
  });
});
