import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, HydratedDocument, Types } from "mongoose";

export type ExecutionDocument = HydratedDocument<Execution>;

// Node result embedded document
@Schema({ _id: false })
class NodeResult {
  @Prop({ required: true })
  nodeId: string;

  @Prop({ required: true, enum: ["pending", "processing", "complete", "error"] })
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

@Schema({ timestamps: true, collection: "executions" })
export class Execution extends Document {
  @Prop({ type: Types.ObjectId, ref: "Workflow", required: true })
  workflowId: Types.ObjectId;

  @Prop({ required: true, enum: ["pending", "running", "completed", "failed", "cancelled"], default: "pending" })
  status: string;

  @Prop()
  startedAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop({ default: 0 })
  totalCost: number;

  @Prop({ type: [Object], default: [] })
  nodeResults: NodeResult[];

  @Prop()
  error?: string;

  @Prop({ default: false })
  isDeleted: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const ExecutionSchema = SchemaFactory.createForClass(Execution);

// Indexes
ExecutionSchema.index({ workflowId: 1, isDeleted: 1 });
ExecutionSchema.index({ status: 1 });
ExecutionSchema.index({ createdAt: -1 });
