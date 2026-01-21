import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { type Model, Types } from 'mongoose';
import type {
  CostSummary,
  ExecutionCostDetails,
  JobCostBreakdown,
} from '@/interfaces/cost.interface';
import { Execution, type ExecutionDocument } from '@/schemas/execution.schema';
import { Job, type JobDocument } from '@/schemas/job.schema';

@Injectable()
export class ExecutionsService {
  constructor(
    @InjectModel(Execution.name)
    private readonly executionModel: Model<ExecutionDocument>,
    @InjectModel(Job.name)
    private readonly jobModel: Model<JobDocument>
  ) {}

  // Execution methods
  async createExecution(workflowId: string): Promise<ExecutionDocument> {
    const execution = new this.executionModel({
      workflowId: new Types.ObjectId(workflowId),
      status: 'pending',
    });
    return execution.save();
  }

  async findExecutionsByWorkflow(workflowId: string): Promise<ExecutionDocument[]> {
    return this.executionModel
      .find({ workflowId: new Types.ObjectId(workflowId), isDeleted: false })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findExecution(id: string): Promise<ExecutionDocument> {
    const execution = await this.executionModel.findOne({ _id: id, isDeleted: false }).exec();
    if (!execution) {
      throw new NotFoundException(`Execution ${id} not found`);
    }
    return execution;
  }

  /**
   * Alias for findExecution - used by workflow processor
   */
  async getExecution(id: string): Promise<ExecutionDocument> {
    return this.findExecution(id);
  }

  /**
   * Create a child execution for workflow composition
   */
  async createChildExecution(
    workflowId: string,
    parentExecutionId: string,
    parentNodeId: string,
    depth: number
  ): Promise<ExecutionDocument> {
    const execution = new this.executionModel({
      workflowId: new Types.ObjectId(workflowId),
      status: 'pending',
      parentExecutionId: new Types.ObjectId(parentExecutionId),
      parentNodeId,
      depth,
    });
    return execution.save();
  }

  /**
   * Add a child execution ID to parent's childExecutionIds array
   */
  async addChildExecution(
    parentExecutionId: string,
    childExecutionId: Types.ObjectId
  ): Promise<void> {
    await this.executionModel
      .updateOne({ _id: parentExecutionId }, { $addToSet: { childExecutionIds: childExecutionId } })
      .exec();
  }

  async updateExecutionStatus(
    id: string,
    status: string,
    error?: string
  ): Promise<ExecutionDocument> {
    const updates: Record<string, unknown> = { status };
    if (error) updates.error = error;
    if (status === 'running') updates.startedAt = new Date();
    if (status === 'completed' || status === 'failed') updates.completedAt = new Date();

    const execution = await this.executionModel
      .findOneAndUpdate({ _id: id, isDeleted: false }, { $set: updates }, { new: true })
      .exec();
    if (!execution) {
      throw new NotFoundException(`Execution ${id} not found`);
    }
    return execution;
  }

  async updateNodeResult(
    executionId: string,
    nodeId: string,
    status: string,
    output?: Record<string, unknown>,
    error?: string,
    cost?: number
  ): Promise<ExecutionDocument> {
    const nodeResult = {
      nodeId,
      status,
      output,
      error,
      cost: cost ?? 0,
      startedAt: status === 'processing' ? new Date() : undefined,
      completedAt: status === 'complete' || status === 'error' ? new Date() : undefined,
    };

    // Try to update existing node result, or add new one
    const execution = await this.executionModel
      .findOneAndUpdate(
        { _id: executionId, 'nodeResults.nodeId': nodeId },
        { $set: { 'nodeResults.$': nodeResult } },
        { new: true }
      )
      .exec();

    if (execution) return execution;

    // Node result doesn't exist, push new one
    const newExecution = await this.executionModel
      .findOneAndUpdate({ _id: executionId }, { $push: { nodeResults: nodeResult } }, { new: true })
      .exec();

    if (!newExecution) {
      throw new NotFoundException(`Execution ${executionId} not found`);
    }
    return newExecution;
  }

  // Job methods
  async createJob(executionId: string, nodeId: string, predictionId: string): Promise<Job> {
    const job = new this.jobModel({
      executionId: new Types.ObjectId(executionId),
      nodeId,
      predictionId,
      status: 'pending',
    });
    return job.save();
  }

  async findJobByPredictionId(predictionId: string): Promise<Job | null> {
    return this.jobModel.findOne({ predictionId }).exec();
  }

  /**
   * Find a job with its execution and workflow context in a single aggregation query
   * Replaces 3 sequential queries with 1 aggregation using $lookup
   */
  async findJobWithContext(predictionId: string): Promise<{
    job: JobDocument;
    execution: ExecutionDocument;
    workflow: { _id: Types.ObjectId; nodes: Array<{ id: string; data: Record<string, unknown> }> };
  } | null> {
    const result = await this.jobModel
      .aggregate([
        { $match: { predictionId } },
        {
          $lookup: {
            from: 'executions',
            localField: 'executionId',
            foreignField: '_id',
            as: 'execution',
          },
        },
        { $unwind: '$execution' },
        {
          $lookup: {
            from: 'workflows',
            localField: 'execution.workflowId',
            foreignField: '_id',
            as: 'workflow',
            pipeline: [{ $project: { _id: 1, nodes: 1 } }],
          },
        },
        { $unwind: '$workflow' },
        {
          $project: {
            job: {
              _id: '$_id',
              executionId: '$executionId',
              nodeId: '$nodeId',
              predictionId: '$predictionId',
              status: '$status',
              progress: '$progress',
              output: '$output',
              error: '$error',
              cost: '$cost',
              costBreakdown: '$costBreakdown',
              predictTime: '$predictTime',
              createdAt: '$createdAt',
              updatedAt: '$updatedAt',
            },
            execution: '$execution',
            workflow: '$workflow',
          },
        },
      ])
      .exec();

    if (!result || result.length === 0) {
      return null;
    }

    return result[0] as {
      job: JobDocument;
      execution: ExecutionDocument;
      workflow: {
        _id: Types.ObjectId;
        nodes: Array<{ id: string; data: Record<string, unknown> }>;
      };
    };
  }

  async updateJob(
    predictionId: string,
    updates: {
      status?: string;
      progress?: number;
      output?: Record<string, unknown>;
      error?: string;
      cost?: number;
      costBreakdown?: JobCostBreakdown;
      predictTime?: number;
    }
  ): Promise<Job> {
    const job = await this.jobModel
      .findOneAndUpdate({ predictionId }, { $set: updates }, { new: true })
      .exec();
    if (!job) {
      throw new NotFoundException(`Job with predictionId ${predictionId} not found`);
    }
    return job;
  }

  async findJobsByExecution(executionId: string): Promise<Job[]> {
    return this.jobModel
      .find({ executionId: new Types.ObjectId(executionId) })
      .sort({ createdAt: 1 })
      .exec();
  }

  /**
   * Set estimated cost before execution starts
   */
  async setEstimatedCost(executionId: string, estimated: number): Promise<void> {
    await this.executionModel
      .updateOne({ _id: executionId }, { $set: { 'costSummary.estimated': estimated } })
      .exec();
  }

  /**
   * Update actual cost after jobs complete
   */
  async updateExecutionCost(executionId: string): Promise<void> {
    const jobs = await this.findJobsByExecution(executionId);
    const actual = jobs.reduce((sum, job) => sum + (job.cost ?? 0), 0);

    const execution = await this.findExecution(executionId);
    const estimated = execution.costSummary?.estimated ?? 0;
    const variance = estimated > 0 ? ((actual - estimated) / estimated) * 100 : 0;

    await this.executionModel
      .updateOne(
        { _id: executionId },
        { $set: { 'costSummary.actual': actual, 'costSummary.variance': variance } }
      )
      .exec();
  }

  /**
   * Get execution cost details with job breakdown
   */
  async getExecutionCostDetails(executionId: string): Promise<ExecutionCostDetails> {
    const execution = await this.findExecution(executionId);
    const jobs = await this.findJobsByExecution(executionId);

    const summary: CostSummary = {
      estimated: execution.costSummary?.estimated ?? 0,
      actual: execution.costSummary?.actual ?? execution.totalCost ?? 0,
      variance: execution.costSummary?.variance ?? 0,
    };

    return {
      summary,
      jobs: jobs.map((job) => ({
        nodeId: job.nodeId,
        predictionId: job.predictionId,
        cost: job.cost ?? 0,
        breakdown: job.costBreakdown,
        predictTime: job.predictTime,
      })),
    };
  }

  // Sequential execution methods

  /**
   * Set pending nodes for sequential execution
   */
  async setPendingNodes(
    executionId: string,
    nodes: Array<{
      nodeId: string;
      nodeType: string;
      nodeData: Record<string, unknown>;
      dependsOn: string[];
    }>
  ): Promise<void> {
    await this.executionModel
      .updateOne({ _id: executionId }, { $set: { pendingNodes: nodes } })
      .exec();
  }

  /**
   * Get nodes that are ready to execute (all dependencies complete)
   */
  async getReadyNodes(executionId: string): Promise<
    Array<{
      nodeId: string;
      nodeType: string;
      nodeData: Record<string, unknown>;
      dependsOn: string[];
    }>
  > {
    const execution = await this.findExecution(executionId);
    const pendingNodes = execution.pendingNodes ?? [];
    const completedNodeIds = new Set(
      execution.nodeResults.filter((r) => r.status === 'complete').map((r) => r.nodeId)
    );

    // Return nodes whose dependencies are all satisfied
    return pendingNodes.filter((node) =>
      node.dependsOn.every((depId) => completedNodeIds.has(depId))
    );
  }

  /**
   * Remove a node from pending nodes (after enqueueing)
   */
  async removeFromPendingNodes(executionId: string, nodeId: string): Promise<void> {
    await this.executionModel
      .updateOne({ _id: executionId }, { $pull: { pendingNodes: { nodeId } } })
      .exec();
  }

  /**
   * Check if all nodes are complete and update execution status
   * Handles: no pending nodes, blocked nodes (failed dependency), all errors
   * Optimized: Uses single reduce to categorize all node results in one pass
   */
  async checkExecutionCompletion(executionId: string): Promise<boolean> {
    const execution = await this.findExecution(executionId);
    const pendingNodes = execution.pendingNodes ?? [];

    // Already completed/failed
    if (execution.status === 'completed' || execution.status === 'failed') {
      return true;
    }

    // Single-pass categorization of node results (replaces multiple filter calls)
    const { completedIds, failedIds, hasError } = execution.nodeResults.reduce(
      (acc, r) => {
        if (r.status === 'complete') acc.completedIds.add(r.nodeId);
        else if (r.status === 'error') {
          acc.failedIds.add(r.nodeId);
          acc.hasError = true;
        }
        return acc;
      },
      { completedIds: new Set<string>(), failedIds: new Set<string>(), hasError: false }
    );

    // Check if any pending nodes are blocked by failed dependencies
    const blockedNodes = pendingNodes.filter((node) =>
      node.dependsOn.some((depId) => failedIds.has(depId))
    );

    // If there are blocked nodes, mark them as skipped and remove from pending
    if (blockedNodes.length > 0) {
      for (const node of blockedNodes) {
        await this.updateNodeResult(
          executionId,
          node.nodeId,
          'error',
          undefined,
          'Skipped: dependency failed'
        );
        await this.removeFromPendingNodes(executionId, node.nodeId);
      }
      // Re-fetch after updates
      return this.checkExecutionCompletion(executionId);
    }

    // Check if there are any ready nodes left
    const readyNodes = pendingNodes.filter((node) =>
      node.dependsOn.every((depId) => completedIds.has(depId))
    );

    // If no pending nodes and no ready nodes, execution is done
    if (pendingNodes.length === 0 || (readyNodes.length === 0 && blockedNodes.length === 0)) {
      const allProcessed = execution.nodeResults.length > 0;

      if (allProcessed && execution.status === 'running') {
        await this.updateExecutionStatus(
          executionId,
          hasError ? 'failed' : 'completed',
          hasError ? 'One or more nodes failed' : undefined
        );
        return true;
      }
    }

    return false;
  }

  /**
   * Find existing job for a node (to prevent duplicate predictions on retry)
   */
  async findExistingJob(executionId: string, nodeId: string): Promise<JobDocument | null> {
    return this.jobModel
      .findOne({
        executionId: new Types.ObjectId(executionId),
        nodeId,
      })
      .exec();
  }

  /**
   * Get aggregated execution statistics
   */
  async getStats(): Promise<{
    totalExecutions: number;
    failedExecutions: number;
    failureRate: number;
    avgRunTimeMs: number;
    totalCost: number;
  }> {
    const pipeline = [
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: null,
          totalExecutions: { $sum: 1 },
          failedExecutions: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
          },
          totalRunTimeMs: {
            $sum: {
              $cond: [
                {
                  $and: [{ $ifNull: ['$startedAt', false] }, { $ifNull: ['$completedAt', false] }],
                },
                { $subtract: ['$completedAt', '$startedAt'] },
                0,
              ],
            },
          },
          completedCount: {
            $sum: {
              $cond: [
                {
                  $and: [{ $ifNull: ['$startedAt', false] }, { $ifNull: ['$completedAt', false] }],
                },
                1,
                0,
              ],
            },
          },
          totalCost: { $sum: { $ifNull: ['$costSummary.actual', 0] } },
        },
      },
    ];

    const [result] = await this.executionModel.aggregate(pipeline).exec();

    if (!result) {
      return {
        totalExecutions: 0,
        failedExecutions: 0,
        failureRate: 0,
        avgRunTimeMs: 0,
        totalCost: 0,
      };
    }

    const failureRate =
      result.totalExecutions > 0
        ? Math.round((result.failedExecutions / result.totalExecutions) * 100)
        : 0;

    const avgRunTimeMs =
      result.completedCount > 0 ? Math.round(result.totalRunTimeMs / result.completedCount) : 0;

    return {
      totalExecutions: result.totalExecutions,
      failedExecutions: result.failedExecutions,
      failureRate,
      avgRunTimeMs,
      totalCost: result.totalCost,
    };
  }
}
