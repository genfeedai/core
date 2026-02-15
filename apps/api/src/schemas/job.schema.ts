import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, type HydratedDocument, Types } from 'mongoose';
import type { JobCostBreakdown } from '@/interfaces/cost.interface';
import type { NodeOutput } from '@/interfaces/execution-types.interface';
import { PREDICTION_STATUS } from '@/queue/queue.constants';

export type JobDocument = HydratedDocument<Job>;

@Schema({ collection: 'jobs', timestamps: true })
export class Job extends Document {
  @Prop({ ref: 'Execution', required: true, type: Types.ObjectId })
  executionId: Types.ObjectId;

  @Prop({ required: true })
  nodeId: string;

  @Prop({ required: true, unique: true })
  predictionId: string;

  @Prop({
    default: PREDICTION_STATUS.PENDING,
    enum: Object.values(PREDICTION_STATUS),
    required: true,
  })
  status: string;

  @Prop({ default: 0, max: 100, min: 0 })
  progress: number;

  @Prop({ type: Object })
  output?: NodeOutput;

  @Prop({ type: Object })
  result?: NodeOutput;

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
