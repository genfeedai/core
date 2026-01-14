import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, HydratedDocument } from "mongoose";

export type WorkflowDocument = HydratedDocument<Workflow>;

// Node position type
class Position {
  @Prop({ required: true })
  x: number;

  @Prop({ required: true })
  y: number;
}

// Workflow node (embedded document)
@Schema({ _id: false })
class WorkflowNode {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  type: string;

  @Prop({ type: Object, required: true })
  position: Position;

  @Prop({ type: Object, required: true })
  data: Record<string, unknown>;
}

// Workflow edge (embedded document)
@Schema({ _id: false })
class WorkflowEdge {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  source: string;

  @Prop({ required: true })
  target: string;

  @Prop()
  sourceHandle?: string;

  @Prop()
  targetHandle?: string;

  @Prop()
  type?: string;
}

@Schema({ timestamps: true, collection: "workflows" })
export class Workflow extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ default: "" })
  description: string;

  @Prop({ default: 1 })
  version: number;

  @Prop({ type: [Object], default: [] })
  nodes: WorkflowNode[];

  @Prop({ type: [Object], default: [] })
  edges: WorkflowEdge[];

  @Prop({ default: "smoothstep" })
  edgeStyle: string;

  @Prop({ default: false })
  isDeleted: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const WorkflowSchema = SchemaFactory.createForClass(Workflow);

// Indexes
WorkflowSchema.index({ isDeleted: 1 });
WorkflowSchema.index({ name: "text", description: "text" });
