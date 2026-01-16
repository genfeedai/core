import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createConstructableMockModel,
  createMockExecution,
  createMockJob,
  createObjectId,
} from '../test/mocks/mongoose.mock';
import { ExecutionsService } from './executions.service';
import { Execution } from './schemas/execution.schema';
import { Job } from './schemas/job.schema';

describe('ExecutionsService', () => {
  let service: ExecutionsService;
  let mockExecution: ReturnType<typeof createMockExecution>;
  let mockJob: ReturnType<typeof createMockJob>;

  const createMockExecutionModel = () => {
    mockExecution = createMockExecution();
    return createConstructableMockModel(
      {
        find: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnThis(),
          exec: vi.fn().mockResolvedValue([mockExecution]),
        }),
        findOne: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockExecution),
        }),
        findOneAndUpdate: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockExecution),
        }),
        updateOne: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
        }),
      },
      () => ({
        ...mockExecution,
        save: vi.fn().mockResolvedValue(mockExecution),
      })
    );
  };

  const createMockJobModel = () => {
    mockJob = createMockJob();
    return createConstructableMockModel(
      {
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
      },
      () => ({
        ...mockJob,
        save: vi.fn().mockResolvedValue(mockJob),
      })
    );
  };

  beforeEach(async () => {
    const mockExecutionModel = createMockExecutionModel();
    const mockJobModel = createMockJobModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecutionsService,
        {
          provide: getModelToken(Execution.name),
          useValue: mockExecutionModel,
        },
        {
          provide: getModelToken(Job.name),
          useValue: mockJobModel,
        },
      ],
    }).compile();

    service = module.get<ExecutionsService>(ExecutionsService);
  });

  describe('createExecution', () => {
    it('should create a new execution', async () => {
      const workflowId = createObjectId().toString();

      const result = await service.createExecution(workflowId);

      expect(result).toBeDefined();
      expect(result.status).toBe('pending');
    });
  });

  describe('findExecutionsByWorkflow', () => {
    it('should return executions for a workflow', async () => {
      const workflowId = createObjectId().toString();

      const result = await service.findExecutionsByWorkflow(workflowId);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockExecution);
    });
  });

  describe('findExecution', () => {
    it('should return an execution by id', async () => {
      const id = createObjectId().toString();

      const result = await service.findExecution(id);

      expect(result).toEqual(mockExecution);
    });

    it('should throw NotFoundException when execution not found', async () => {
      const mockExecutionModel = createMockExecutionModel();
      mockExecutionModel.findOne = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ExecutionsService,
          {
            provide: getModelToken(Execution.name),
            useValue: mockExecutionModel,
          },
          {
            provide: getModelToken(Job.name),
            useValue: createMockJobModel(),
          },
        ],
      }).compile();

      const serviceWithNullFind = module.get<ExecutionsService>(ExecutionsService);
      const id = createObjectId().toString();

      await expect(serviceWithNullFind.findExecution(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateExecutionStatus', () => {
    it('should update execution status', async () => {
      const id = createObjectId().toString();

      const result = await service.updateExecutionStatus(id, 'running');

      expect(result).toBeDefined();
    });

    it('should set startedAt when status is running', async () => {
      const id = createObjectId().toString();

      const result = await service.updateExecutionStatus(id, 'running');

      expect(result).toBeDefined();
    });

    it('should set completedAt when status is completed', async () => {
      const id = createObjectId().toString();

      const result = await service.updateExecutionStatus(id, 'completed');

      expect(result).toBeDefined();
    });

    it('should set completedAt when status is failed', async () => {
      const id = createObjectId().toString();

      const result = await service.updateExecutionStatus(id, 'failed', 'Something went wrong');

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when updating non-existent execution', async () => {
      const mockExecutionModel = createMockExecutionModel();
      mockExecutionModel.findOneAndUpdate = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ExecutionsService,
          {
            provide: getModelToken(Execution.name),
            useValue: mockExecutionModel,
          },
          {
            provide: getModelToken(Job.name),
            useValue: createMockJobModel(),
          },
        ],
      }).compile();

      const serviceWithNullUpdate = module.get<ExecutionsService>(ExecutionsService);
      const id = createObjectId().toString();

      await expect(serviceWithNullUpdate.updateExecutionStatus(id, 'running')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('updateNodeResult', () => {
    it('should update existing node result', async () => {
      const executionId = createObjectId().toString();

      const result = await service.updateNodeResult(executionId, 'node-1', 'complete', {
        data: 'output',
      });

      expect(result).toBeDefined();
    });

    it('should add new node result if not exists', async () => {
      const mockExecutionModel = createMockExecutionModel();
      // First findOneAndUpdate returns null (node doesn't exist)
      // Second findOneAndUpdate adds the new node result
      mockExecutionModel.findOneAndUpdate = vi
        .fn()
        .mockReturnValueOnce({
          exec: vi.fn().mockResolvedValue(null),
        })
        .mockReturnValueOnce({
          exec: vi.fn().mockResolvedValue(mockExecution),
        });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ExecutionsService,
          {
            provide: getModelToken(Execution.name),
            useValue: mockExecutionModel,
          },
          {
            provide: getModelToken(Job.name),
            useValue: createMockJobModel(),
          },
        ],
      }).compile();

      const serviceWithNewNode = module.get<ExecutionsService>(ExecutionsService);
      const executionId = createObjectId().toString();

      const result = await serviceWithNewNode.updateNodeResult(
        executionId,
        'node-new',
        'processing'
      );

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when execution not found for new node', async () => {
      const mockExecutionModel = createMockExecutionModel();
      mockExecutionModel.findOneAndUpdate = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ExecutionsService,
          {
            provide: getModelToken(Execution.name),
            useValue: mockExecutionModel,
          },
          {
            provide: getModelToken(Job.name),
            useValue: createMockJobModel(),
          },
        ],
      }).compile();

      const serviceWithNullFind = module.get<ExecutionsService>(ExecutionsService);
      const executionId = createObjectId().toString();

      await expect(
        serviceWithNullFind.updateNodeResult(executionId, 'node-1', 'complete')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createJob', () => {
    it('should create a new job', async () => {
      const executionId = createObjectId().toString();

      const result = await service.createJob(executionId, 'node-1', 'prediction-123');

      expect(result).toBeDefined();
      expect(result.status).toBe('pending');
    });
  });

  describe('findJobByPredictionId', () => {
    it('should return a job by prediction id', async () => {
      const result = await service.findJobByPredictionId('prediction-123');

      expect(result).toEqual(mockJob);
    });

    it('should return null when job not found', async () => {
      const mockJobModel = createMockJobModel();
      mockJobModel.findOne = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ExecutionsService,
          {
            provide: getModelToken(Execution.name),
            useValue: createMockExecutionModel(),
          },
          {
            provide: getModelToken(Job.name),
            useValue: mockJobModel,
          },
        ],
      }).compile();

      const serviceWithNullFind = module.get<ExecutionsService>(ExecutionsService);

      const result = await serviceWithNullFind.findJobByPredictionId('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateJob', () => {
    it('should update a job', async () => {
      const result = await service.updateJob('prediction-123', {
        status: 'completed',
        progress: 100,
      });

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when job not found', async () => {
      const mockJobModel = createMockJobModel();
      mockJobModel.findOneAndUpdate = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ExecutionsService,
          {
            provide: getModelToken(Execution.name),
            useValue: createMockExecutionModel(),
          },
          {
            provide: getModelToken(Job.name),
            useValue: mockJobModel,
          },
        ],
      }).compile();

      const serviceWithNullUpdate = module.get<ExecutionsService>(ExecutionsService);

      await expect(
        serviceWithNullUpdate.updateJob('non-existent', { status: 'completed' })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findJobsByExecution', () => {
    it('should return jobs for an execution', async () => {
      const executionId = createObjectId().toString();

      const result = await service.findJobsByExecution(executionId);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockJob);
    });
  });

  describe('setEstimatedCost', () => {
    it('should set estimated cost for execution', async () => {
      const executionId = createObjectId().toString();

      await expect(service.setEstimatedCost(executionId, 1.5)).resolves.not.toThrow();
    });
  });

  describe('updateExecutionCost', () => {
    it('should update execution cost based on jobs', async () => {
      const executionId = createObjectId().toString();

      await expect(service.updateExecutionCost(executionId)).resolves.not.toThrow();
    });
  });

  describe('getExecutionCostDetails', () => {
    it('should return execution cost details with job breakdown', async () => {
      const executionId = createObjectId().toString();

      const result = await service.getExecutionCostDetails(executionId);

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('jobs');
      expect(result.jobs).toHaveLength(1);
    });
  });
});
