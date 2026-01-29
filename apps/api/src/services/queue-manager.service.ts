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
import type { ExecutionsService, WorkflowDefinition } from '@/services/executions.service';
import type { WorkflowsService } from '@/services/workflows.service';

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
    private readonly executionsService: ExecutionsService,
    @Inject(forwardRef(() => 'WorkflowsService'))
    private readonly workflowsService: WorkflowsService
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
  async enqueueWorkflow(
    executionId: string,
    workflowId: string,
    options?: { debugMode?: boolean; selectedNodeIds?: string[] }
  ): Promise<string> {
    const jobData: WorkflowJobData = {
      executionId,
      workflowId,
      timestamp: new Date().toISOString(),
      debugMode: options?.debugMode ?? false,
      selectedNodeIds: options?.selectedNodeIds ?? [],
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
   * @param workflow - Optional workflow definition for input resolution. If provided, node inputs will be resolved from connected upstream nodes.
   * @param options - Optional configuration including debugMode
   */
  async enqueueNode(
    executionId: string,
    workflowId: string,
    nodeId: string,
    nodeType: string,
    nodeData: Record<string, unknown>,
    dependsOn?: string[],
    workflow?: WorkflowDefinition,
    options?: { debugMode?: boolean }
  ): Promise<string> {
    const queueName = this.getQueueForNodeType(nodeType);
    const queue = this.queues.get(queueName);

    if (!queue) {
      throw new Error(`No queue found for node type: ${nodeType}`);
    }

    // Resolve inputs from connected upstream nodes if workflow is provided
    let resolvedNodeData = nodeData;
    if (workflow) {
      resolvedNodeData = await this.executionsService.resolveNodeInputs(
        executionId,
        nodeId,
        nodeData,
        workflow
      );
      this.logger.log(
        `Resolved inputs for node ${nodeId}: ${JSON.stringify(Object.keys(resolvedNodeData))}`
      );
    }

    const jobData: NodeJobData = {
      executionId,
      workflowId,
      nodeId,
      nodeType,
      nodeData: resolvedNodeData,
      dependsOn,
      timestamp: new Date().toISOString(),
      debugMode: options?.debugMode ?? false,
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
   * Send a heartbeat for a job to prevent it from being marked as stalled
   * during long-running polling operations
   */
  async heartbeatJob(bullJobId: string): Promise<void> {
    await this.queueJobModel.updateOne({ bullJobId }, { $set: { lastHeartbeat: new Date() } });
    this.logger.debug(`Heartbeat sent for job ${bullJobId}`);
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

  private static readonly NODE_TYPE_TO_JOB_TYPE: Record<string, string> = {
    imageGen: JOB_TYPES.GENERATE_IMAGE,
    videoGen: JOB_TYPES.GENERATE_VIDEO,
    llm: JOB_TYPES.GENERATE_TEXT,
  };

  private static readonly NODE_TYPE_TO_PRIORITY: Record<string, number> = {
    llm: JOB_PRIORITY.HIGH,
    imageGen: JOB_PRIORITY.NORMAL,
    videoGen: JOB_PRIORITY.LOW, // Video is expensive, lower priority
  };

  /**
   * Get job type for node type
   */
  private getJobTypeForNodeType(nodeType: string): string {
    return QueueManagerService.NODE_TYPE_TO_JOB_TYPE[nodeType] ?? JOB_TYPES.EXECUTE_NODE;
  }

  /**
   * Get priority for node type
   */
  private getPriorityForNodeType(nodeType: string): number {
    return QueueManagerService.NODE_TYPE_TO_PRIORITY[nodeType] ?? JOB_PRIORITY.NORMAL;
  }

  /**
   * Continue sequential execution by enqueueing the next ready node
   * Called after a node completes (via webhook) or fails (after all retries)
   * @param workflow - Optional workflow definition for input resolution. If not provided, will be fetched.
   */
  async continueExecution(
    executionId: string,
    workflowId: string,
    workflow?: WorkflowDefinition
  ): Promise<void> {
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

    // Get debugMode from execution record
    const execution = await this.executionsService.findExecution(executionId);
    const debugMode = (execution as unknown as { debugMode?: boolean }).debugMode ?? false;

    // Fetch workflow if not provided (needed for input resolution)
    let workflowDef = workflow;
    if (!workflowDef) {
      const fetchedWorkflow = await this.workflowsService.findOne(workflowId);
      workflowDef = {
        nodes: fetchedWorkflow.nodes as Array<{
          id: string;
          type: string;
          data: Record<string, unknown>;
        }>,
        edges: fetchedWorkflow.edges as Array<{
          source: string;
          target: string;
          sourceHandle?: string;
          targetHandle?: string;
        }>,
      };
    }

    // Enqueue only the first ready node (sequential execution)
    const nextNode = readyNodes[0];
    await this.enqueueNode(
      executionId,
      workflowId,
      nextNode.nodeId,
      nextNode.nodeType,
      nextNode.nodeData,
      nextNode.dependsOn,
      workflowDef,
      { debugMode }
    );
    await this.executionsService.removeFromPendingNodes(executionId, nextNode.nodeId);

    this.logger.log(
      `Execution ${executionId}: enqueued next node ${nextNode.nodeId} (${nextNode.nodeType})`
    );
  }
}
