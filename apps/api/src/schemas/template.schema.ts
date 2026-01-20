import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, type HydratedDocument } from 'mongoose';

export type TemplateDocument = HydratedDocument<Template>;

@Schema({ timestamps: true, collection: 'templates' })
export class Template extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ required: true, enum: ['images', 'video', 'full-pipeline'] })
  category: string;

  @Prop()
  thumbnail?: string;

  @Prop({ default: 1 })
  version: number;

  @Prop({ type: [Object], default: [] })
  nodes: Record<string, unknown>[];

  @Prop({ type: [Object], default: [] })
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
