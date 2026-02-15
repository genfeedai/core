import { PROMPT_CATEGORIES, type PromptCategory } from '@genfeedai/types';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, type HydratedDocument } from 'mongoose';

export type PromptDocument = HydratedDocument<Prompt>;

// Style settings embedded document
@Schema({ _id: false })
export class StyleSettings {
  @Prop()
  mood?: string; // cinematic, dreamy, gritty, ethereal, etc.

  @Prop()
  style?: string; // photorealistic, anime, 3d-render, oil-painting, etc.

  @Prop()
  camera?: string; // wide-angle, macro, telephoto, drone, etc.

  @Prop()
  lighting?: string; // golden-hour, studio, neon, natural, etc.

  @Prop()
  scene?: string; // indoor, outdoor, urban, nature, etc.
}

@Schema({ collection: 'prompts', timestamps: true })
export class Prompt extends Document {
  // Core prompt content
  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ required: true })
  promptText: string;

  // Style settings (embedded)
  @Prop({ default: {}, type: Object })
  styleSettings: StyleSettings;

  // Generation defaults
  @Prop()
  aspectRatio?: string;

  @Prop()
  preferredModel?: string;

  // Organization
  @Prop({ default: 'custom', enum: PROMPT_CATEGORIES, type: String })
  category: PromptCategory;

  @Prop({ default: [], index: true, type: [String] })
  tags: string[];

  // Preview thumbnail (URL or base64)
  @Prop()
  thumbnail?: string;

  // Usage stats
  @Prop({ default: 0 })
  useCount: number;

  // Featured flag (for curated prompts)
  @Prop({ default: false })
  isFeatured: boolean;

  // System prompt flag (for seeded prompts)
  @Prop({ default: false })
  isSystem: boolean;

  // Soft delete
  @Prop({ default: false })
  isDeleted: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const PromptSchema = SchemaFactory.createForClass(Prompt);
