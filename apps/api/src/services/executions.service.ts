import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { type Model, Types } from 'mongoose';
import type {
  CostSummary,
  ExecutionCostDetails,
  JobCostBreakdown,
} from '@/interfaces/cost.interface';
import type {
  DebugPayload,
  ExecutionStatusUpdate,
  NodeOutput,
  PendingNode,
} from '@/interfaces/execution-types.interface';
import type {
  WorkflowDefinition,
  WorkflowEdge,
  WorkflowNode,
} from '@/interfaces/workflow.interface';
import { DATA_PASSTHROUGH_TYPES, PASSTHROUGH_OUTPUT_MAP } from '@/registry/node-type.registry';
import { Execution, type ExecutionDocument } from '@/schemas/execution.schema';
import { Job, type JobDocument } from '@/schemas/job.schema';

export type { WorkflowDefinition };

@Injectable()
export class ExecutionsService {
  private readonly logger = new Logger(ExecutionsService.name);

  constructor(
    @InjectModel(Execution.name)
    private readonly executionModel: Model<ExecutionDocument>,
    @InjectModel(Job.name)
    private readonly jobModel: Model<JobDocument>
  ) {}

  // Execution methods
  async createExecution(
    workflowId: string,
    options?: { debugMode?: boolean; selectedNodeIds?: string[] }
  ): Promise<ExecutionDocument> {
    const execution = new this.executionModel({
      debugMode: options?.debugMode ?? false,
      selectedNodeIds: options?.selectedNodeIds ?? [],
      status: 'pending',
      workflowId: new Types.ObjectId(workflowId),
    });
    return execution.save();
  }

  async findExecutionsByWorkflow(workflowId: string): Promise<ExecutionDocument[]> {
    return this.executionModel
      .find({ isDeleted: false, workflowId: new Types.ObjectId(workflowId) })
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
   * Create a child execution for workflow composition
   */
  async createChildExecution(
    workflowId: string,
    parentExecutionId: string,
    parentNodeId: string,
    depth: number
  ): Promise<ExecutionDocument> {
    const execution = new this.executionModel({
      depth,
      parentExecutionId: new Types.ObjectId(parentExecutionId),
      parentNodeId,
      status: 'pending',
      workflowId: new Types.ObjectId(workflowId),
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
    const updates: ExecutionStatusUpdate = { status };
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

  /**
   * Set or clear the paused-at node ID for pause edge breakpoints
   */
  async setPausedAtNodeId(executionId: string, nodeId: string | null): Promise<void> {
    await this.executionModel
      .updateOne({ _id: executionId, isDeleted: false }, { $set: { pausedAtNodeId: nodeId } })
      .exec();
  }

  async updateNodeResult(
    executionId: string,
    nodeId: string,
    status: string,
    output?: NodeOutput,
    error?: string,
    cost?: number
  ): Promise<ExecutionDocument> {
    const nodeResult = {
      completedAt: status === 'complete' || status === 'error' ? new Date() : undefined,
      cost: cost ?? 0,
      error,
      nodeId,
      output,
      startedAt: status === 'processing' ? new Date() : undefined,
      status,
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

  /**
   * Create a debug job with mock data and debug payload
   * Used when debug mode is enabled to record the would-be API call
   */
  async createDebugJob(
    executionId: string,
    nodeId: string,
    mockPredictionId: string,
    output: NodeOutput,
    debugPayload: DebugPayload
  ): Promise<Job> {
    const job = new this.jobModel({
      executionId: new Types.ObjectId(executionId),
      nodeId,
      output,
      predictionId: mockPredictionId,
      result: { debugPayload },
      status: 'succeeded',
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
    workflow: {
      _id: Types.ObjectId;
      nodes: WorkflowNode[];
      edges: WorkflowEdge[];
    };
  } | null> {
    const result = await this.jobModel
      .aggregate([
        { $match: { predictionId } },
        {
          $lookup: {
            as: 'execution',
            foreignField: '_id',
            from: 'executions',
            localField: 'executionId',
          },
        },
        { $unwind: '$execution' },
        {
          $lookup: {
            as: 'workflow',
            foreignField: '_id',
            from: 'workflows',
            localField: 'execution.workflowId',
            pipeline: [{ $project: { _id: 1, edges: 1, nodes: 1 } }],
          },
        },
        { $unwind: '$workflow' },
        {
          $project: {
            execution: '$execution',
            job: {
              _id: '$_id',
              cost: '$cost',
              costBreakdown: '$costBreakdown',
              createdAt: '$createdAt',
              error: '$error',
              executionId: '$executionId',
              nodeId: '$nodeId',
              output: '$output',
              predictionId: '$predictionId',
              predictTime: '$predictTime',
              progress: '$progress',
              status: '$status',
              updatedAt: '$updatedAt',
            },
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
        nodes: WorkflowNode[];
        edges: WorkflowEdge[];
      };
    };
  }

  async updateJob(
    predictionId: string,
    updates: {
      status?: string;
      progress?: number;
      output?: NodeOutput;
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

  // Input resolution methods

  /**
   * Resolve node inputs from connected upstream nodes
   * Walks workflow edges to find incoming connections and resolves their output values
   *
   * For passthrough nodes (imageInput, prompt, etc.): gets value directly from node data
   * For processing nodes: gets value from execution nodeResults
   */
  async resolveNodeInputs(
    executionId: string,
    nodeId: string,
    nodeData: Record<string, unknown>,
    workflow: WorkflowDefinition
  ): Promise<Record<string, unknown>> {
    const resolvedInputs: Record<string, unknown> = { ...nodeData };
    const execution = await this.findExecution(executionId);

    // Find incoming edges to this node
    const incomingEdges = workflow.edges.filter((e) => e.target === nodeId);

    if (incomingEdges.length === 0) {
      return resolvedInputs;
    }

    this.logger.debug(`Resolving ${incomingEdges.length} inputs for node ${nodeId}`);

    for (const edge of incomingEdges) {
      const sourceNode = workflow.nodes.find((n) => n.id === edge.source);
      if (!sourceNode) {
        this.logger.warn(`Source node ${edge.source} not found for edge to ${nodeId}`);
        continue;
      }

      this.logger.log(
        `Edge: ${sourceNode.type}[${edge.sourceHandle ?? 'undefined'}] -> ${nodeId}[${edge.targetHandle ?? 'undefined'}]`
      );

      // Get output value from source node
      let outputValue: unknown;

      // Check if source is a passthrough node
      if (DATA_PASSTHROUGH_TYPES.includes(sourceNode.type)) {
        outputValue = this.getPassthroughOutput(sourceNode, edge.sourceHandle);
        this.logger.log(
          `Passthrough ${sourceNode.type} output (handle=${edge.sourceHandle ?? 'undefined'}): ${outputValue === undefined ? 'UNDEFINED' : outputValue === null ? 'NULL' : typeof outputValue === 'string' ? outputValue.substring(0, 80) : JSON.stringify(outputValue)}`
        );
      } else {
        // Processing nodes: get from execution results
        const nodeResult = execution.nodeResults.find((r) => r.nodeId === edge.source);
        if (nodeResult?.status === 'complete' && nodeResult.output) {
          const sourceHandle = edge.sourceHandle ?? 'output';
          outputValue = (nodeResult.output as NodeOutput)[sourceHandle];
        }
      }

      // Map to target input handle
      if (outputValue !== undefined && outputValue !== null) {
        const targetHandle = edge.targetHandle ?? 'input';
        const mappedField = this.mapHandleToInputField(targetHandle, nodeData);

        this.logger.log(
          `Mapping: targetHandle=${targetHandle} -> mappedField=${mappedField}, isArray=${Array.isArray(resolvedInputs[mappedField])}`
        );

        // Handle array inputs (like imageInput which accepts multiple)
        if (Array.isArray(resolvedInputs[mappedField])) {
          resolvedInputs[mappedField] = [
            ...(resolvedInputs[mappedField] as unknown[]),
            outputValue,
          ];
        } else {
          resolvedInputs[mappedField] = outputValue;
        }

        this.logger.log(`Mapped ${sourceNode.type}.${edge.sourceHandle} -> ${mappedField}`);
      } else {
        this.logger.warn(`No output value from ${sourceNode.type} for edge to ${nodeId}`);
      }
    }

    // Log final resolved inputs (especially arrays)
    // Truncate data: URLs to avoid bloating logs with base64 content
    const inputImages = resolvedInputs.inputImages;
    if (Array.isArray(inputImages)) {
      this.logger.log(
        `Final inputImages for ${nodeId}: ${inputImages.length} items - ${JSON.stringify(
          inputImages.map((img: string) =>
            img?.startsWith?.('data:') ? '[base64 data]' : (img?.substring?.(0, 50) ?? img)
          )
        )}`
      );
    }

    return resolvedInputs;
  }

  /**
   * Get output value from a passthrough node
   */
  private getPassthroughOutput(node: WorkflowNode, sourceHandle?: string): unknown {
    const handle = sourceHandle ?? 'output';
    const outputMap = PASSTHROUGH_OUTPUT_MAP[node.type];

    if (outputMap?.[handle]) {
      return node.data[outputMap[handle]];
    }

    // Fallback: try common field names
    const fallbackFields = ['image', 'video', 'audio', 'prompt', 'text', 'value'];
    for (const field of fallbackFields) {
      if (node.data[field] !== undefined && node.data[field] !== null) {
        return node.data[field];
      }
    }

    return undefined;
  }

  /**
   * Map a target handle ID to the corresponding input field name
   * Note: React Flow may omit handle IDs from edges when there's only one handle,
   * defaulting to 'input' for target and 'output' for source
   */
  private mapHandleToInputField(targetHandle: string, nodeData: Record<string, unknown>): string {
    // Direct match
    if (targetHandle in nodeData) {
      return targetHandle;
    }

    // Common input field mappings
    // 'input' is the default when targetHandle is undefined in React Flow
    const handleMappings: Record<string, string[]> = {
      audio: ['inputAudio', 'audio'],
      image: ['inputImage', 'image', 'imageInput', 'inputImages'],
      images: ['inputImages', 'imageInput'],
      // Default fallback for undefined handle IDs
      input: ['inputImage', 'inputImages', 'inputVideo', 'inputAudio', 'inputPrompt', 'inputMedia'],
      lastFrame: ['lastFrame', 'inputLastFrame'], // Video end frame
      media: ['inputMedia'],
      prompt: ['inputPrompt', 'prompt'],
      text: ['inputText', 'inputPrompt', 'text'],
      video: ['inputVideo', 'video'],
    };

    const candidates = handleMappings[targetHandle] ?? [];
    for (const candidate of candidates) {
      if (candidate in nodeData) {
        return candidate;
      }
    }

    return targetHandle;
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
      actual: execution.costSummary?.actual ?? execution.totalCost ?? 0,
      estimated: execution.costSummary?.estimated ?? 0,
      variance: execution.costSummary?.variance ?? 0,
    };

    return {
      jobs: jobs.map((job) => ({
        breakdown: job.costBreakdown,
        cost: job.cost ?? 0,
        nodeId: job.nodeId,
        predictionId: job.predictionId,
        predictTime: job.predictTime,
      })),
      summary,
    };
  }

  // Sequential execution methods

  /**
   * Set pending nodes for sequential execution
   */
  async setPendingNodes(executionId: string, nodes: PendingNode[]): Promise<void> {
    await this.executionModel
      .updateOne({ _id: executionId }, { $set: { pendingNodes: nodes } })
      .exec();
  }

  /**
   * Get nodes that are ready to execute (all dependencies complete)
   */
  async getReadyNodes(executionId: string): Promise<PendingNode[]> {
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
   *
   * For partial execution (selectedNodeIds set), completion is based on
   * whether all nodes in the execution scope are complete, not all workflow nodes.
   */
  async checkExecutionCompletion(executionId: string): Promise<boolean> {
    const execution = await this.findExecution(executionId);
    const pendingNodes = execution.pendingNodes ?? [];
    const selectedNodeIds = (execution as unknown as { selectedNodeIds?: string[] })
      .selectedNodeIds;

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

      // For partial execution, check if all selected nodes are complete
      if (selectedNodeIds && selectedNodeIds.length > 0) {
        const allSelectedComplete = selectedNodeIds.every(
          (nodeId) => completedIds.has(nodeId) || failedIds.has(nodeId)
        );
        if (allSelectedComplete && execution.status === 'running') {
          await this.updateExecutionStatus(
            executionId,
            hasError ? 'failed' : 'completed',
            hasError ? 'One or more nodes failed' : undefined
          );
          return true;
        }
      } else if (allProcessed && execution.status === 'running') {
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
          failedExecutions: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
          },
          totalCost: { $sum: { $ifNull: ['$costSummary.actual', 0] } },
          totalExecutions: { $sum: 1 },
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
        },
      },
    ];

    const [result] = await this.executionModel.aggregate(pipeline).exec();

    if (!result) {
      return {
        avgRunTimeMs: 0,
        failedExecutions: 0,
        failureRate: 0,
        totalCost: 0,
        totalExecutions: 0,
      };
    }

    const failureRate =
      result.totalExecutions > 0
        ? Math.round((result.failedExecutions / result.totalExecutions) * 100)
        : 0;

    const avgRunTimeMs =
      result.completedCount > 0 ? Math.round(result.totalRunTimeMs / result.completedCount) : 0;

    return {
      avgRunTimeMs,
      failedExecutions: result.failedExecutions,
      failureRate,
      totalCost: result.totalCost,
      totalExecutions: result.totalExecutions,
    };
  }
}
