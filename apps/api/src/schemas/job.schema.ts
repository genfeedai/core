import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, type HydratedDocument, Types } from 'mongoose';
import type { JobCostBreakdown } from '@/interfaces/cost.interface';
import { PREDICTION_STATUS } from '@/queue/queue.constants';

export type JobDocument = HydratedDocument<Job>;

@Schema({ timestamps: true, collection: 'jobs' })
export class Job extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Execution', required: true })
  executionId: Types.ObjectId;

  @Prop({ required: true })
  nodeId: string;

  @Prop({ required: true, unique: true })
  predictionId: string;

  @Prop({
    required: true,
    enum: Object.values(PREDICTION_STATUS),
    default: PREDICTION_STATUS.PENDING,
  })
  status: string;

  @Prop({ default: 0, min: 0, max: 100 })
  progress: number;

  @Prop({ type: Object })
  output?: Record<string, unknown>;

  @Prop()
  error?: string;

  @Prop({ default: 0 })
  cost: number;

  @Prop({ type: Object })
  costBreakdown?: JobCostBreakdown;

  @Prop()
  predictTime?: number; // From Replicate metrics (seconds)

  createdAt: Date;
  updatedAt: Date;
}

export const JobSchema = SchemaFactory.createForClass(Job);
