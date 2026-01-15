import {
  EXECUTION_REPOSITORY,
  type ExecutionEntity,
  type IExecutionRepository,
} from '@genfeedai/storage';
import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExecutionsService } from './executions.service';
import { Job } from './schemas/job.schema';

describe('ExecutionsService', () => {
  let service: ExecutionsService;
  let mockRepository: IExecutionRepository;

  const mockWorkflowId = 'workflow-123';
  const mockExecutionId = 'execution-123';
  const mockJobId = new Types.ObjectId();

  const mockExecution: ExecutionEntity = {
    id: mockExecutionId,
    workflowId: mockWorkflowId,
    status: 'pending',
    startedAt: new Date(),
    completedAt: undefined,
    totalCost: 0,
    costSummary: { estimated: 0, actual: 0, variance: 0 },
    nodeResults: [],
    error: undefined,
    isDeleted: false,
    executionMode: 'sync',
    queueJobIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockJob = {
    _id: mockJobId,
    executionId: new Types.ObjectId(),
    nodeId: 'node-1',
    predictionId: 'prediction-123',
    status: 'pending',
    progress: 0,
    output: null,
    error: null,
    cost: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: vi.fn().mockImplementation(function (this: typeof mockJob) {
      return Promise.resolve(this);
    }),
  };

  const mockJobModel = {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([mockJob]),
    }),
    findOne: vi.fn().mockReturnValue({
      exec: vi.fn().mockResolvedValue(mockJob),
    }),
    findOneAndUpdate: vi.fn().mockReturnValue({
      exec: vi.fn().mockResolvedValue(mockJob),
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    mockRepository = {
      create: vi.fn().mockResolvedValue(mockExecution),
      findById: vi.fn().mockResolvedValue(mockExecution),
      findOne: vi.fn().mockResolvedValue(mockExecution),
      findAll: vi.fn().mockResolvedValue([mockExecution]),
      findByWorkflowId: vi.fn().mockResolvedValue([mockExecution]),
      findByStatus: vi.fn().mockResolvedValue([mockExecution]),
      updateStatus: vi.fn().mockResolvedValue(mockExecution),
      updateNodeResult: vi.fn().mockResolvedValue(mockExecution),
      updateCostSummary: vi.fn().mockResolvedValue(mockExecution),
      update: vi.fn().mockResolvedValue(mockExecution),
      softDelete: vi.fn().mockResolvedValue({ ...mockExecution, isDeleted: true }),
      hardDelete: vi.fn().mockResolvedValue(true),
      count: vi.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecutionsService,
        { provide: EXECUTION_REPOSITORY, useValue: mockRepository },
        { provide: getModelToken(Job.name), useValue: mockJobModel },
      ],
    }).compile();

    service = module.get<ExecutionsService>(ExecutionsService);
  });

  describe('createExecution', () => {
    it('should create a new execution', async () => {
      const result = await service.createExecution(mockWorkflowId);

      expect(result).toEqual(mockExecution);
      expect(mockRepository.create).toHaveBeenCalledWith({ workflowId: mockWorkflowId });
    });
  });

  describe('findExecutionsByWorkflow', () => {
    it('should return executions for a workflow', async () => {
      const result = await service.findExecutionsByWorkflow(mockWorkflowId);

      expect(result).toEqual([mockExecution]);
      expect(mockRepository.findByWorkflowId).toHaveBeenCalledWith(mockWorkflowId, {
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
    });

    it('should return empty array when no executions exist', async () => {
      vi.mocked(mockRepository.findByWorkflowId).mockResolvedValue([]);

      const result = await service.findExecutionsByWorkflow(mockWorkflowId);

      expect(result).toEqual([]);
    });
  });

  describe('findExecution', () => {
    it('should return a single execution by ID', async () => {
      const result = await service.findExecution(mockExecutionId);

      expect(result).toEqual(mockExecution);
      expect(mockRepository.findById).toHaveBeenCalledWith(mockExecutionId);
    });

    it('should throw NotFoundException when execution not found', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      await expect(service.findExecution('nonexistent-id')).rejects.toThrow(NotFoundException);
      await expect(service.findExecution('nonexistent-id')).rejects.toThrow(
        'Execution with ID nonexistent-id not found'
      );
    });
  });

  describe('updateExecutionStatus', () => {
    it('should update execution status', async () => {
      const updatedExecution = { ...mockExecution, status: 'running' as const };
      vi.mocked(mockRepository.updateStatus).mockResolvedValue(updatedExecution);

      const result = await service.updateExecutionStatus(mockExecutionId, 'running');

      expect(result.status).toBe('running');
      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        mockExecutionId,
        'running',
        undefined
      );
    });

    it('should update execution status with error', async () => {
      const updatedExecution = {
        ...mockExecution,
        status: 'failed' as const,
        error: 'Error message',
      };
      vi.mocked(mockRepository.updateStatus).mockResolvedValue(updatedExecution);

      const result = await service.updateExecutionStatus(
        mockExecutionId,
        'failed',
        'Error message'
      );

      expect(result.status).toBe('failed');
      expect(result.error).toBe('Error message');
      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        mockExecutionId,
        'failed',
        'Error message'
      );
    });

    it('should throw NotFoundException when execution not found', async () => {
      vi.mocked(mockRepository.updateStatus).mockResolvedValue(null);

      await expect(service.updateExecutionStatus('nonexistent-id', 'running')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('updateNodeResult', () => {
    it('should update node result', async () => {
      const updatedExecution = {
        ...mockExecution,
        nodeResults: [{ nodeId: 'node-1', status: 'completed' as const, cost: 0.05 }],
        totalCost: 0.05,
      };
      vi.mocked(mockRepository.updateNodeResult).mockResolvedValue(updatedExecution);

      const result = await service.updateNodeResult(
        mockExecutionId,
        'node-1',
        'completed',
        { url: 'https://example.com/output.png' },
        undefined,
        0.05
      );

      expect(result).toBeDefined();
      expect(mockRepository.updateNodeResult).toHaveBeenCalledWith(
        mockExecutionId,
        expect.objectContaining({
          nodeId: 'node-1',
          status: 'completed',
          cost: 0.05,
        })
      );
    });

    it('should throw NotFoundException when execution not found', async () => {
      vi.mocked(mockRepository.updateNodeResult).mockResolvedValue(null);

      await expect(
        service.updateNodeResult(mockExecutionId, 'node-1', 'completed')
      ).rejects.toThrow(NotFoundException);
    });
  });

  // Job methods (still use Mongoose)
  describe('createJob', () => {
    it('should create a new job', async () => {
      const saveMock = vi.fn().mockResolvedValue(mockJob);
      const mockModel = Object.assign(
        vi.fn().mockImplementation(() => ({
          ...mockJob,
          save: saveMock,
        })),
        mockJobModel
      );

      const testModule = await Test.createTestingModule({
        providers: [
          ExecutionsService,
          { provide: EXECUTION_REPOSITORY, useValue: mockRepository },
          { provide: getModelToken(Job.name), useValue: mockModel },
        ],
      }).compile();

      const testService = testModule.get<ExecutionsService>(ExecutionsService);
      const result = await testService.createJob(mockExecutionId, 'node-1', 'prediction-123');

      expect(result).toBeDefined();
      expect(saveMock).toHaveBeenCalled();
    });
  });

  describe('findJobByPredictionId', () => {
    it('should return job by prediction ID', async () => {
      const result = await service.findJobByPredictionId('prediction-123');

      expect(result).toEqual(mockJob);
      expect(mockJobModel.findOne).toHaveBeenCalledWith({ predictionId: 'prediction-123' });
    });

    it('should return null when job not found', async () => {
      mockJobModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      const result = await service.findJobByPredictionId('nonexistent-prediction');

      expect(result).toBeNull();
    });
  });

  describe('updateJob', () => {
    it('should update job status', async () => {
      const result = await service.updateJob('prediction-123', { status: 'succeeded' });

      expect(result).toBeDefined();
      expect(mockJobModel.findOneAndUpdate).toHaveBeenCalledWith(
        { predictionId: 'prediction-123' },
        { $set: { status: 'succeeded' } },
        { new: true }
      );
    });

    it('should update job with output and cost', async () => {
      await service.updateJob('prediction-123', {
        status: 'succeeded',
        output: { url: 'https://example.com/output.png' },
        cost: 0.05,
      });

      expect(mockJobModel.findOneAndUpdate).toHaveBeenCalledWith(
        { predictionId: 'prediction-123' },
        {
          $set: {
            status: 'succeeded',
            output: { url: 'https://example.com/output.png' },
            cost: 0.05,
          },
        },
        { new: true }
      );
    });

    it('should throw NotFoundException when job not found', async () => {
      mockJobModel.findOneAndUpdate.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      await expect(
        service.updateJob('nonexistent-prediction', { status: 'succeeded' })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findJobsByExecution', () => {
    it('should return jobs for an execution', async () => {
      const result = await service.findJobsByExecution(mockExecutionId);

      expect(result).toEqual([mockJob]);
    });

    it('should return empty array when no jobs exist', async () => {
      mockJobModel.find.mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      });

      const result = await service.findJobsByExecution(mockExecutionId);

      expect(result).toEqual([]);
    });
  });

  describe('setEstimatedCost', () => {
    it('should set estimated cost', async () => {
      await service.setEstimatedCost(mockExecutionId, 0.1);

      expect(mockRepository.updateCostSummary).toHaveBeenCalledWith(mockExecutionId, {
        estimated: 0.1,
      });
    });
  });

  describe('updateExecutionCost', () => {
    it('should update actual cost from jobs', async () => {
      const jobsWithCost = [
        { ...mockJob, cost: 0.02 },
        { ...mockJob, cost: 0.03 },
      ];
      mockJobModel.find.mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(jobsWithCost),
      });

      await service.updateExecutionCost(mockExecutionId);

      expect(mockRepository.updateCostSummary).toHaveBeenCalledWith(
        mockExecutionId,
        expect.objectContaining({
          actual: 0.05,
        })
      );
    });
  });

  describe('getExecutionCostDetails', () => {
    it('should return cost details with job breakdown', async () => {
      const executionWithCost = {
        ...mockExecution,
        costSummary: { estimated: 0.1, actual: 0.05, variance: -50 },
        totalCost: 0.05,
      };
      vi.mocked(mockRepository.findById).mockResolvedValue(executionWithCost);

      const jobsWithCost = [
        { ...mockJob, cost: 0.02, costBreakdown: { compute: 0.01, storage: 0.01 }, predictTime: 5 },
        { ...mockJob, cost: 0.03, costBreakdown: { compute: 0.02, storage: 0.01 }, predictTime: 8 },
      ];
      mockJobModel.find.mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(jobsWithCost),
      });

      const result = await service.getExecutionCostDetails(mockExecutionId);

      expect(result.summary).toEqual({
        estimated: 0.1,
        actual: 0.05,
        variance: -50,
      });
      expect(result.jobs).toHaveLength(2);
    });
  });
});
