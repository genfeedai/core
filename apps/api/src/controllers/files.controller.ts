import { createReadStream } from 'node:fs';
import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import {
  FilesService,
  type FileType,
  type FileUploadResult,
  type MulterFile,
} from '@/services/files.service';

/**
 * Get MIME type from filename extension
 */
function getMimeType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  const mimeTypes: Record<string, string> = {
    gif: 'image/gif',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    mov: 'video/quicktime',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
    ogg: 'audio/ogg',
    png: 'image/png',
    wav: 'audio/wav',
    webm: 'video/webm',
    webp: 'image/webp',
  };
  return mimeTypes[ext ?? ''] ?? 'application/octet-stream';
}

/**
 * Maximum file sizes by type (in bytes)
 */
const MAX_FILE_SIZES: Record<FileType, number> = {
  audio: 50 * 1024 * 1024, // 50MB
  image: 20 * 1024 * 1024, // 20MB
  video: 200 * 1024 * 1024, // 200MB
};

/**
 * Allowed MIME types by file type
 */
const ALLOWED_MIME_TYPES: Record<FileType, string[]> = {
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3'],
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
};

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  /**
   * Upload a workflow input file (image, video, or audio)
   * POST /api/files/workflows/:workflowId/input/:fileType
   */
  @Post('workflows/:workflowId/input/:fileType')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 200 * 1024 * 1024, // 200MB max (largest allowed)
      },
    })
  )
  async uploadWorkflowInput(
    @Param('workflowId') workflowId: string,
    @Param('fileType') fileType: string,
    @UploadedFile() file: MulterFile
  ): Promise<FileUploadResult> {
    // Validate file type parameter
    if (!['image', 'video', 'audio'].includes(fileType)) {
      throw new BadRequestException('Invalid file type. Must be: image, video, or audio');
    }

    const typedFileType = fileType as FileType;

    // Validate file was uploaded
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate MIME type
    const allowedTypes = ALLOWED_MIME_TYPES[typedFileType];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types for ${fileType}: ${allowedTypes.join(', ')}`
      );
    }

    // Validate file size
    const maxSize = MAX_FILE_SIZES[typedFileType];
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File too large. Maximum size for ${fileType}: ${maxSize / (1024 * 1024)}MB`
      );
    }

    // Save the file
    return this.filesService.saveWorkflowInput(workflowId, file, typedFileType);
  }

  /**
   * Serve a workflow input file
   * GET /api/files/workflows/:workflowId/input/:filename
   */
  @Get('workflows/:workflowId/input/:filename')
  async serveInputFile(
    @Param('workflowId') workflowId: string,
    @Param('filename') filename: string,
    @Res() res: Response
  ): Promise<void> {
    const filePath = this.filesService.getInputFilePath(workflowId, filename);

    if (!this.filesService.fileExists(filePath)) {
      throw new NotFoundException('File not found');
    }

    const mimeType = getMimeType(filename);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache

    const stream = createReadStream(filePath);
    stream.pipe(res);
  }

  /**
   * Serve a workflow output file
   * GET /api/files/workflows/:workflowId/output/:filename
   */
  @Get('workflows/:workflowId/output/:filename')
  async serveOutputFile(
    @Param('workflowId') workflowId: string,
    @Param('filename') filename: string,
    @Res() res: Response
  ): Promise<void> {
    const filePath = this.filesService.getOutputFilePath(workflowId, filename);

    if (!this.filesService.fileExists(filePath)) {
      throw new NotFoundException('File not found');
    }

    const mimeType = getMimeType(filename);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache

    const stream = createReadStream(filePath);
    stream.pipe(res);
  }
}
