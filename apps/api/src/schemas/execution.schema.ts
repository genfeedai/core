import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, type HydratedDocument, Types } from 'mongoose';
import type { NodeOutput } from '@/interfaces/execution-types.interface';
import { EXECUTION_STATUS, NODE_RESULT_STATUS } from '@/queue/queue.constants';

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

  @Prop({ enum: Object.values(NODE_RESULT_STATUS), required: true })
  status: string;

  @Prop({ type: Object })
  output?: NodeOutput;

  @Prop()
  error?: string;

  @Prop({ default: 0 })
  cost: number;

  @Prop()
  startedAt?: Date;

  @Prop()
  completedAt?: Date;
}

@Schema({ collection: 'executions', timestamps: true })
export class Execution extends Document {
  @Prop({ ref: 'Workflow', required: true, type: Types.ObjectId })
  workflowId: Types.ObjectId;

  @Prop({
    default: EXECUTION_STATUS.PENDING,
    enum: Object.values(EXECUTION_STATUS),
    index: true,
    required: true,
  })
  status: string;

  @Prop()
  startedAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop({ default: 0 })
  totalCost: number;

  @Prop({ default: { actual: 0, estimated: 0, variance: 0 }, type: CostSummarySchema })
  costSummary: CostSummarySchema;

  @Prop({ default: [], type: [Object] })
  nodeResults: NodeResult[];

  @Prop()
  error?: string;

  @Prop({ default: false })
  isDeleted: boolean;

  // Queue-related fields
  @Prop({ default: 'sync', enum: ['sync', 'async'] })
  executionMode: string;

  @Prop({ default: [], type: [String] })
  queueJobIds: string[];

  @Prop()
  resumedFrom?: string; // For recovery - previous execution ID

  // Composition: nested execution tracking
  @Prop({ index: true, ref: 'Execution', type: Types.ObjectId })
  parentExecutionId?: Types.ObjectId;

  @Prop()
  parentNodeId?: string; // The workflowRef node ID in parent that triggered this execution

  @Prop({ default: [], ref: 'Execution', type: [Types.ObjectId] })
  childExecutionIds: Types.ObjectId[]; // Child executions spawned by workflowRef nodes

  @Prop({ default: 0 })
  depth: number; // Nesting level (0 = root execution)

  // Sequential execution: pending nodes waiting to be processed
  @Prop({ default: [], type: [Object] })
  pendingNodes: Array<{
    nodeId: string;
    nodeType: string;
    nodeData: Record<string, unknown>;
    dependsOn: string[];
  }>;

  // Debug mode - skip API calls and return mock data
  @Prop({ default: false })
  debugMode: boolean;

  // Selected nodes for partial execution (empty = execute all)
  @Prop({ default: [], type: [String] })
  selectedNodeIds: string[];

  createdAt: Date;
  updatedAt: Date;
}

export const ExecutionSchema = SchemaFactory.createForClass(Execution);
