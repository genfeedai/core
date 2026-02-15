import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Settings, type SettingsDocument } from '@/schemas/settings.schema';

// DTO types for settings updates
export interface NodeDefaultsDto {
  imageModel?: string;
  imageProvider?: string;
  imageAspectRatio?: string;
  imageResolution?: string;
  videoModel?: string;
  videoProvider?: string;
  videoAspectRatio?: string;
  videoDuration?: number;
  llmModel?: string;
  llmTemperature?: number;
  llmMaxTokens?: number;
  ttsProvider?: string;
  ttsVoice?: string;
}

export interface UiPreferencesDto {
  edgeStyle?: string;
  showMinimap?: boolean;
  hasSeenWelcome?: boolean;
}

export interface RecentModelDto {
  id: string;
  displayName: string;
  provider: string;
}

export interface UpdateSettingsDto {
  nodeDefaults?: NodeDefaultsDto;
  uiPreferences?: UiPreferencesDto;
}

const MAX_RECENT_MODELS = 8;

@Injectable()
export class SettingsService {
  constructor(@InjectModel(Settings.name) private settingsModel: Model<SettingsDocument>) {}

  /**
   * Get settings for a user, creating default settings if they don't exist
   */
  async getSettings(userId: string): Promise<SettingsDocument> {
    let settings = await this.settingsModel.findOne({ userId });

    if (!settings) {
      settings = await this.settingsModel.create({
        nodeDefaults: {},
        recentModels: [],
        uiPreferences: {},
        userId,
      });
    }

    return settings;
  }

  /**
   * Update node defaults for a user
   */
  async updateNodeDefaults(userId: string, defaults: NodeDefaultsDto): Promise<SettingsDocument> {
    const settings = await this.getSettings(userId);

    // Merge with existing defaults
    settings.nodeDefaults = {
      ...settings.nodeDefaults,
      ...defaults,
    };

    await settings.save();
    return settings;
  }

  /**
   * Update UI preferences for a user
   */
  async updateUiPreferences(
    userId: string,
    preferences: UiPreferencesDto
  ): Promise<SettingsDocument> {
    const settings = await this.getSettings(userId);

    // Merge with existing preferences
    settings.uiPreferences = {
      ...settings.uiPreferences,
      ...preferences,
    };

    await settings.save();
    return settings;
  }

  /**
   * Update multiple settings at once
   */
  async updateSettings(userId: string, updates: UpdateSettingsDto): Promise<SettingsDocument> {
    const settings = await this.getSettings(userId);

    if (updates.nodeDefaults) {
      settings.nodeDefaults = {
        ...settings.nodeDefaults,
        ...updates.nodeDefaults,
      };
    }

    if (updates.uiPreferences) {
      settings.uiPreferences = {
        ...settings.uiPreferences,
        ...updates.uiPreferences,
      };
    }

    await settings.save();
    return settings;
  }

  /**
   * Add a model to recent models list
   */
  async addRecentModel(userId: string, model: RecentModelDto): Promise<SettingsDocument> {
    const settings = await this.getSettings(userId);

    // Remove existing entry for same model
    const filtered = settings.recentModels.filter(
      (m) => !(m.id === model.id && m.provider === model.provider)
    );

    // Add to front with timestamp
    settings.recentModels = [{ ...model, timestamp: Date.now() }, ...filtered].slice(
      0,
      MAX_RECENT_MODELS
    );

    await settings.save();
    return settings;
  }

  /**
   * Clear recent models list
   */
  async clearRecentModels(userId: string): Promise<SettingsDocument> {
    const settings = await this.getSettings(userId);
    settings.recentModels = [];
    await settings.save();
    return settings;
  }

  /**
   * Reset settings to defaults
   */
  async resetSettings(userId: string): Promise<SettingsDocument> {
    await this.settingsModel.deleteOne({ userId });
    return this.getSettings(userId); // Creates fresh defaults
  }
}
