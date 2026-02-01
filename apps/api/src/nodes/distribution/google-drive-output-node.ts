import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseOutputNode, GeneratedVideo, DeliveryConfig, DeliveryResult } from './base-output-node';
import { google } from 'googleapis';

// Google Drive configuration
interface GoogleDriveConfig {
  enabled: boolean;
  folder_name?: string; // Custom folder name override
}

interface DriveFile {
  id: string;
  name: string;
  webViewLink: string;
  webContentLink: string;
  size?: string;
  parents?: string[];
}

@Injectable()
export class GoogleDriveOutputNode extends BaseOutputNode {
  readonly platform = 'google_drive';
  readonly enabled: boolean;

  private readonly credentialsPath: string;
  private drive: any;

  constructor(private readonly configService: ConfigService) {
    super();
    this.credentialsPath = this.configService.get<string>('GOOGLE_DRIVE_CREDENTIALS') || '';
    this.enabled = !!this.credentialsPath;

    if (!this.enabled) {
      this.logger.warn(
        'Google Drive output node disabled: GOOGLE_DRIVE_CREDENTIALS not configured'
      );
    } else {
      this.initializeDriveClient();
    }
  }

  async deliver(
    video: GeneratedVideo,
    config: DeliveryConfig,
    platformConfig: GoogleDriveConfig
  ): Promise<DeliveryResult> {
    if (!this.enabled) {
      return {
        platform: this.platform,
        success: false,
        error: 'Google Drive credentials not configured',
      };
    }

    try {
      // Download video buffer if not already available
      if (!video.buffer) {
        video.buffer = await this.downloadVideo(video.url);
      }

      // Create organized folder structure
      const folderPath = await this.createFolderStructure(config, platformConfig.folder_name);

      // Upload video to Google Drive
      const uploadResult = await this.uploadVideo(video, config, folderPath);

      // Create metadata file with generation details
      const metadataResult = await this.createMetadataFile(config, video, folderPath);

      return {
        platform: this.platform,
        success: true,
        results: [
          {
            type: 'video',
            file_id: uploadResult.id,
            file_name: uploadResult.name,
            view_url: uploadResult.webViewLink,
            download_url: uploadResult.webContentLink,
            size_bytes: parseInt(uploadResult.size || '0', 10),
            folder_path: folderPath,
          },
          {
            type: 'metadata',
            file_id: metadataResult.id,
            file_name: metadataResult.name,
            view_url: metadataResult.webViewLink,
          },
        ],
        delivered_count: 1,
        total_targets: 1,
      };
    } catch (error) {
      this.logger.error(`Google Drive upload failed: ${error.message}`);
      return {
        platform: this.platform,
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Initialize Google Drive client with service account credentials
   */
  private async initializeDriveClient(): Promise<void> {
    try {
      // Load service account credentials
      let credentials;
      if (this.credentialsPath.startsWith('{')) {
        // JSON string credentials
        credentials = JSON.parse(this.credentialsPath);
      } else {
        // File path to credentials
        const fs = await import('node:fs/promises');
        const credentialsContent = await fs.readFile(this.credentialsPath, 'utf8');
        credentials = JSON.parse(credentialsContent);
      }

      // Create JWT auth client
      const auth = new google.auth.JWT(
        credentials.client_email,
        undefined,
        credentials.private_key,
        ['https://www.googleapis.com/auth/drive.file']
      );

      // Initialize Drive API
      this.drive = google.drive({ version: 'v3', auth });
    } catch (error) {
      this.logger.error(`Failed to initialize Google Drive client: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create organized folder structure: UGC_Factory/YYYY-MM-DD/batch_id/
   */
  private async createFolderStructure(
    config: DeliveryConfig,
    customFolderName?: string
  ): Promise<string[]> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const rootFolderName = customFolderName || 'UGC_Factory';

    const folderPath = [rootFolderName, today, config.batch_id];
    let parentId = 'root';
    const createdFolderIds: string[] = [];

    for (const folderName of folderPath) {
      // Check if folder already exists
      const existingFolder = await this.findFolder(folderName, parentId);

      if (existingFolder) {
        parentId = existingFolder.id;
        createdFolderIds.push(existingFolder.id);
      } else {
        // Create new folder
        const newFolder = await this.createFolder(folderName, parentId);
        parentId = newFolder.id;
        createdFolderIds.push(newFolder.id);
      }
    }

    return createdFolderIds;
  }

  /**
   * Find existing folder by name and parent
   */
  private async findFolder(name: string, parentId: string): Promise<DriveFile | null> {
    try {
      const response = await this.drive.files.list({
        q: `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
      });

      return response.data.files?.[0] || null;
    } catch (error) {
      this.logger.warn(`Error finding folder ${name}: ${error.message}`);
      return null;
    }
  }

  /**
   * Create new folder
   */
  private async createFolder(name: string, parentId: string): Promise<DriveFile> {
    const response = await this.drive.files.create({
      requestBody: {
        name,
        parents: [parentId],
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id, name, webViewLink',
    });

    this.logger.log(`Created Google Drive folder: ${name}`);
    return response.data;
  }

  /**
   * Upload video file to Google Drive
   */
  private async uploadVideo(
    video: GeneratedVideo,
    config: DeliveryConfig,
    folderPath: string[]
  ): Promise<DriveFile> {
    const parentId = folderPath[folderPath.length - 1]; // Last folder in path

    // Generate descriptive filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${config.batch_id}_v${config.variation}_${config.format}_${timestamp}.${this.getFileExtension(video.url)}`;

    const response = await this.drive.files.create({
      requestBody: {
        name: filename,
        parents: [parentId],
        description: `UGC Factory generated video - Batch: ${config.batch_id}, Variation: ${config.variation}, Format: ${config.format}`,
      },
      media: {
        mimeType: 'video/mp4',
        body: video.buffer,
      },
      fields: 'id, name, webViewLink, webContentLink, size, parents',
    });

    this.logger.log(`Uploaded video to Google Drive: ${filename}`);
    return response.data;
  }

  /**
   * Create metadata file with generation details
   */
  private async createMetadataFile(
    config: DeliveryConfig,
    video: GeneratedVideo,
    folderPath: string[]
  ): Promise<DriveFile> {
    const parentId = folderPath[folderPath.length - 1];

    const metadata = {
      generation_info: {
        batch_id: config.batch_id,
        variation: config.variation,
        format: config.format,
        original_script: config.original_script,
        generated_at: new Date().toISOString(),
        platform: 'UGC Factory',
      },
      video_info: {
        filename: video.filename,
        original_url: video.url,
        width: video.width,
        height: video.height,
        duration: video.duration,
        size_bytes: video.buffer?.length,
      },
      folder_structure: {
        path: folderPath,
        description: 'Organized as: UGC_Factory/YYYY-MM-DD/batch_id/',
      },
    };

    const metadataBuffer = Buffer.from(JSON.stringify(metadata, null, 2), 'utf8');
    const metadataFilename = `${config.batch_id}_v${config.variation}_${config.format}_metadata.json`;

    const response = await this.drive.files.create({
      requestBody: {
        name: metadataFilename,
        parents: [parentId],
        description: `Metadata for UGC Factory video - ${config.batch_id}`,
      },
      media: {
        mimeType: 'application/json',
        body: metadataBuffer,
      },
      fields: 'id, name, webViewLink',
    });

    return response.data;
  }

  /**
   * Get folder URL for sharing
   */
  async getFolderUrl(folderId: string): Promise<string> {
    try {
      const response = await this.drive.files.get({
        fileId: folderId,
        fields: 'webViewLink',
      });

      return response.data.webViewLink;
    } catch (error) {
      this.logger.warn(`Error getting folder URL: ${error.message}`);
      return '';
    }
  }

  /**
   * Test Google Drive connection
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.enabled || !this.drive) {
        return false;
      }

      // Test by listing files (should return successfully even if empty)
      await this.drive.files.list({
        pageSize: 1,
        fields: 'files(id, name)',
      });

      return true;
    } catch (error) {
      this.logger.error(`Google Drive connection test failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get storage usage info
   */
  async getStorageInfo(): Promise<any> {
    try {
      const response = await this.drive.about.get({
        fields: 'storageQuota, user',
      });

      return {
        total: response.data.storageQuota?.limit,
        used: response.data.storageQuota?.usage,
        available: response.data.storageQuota?.limit
          ? parseInt(response.data.storageQuota.limit, 10) -
            parseInt(response.data.storageQuota.usage || '0', 10)
          : 'unlimited',
        user_email: response.data.user?.emailAddress,
      };
    } catch (error) {
      this.logger.warn(`Error getting storage info: ${error.message}`);
      return null;
    }
  }
}
