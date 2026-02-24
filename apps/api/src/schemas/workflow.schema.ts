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

  @Prop({ required: true, type: Object })
  position: Position;

  @Prop({ required: true, type: Object })
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

  @Prop({ default: [], type: [String] })
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

  @Prop({ enum: ['image', 'video', 'text', 'audio', 'number'], required: true })
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

  @Prop({ enum: ['image', 'video', 'text', 'audio', 'number'], required: true })
  type: string;
}

// Workflow interface (computed from boundary nodes)
@Schema({ _id: false })
class WorkflowInterfaceSchema {
  @Prop({ default: [], type: [Object] })
  inputs: WorkflowInterfaceInput[];

  @Prop({ default: [], type: [Object] })
  outputs: WorkflowInterfaceOutput[];
}

@Schema({ collection: 'workflows', timestamps: true })
export class Workflow extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: 1 })
  version: number;

  @Prop({ default: [], type: [Object] })
  nodes: WorkflowNode[];

  @Prop({ default: [], type: [Object] })
  edges: WorkflowEdge[];

  @Prop({ default: 'smoothstep' })
  edgeStyle: string;

  @Prop({ default: [], type: [Object] })
  groups: NodeGroup[];

  @Prop({ default: false, index: true })
  isDeleted: boolean;

  @Prop({ default: [], index: true, type: [String] })
  tags: string[];

  // Composition: computed interface from WorkflowInput/WorkflowOutput boundary nodes
  @Prop({ default: { inputs: [], outputs: [] }, type: Object })
  interface: WorkflowInterfaceSchema;

  // Composition: true if workflow has defined interface (inputs or outputs)
  @Prop({ default: false })
  isReusable: boolean;

  // Thumbnail: URL of video/image to display as workflow preview
  @Prop({ default: null, type: String })
  thumbnail: string | null;

  // Thumbnail node ID: which node's output is used as thumbnail
  @Prop({ default: null, type: String })
  thumbnailNodeId: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export const WorkflowSchema = SchemaFactory.createForClass(Workflow);
