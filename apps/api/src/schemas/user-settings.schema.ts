import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, type HydratedDocument } from 'mongoose';

export type UserSettingsDocument = HydratedDocument<UserSettings>;

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
  @Prop({ default: 'bezier' })
  edgeStyle: string;

  @Prop({ default: true })
  showMinimap: boolean;

  @Prop({ default: false })
  hasSeenWelcome: boolean;
}

// Create schemas for nested documents
const NodeDefaultsSchema = SchemaFactory.createForClass(NodeDefaults);
const UiPreferencesSchema = SchemaFactory.createForClass(UiPreferences);

@Schema({ timestamps: true, collection: 'user_settings' })
export class UserSettings extends Document {
  // User identifier (could be anonymous session ID or authenticated user ID)
  @Prop({ required: true, unique: true, index: true })
  userId: string;

  // Node defaults
  @Prop({ type: NodeDefaultsSchema, default: {} })
  nodeDefaults: NodeDefaults;

  // UI preferences
  @Prop({ type: UiPreferencesSchema, default: {} })
  uiPreferences: UiPreferences;

  // Recent models (for model browser)
  @Prop({
    type: [
      {
        id: String,
        displayName: String,
        provider: String,
        timestamp: Number,
      },
    ],
    default: [],
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

export const UserSettingsSchema = SchemaFactory.createForClass(UserSettings);
