import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

/** Maximum file size for downloads (500MB) */
const MAX_DOWNLOAD_SIZE = 500 * 1024 * 1024;

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly dataPath: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    // Data stored at monorepo root: /data/workflows/
    // __dirname is apps/api/dist (webpack bundle), go up 3 levels to reach root
    const rootPath = join(__dirname, '..', '..', '..');
    this.dataPath = join(rootPath, 'data', 'workflows');
    this.baseUrl = this.configService.get<string>('API_BASE_URL', 'http://localhost:3001');

    // Base directory will be created on first use per workflow
    this.ensureDirectoryExists(this.dataPath);
  }

  /**
   * Save a workflow input file (image, video, audio)
   * Files are stored in /data/workflows/{workflowId}/input/
   *
   * Uses content-based MD5 hash for deduplication - identical files
   * are not re-written, saving disk space.
   */
  async saveWorkflowInput(
    workflowId: string,
    file: MulterFile,
    fileType: FileType
  ): Promise<FileUploadResult> {
    // Create workflow-specific input directory
    const inputDir = join(this.dataPath, workflowId, 'input');
    this.ensureDirectoryExists(inputDir);

    // Generate filename using full MD5 hash for content-based deduplication
    const hash = createHash('md5').update(file.buffer).digest('hex');
    const ext = this.getExtension(file.originalname, file.mimetype);
    const filename = `${fileType}-${hash}${ext}`;
    const filePath = join(inputDir, filename);

    // Only write if file doesn't already exist (deduplication)
    if (existsSync(filePath)) {
      this.logger.log(`Deduplicated ${fileType} file: ${filename} (already exists)`);
    } else {
      writeFileSync(filePath, file.buffer);
      this.logger.log(`Saved ${fileType} file: ${filename} for workflow ${workflowId}`);
    }

    // Generate URL for accessing the file
    const url = `${this.baseUrl}/api/files/workflows/${workflowId}/input/${filename}`;

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
   * @param predictionId - Optional Replicate prediction ID to use as filename (for tracking)
   */
  async saveWorkflowOutput(
    workflowId: string,
    nodeId: string,
    buffer: Buffer,
    mimeType: string,
    predictionId?: string
  ): Promise<FileUploadResult> {
    // Create workflow-specific output directory
    const outputDir = join(this.dataPath, workflowId, 'output');
    this.ensureDirectoryExists(outputDir);

    // Generate filename: use predictionId if provided (for Replicate tracking), otherwise nodeId-timestamp
    const ext = this.getExtensionFromMimeType(mimeType);
    const filename = predictionId ? `${predictionId}${ext}` : `${nodeId}-${Date.now()}${ext}`;

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
   * @param predictionId - Optional Replicate prediction ID to use as filename (for tracking against dashboard)
   * @param retries - Number of retry attempts (default: 3)
   */
  async downloadAndSaveOutput(
    workflowId: string,
    nodeId: string,
    remoteUrl: string,
    predictionId?: string,
    retries = 3
  ): Promise<FileUploadResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // First, check file size with HEAD request to avoid downloading oversized files
        const headResponse = await fetch(remoteUrl, {
          method: 'HEAD',
          headers: { 'User-Agent': 'Genfeed/1.0' },
        });

        if (headResponse.ok) {
          const contentLength = parseInt(headResponse.headers.get('content-length') || '0', 10);
          if (contentLength > MAX_DOWNLOAD_SIZE) {
            throw new Error(
              `File too large: ${Math.round(contentLength / 1024 / 1024)}MB exceeds ${Math.round(MAX_DOWNLOAD_SIZE / 1024 / 1024)}MB limit`
            );
          }
        }

        // Fetch the file from remote URL with User-Agent header
        const response = await fetch(remoteUrl, {
          headers: {
            'User-Agent': 'Genfeed/1.0',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Double-check content-length from actual response (HEAD might have been cached)
        const actualContentLength = parseInt(response.headers.get('content-length') || '0', 10);
        if (actualContentLength > MAX_DOWNLOAD_SIZE) {
          throw new Error(
            `File too large: ${Math.round(actualContentLength / 1024 / 1024)}MB exceeds ${Math.round(MAX_DOWNLOAD_SIZE / 1024 / 1024)}MB limit`
          );
        }

        const buffer = Buffer.from(await response.arrayBuffer());

        // Final size check after download (in case Content-Length was missing/wrong)
        if (buffer.length > MAX_DOWNLOAD_SIZE) {
          throw new Error(
            `Downloaded file too large: ${Math.round(buffer.length / 1024 / 1024)}MB exceeds ${Math.round(MAX_DOWNLOAD_SIZE / 1024 / 1024)}MB limit`
          );
        }

        if (buffer.length === 0) {
          throw new Error('Downloaded file is empty');
        }

        const contentType = response.headers.get('content-type') || 'application/octet-stream';

        return this.saveWorkflowOutput(workflowId, nodeId, buffer, contentType, predictionId);
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `Download attempt ${attempt}/${retries} failed for ${remoteUrl.substring(0, 80)}...: ${lastError.message}`
        );

        if (attempt < retries) {
          // Exponential backoff: 1s, 2s, 3s
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw lastError ?? new Error('Download failed after retries');
  }

  /**
   * Download and save multiple output files from remote URLs
   * Used when models like SeedDream 4.5 return multiple images
   * @param workflowId - Workflow ID for storage path
   * @param nodeId - Node ID for filename generation
   * @param remoteUrls - Array of remote URLs to download
   * @param predictionId - Optional base prediction ID (files will be indexed: {predictionId}-0, {predictionId}-1, etc.)
   * @returns Array of FileUploadResult for each saved file
   */
  async downloadAndSaveMultipleOutputs(
    workflowId: string,
    nodeId: string,
    remoteUrls: string[],
    predictionId?: string
  ): Promise<FileUploadResult[]> {
    const results: FileUploadResult[] = [];

    for (let i = 0; i < remoteUrls.length; i++) {
      const indexedId = predictionId ? `${predictionId}-${i}` : `${nodeId}-${Date.now()}-${i}`;
      const result = await this.downloadAndSaveOutput(workflowId, nodeId, remoteUrls[i], indexedId);
      results.push(result);
    }

    return results;
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
   * Convert a local file URL to a base64 data URI (sync version)
   * Returns the original URL if it's not a local file or doesn't exist
   * For remote URLs, use urlToBase64Async instead
   */
  urlToBase64(url: string): string {
    // Already base64? Return as-is
    if (url.startsWith('data:')) {
      return url;
    }

    // Check if this is a local API file URL
    if (!url.includes('/api/files/workflows/')) {
      this.logger.debug(`Not a local file URL, returning as-is: ${url.substring(0, 100)}...`);
      return url;
    }

    // Extract workflowId, type (input/output), and filename from URL
    // Format: http://localhost:3001/api/files/workflows/{workflowId}/{input|output}/{filename}
    const match = url.match(/\/api\/files\/workflows\/([^/]+)\/(input|output)\/([^/?#]+)/);
    if (!match) {
      this.logger.warn(`Could not parse local file URL: ${url}`);
      return url;
    }

    const [, workflowId, fileType, filename] = match;
    const filePath =
      fileType === 'input'
        ? this.getInputFilePath(workflowId, filename)
        : this.getOutputFilePath(workflowId, filename);

    this.logger.debug(
      `Converting to base64: workflowId=${workflowId}, type=${fileType}, filename=${filename}`
    );

    if (!this.fileExists(filePath)) {
      this.logger.warn(`Local file not found: ${filePath}`);
      return url;
    }

    // Read file and convert to base64
    const buffer = readFileSync(filePath);
    const mimeType = this.getMimeTypeFromFilename(filename);
    const base64 = buffer.toString('base64');

    this.logger.log(`Converted ${filename} to base64 (${Math.round(base64.length / 1024)}KB)`);

    return `data:${mimeType};base64,${base64}`;
  }

  /**
   * Convert any URL (local or remote) to a base64 data URI
   * Handles local files synchronously and fetches remote URLs
   */
  async urlToBase64Async(url: string): Promise<string> {
    // Already base64? Return as-is
    if (url.startsWith('data:')) {
      return url;
    }

    // Try local conversion first (fast path)
    if (url.includes('/api/files/workflows/')) {
      const localResult = this.urlToBase64(url);
      if (localResult.startsWith('data:')) {
        return localResult;
      }
    }

    // Remote URL - fetch and convert
    try {
      this.logger.debug(`Fetching remote URL for base64 conversion: ${url.substring(0, 100)}...`);

      // Check file size first with HEAD request
      const headResponse = await fetch(url, {
        method: 'HEAD',
        headers: { 'User-Agent': 'Genfeed/1.0' },
      });

      if (headResponse.ok) {
        const contentLength = parseInt(headResponse.headers.get('content-length') || '0', 10);
        if (contentLength > MAX_DOWNLOAD_SIZE) {
          this.logger.warn(
            `File too large for base64 conversion: ${Math.round(contentLength / 1024 / 1024)}MB exceeds limit`
          );
          return url;
        }
      }

      const response = await fetch(url, {
        headers: { 'User-Agent': 'Genfeed/1.0' },
      });

      if (!response.ok) {
        this.logger.warn(`Failed to fetch remote URL: HTTP ${response.status}`);
        return url;
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      // Check size after download
      if (buffer.length > MAX_DOWNLOAD_SIZE) {
        this.logger.warn(
          `Downloaded file too large for base64 conversion: ${Math.round(buffer.length / 1024 / 1024)}MB exceeds limit`
        );
        return url;
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const base64 = buffer.toString('base64');

      this.logger.log(
        `Converted remote URL to base64 (${Math.round(base64.length / 1024)}KB): ${url.substring(0, 60)}...`
      );

      return `data:${contentType};base64,${base64}`;
    } catch (error) {
      this.logger.warn(`Failed to convert remote URL to base64: ${(error as Error).message}`);
      return url;
    }
  }

  /**
   * Convert multiple URLs to base64 (async version for remote URLs)
   */
  async urlsToBase64Async(urls: string[]): Promise<string[]> {
    return Promise.all(urls.map((url) => this.urlToBase64Async(url)));
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
