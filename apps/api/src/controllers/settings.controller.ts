import { Body, Controller, Delete, Get, Headers, Post, Put } from '@nestjs/common';
import {
  type NodeDefaultsDto,
  type RecentModelDto,
  SettingsService,
  type UiPreferencesDto,
  type UpdateSettingsDto,
} from '@/services/settings.service';

// Helper to get user ID from headers (can be session ID or auth token)
function getUserId(headers: Record<string, string>): string {
  // In production, this would come from auth middleware
  // For now, use a header-based session ID or default
  return headers['x-session-id'] || headers['x-user-id'] || 'anonymous';
}

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * Get all settings for current user
   */
  @Get()
  async getSettings(@Headers() headers: Record<string, string>) {
    const userId = getUserId(headers);
    const settings = await this.settingsService.getSettings(userId);
    return {
      nodeDefaults: settings.nodeDefaults,
      uiPreferences: settings.uiPreferences,
      recentModels: settings.recentModels,
    };
  }

  /**
   * Update multiple settings at once
   */
  @Put()
  async updateSettings(
    @Headers() headers: Record<string, string>,
    @Body() body: UpdateSettingsDto
  ) {
    const userId = getUserId(headers);
    const settings = await this.settingsService.updateSettings(userId, body);
    return {
      nodeDefaults: settings.nodeDefaults,
      uiPreferences: settings.uiPreferences,
      recentModels: settings.recentModels,
    };
  }

  /**
   * Update node defaults only
   */
  @Put('node-defaults')
  async updateNodeDefaults(
    @Headers() headers: Record<string, string>,
    @Body() body: NodeDefaultsDto
  ) {
    const userId = getUserId(headers);
    const settings = await this.settingsService.updateNodeDefaults(userId, body);
    return settings.nodeDefaults;
  }

  /**
   * Update UI preferences only
   */
  @Put('ui-preferences')
  async updateUiPreferences(
    @Headers() headers: Record<string, string>,
    @Body() body: UiPreferencesDto
  ) {
    const userId = getUserId(headers);
    const settings = await this.settingsService.updateUiPreferences(userId, body);
    return settings.uiPreferences;
  }

  /**
   * Add a model to recent models
   */
  @Post('recent-models')
  async addRecentModel(@Headers() headers: Record<string, string>, @Body() body: RecentModelDto) {
    const userId = getUserId(headers);
    const settings = await this.settingsService.addRecentModel(userId, body);
    return settings.recentModels;
  }

  /**
   * Clear recent models
   */
  @Delete('recent-models')
  async clearRecentModels(@Headers() headers: Record<string, string>) {
    const userId = getUserId(headers);
    const settings = await this.settingsService.clearRecentModels(userId);
    return settings.recentModels;
  }

  /**
   * Reset all settings to defaults
   */
  @Delete()
  async resetSettings(@Headers() headers: Record<string, string>) {
    const userId = getUserId(headers);
    const settings = await this.settingsService.resetSettings(userId);
    return {
      nodeDefaults: settings.nodeDefaults,
      uiPreferences: settings.uiPreferences,
      recentModels: settings.recentModels,
    };
  }
}
