import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, type HydratedDocument, Types } from 'mongoose';

export type ExecutionDocument = HydratedDocument<Execution>;

// Cost summary embedded document
@Schema({ _id: false })
class CostSummarySchema {
  @Prop({ default: 0 })
  estimated: number;

  @Prop({ default: 0 })
  actual: number;

  @Prop({ default: 0 })
  variance: number; // Percentage: (actual - estimated) / estimated * 100
}

// Node result embedded document
@Schema({ _id: false })
class NodeResult {
  @Prop({ required: true })
  nodeId: string;

  @Prop({ required: true, enum: ['pending', 'processing', 'complete', 'error'] })
  status: string;

  @Prop({ type: Object })
  output?: Record<string, unknown>;

  @Prop()
  error?: string;

  @Prop({ default: 0 })
  cost: number;

  @Prop()
  startedAt?: Date;

  @Prop()
  completedAt?: Date;
}

@Schema({ timestamps: true, collection: 'executions' })
export class Execution extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Workflow', required: true })
  workflowId: Types.ObjectId;

  @Prop({
    required: true,
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
    default: 'pending',
  })
  status: string;

  @Prop()
  startedAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop({ default: 0 })
  totalCost: number;

  @Prop({ type: CostSummarySchema, default: { estimated: 0, actual: 0, variance: 0 } })
  costSummary: CostSummarySchema;

  @Prop({ type: [Object], default: [] })
  nodeResults: NodeResult[];

  @Prop()
  error?: string;

  @Prop({ default: false })
  isDeleted: boolean;

  // Queue-related fields
  @Prop({ enum: ['sync', 'async'], default: 'sync' })
  executionMode: string;

  @Prop({ type: [String], default: [] })
  queueJobIds: string[];

  @Prop()
  resumedFrom?: string; // For recovery - previous execution ID

  // Composition: nested execution tracking
  @Prop({ type: Types.ObjectId, ref: 'Execution' })
  parentExecutionId?: Types.ObjectId; // If this is a child execution, reference to parent

  @Prop()
  parentNodeId?: string; // The workflowRef node ID in parent that triggered this execution

  @Prop({ type: [Types.ObjectId], ref: 'Execution', default: [] })
  childExecutionIds: Types.ObjectId[]; // Child executions spawned by workflowRef nodes

  @Prop({ default: 0 })
  depth: number; // Nesting level (0 = root execution)

  createdAt: Date;
  updatedAt: Date;
}

export const ExecutionSchema = SchemaFactory.createForClass(Execution);

// Indexes
ExecutionSchema.index({ workflowId: 1, isDeleted: 1 });
ExecutionSchema.index({ status: 1 });
ExecutionSchema.index({ createdAt: -1 });
ExecutionSchema.index({ parentExecutionId: 1 }); // For finding child executions
