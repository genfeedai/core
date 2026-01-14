import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, HydratedDocument, Types } from "mongoose";

export type JobDocument = HydratedDocument<Job>;

@Schema({ timestamps: true, collection: "jobs" })
export class Job extends Document {
  @Prop({ type: Types.ObjectId, ref: "Execution", required: true })
  executionId: Types.ObjectId;

  @Prop({ required: true })
  nodeId: string;

  @Prop({ required: true, unique: true })
  predictionId: string; // Replicate prediction ID

  @Prop({ required: true, enum: ["pending", "processing", "succeeded", "failed", "canceled"], default: "pending" })
  status: string;

  @Prop({ default: 0, min: 0, max: 100 })
  progress: number;

  @Prop({ type: Object })
  output?: Record<string, unknown>;

  @Prop()
  error?: string;

  @Prop({ default: 0 })
  cost: number;

  createdAt: Date;
  updatedAt: Date;
}

export const JobSchema = SchemaFactory.createForClass(Job);

// Indexes
JobSchema.index({ executionId: 1 });
JobSchema.index({ predictionId: 1 }, { unique: true });
JobSchema.index({ status: 1 });
