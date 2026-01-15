import {
  EXECUTION_REPOSITORY,
  type ExecutionEntity,
  type IExecutionRepository,
} from '@genfeedai/storage';
import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import { throwIfNotFound } from '../common/utils';
import type {
  CostSummary,
  ExecutionCostDetails,
  JobCostBreakdown,
} from '../cost/interfaces/cost.interface';
import { Job, type JobDocument } from './schemas/job.schema';

@Injectable()
export class ExecutionsService {
  constructor(
    @Inject(EXECUTION_REPOSITORY)
    private readonly executionRepository: IExecutionRepository,
    @InjectModel(Job.name) private jobModel: Model<JobDocument>
  ) {}

  // Execution methods
  async createExecution(workflowId: string): Promise<ExecutionEntity> {
    return this.executionRepository.create({ workflowId });
  }

  async findExecutionsByWorkflow(workflowId: string): Promise<ExecutionEntity[]> {
    return this.executionRepository.findByWorkflowId(workflowId, {
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }

  async findExecution(id: string): Promise<ExecutionEntity> {
    const execution = await this.executionRepository.findById(id);
    return throwIfNotFound(execution, 'Execution', id);
  }

  async updateExecutionStatus(
    id: string,
    status: string,
    error?: string
  ): Promise<ExecutionEntity> {
    const execution = await this.executionRepository.updateStatus(id, status, error);
    return throwIfNotFound(execution, 'Execution', id);
  }

  async updateNodeResult(
    executionId: string,
    nodeId: string,
    status: string,
    output?: Record<string, unknown>,
    error?: string,
    cost?: number
  ): Promise<ExecutionEntity> {
    const nodeResult = {
      nodeId,
      status: status as 'pending' | 'running' | 'completed' | 'failed' | 'skipped',
      output,
      error,
      cost: cost ?? 0,
      startedAt: status === 'processing' ? new Date() : undefined,
      completedAt: status === 'complete' || status === 'error' ? new Date() : undefined,
    };

    const execution = await this.executionRepository.updateNodeResult(executionId, nodeResult);
    return throwIfNotFound(execution, 'Execution', executionId);
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
    return throwIfNotFound(job, 'Job', predictionId);
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
    await this.executionRepository.updateCostSummary(executionId, { estimated });
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

    await this.executionRepository.updateCostSummary(executionId, {
      actual,
      variance,
    });
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
}
