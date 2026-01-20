import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, type HydratedDocument } from 'mongoose';

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

// Node group (embedded document)
@Schema({ _id: false })
class NodeGroup {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ type: [String], default: [] })
  nodeIds: string[];

  @Prop({ default: false })
  isLocked: boolean;

  @Prop()
  color?: string;

  @Prop()
  collapsed?: boolean;
}

// Workflow interface input (embedded document)
@Schema({ _id: false })
class WorkflowInterfaceInput {
  @Prop({ required: true })
  nodeId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: ['image', 'video', 'text', 'audio', 'number'] })
  type: string;

  @Prop({ default: true })
  required: boolean;
}

// Workflow interface output (embedded document)
@Schema({ _id: false })
class WorkflowInterfaceOutput {
  @Prop({ required: true })
  nodeId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: ['image', 'video', 'text', 'audio', 'number'] })
  type: string;
}

// Workflow interface (computed from boundary nodes)
@Schema({ _id: false })
class WorkflowInterfaceSchema {
  @Prop({ type: [Object], default: [] })
  inputs: WorkflowInterfaceInput[];

  @Prop({ type: [Object], default: [] })
  outputs: WorkflowInterfaceOutput[];
}

@Schema({ timestamps: true, collection: 'workflows' })
export class Workflow extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: 1 })
  version: number;

  @Prop({ type: [Object], default: [] })
  nodes: WorkflowNode[];

  @Prop({ type: [Object], default: [] })
  edges: WorkflowEdge[];

  @Prop({ default: 'smoothstep' })
  edgeStyle: string;

  @Prop({ type: [Object], default: [] })
  groups: NodeGroup[];

  @Prop({ default: false, index: true })
  isDeleted: boolean;

  // Composition: computed interface from WorkflowInput/WorkflowOutput boundary nodes
  @Prop({ type: Object, default: { inputs: [], outputs: [] } })
  interface: WorkflowInterfaceSchema;

  // Composition: true if workflow has defined interface (inputs or outputs)
  @Prop({ default: false })
  isReusable: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const WorkflowSchema = SchemaFactory.createForClass(Workflow);
