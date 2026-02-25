import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, type HydratedDocument, Types } from 'mongoose';
import type { NodeOutput } from '@/interfaces/execution-types.interface';
import type { NodeJobData, WorkflowJobData } from '@/interfaces/job-data.interface';
import { JOB_STATUS, QUEUE_NAMES } from '@/queue/queue.constants';

export type QueueJobDocument = HydratedDocument<QueueJob>;

@Schema({ _id: false })
class JobLog {
  @Prop({ required: true })
  timestamp: Date;

  @Prop({ required: true })
  message: string;

  @Prop({ enum: ['info', 'warn', 'error', 'debug'], required: true })
  level: string;
}

@Schema({ collection: 'queue_jobs', timestamps: true })
export class QueueJob extends Document {
  @Prop({ required: true })
  bullJobId: string;

  @Prop({ enum: Object.values(QUEUE_NAMES), required: true })
  queueName: string;

  @Prop({ ref: 'Execution', required: true, type: Types.ObjectId })
  executionId: Types.ObjectId;

  @Prop({ required: true })
  nodeId: string;

  @Prop({
    default: JOB_STATUS.PENDING,
    enum: Object.values(JOB_STATUS),
    required: true,
  })
  status: string;

  @Prop({ required: true, type: Object })
  data: NodeJobData | WorkflowJobData;

  @Prop({ type: Object })
  result?: NodeOutput;

  @Prop()
  error?: string;

  @Prop({ default: 0 })
  attemptsMade: number;

  @Prop()
  processedAt?: Date;

  @Prop()
  finishedAt?: Date;

  @Prop()
  failedReason?: string;

  @Prop({ default: [], type: [Object] })
  logs: JobLog[];

  @Prop({ default: false })
  movedToDlq: boolean;

  /** Last heartbeat timestamp - updated during long-running polling operations */
  @Prop()
  lastHeartbeat?: Date;

  /** Number of times this job has been recovered from stalled state */
  @Prop({ default: 0 })
  recoveryCount: number;

  createdAt: Date;
  updatedAt: Date;
}

export const QueueJobSchema = SchemaFactory.createForClass(QueueJob);
