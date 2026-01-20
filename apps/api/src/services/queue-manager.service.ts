import { InjectQueue } from '@nestjs/bullmq';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Queue } from 'bullmq';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import type { JobResult, NodeJobData, WorkflowJobData } from '@/interfaces/job-data.interface';
import {
  JOB_PRIORITY,
  JOB_STATUS,
  JOB_TYPES,
  NODE_TYPE_TO_QUEUE,
  QUEUE_NAMES,
  type QueueName,
} from '@/queue/queue.constants';
import { QueueJob, type QueueJobDocument } from '@/schemas/queue-job.schema';
import type { ExecutionsService } from '@/services/executions.service';

@Injectable()
export class QueueManagerService {
  private readonly logger = new Logger(QueueManagerService.name);
  private readonly queues: Map<QueueName, Queue>;

  constructor(
    @InjectQueue(QUEUE_NAMES.WORKFLOW_ORCHESTRATOR)
    private readonly workflowQueue: Queue,
    @InjectQueue(QUEUE_NAMES.IMAGE_GENERATION)
    private readonly imageQueue: Queue,
    @InjectQueue(QUEUE_NAMES.VIDEO_GENERATION)
    private readonly videoQueue: Queue,
    @InjectQueue(QUEUE_NAMES.LLM_GENERATION)
    private readonly llmQueue: Queue,
    @InjectModel(QueueJob.name)
    private readonly queueJobModel: Model<QueueJobDocument>,
    @Inject(forwardRef(() => 'ExecutionsService'))
    private readonly executionsService: ExecutionsService
  ) {
    this.queues = new Map([
      [QUEUE_NAMES.WORKFLOW_ORCHESTRATOR, this.workflowQueue],
      [QUEUE_NAMES.IMAGE_GENERATION, this.imageQueue],
      [QUEUE_NAMES.VIDEO_GENERATION, this.videoQueue],
      [QUEUE_NAMES.LLM_GENERATION, this.llmQueue],
    ]);
  }

  /**
   * Enqueue a workflow for async execution
   */
  async enqueueWorkflow(executionId: string, workflowId: string): Promise<string> {
    const jobData: WorkflowJobData = {
      executionId,
      workflowId,
      timestamp: new Date().toISOString(),
    };

    const job = await this.workflowQueue.add(JOB_TYPES.EXECUTE_WORKFLOW, jobData, {
      jobId: `workflow-${executionId}`,
      priority: JOB_PRIORITY.HIGH,
    });

    // Persist to MongoDB for recovery
    await this.queueJobModel.create({
      bullJobId: job.id,
      queueName: QUEUE_NAMES.WORKFLOW_ORCHESTRATOR,
      executionId: new Types.ObjectId(executionId),
      nodeId: 'root',
      status: JOB_STATUS.PENDING,
      data: jobData,
    });

    this.logger.log(`Enqueued workflow execution ${executionId}, job ID: ${job.id}`);

    return job.id as string;
  }

  /**
   * Enqueue a single node for processing
   */
  async enqueueNode(
    executionId: string,
    workflowId: string,
    nodeId: string,
    nodeType: string,
    nodeData: Record<string, unknown>,
    dependsOn?: string[]
  ): Promise<string> {
    const queueName = this.getQueueForNodeType(nodeType);
    const queue = this.queues.get(queueName);

    if (!queue) {
      throw new Error(`No queue found for node type: ${nodeType}`);
    }

    const jobData: NodeJobData = {
      executionId,
      workflowId,
      nodeId,
      nodeType,
      nodeData,
      dependsOn,
      timestamp: new Date().toISOString(),
    };

    const job = await queue.add(this.getJobTypeForNodeType(nodeType), jobData, {
      jobId: `${executionId}-${nodeId}`,
      priority: this.getPriorityForNodeType(nodeType),
    });

    // Persist to MongoDB for recovery
    await this.queueJobModel.create({
      bullJobId: job.id,
      queueName,
      executionId: new Types.ObjectId(executionId),
      nodeId,
      status: JOB_STATUS.PENDING,
      data: jobData,
    });

    this.logger.log(
      `Enqueued node ${nodeId} (${nodeType}) for execution ${executionId}, job ID: ${job.id}`
    );

    return job.id as string;
  }

  /**
   * Get the status of a job
   */
  async getJobStatus(
    queueName: QueueName,
    jobId: string
  ): Promise<{
    status: string;
    progress: number;
    result?: JobResult;
    error?: string;
  }> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      // Check MongoDB for persisted status
      const dbJob = await this.queueJobModel.findOne({ bullJobId: jobId });
      if (dbJob) {
        return {
          status: dbJob.status,
          progress: dbJob.status === JOB_STATUS.COMPLETED ? 100 : 0,
          result: dbJob.result as JobResult | undefined,
          error: dbJob.error,
        };
      }
      throw new Error(`Job not found: ${jobId}`);
    }

    const state = await job.getState();
    const progress =
      typeof job.progress === 'number'
        ? job.progress
        : ((job.progress as { percent?: number })?.percent ?? 0);

    return {
      status: state,
      progress,
      result: job.returnvalue as JobResult | undefined,
      error: job.failedReason,
    };
  }

  /**
   * Get all jobs for an execution
   */
  async getExecutionJobs(executionId: string): Promise<QueueJobDocument[]> {
    return this.queueJobModel
      .find({ executionId: new Types.ObjectId(executionId) })
      .sort({ createdAt: 1 })
      .exec();
  }

  /**
   * Update job status in MongoDB
   */
  async updateJobStatus(
    bullJobId: string,
    status: string,
    updates?: {
      result?: Record<string, unknown>;
      error?: string;
      attemptsMade?: number;
    }
  ): Promise<void> {
    const updateData: Record<string, unknown> = { status };

    if (status === JOB_STATUS.ACTIVE) {
      updateData.processedAt = new Date();
    }

    if (status === JOB_STATUS.COMPLETED || status === JOB_STATUS.FAILED) {
      updateData.finishedAt = new Date();
    }

    if (updates?.result) {
      updateData.result = updates.result;
    }

    if (updates?.error) {
      updateData.error = updates.error;
      updateData.failedReason = updates.error;
    }

    if (updates?.attemptsMade !== undefined) {
      updateData.attemptsMade = updates.attemptsMade;
    }

    await this.queueJobModel.updateOne({ bullJobId }, { $set: updateData });
  }

  /**
   * Add a log entry to a job
   */
  async addJobLog(
    bullJobId: string,
    message: string,
    level: 'info' | 'warn' | 'error' | 'debug' = 'info'
  ): Promise<void> {
    await this.queueJobModel.updateOne(
      { bullJobId },
      {
        $push: {
          logs: {
            timestamp: new Date(),
            message,
            level,
          },
        },
      }
    );
  }

  /**
   * Move a job to dead letter queue
   */
  async moveToDeadLetterQueue(
    bullJobId: string,
    queueName: QueueName,
    error: string
  ): Promise<void> {
    await this.queueJobModel.updateOne(
      { bullJobId },
      {
        $set: {
          movedToDlq: true,
          failedReason: error,
          status: JOB_STATUS.FAILED,
        },
      }
    );

    this.logger.warn(`Job ${bullJobId} moved to DLQ from ${queueName}: ${error}`);
  }

  /**
   * Get queue metrics
   */
  async getQueueMetrics(): Promise<
    Array<{
      name: QueueName;
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    }>
  > {
    const metrics: Array<{
      name: QueueName;
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    }> = [];

    for (const [name, queue] of this.queues) {
      metrics.push({
        name,
        waiting: await queue.getWaitingCount(),
        active: await queue.getActiveCount(),
        completed: await queue.getCompletedCount(),
        failed: await queue.getFailedCount(),
        delayed: await queue.getDelayedCount(),
      });
    }

    return metrics;
  }

  /**
   * Get the appropriate queue for a node type
   */
  private getQueueForNodeType(nodeType: string): QueueName {
    return NODE_TYPE_TO_QUEUE[nodeType] ?? QUEUE_NAMES.WORKFLOW_ORCHESTRATOR;
  }

  /**
   * Get job type for node type
   */
  private getJobTypeForNodeType(nodeType: string): string {
    switch (nodeType) {
      case 'imageGen':
        return JOB_TYPES.GENERATE_IMAGE;
      case 'videoGen':
        return JOB_TYPES.GENERATE_VIDEO;
      case 'llm':
        return JOB_TYPES.GENERATE_TEXT;
      default:
        return JOB_TYPES.EXECUTE_NODE;
    }
  }

  /**
   * Get priority for node type
   */
  private getPriorityForNodeType(nodeType: string): number {
    switch (nodeType) {
      case 'llm':
        return JOB_PRIORITY.HIGH;
      case 'imageGen':
        return JOB_PRIORITY.NORMAL;
      case 'videoGen':
        return JOB_PRIORITY.LOW; // Video is expensive, lower priority
      default:
        return JOB_PRIORITY.NORMAL;
    }
  }

  /**
   * Continue sequential execution by enqueueing the next ready node
   * Called after a node completes (via webhook) or fails (after all retries)
   */
  async continueExecution(executionId: string, workflowId: string): Promise<void> {
    // Check if execution is complete (handles failed nodes and blocked dependents)
    const isComplete = await this.executionsService.checkExecutionCompletion(executionId);
    if (isComplete) {
      this.logger.log(`Execution ${executionId} completed`);
      return;
    }

    // Get next ready nodes
    const readyNodes = await this.executionsService.getReadyNodes(executionId);

    if (readyNodes.length === 0) {
      this.logger.log(`Execution ${executionId}: no ready nodes, waiting for dependencies`);
      return;
    }

    // Enqueue only the first ready node (sequential execution)
    const nextNode = readyNodes[0];
    await this.enqueueNode(
      executionId,
      workflowId,
      nextNode.nodeId,
      nextNode.nodeType,
      nextNode.nodeData,
      nextNode.dependsOn
    );
    await this.executionsService.removeFromPendingNodes(executionId, nextNode.nodeId);

    this.logger.log(
      `Execution ${executionId}: enqueued next node ${nextNode.nodeId} (${nextNode.nodeType})`
    );
  }
}
