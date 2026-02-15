import { forwardRef, Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import {
  EXECUTION_STATUS,
  JOB_STATUS,
  MAX_RECOVERY_ATTEMPTS,
  QUEUE_NAMES,
  type QueueName,
} from '@/queue/queue.constants';
import type { NodeJobData, WorkflowJobData } from '@/interfaces/job-data.interface';
import { QueueJob, type QueueJobDocument } from '@/schemas/queue-job.schema';
import type { ExecutionsService } from '@/services/executions.service';
import { QueueManagerService } from '@/services/queue-manager.service';

interface StalledJob {
  _id: Types.ObjectId;
  bullJobId: string;
  queueName: string;
  executionId: Types.ObjectId;
  nodeId: string;
  data: NodeJobData | WorkflowJobData;
  recoveryCount?: number;
}

@Injectable()
export class JobRecoveryService implements OnModuleInit {
  private readonly logger = new Logger(JobRecoveryService.name);
  private readonly STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectModel(QueueJob.name)
    private readonly queueJobModel: Model<QueueJobDocument>,
    private readonly queueManager: QueueManagerService,
    @Inject(forwardRef(() => 'ExecutionsService'))
    private readonly executionsService: ExecutionsService
  ) {}

  /**
   * On module init, recover any stalled jobs from previous runs
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('Checking for stalled jobs to recover...');
    await this.recoverStalledJobs();
  }

  /**
   * Periodically check for stalled jobs (every 5 minutes)
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async scheduledRecovery(): Promise<void> {
    await this.recoverStalledJobs();
  }

  /**
   * Find and re-enqueue stalled jobs
   */
  async recoverStalledJobs(): Promise<number> {
    const staleThreshold = new Date(Date.now() - this.STALE_THRESHOLD_MS);

    // Find jobs that were in-progress when server may have crashed
    // Jobs are considered stalled if ALL:
    // 1. updatedAt is older than threshold (no status change)
    // 2. lastHeartbeat is null OR older than threshold (no heartbeat during polling)
    // 3. recoveryCount below max attempts (prevent infinite recovery loops)
    const stalledJobs = await this.queueJobModel
      .find({
        $and: [
          {
            movedToDlq: false,
            status: { $in: [JOB_STATUS.ACTIVE, JOB_STATUS.PENDING] },
            updatedAt: { $lt: staleThreshold },
          },
          {
            $or: [
              { lastHeartbeat: { $exists: false } },
              { lastHeartbeat: null },
              { lastHeartbeat: { $lt: staleThreshold } },
            ],
          },
          {
            $or: [
              { recoveryCount: { $exists: false } },
              { recoveryCount: { $lt: MAX_RECOVERY_ATTEMPTS } },
            ],
          },
        ],
      })
      .lean<StalledJob[]>();

    if (stalledJobs.length === 0) {
      return 0;
    }

    this.logger.warn(`Found ${stalledJobs.length} stalled job candidates to evaluate`);

    // Batch-check execution statuses to filter out jobs for completed/failed/cancelled executions
    const executionIds = [...new Set(stalledJobs.map((j) => j.executionId.toString()))];
    const terminalExecutionIds = new Set<string>();

    for (const execId of executionIds) {
      try {
        const execution = await this.executionsService.findExecution(execId);
        const status = (execution as unknown as { status: string }).status;
        if (
          status === EXECUTION_STATUS.COMPLETED ||
          status === EXECUTION_STATUS.FAILED ||
          status === EXECUTION_STATUS.CANCELLED
        ) {
          terminalExecutionIds.add(execId);
        }
      } catch {
        // Execution not found — treat as terminal (don't recover orphaned jobs)
        terminalExecutionIds.add(execId);
      }
    }

    // Mark jobs from terminal executions as completed — they don't need recovery
    const terminalJobs = stalledJobs.filter((j) =>
      terminalExecutionIds.has(j.executionId.toString())
    );
    if (terminalJobs.length > 0) {
      const terminalJobIds = terminalJobs.map((j) => j._id);
      await this.queueJobModel.updateMany(
        { _id: { $in: terminalJobIds } },
        {
          $push: {
            logs: {
              level: 'info',
              message: 'Skipped recovery — parent execution already terminal',
              timestamp: new Date(),
            },
          },
          $set: { status: JOB_STATUS.COMPLETED },
        }
      );
      this.logger.log(`Skipped ${terminalJobs.length} jobs — parent executions already terminal`);
    }

    // Only recover jobs from active executions
    const recoverableJobs = stalledJobs.filter(
      (j) => !terminalExecutionIds.has(j.executionId.toString())
    );

    let recoveredCount = 0;

    for (const job of recoverableJobs) {
      try {
        await this.recoverJob(job);
        recoveredCount++;
      } catch (error) {
        this.logger.error(
          `Failed to recover job ${job.bullJobId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    this.logger.log(`Successfully recovered ${recoveredCount} stalled jobs`);
    return recoveredCount;
  }

  /**
   * Recover a single stalled job with guards against false positives
   */
  private async recoverJob(job: StalledJob): Promise<void> {
    const recoveryCount = job.recoveryCount ?? 0;

    // Guard 1: Check if job is still active in BullMQ — if so, it's not actually stalled
    const isActive = await this.queueManager.isJobActiveInBullMQ(
      job.queueName as QueueName,
      job.bullJobId
    );
    if (isActive) {
      await this.queueJobModel.updateOne({ _id: job._id }, { $set: { lastHeartbeat: new Date() } });
      this.logger.debug(`Job ${job.bullJobId} still active in BullMQ, refreshed heartbeat`);
      return;
    }

    // Guard 2: Max recovery attempts exceeded — move to DLQ
    if (recoveryCount >= MAX_RECOVERY_ATTEMPTS) {
      await this.queueManager.moveToDeadLetterQueue(
        job.bullJobId,
        job.queueName as QueueName,
        `Exceeded max recovery attempts (${MAX_RECOVERY_ATTEMPTS})`
      );
      this.logger.warn(
        `Job ${job.bullJobId} exceeded ${MAX_RECOVERY_ATTEMPTS} recovery attempts, moved to DLQ`
      );
      return;
    }

    this.logger.log(
      `Recovering stalled job: ${job.bullJobId} from queue ${job.queueName} (attempt ${recoveryCount + 1}/${MAX_RECOVERY_ATTEMPTS})`
    );

    // Mark the job as recovered and increment recoveryCount
    await this.queueJobModel.updateOne(
      { _id: job._id },
      {
        $inc: { recoveryCount: 1 },
        $push: {
          logs: {
            level: 'warn',
            message: `Job recovered after stall detection (attempt ${recoveryCount + 1}/${MAX_RECOVERY_ATTEMPTS})`,
            timestamp: new Date(),
          },
        },
        $set: { status: JOB_STATUS.RECOVERED },
      }
    );

    // Re-enqueue based on queue type (upsert in enqueue prevents duplicate MongoDB docs)
    if (job.queueName === QUEUE_NAMES.WORKFLOW_ORCHESTRATOR) {
      await this.queueManager.enqueueWorkflow(job.executionId.toString(), job.data.workflowId);
    } else {
      const nodeData = job.data as NodeJobData;
      await this.queueManager.enqueueNode(
        job.executionId.toString(),
        nodeData.workflowId,
        job.nodeId,
        nodeData.nodeType,
        nodeData.nodeData,
        nodeData.dependsOn
      );
    }
  }

  /**
   * Manually recover a specific execution's incomplete jobs
   */
  async recoverExecution(executionId: string): Promise<number> {
    const incompleteJobs = await this.queueJobModel
      .find({
        executionId: new Types.ObjectId(executionId),
        movedToDlq: false,
        status: { $nin: [JOB_STATUS.COMPLETED, JOB_STATUS.FAILED] },
      })
      .lean<StalledJob[]>();

    if (incompleteJobs.length === 0) {
      return 0;
    }

    this.logger.log(
      `Recovering ${incompleteJobs.length} incomplete jobs for execution ${executionId}`
    );

    let recoveredCount = 0;

    for (const job of incompleteJobs) {
      try {
        await this.recoverJob(job);
        recoveredCount++;
      } catch (error) {
        this.logger.error(
          `Failed to recover job ${job.bullJobId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return recoveredCount;
  }

  /**
   * Get statistics on job states
   */
  async getJobStats(): Promise<{
    total: number;
    pending: number;
    active: number;
    completed: number;
    failed: number;
    recovered: number;
    inDlq: number;
  }> {
    const pipeline = [
      {
        $facet: {
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          inDlq: [{ $match: { movedToDlq: true } }, { $count: 'count' }],
          total: [{ $count: 'count' }],
        },
      },
    ];

    const [result] = await this.queueJobModel.aggregate(pipeline);

    const statusCounts = new Map<string, number>(
      result.byStatus.map(
        (s: { _id: string; count: number }) => [s._id, s.count] as [string, number]
      )
    );

    return {
      active: statusCounts.get(JOB_STATUS.ACTIVE) ?? 0,
      completed: statusCounts.get(JOB_STATUS.COMPLETED) ?? 0,
      failed: statusCounts.get(JOB_STATUS.FAILED) ?? 0,
      inDlq: (result.inDlq[0]?.count as number) ?? 0,
      pending: statusCounts.get(JOB_STATUS.PENDING) ?? 0,
      recovered: statusCounts.get(JOB_STATUS.RECOVERED) ?? 0,
      total: (result.total[0]?.count as number) ?? 0,
    };
  }

  /**
   * Retry a failed job from the DLQ
   */
  async retryFromDlq(bullJobId: string): Promise<string> {
    const job = await this.queueJobModel
      .findOne({
        bullJobId,
        movedToDlq: true,
      })
      .lean<StalledJob>();

    if (!job) {
      throw new Error(`Job ${bullJobId} not found in DLQ`);
    }

    this.logger.log(`Retrying job ${bullJobId} from DLQ`);

    // Reset DLQ flag and recovery count
    await this.queueJobModel.updateOne(
      { _id: job._id },
      {
        $push: {
          logs: {
            level: 'info',
            message: 'Job retried from DLQ',
            timestamp: new Date(),
          },
        },
        $set: { movedToDlq: false, recoveryCount: 0, status: JOB_STATUS.PENDING },
      }
    );

    // Re-enqueue
    if (job.queueName === QUEUE_NAMES.WORKFLOW_ORCHESTRATOR) {
      return this.queueManager.enqueueWorkflow(job.executionId.toString(), job.data.workflowId);
    }

    const nodeData = job.data as NodeJobData;
    return this.queueManager.enqueueNode(
      job.executionId.toString(),
      nodeData.workflowId,
      job.nodeId,
      nodeData.nodeType,
      nodeData.nodeData,
      nodeData.dependsOn
    );
  }

  /**
   * Get jobs in DLQ for inspection
   */
  async getDlqJobs(limit = 50, offset = 0): Promise<{ jobs: QueueJobDocument[]; total: number }> {
    const [jobs, total] = await Promise.all([
      this.queueJobModel
        .find({ movedToDlq: true })
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .exec(),
      this.queueJobModel.countDocuments({ movedToDlq: true }),
    ]);

    return { jobs, total };
  }
}
