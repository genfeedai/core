import { WorkflowTemplateCategory } from '@genfeedai/types';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, type HydratedDocument } from 'mongoose';

export type TemplateDocument = HydratedDocument<Template>;

@Schema({ collection: 'templates', timestamps: true })
export class Template extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ enum: Object.values(WorkflowTemplateCategory), required: true, type: String })
  category: WorkflowTemplateCategory;

  @Prop()
  thumbnail?: string;

  @Prop({ default: 1 })
  version: number;

  @Prop({ default: [], type: [Object] })
  nodes: Record<string, unknown>[];

  @Prop({ default: [], type: [Object] })
  edges: Record<string, unknown>[];

  @Prop({ default: 'smoothstep' })
  edgeStyle: string;

  @Prop({ default: false, index: true })
  isSystem: boolean;

  @Prop({ default: false })
  isDeleted: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const TemplateSchema = SchemaFactory.createForClass(Template);
