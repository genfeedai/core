import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JOB_STATUS, QUEUE_NAMES } from '@/queue/queue.constants';
import { QueueJob } from '@/schemas/queue-job.schema';
import { JobRecoveryService } from '@/services/job-recovery.service';
import { QueueManagerService } from '@/services/queue-manager.service';

describe('JobRecoveryService', () => {
  let service: JobRecoveryService;
  let mockQueueManager: QueueManagerService;

  const mockExecutionId = new Types.ObjectId();
  const mockWorkflowId = 'workflow-123';
  const mockBullJobId = 'bull-job-123';

  const createStalledJob = (overrides = {}) => ({
    _id: new Types.ObjectId(),
    bullJobId: mockBullJobId,
    data: { workflowId: mockWorkflowId },
    executionId: mockExecutionId,
    movedToDlq: false,
    nodeId: 'root',
    queueName: QUEUE_NAMES.WORKFLOW_ORCHESTRATOR,
    status: JOB_STATUS.ACTIVE,
    ...overrides,
  });

  const mockQueueJobModel = {
    aggregate: vi.fn(),
    countDocuments: vi.fn().mockResolvedValue(5),
    find: vi.fn(),
    findOne: vi.fn(),
    updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    mockQueueManager = {
      enqueueNode: vi.fn().mockResolvedValue('new-node-job-id'),
      enqueueWorkflow: vi.fn().mockResolvedValue('new-job-id'),
    } as unknown as QueueManagerService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobRecoveryService,
        { provide: QueueManagerService, useValue: mockQueueManager },
        { provide: getModelToken(QueueJob.name), useValue: mockQueueJobModel },
      ],
    }).compile();

    service = module.get<JobRecoveryService>(JobRecoveryService);
  });

  describe('onModuleInit', () => {
    it('should recover stalled jobs on init', async () => {
      mockQueueJobModel.find.mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      });

      await service.onModuleInit();

      expect(mockQueueJobModel.find).toHaveBeenCalled();
    });
  });

  describe('recoverStalledJobs', () => {
    it('should return 0 when no stalled jobs found', async () => {
      mockQueueJobModel.find.mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      });

      const result = await service.recoverStalledJobs();

      expect(result).toBe(0);
    });

    it('should recover workflow orchestrator jobs', async () => {
      const stalledJob = createStalledJob();
      mockQueueJobModel.find.mockReturnValue({
        lean: vi.fn().mockResolvedValue([stalledJob]),
      });

      const result = await service.recoverStalledJobs();

      expect(result).toBe(1);
      expect(mockQueueManager.enqueueWorkflow).toHaveBeenCalledWith(
        mockExecutionId.toString(),
        mockWorkflowId
      );
    });

    it('should recover node jobs', async () => {
      const stalledJob = createStalledJob({
        data: {
          dependsOn: ['node-0'],
          nodeData: { prompt: 'test' },
          nodeType: 'imageGen',
          workflowId: mockWorkflowId,
        },
        nodeId: 'image-node-1',
        queueName: QUEUE_NAMES.IMAGE_GENERATION,
      });
      mockQueueJobModel.find.mockReturnValue({
        lean: vi.fn().mockResolvedValue([stalledJob]),
      });

      const result = await service.recoverStalledJobs();

      expect(result).toBe(1);
      expect(mockQueueManager.enqueueNode).toHaveBeenCalledWith(
        mockExecutionId.toString(),
        mockWorkflowId,
        'image-node-1',
        'imageGen',
        { prompt: 'test' },
        ['node-0']
      );
    });

    it('should mark recovered jobs with RECOVERED status', async () => {
      const stalledJob = createStalledJob();
      mockQueueJobModel.find.mockReturnValue({
        lean: vi.fn().mockResolvedValue([stalledJob]),
      });

      await service.recoverStalledJobs();

      expect(mockQueueJobModel.updateOne).toHaveBeenCalledWith(
        { _id: stalledJob._id },
        expect.objectContaining({
          $set: { status: JOB_STATUS.RECOVERED },
        })
      );
    });

    it('should add log entry when recovering job', async () => {
      const stalledJob = createStalledJob();
      mockQueueJobModel.find.mockReturnValue({
        lean: vi.fn().mockResolvedValue([stalledJob]),
      });

      await service.recoverStalledJobs();

      expect(mockQueueJobModel.updateOne).toHaveBeenCalledWith(
        { _id: stalledJob._id },
        expect.objectContaining({
          $push: {
            logs: expect.objectContaining({
              level: 'warn',
              message: 'Job recovered after stall detection',
            }),
          },
        })
      );
    });

    it('should handle recovery errors gracefully', async () => {
      const stalledJob = createStalledJob();
      mockQueueJobModel.find.mockReturnValue({
        lean: vi.fn().mockResolvedValue([stalledJob]),
      });
      mockQueueManager.enqueueWorkflow = vi.fn().mockRejectedValue(new Error('Queue error'));

      const result = await service.recoverStalledJobs();

      expect(result).toBe(0);
    });

    it('should query for ACTIVE and PENDING jobs older than threshold', async () => {
      mockQueueJobModel.find.mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      });

      await service.recoverStalledJobs();

      expect(mockQueueJobModel.find).toHaveBeenCalledWith({
        $or: [
          { lastHeartbeat: { $exists: false } },
          { lastHeartbeat: null },
          { lastHeartbeat: { $lt: expect.any(Date) } },
        ],
        movedToDlq: false,
        status: { $in: [JOB_STATUS.ACTIVE, JOB_STATUS.PENDING] },
        updatedAt: { $lt: expect.any(Date) },
      });
    });
  });

  describe('recoverExecution', () => {
    it('should return 0 when no incomplete jobs', async () => {
      mockQueueJobModel.find.mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      });

      const result = await service.recoverExecution(mockExecutionId.toString());

      expect(result).toBe(0);
    });

    it('should recover incomplete jobs for execution', async () => {
      const incompleteJob = createStalledJob({ status: JOB_STATUS.PENDING });
      mockQueueJobModel.find.mockReturnValue({
        lean: vi.fn().mockResolvedValue([incompleteJob]),
      });

      const result = await service.recoverExecution(mockExecutionId.toString());

      expect(result).toBe(1);
      expect(mockQueueManager.enqueueWorkflow).toHaveBeenCalled();
    });

    it('should query for specific execution', async () => {
      mockQueueJobModel.find.mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      });

      await service.recoverExecution(mockExecutionId.toString());

      expect(mockQueueJobModel.find).toHaveBeenCalledWith({
        executionId: expect.any(Types.ObjectId),
        movedToDlq: false,
        status: { $nin: [JOB_STATUS.COMPLETED, JOB_STATUS.FAILED] },
      });
    });
  });

  describe('getJobStats', () => {
    it('should return aggregated job statistics', async () => {
      mockQueueJobModel.aggregate.mockResolvedValue([
        {
          byStatus: [
            { _id: JOB_STATUS.PENDING, count: 10 },
            { _id: JOB_STATUS.ACTIVE, count: 5 },
            { _id: JOB_STATUS.COMPLETED, count: 75 },
            { _id: JOB_STATUS.FAILED, count: 8 },
            { _id: JOB_STATUS.RECOVERED, count: 2 },
          ],
          inDlq: [{ count: 3 }],
          total: [{ count: 100 }],
        },
      ]);

      const result = await service.getJobStats();

      expect(result).toEqual({
        active: 5,
        completed: 75,
        failed: 8,
        inDlq: 3,
        pending: 10,
        recovered: 2,
        total: 100,
      });
    });

    it('should handle empty aggregation result', async () => {
      mockQueueJobModel.aggregate.mockResolvedValue([
        {
          byStatus: [],
          inDlq: [],
          total: [],
        },
      ]);

      const result = await service.getJobStats();

      expect(result).toEqual({
        active: 0,
        completed: 0,
        failed: 0,
        inDlq: 0,
        pending: 0,
        recovered: 0,
        total: 0,
      });
    });
  });

  describe('retryFromDlq', () => {
    it('should retry a job from DLQ', async () => {
      const dlqJob = createStalledJob({ movedToDlq: true });
      mockQueueJobModel.findOne.mockReturnValue({
        lean: vi.fn().mockResolvedValue(dlqJob),
      });

      const result = await service.retryFromDlq(mockBullJobId);

      expect(result).toBe('new-job-id');
      expect(mockQueueJobModel.updateOne).toHaveBeenCalledWith(
        { _id: dlqJob._id },
        expect.objectContaining({
          $set: { movedToDlq: false, status: JOB_STATUS.PENDING },
        })
      );
    });

    it('should throw error when job not found in DLQ', async () => {
      mockQueueJobModel.findOne.mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });

      await expect(service.retryFromDlq('nonexistent-job')).rejects.toThrow(
        'Job nonexistent-job not found in DLQ'
      );
    });

    it('should re-enqueue node jobs from DLQ', async () => {
      const dlqJob = createStalledJob({
        data: {
          nodeData: { prompt: 'test' },
          nodeType: 'imageGen',
          workflowId: mockWorkflowId,
        },
        movedToDlq: true,
        nodeId: 'node-1',
        queueName: QUEUE_NAMES.IMAGE_GENERATION,
      });
      mockQueueJobModel.findOne.mockReturnValue({
        lean: vi.fn().mockResolvedValue(dlqJob),
      });

      const result = await service.retryFromDlq(mockBullJobId);

      expect(result).toBe('new-node-job-id');
      expect(mockQueueManager.enqueueNode).toHaveBeenCalled();
    });

    it('should add log entry when retrying from DLQ', async () => {
      const dlqJob = createStalledJob({ movedToDlq: true });
      mockQueueJobModel.findOne.mockReturnValue({
        lean: vi.fn().mockResolvedValue(dlqJob),
      });

      await service.retryFromDlq(mockBullJobId);

      expect(mockQueueJobModel.updateOne).toHaveBeenCalledWith(
        { _id: dlqJob._id },
        expect.objectContaining({
          $push: {
            logs: expect.objectContaining({
              level: 'info',
              message: 'Job retried from DLQ',
            }),
          },
        })
      );
    });
  });

  describe('getDlqJobs', () => {
    it('should return jobs in DLQ with pagination', async () => {
      const dlqJobs = [createStalledJob({ movedToDlq: true })];
      mockQueueJobModel.find.mockReturnValue({
        exec: vi.fn().mockResolvedValue(dlqJobs),
        limit: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
      });

      const result = await service.getDlqJobs(10, 0);

      expect(result.jobs).toEqual(dlqJobs);
      expect(result.total).toBe(5);
    });

    it('should use default pagination values', async () => {
      mockQueueJobModel.find.mockReturnValue({
        exec: vi.fn().mockResolvedValue([]),
        limit: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
      });

      await service.getDlqJobs();

      const mockFind = mockQueueJobModel.find({ movedToDlq: true });
      expect(mockFind.skip).toHaveBeenCalledWith(0);
      expect(mockFind.limit).toHaveBeenCalledWith(50);
    });

    it('should sort DLQ jobs by createdAt descending', async () => {
      mockQueueJobModel.find.mockReturnValue({
        exec: vi.fn().mockResolvedValue([]),
        limit: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
      });

      await service.getDlqJobs();

      const mockFind = mockQueueJobModel.find({ movedToDlq: true });
      expect(mockFind.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });
  });

  describe('scheduledRecovery', () => {
    it('should call recoverStalledJobs', async () => {
      mockQueueJobModel.find.mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      });

      await service.scheduledRecovery();

      expect(mockQueueJobModel.find).toHaveBeenCalled();
    });
  });
});
