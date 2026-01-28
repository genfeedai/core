import { PROMPT_CATEGORIES, type PromptCategory } from '@genfeedai/types';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, type HydratedDocument } from 'mongoose';

export type PromptLibraryItemDocument = HydratedDocument<PromptLibraryItem>;

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

@Schema({ timestamps: true, collection: 'prompt-library-items' })
export class PromptLibraryItem extends Document {
  // Core prompt content
  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ required: true })
  promptText: string;

  // Style settings (embedded)
  @Prop({ type: Object, default: {} })
  styleSettings: StyleSettings;

  // Generation defaults
  @Prop()
  aspectRatio?: string;

  @Prop()
  preferredModel?: string;

  // Organization
  @Prop({ type: String, enum: PROMPT_CATEGORIES, default: 'custom' })
  category: PromptCategory;

  @Prop({ type: [String], default: [], index: true })
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

  // Soft delete
  @Prop({ default: false })
  isDeleted: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const PromptLibraryItemSchema = SchemaFactory.createForClass(PromptLibraryItem);
