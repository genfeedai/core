import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Supported file types
 */
export type FileType = 'image' | 'video' | 'audio';

/**
 * Multer file interface (simplified)
 */
export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/**
 * Result of a file upload operation
 */
export interface FileUploadResult {
  filename: string;
  url: string;
  path: string;
  size: number;
  mimeType: string;
}

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly dataPath: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    // Data stored relative to project root in data/workflows/
    this.dataPath = join(process.cwd(), 'data', 'workflows');
    this.baseUrl = this.configService.get<string>('API_BASE_URL', 'http://localhost:3001');

    // Base directory will be created on first use per workflow
    this.ensureDirectoryExists(this.dataPath);
  }

  /**
   * Save a workflow input file (image, video, audio)
   * Files are stored in /data/workflows/{workflowId}/input/
   */
  async saveWorkflowInput(
    workflowId: string,
    file: MulterFile,
    fileType: FileType
  ): Promise<FileUploadResult> {
    // Create workflow-specific input directory
    const inputDir = join(this.dataPath, workflowId, 'input');
    this.ensureDirectoryExists(inputDir);

    // Generate unique filename using hash of content + timestamp
    const hash = createHash('md5').update(file.buffer).digest('hex').substring(0, 8);
    const timestamp = Date.now();
    const ext = this.getExtension(file.originalname, file.mimetype);
    const filename = `${fileType}-${timestamp}-${hash}${ext}`;

    // Write file to disk
    const filePath = join(inputDir, filename);
    writeFileSync(filePath, file.buffer);

    // Generate URL for accessing the file
    const url = `${this.baseUrl}/api/files/workflows/${workflowId}/input/${filename}`;

    this.logger.log(`Saved ${fileType} file: ${filename} for workflow ${workflowId}`);

    return {
      filename,
      url,
      path: filePath,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  /**
   * Save workflow output file from generation
   * Files are stored in /data/workflows/{workflowId}/output/
   */
  async saveWorkflowOutput(
    workflowId: string,
    nodeId: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<FileUploadResult> {
    // Create workflow-specific output directory
    const outputDir = join(this.dataPath, workflowId, 'output');
    this.ensureDirectoryExists(outputDir);

    // Generate filename: {nodeId}-{timestamp}.{ext}
    const timestamp = Date.now();
    const ext = this.getExtensionFromMimeType(mimeType);
    const filename = `${nodeId}-${timestamp}${ext}`;

    // Write file to disk
    const filePath = join(outputDir, filename);
    writeFileSync(filePath, buffer);

    // Generate URL for accessing the file
    const url = `${this.baseUrl}/api/files/workflows/${workflowId}/output/${filename}`;

    this.logger.log(`Saved output file: ${filename} for workflow ${workflowId}, node ${nodeId}`);

    return {
      filename,
      url,
      path: filePath,
      size: buffer.length,
      mimeType,
    };
  }

  /**
   * Download file from URL and save as workflow output
   * Used to persist generated files from Replicate
   */
  async downloadAndSaveOutput(
    workflowId: string,
    nodeId: string,
    remoteUrl: string
  ): Promise<FileUploadResult> {
    // Fetch the file from remote URL
    const response = await fetch(remoteUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    return this.saveWorkflowOutput(workflowId, nodeId, buffer, contentType);
  }

  /**
   * Get the file path for a workflow input file
   */
  getInputFilePath(workflowId: string, filename: string): string {
    return join(this.dataPath, workflowId, 'input', filename);
  }

  /**
   * Get the file path for a workflow output file
   */
  getOutputFilePath(workflowId: string, filename: string): string {
    return join(this.dataPath, workflowId, 'output', filename);
  }

  /**
   * Check if a file exists
   */
  fileExists(filePath: string): boolean {
    return existsSync(filePath);
  }

  /**
   * Ensure a directory exists, creating it if necessary
   */
  private ensureDirectoryExists(dirPath: string): void {
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
      this.logger.log(`Created directory: ${dirPath}`);
    }
  }

  /**
   * Convert a local file URL to a base64 data URI
   * Returns the original URL if it's not a local file or doesn't exist
   */
  urlToBase64(url: string): string {
    // Check if this is a local API file URL (new format)
    if (!url.includes('/api/files/workflows/')) {
      return url; // External URL, return as-is
    }

    // Extract workflowId and filename from URL
    // URL format: http://localhost:3001/api/files/workflows/{workflowId}/input/{filename}
    const match = url.match(/\/api\/files\/workflows\/([^/]+)\/input\/([^/]+)$/);
    if (!match) {
      this.logger.warn(`Could not parse local file URL: ${url}`);
      return url;
    }

    const [, workflowId, filename] = match;
    const filePath = this.getInputFilePath(workflowId, filename);

    if (!this.fileExists(filePath)) {
      this.logger.warn(`Local file not found: ${filePath}`);
      return url;
    }

    // Read file and convert to base64
    const buffer = readFileSync(filePath);
    const mimeType = this.getMimeTypeFromFilename(filename);
    const base64 = buffer.toString('base64');

    this.logger.debug(`Converted ${filename} to base64 (${Math.round(base64.length / 1024)}KB)`);

    return `data:${mimeType};base64,${base64}`;
  }

  /**
   * Convert multiple URLs to base64
   */
  urlsToBase64(urls: string[]): string[] {
    return urls.map((url) => this.urlToBase64(url));
  }

  /**
   * Get MIME type from filename
   */
  private getMimeTypeFromFilename(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      mp4: 'video/mp4',
      webm: 'video/webm',
      mov: 'video/quicktime',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
    };
    return mimeTypes[ext ?? ''] ?? 'application/octet-stream';
  }

  /**
   * Get file extension from filename or mime type
   */
  private getExtension(filename: string, mimeType: string): string {
    // Try to get from filename
    const extFromName = filename.substring(filename.lastIndexOf('.'));
    if (extFromName && extFromName !== filename) {
      return extFromName;
    }

    return this.getExtensionFromMimeType(mimeType);
  }

  /**
   * Get file extension from mime type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'video/quicktime': '.mov',
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
      'audio/ogg': '.ogg',
    };

    return mimeToExt[mimeType] ?? '';
  }
}
