import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Execution, ExecutionDocument } from "./schemas/execution.schema";
import { Job, JobDocument } from "./schemas/job.schema";

@Injectable()
export class ExecutionsService {
  constructor(
    @InjectModel(Execution.name) private executionModel: Model<ExecutionDocument>,
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
  ) {}

  // Execution methods
  async createExecution(workflowId: string): Promise<Execution> {
    const execution = new this.executionModel({
      workflowId: new Types.ObjectId(workflowId),
      status: "pending",
      startedAt: new Date(),
      nodeResults: [],
    });
    return execution.save();
  }

  async findExecutionsByWorkflow(workflowId: string): Promise<Execution[]> {
    return this.executionModel
      .find({ workflowId: new Types.ObjectId(workflowId), isDeleted: false })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findExecution(id: string): Promise<Execution> {
    const execution = await this.executionModel
      .findOne({ _id: id, isDeleted: false })
      .exec();

    if (!execution) {
      throw new NotFoundException(`Execution with ID ${id} not found`);
    }

    return execution;
  }

  async updateExecutionStatus(id: string, status: string, error?: string): Promise<Execution> {
    const updates: Record<string, unknown> = { status };

    if (status === "completed" || status === "failed" || status === "cancelled") {
      updates.completedAt = new Date();
    }

    if (error) {
      updates.error = error;
    }

    const execution = await this.executionModel
      .findByIdAndUpdate(id, { $set: updates }, { new: true })
      .exec();

    if (!execution) {
      throw new NotFoundException(`Execution with ID ${id} not found`);
    }

    return execution;
  }

  async updateNodeResult(
    executionId: string,
    nodeId: string,
    status: string,
    output?: Record<string, unknown>,
    error?: string,
    cost?: number,
  ): Promise<Execution> {
    const execution = await this.findExecution(executionId);

    // Find existing node result or create new one
    const nodeResultIndex = execution.nodeResults.findIndex(
      (nr) => nr.nodeId === nodeId,
    );

    const nodeResult = {
      nodeId,
      status,
      output,
      error,
      cost: cost ?? 0,
      startedAt: status === "processing" ? new Date() : undefined,
      completedAt: status === "complete" || status === "error" ? new Date() : undefined,
    };

    if (nodeResultIndex >= 0) {
      execution.nodeResults[nodeResultIndex] = {
        ...execution.nodeResults[nodeResultIndex],
        ...nodeResult,
      };
    } else {
      execution.nodeResults.push(nodeResult as never);
    }

    // Update total cost
    execution.totalCost = execution.nodeResults.reduce(
      (total, nr) => total + (nr.cost ?? 0),
      0,
    );

    return execution.save();
  }

  // Job methods
  async createJob(executionId: string, nodeId: string, predictionId: string): Promise<Job> {
    const job = new this.jobModel({
      executionId: new Types.ObjectId(executionId),
      nodeId,
      predictionId,
      status: "pending",
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
    },
  ): Promise<Job> {
    const job = await this.jobModel
      .findOneAndUpdate({ predictionId }, { $set: updates }, { new: true })
      .exec();

    if (!job) {
      throw new NotFoundException(`Job with prediction ID ${predictionId} not found`);
    }

    return job;
  }

  async findJobsByExecution(executionId: string): Promise<Job[]> {
    return this.jobModel
      .find({ executionId: new Types.ObjectId(executionId) })
      .sort({ createdAt: 1 })
      .exec();
  }
}
