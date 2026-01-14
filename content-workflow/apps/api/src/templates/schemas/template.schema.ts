import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, HydratedDocument } from "mongoose";

export type TemplateDocument = HydratedDocument<Template>;

@Schema({ timestamps: true, collection: "templates" })
export class Template extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ default: "" })
  description: string;

  @Prop({ required: true, enum: ["images", "video", "full-pipeline"] })
  category: string;

  @Prop()
  thumbnail?: string;

  @Prop({ default: 1 })
  version: number;

  @Prop({ type: [Object], default: [] })
  nodes: Record<string, unknown>[];

  @Prop({ type: [Object], default: [] })
  edges: Record<string, unknown>[];

  @Prop({ default: "smoothstep" })
  edgeStyle: string;

  @Prop({ default: false })
  isSystem: boolean; // Built-in templates vs user-created

  @Prop({ default: false })
  isDeleted: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const TemplateSchema = SchemaFactory.createForClass(Template);

// Indexes
TemplateSchema.index({ isDeleted: 1, category: 1 });
TemplateSchema.index({ isSystem: 1 });
TemplateSchema.index({ name: "text", description: "text" });
