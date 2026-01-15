import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JOB_PRIORITY, JOB_STATUS, JOB_TYPES, QUEUE_NAMES } from '../queue.constants';
import { QueueManagerService } from './queue-manager.service';

describe('QueueManagerService', () => {
  let service: QueueManagerService;

  const mockExecutionId = new Types.ObjectId().toString();
  const mockWorkflowId = new Types.ObjectId().toString();

  // Mock queue with basic operations
  const createMockQueue = () => ({
    add: vi.fn().mockResolvedValue({ id: 'job-123' }),
    getJob: vi.fn(),
    getWaitingCount: vi.fn().mockResolvedValue(5),
    getActiveCount: vi.fn().mockResolvedValue(2),
    getCompletedCount: vi.fn().mockResolvedValue(100),
    getFailedCount: vi.fn().mockResolvedValue(3),
    getDelayedCount: vi.fn().mockResolvedValue(1),
  });

  const mockWorkflowQueue = createMockQueue();
  const mockImageQueue = createMockQueue();
  const mockVideoQueue = createMockQueue();
  const mockLlmQueue = createMockQueue();

  // Mock Mongoose model
  const mockQueueJobModel = {
    create: vi.fn().mockResolvedValue({}),
    findOne: vi.fn(),
    find: vi.fn(),
    updateOne: vi.fn().mockResolvedValue({}),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock implementations
    mockQueueJobModel.find.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    });

    // Create service instance with mocks
    // Using Object.create to bypass constructor, then manually set properties
    service = Object.create(QueueManagerService.prototype);

    // Set up private properties using reflection
    (service as unknown as Record<string, unknown>).workflowQueue = mockWorkflowQueue;
    (service as unknown as Record<string, unknown>).imageQueue = mockImageQueue;
    (service as unknown as Record<string, unknown>).videoQueue = mockVideoQueue;
    (service as unknown as Record<string, unknown>).llmQueue = mockLlmQueue;
    (service as unknown as Record<string, unknown>).queueJobModel = mockQueueJobModel;
    (service as unknown as Record<string, unknown>).logger = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    // Set up queues Map
    const queuesMap = new Map([
      [QUEUE_NAMES.WORKFLOW_ORCHESTRATOR, mockWorkflowQueue],
      [QUEUE_NAMES.IMAGE_GENERATION, mockImageQueue],
      [QUEUE_NAMES.VIDEO_GENERATION, mockVideoQueue],
      [QUEUE_NAMES.LLM_GENERATION, mockLlmQueue],
    ]);
    (service as unknown as Record<string, unknown>).queues = queuesMap;
  });

  describe('enqueueWorkflow', () => {
    it('should enqueue a workflow for execution', async () => {
      const result = await service.enqueueWorkflow(mockExecutionId, mockWorkflowId);

      expect(result).toBe('job-123');
      expect(mockWorkflowQueue.add).toHaveBeenCalledWith(
        JOB_TYPES.EXECUTE_WORKFLOW,
        expect.objectContaining({
          executionId: mockExecutionId,
          workflowId: mockWorkflowId,
        }),
        expect.objectContaining({
          jobId: `workflow-${mockExecutionId}`,
          priority: JOB_PRIORITY.HIGH,
        })
      );
    });

    it('should persist job to MongoDB', async () => {
      await service.enqueueWorkflow(mockExecutionId, mockWorkflowId);

      expect(mockQueueJobModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          bullJobId: 'job-123',
          queueName: QUEUE_NAMES.WORKFLOW_ORCHESTRATOR,
          nodeId: 'root',
          status: JOB_STATUS.PENDING,
        })
      );
    });

    it('should include timestamp in job data', async () => {
      await service.enqueueWorkflow(mockExecutionId, mockWorkflowId);

      expect(mockWorkflowQueue.add).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          timestamp: expect.any(String),
        }),
        expect.anything()
      );
    });
  });

  describe('enqueueNode', () => {
    it('should enqueue an image generation node', async () => {
      const nodeData = { prompt: 'test image' };

      const result = await service.enqueueNode(
        mockExecutionId,
        mockWorkflowId,
        'node-1',
        'imageGen',
        nodeData
      );

      expect(result).toBe('job-123');
      expect(mockImageQueue.add).toHaveBeenCalledWith(
        JOB_TYPES.GENERATE_IMAGE,
        expect.objectContaining({
          executionId: mockExecutionId,
          nodeId: 'node-1',
          nodeType: 'imageGen',
          nodeData,
        }),
        expect.objectContaining({
          jobId: `${mockExecutionId}-node-1`,
        })
      );
    });

    it('should enqueue a video generation node', async () => {
      const nodeData = { prompt: 'test video' };

      await service.enqueueNode(mockExecutionId, mockWorkflowId, 'node-2', 'videoGen', nodeData);

      expect(mockVideoQueue.add).toHaveBeenCalledWith(
        JOB_TYPES.GENERATE_VIDEO,
        expect.anything(),
        expect.objectContaining({
          priority: JOB_PRIORITY.LOW,
        })
      );
    });

    it('should enqueue an LLM node', async () => {
      const nodeData = { prompt: 'test prompt' };

      await service.enqueueNode(mockExecutionId, mockWorkflowId, 'node-3', 'llm', nodeData);

      expect(mockLlmQueue.add).toHaveBeenCalledWith(
        JOB_TYPES.GENERATE_TEXT,
        expect.anything(),
        expect.objectContaining({
          priority: JOB_PRIORITY.HIGH,
        })
      );
    });

    it('should handle unknown node types', async () => {
      const nodeData = { data: 'test' };

      await service.enqueueNode(mockExecutionId, mockWorkflowId, 'node-4', 'unknownType', nodeData);

      expect(mockWorkflowQueue.add).toHaveBeenCalledWith(
        JOB_TYPES.EXECUTE_NODE,
        expect.anything(),
        expect.anything()
      );
    });

    it('should include dependencies in job data', async () => {
      const dependsOn = ['node-1', 'node-2'];

      await service.enqueueNode(
        mockExecutionId,
        mockWorkflowId,
        'node-3',
        'imageGen',
        {},
        dependsOn
      );

      expect(mockImageQueue.add).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          dependsOn,
        }),
        expect.anything()
      );
    });

    it('should throw error for missing queue', async () => {
      const queuesMap = (service as unknown as Record<string, unknown>).queues as Map<
        string,
        unknown
      >;
      queuesMap.delete(QUEUE_NAMES.IMAGE_GENERATION);

      await expect(
        service.enqueueNode(mockExecutionId, mockWorkflowId, 'node-1', 'imageGen', {})
      ).rejects.toThrow('No queue found for node type: imageGen');
    });
  });

  describe('getJobStatus', () => {
    it('should get status from BullMQ job', async () => {
      const mockJob = {
        getState: vi.fn().mockResolvedValue('completed'),
        progress: 100,
        returnvalue: { output: 'result' },
        failedReason: undefined,
      };
      mockWorkflowQueue.getJob.mockResolvedValue(mockJob);

      const result = await service.getJobStatus(QUEUE_NAMES.WORKFLOW_ORCHESTRATOR, 'job-123');

      expect(result).toEqual({
        status: 'completed',
        progress: 100,
        result: { output: 'result' },
        error: undefined,
      });
    });

    it('should handle progress as object', async () => {
      const mockJob = {
        getState: vi.fn().mockResolvedValue('active'),
        progress: { percent: 50 },
        returnvalue: undefined,
        failedReason: undefined,
      };
      mockWorkflowQueue.getJob.mockResolvedValue(mockJob);

      const result = await service.getJobStatus(QUEUE_NAMES.WORKFLOW_ORCHESTRATOR, 'job-123');

      expect(result.progress).toBe(50);
    });

    it('should fallback to MongoDB when job not in queue', async () => {
      mockWorkflowQueue.getJob.mockResolvedValue(null);
      mockQueueJobModel.findOne.mockResolvedValue({
        status: JOB_STATUS.COMPLETED,
        result: { data: 'from-db' },
        error: undefined,
      });

      const result = await service.getJobStatus(QUEUE_NAMES.WORKFLOW_ORCHESTRATOR, 'job-123');

      expect(result).toEqual({
        status: JOB_STATUS.COMPLETED,
        progress: 100,
        result: { data: 'from-db' },
        error: undefined,
      });
    });

    it('should return pending progress for non-completed MongoDB job', async () => {
      mockWorkflowQueue.getJob.mockResolvedValue(null);
      mockQueueJobModel.findOne.mockResolvedValue({
        status: JOB_STATUS.PENDING,
        result: undefined,
        error: undefined,
      });

      const result = await service.getJobStatus(QUEUE_NAMES.WORKFLOW_ORCHESTRATOR, 'job-123');

      expect(result.progress).toBe(0);
    });

    it('should throw error when job not found anywhere', async () => {
      mockWorkflowQueue.getJob.mockResolvedValue(null);
      mockQueueJobModel.findOne.mockResolvedValue(null);

      await expect(
        service.getJobStatus(QUEUE_NAMES.WORKFLOW_ORCHESTRATOR, 'job-123')
      ).rejects.toThrow('Job not found: job-123');
    });

    it('should throw error for invalid queue name', async () => {
      await expect(
        service.getJobStatus('invalid-queue' as typeof QUEUE_NAMES.WORKFLOW_ORCHESTRATOR, 'job-123')
      ).rejects.toThrow('Queue not found: invalid-queue');
    });
  });

  describe('getExecutionJobs', () => {
    it('should return jobs for an execution', async () => {
      const mockJobs = [
        { _id: 'job-1', nodeId: 'node-1', status: JOB_STATUS.COMPLETED },
        { _id: 'job-2', nodeId: 'node-2', status: JOB_STATUS.PENDING },
      ];

      mockQueueJobModel.find.mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(mockJobs),
      });

      const result = await service.getExecutionJobs(mockExecutionId);

      expect(result).toEqual(mockJobs);
      expect(mockQueueJobModel.find).toHaveBeenCalledWith({
        executionId: expect.any(Types.ObjectId),
      });
    });

    it('should sort jobs by creation date', async () => {
      const sortMock = vi.fn().mockReturnThis();
      mockQueueJobModel.find.mockReturnValue({
        sort: sortMock,
        exec: vi.fn().mockResolvedValue([]),
      });

      await service.getExecutionJobs(mockExecutionId);

      expect(sortMock).toHaveBeenCalledWith({ createdAt: 1 });
    });
  });

  describe('updateJobStatus', () => {
    it('should update job status', async () => {
      await service.updateJobStatus('job-123', JOB_STATUS.COMPLETED);

      expect(mockQueueJobModel.updateOne).toHaveBeenCalledWith(
        { bullJobId: 'job-123' },
        {
          $set: expect.objectContaining({
            status: JOB_STATUS.COMPLETED,
            finishedAt: expect.any(Date),
          }),
        }
      );
    });

    it('should set processedAt for active status', async () => {
      await service.updateJobStatus('job-123', JOB_STATUS.ACTIVE);

      expect(mockQueueJobModel.updateOne).toHaveBeenCalledWith(
        { bullJobId: 'job-123' },
        {
          $set: expect.objectContaining({
            processedAt: expect.any(Date),
          }),
        }
      );
    });

    it('should set finishedAt for completed status', async () => {
      await service.updateJobStatus('job-123', JOB_STATUS.COMPLETED);

      expect(mockQueueJobModel.updateOne).toHaveBeenCalledWith(
        { bullJobId: 'job-123' },
        {
          $set: expect.objectContaining({
            finishedAt: expect.any(Date),
          }),
        }
      );
    });

    it('should set finishedAt for failed status', async () => {
      await service.updateJobStatus('job-123', JOB_STATUS.FAILED);

      expect(mockQueueJobModel.updateOne).toHaveBeenCalledWith(
        { bullJobId: 'job-123' },
        {
          $set: expect.objectContaining({
            finishedAt: expect.any(Date),
          }),
        }
      );
    });

    it('should include result when provided', async () => {
      await service.updateJobStatus('job-123', JOB_STATUS.COMPLETED, {
        result: { output: 'data' },
      });

      expect(mockQueueJobModel.updateOne).toHaveBeenCalledWith(
        { bullJobId: 'job-123' },
        {
          $set: expect.objectContaining({
            result: { output: 'data' },
          }),
        }
      );
    });

    it('should include error when provided', async () => {
      await service.updateJobStatus('job-123', JOB_STATUS.FAILED, {
        error: 'Something went wrong',
      });

      expect(mockQueueJobModel.updateOne).toHaveBeenCalledWith(
        { bullJobId: 'job-123' },
        {
          $set: expect.objectContaining({
            error: 'Something went wrong',
            failedReason: 'Something went wrong',
          }),
        }
      );
    });

    it('should include attemptsMade when provided', async () => {
      await service.updateJobStatus('job-123', JOB_STATUS.ACTIVE, {
        attemptsMade: 2,
      });

      expect(mockQueueJobModel.updateOne).toHaveBeenCalledWith(
        { bullJobId: 'job-123' },
        {
          $set: expect.objectContaining({
            attemptsMade: 2,
          }),
        }
      );
    });
  });

  describe('addJobLog', () => {
    it('should add info log entry', async () => {
      await service.addJobLog('job-123', 'Processing started');

      expect(mockQueueJobModel.updateOne).toHaveBeenCalledWith(
        { bullJobId: 'job-123' },
        {
          $push: {
            logs: {
              timestamp: expect.any(Date),
              message: 'Processing started',
              level: 'info',
            },
          },
        }
      );
    });

    it('should add error log entry', async () => {
      await service.addJobLog('job-123', 'Failed to process', 'error');

      expect(mockQueueJobModel.updateOne).toHaveBeenCalledWith(
        { bullJobId: 'job-123' },
        {
          $push: {
            logs: expect.objectContaining({
              level: 'error',
            }),
          },
        }
      );
    });

    it('should add warn log entry', async () => {
      await service.addJobLog('job-123', 'Retrying...', 'warn');

      expect(mockQueueJobModel.updateOne).toHaveBeenCalledWith(
        { bullJobId: 'job-123' },
        {
          $push: {
            logs: expect.objectContaining({
              level: 'warn',
            }),
          },
        }
      );
    });

    it('should add debug log entry', async () => {
      await service.addJobLog('job-123', 'Debug info', 'debug');

      expect(mockQueueJobModel.updateOne).toHaveBeenCalledWith(
        { bullJobId: 'job-123' },
        {
          $push: {
            logs: expect.objectContaining({
              level: 'debug',
            }),
          },
        }
      );
    });
  });

  describe('moveToDeadLetterQueue', () => {
    it('should mark job as moved to DLQ', async () => {
      await service.moveToDeadLetterQueue(
        'job-123',
        QUEUE_NAMES.IMAGE_GENERATION,
        'Max retries exceeded'
      );

      expect(mockQueueJobModel.updateOne).toHaveBeenCalledWith(
        { bullJobId: 'job-123' },
        {
          $set: {
            movedToDlq: true,
            failedReason: 'Max retries exceeded',
            status: JOB_STATUS.FAILED,
          },
        }
      );
    });
  });

  describe('getQueueMetrics', () => {
    it('should return metrics for all queues', async () => {
      const result = await service.getQueueMetrics();

      expect(result).toHaveLength(4);
      expect(result).toContainEqual(
        expect.objectContaining({
          name: QUEUE_NAMES.WORKFLOW_ORCHESTRATOR,
          waiting: 5,
          active: 2,
          completed: 100,
          failed: 3,
          delayed: 1,
        })
      );
    });

    it('should include all queue types', async () => {
      const result = await service.getQueueMetrics();
      const names = result.map((m) => m.name);

      expect(names).toContain(QUEUE_NAMES.WORKFLOW_ORCHESTRATOR);
      expect(names).toContain(QUEUE_NAMES.IMAGE_GENERATION);
      expect(names).toContain(QUEUE_NAMES.VIDEO_GENERATION);
      expect(names).toContain(QUEUE_NAMES.LLM_GENERATION);
    });
  });
});
