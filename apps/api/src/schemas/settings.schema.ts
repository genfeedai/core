import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, type HydratedDocument } from 'mongoose';

export type SettingsDocument = HydratedDocument<Settings>;

// Default model settings for node types
@Schema({ _id: false })
class NodeDefaults {
  // Image generation defaults
  @Prop({ default: 'nano-banana-pro' })
  imageModel: string;

  @Prop({ default: 'replicate' })
  imageProvider: string;

  @Prop({ default: '1:1' })
  imageAspectRatio: string;

  @Prop({ default: '2K' })
  imageResolution: string;

  // Video generation defaults
  @Prop({ default: 'veo-3.1' })
  videoModel: string;

  @Prop({ default: 'replicate' })
  videoProvider: string;

  @Prop({ default: '16:9' })
  videoAspectRatio: string;

  @Prop({ default: 8 })
  videoDuration: number;

  // LLM defaults
  @Prop({ default: 'meta-llama-3.1-70b' })
  llmModel: string;

  @Prop({ default: 0.7 })
  llmTemperature: number;

  @Prop({ default: 1024 })
  llmMaxTokens: number;

  // TTS defaults
  @Prop({ default: 'elevenlabs' })
  ttsProvider: string;

  @Prop({ default: 'rachel' })
  ttsVoice: string;
}

// UI preferences
@Schema({ _id: false })
class UiPreferences {
  @Prop({ default: 'default' })
  edgeStyle: string;

  @Prop({ default: true })
  showMinimap: boolean;

  @Prop({ default: false })
  hasSeenWelcome: boolean;
}

// Create schemas for nested documents
const NodeDefaultsSchema = SchemaFactory.createForClass(NodeDefaults);
const UiPreferencesSchema = SchemaFactory.createForClass(UiPreferences);

@Schema({ collection: 'settings', timestamps: true })
export class Settings extends Document {
  // User identifier (could be anonymous session ID or authenticated user ID)
  @Prop({ index: true, required: true, unique: true })
  userId: string;

  // Node defaults
  @Prop({ default: {}, type: NodeDefaultsSchema })
  nodeDefaults: NodeDefaults;

  // UI preferences
  @Prop({ default: {}, type: UiPreferencesSchema })
  uiPreferences: UiPreferences;

  // Recent models (for model browser)
  @Prop({
    default: [],
    type: [
      {
        displayName: String,
        id: String,
        provider: String,
        timestamp: Number,
      },
    ],
  })
  recentModels: Array<{
    id: string;
    displayName: string;
    provider: string;
    timestamp: number;
  }>;

  createdAt: Date;
  updatedAt: Date;
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);
