import { exec } from 'node:child_process';
import { mkdir, readFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ExecutionsService } from '@/services/executions.service';

const execAsync = promisify(exec);

export interface FrameExtractInput {
  video: string;
  selectionMode: 'first' | 'last' | 'timestamp' | 'percentage';
  timestampSeconds?: number;
  percentagePosition?: number;
  videoDuration?: number;
}

export interface FrameExtractResult {
  imageUrl: string;
}

export interface ReplaceAudioInput {
  video: string;
  audio: string;
  preserveOriginalAudio?: boolean;
  audioMixLevel?: number;
}

export interface ReplaceAudioResult {
  videoUrl: string;
}

export interface SubtitleInput {
  video: string;
  text: string;
  style: 'default' | 'modern' | 'minimal' | 'bold';
  position: 'top' | 'center' | 'bottom';
  fontSize: number;
  fontColor: string;
  backgroundColor: string | null;
  fontFamily: string;
}

export interface SubtitleResult {
  videoUrl: string;
}

export interface StitchVideosInput {
  videos: string[];
  transitionType: 'cut' | 'crossfade' | 'wipe' | 'fade';
  transitionDuration: number;
  seamlessLoop: boolean;
  audioCodec: 'aac' | 'mp3';
  outputQuality: 'full' | 'draft';
}

export interface StitchVideosResult {
  videoUrl: string;
}

export interface ImageToVideoInput {
  image: string;
  duration: number; // seconds
}

export interface ImageToVideoResult {
  videoUrl: string;
}

@Injectable()
export class FFmpegService {
  private readonly logger = new Logger(FFmpegService.name);
  private readonly tempDir = join(tmpdir(), 'genfeed-ffmpeg');

  constructor(
    @Inject(forwardRef(() => ExecutionsService))
    private readonly executionsService: ExecutionsService
  ) {}

  /**
   * Helper to run FFmpeg operation with temp file cleanup
   */
  private async withTempFiles<T>(tempFiles: string[], operation: () => Promise<T>): Promise<T> {
    await mkdir(this.tempDir, { recursive: true });
    try {
      return await operation();
    } finally {
      await Promise.all(tempFiles.map((f) => unlink(f).catch(() => {})));
    }
  }

  /**
   * Helper to handle FFmpeg errors consistently
   */
  private async handleFFmpegError(
    executionId: string,
    nodeId: string,
    error: unknown,
    context: string
  ): Promise<never> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Failed to ${context} for node ${nodeId}: ${errorMessage}`);

    await this.executionsService.updateNodeResult(
      executionId,
      nodeId,
      'error',
      undefined,
      errorMessage
    );

    throw error;
  }

  /**
   * Extract a frame from a video using FFmpeg
   */
  async extractFrame(
    executionId: string,
    nodeId: string,
    input: FrameExtractInput
  ): Promise<FrameExtractResult> {
    this.logger.log(`Extracting ${input.selectionMode} frame for node ${nodeId}`);

    const outputPath = join(this.tempDir, `frame-${nodeId}-${Date.now()}.jpg`);

    return this.withTempFiles([outputPath], async () => {
      try {
        const ffmpegCmd = this.buildFrameExtractCommand(input, outputPath);
        this.logger.debug(`Running FFmpeg: ${ffmpegCmd}`);

        const { stderr } = await execAsync(ffmpegCmd, { timeout: 60000 });

        if (stderr?.includes('Error')) {
          this.logger.warn(`FFmpeg stderr: ${stderr}`);
        }

        const imageBuffer = await readFile(outputPath);
        const imageDataUrl = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

        await this.executionsService.updateNodeResult(executionId, nodeId, 'complete', {
          image: imageDataUrl,
        });

        this.logger.log(`Frame extracted successfully for node ${nodeId}`);

        return { imageUrl: imageDataUrl };
      } catch (error) {
        return this.handleFFmpegError(executionId, nodeId, error, 'extract frame');
      }
    });
  }

  /**
   * Build FFmpeg command for frame extraction based on selection mode
   */
  private buildFrameExtractCommand(input: FrameExtractInput, outputPath: string): string {
    switch (input.selectionMode) {
      case 'first':
        return `ffmpeg -y -i "${input.video}" -vframes 1 -q:v 2 "${outputPath}"`;

      case 'timestamp':
        if (input.timestampSeconds !== undefined) {
          return `ffmpeg -y -ss ${input.timestampSeconds} -i "${input.video}" -vframes 1 -q:v 2 "${outputPath}"`;
        }
        return `ffmpeg -y -sseof -1 -i "${input.video}" -vframes 1 -q:v 2 "${outputPath}"`;

      case 'percentage':
        if (input.percentagePosition !== undefined && input.videoDuration !== undefined) {
          const seekTime = (input.percentagePosition / 100) * input.videoDuration;
          return `ffmpeg -y -ss ${seekTime} -i "${input.video}" -vframes 1 -q:v 2 "${outputPath}"`;
        }
        return `ffmpeg -y -sseof -1 -i "${input.video}" -vframes 1 -q:v 2 "${outputPath}"`;

      default:
        return `ffmpeg -y -sseof -1 -i "${input.video}" -vframes 1 -q:v 2 "${outputPath}"`;
    }
  }

  /**
   * Replace or mix audio in a video using FFmpeg
   */
  async replaceAudio(
    executionId: string,
    nodeId: string,
    input: ReplaceAudioInput
  ): Promise<ReplaceAudioResult> {
    const action = input.preserveOriginalAudio ? 'Mixing' : 'Replacing';
    this.logger.log(`${action} audio for node ${nodeId}`);

    const outputPath = join(this.tempDir, `video-${nodeId}-${Date.now()}.mp4`);

    return this.withTempFiles([outputPath], async () => {
      try {
        const ffmpegCmd = this.buildReplaceAudioCommand(input, outputPath);
        this.logger.debug(`Running FFmpeg: ${ffmpegCmd}`);

        const { stderr } = await execAsync(ffmpegCmd, { timeout: 300000 });

        if (stderr?.includes('Error')) {
          this.logger.warn(`FFmpeg stderr: ${stderr}`);
        }

        const videoBuffer = await readFile(outputPath);
        const videoDataUrl = `data:video/mp4;base64,${videoBuffer.toString('base64')}`;

        await this.executionsService.updateNodeResult(executionId, nodeId, 'complete', {
          video: videoDataUrl,
        });

        this.logger.log(`Audio replaced successfully for node ${nodeId}`);

        return { videoUrl: videoDataUrl };
      } catch (error) {
        return this.handleFFmpegError(executionId, nodeId, error, 'replace audio');
      }
    });
  }

  /**
   * Build FFmpeg command for audio replacement/mixing
   */
  private buildReplaceAudioCommand(input: ReplaceAudioInput, outputPath: string): string {
    if (input.preserveOriginalAudio && input.audioMixLevel !== undefined) {
      const originalVolume = 1 - input.audioMixLevel;
      const newVolume = input.audioMixLevel;
      return `ffmpeg -y -i "${input.video}" -i "${input.audio}" -filter_complex "[0:a]volume=${originalVolume}[a1];[1:a]volume=${newVolume}[a2];[a1][a2]amix=inputs=2:duration=first[aout]" -map 0:v -map "[aout]" -c:v copy -c:a aac "${outputPath}"`;
    }
    return `ffmpeg -y -i "${input.video}" -i "${input.audio}" -map 0:v -map 1:a -c:v copy -c:a aac -shortest "${outputPath}"`;
  }

  /**
   * Burn subtitles into video using FFmpeg drawtext filter
   */
  async addSubtitles(
    executionId: string,
    nodeId: string,
    input: SubtitleInput
  ): Promise<SubtitleResult> {
    this.logger.log(`Adding subtitles for node ${nodeId}`);

    const timestamp = Date.now();
    const outputPath = join(this.tempDir, `subtitle-${nodeId}-${timestamp}.mp4`);
    const subtitlePath = join(this.tempDir, `subtitle-${nodeId}-${timestamp}.srt`);

    return this.withTempFiles([outputPath, subtitlePath], async () => {
      try {
        const { writeFile } = await import('node:fs/promises');
        await writeFile(subtitlePath, this.textToSrt(input.text), 'utf-8');

        const { fontsize, fontcolor, boxcolor, yPosition } = this.getSubtitleStyle(input);
        const escapedSubtitlePath = subtitlePath.replace(/'/g, "'\\''").replace(/:/g, '\\:');

        const ffmpegCmd = `ffmpeg -y -i "${input.video}" -vf "subtitles='${escapedSubtitlePath}':force_style='FontSize=${fontsize},FontName=${input.fontFamily},PrimaryColour=${fontcolor},BackColour=${boxcolor},BorderStyle=4,Outline=0,Shadow=0,MarginV=${yPosition}'" -c:a copy "${outputPath}"`;

        this.logger.debug(`Running FFmpeg: ${ffmpegCmd}`);

        const { stderr } = await execAsync(ffmpegCmd, { timeout: 600000 });

        if (stderr?.includes('Error') && !stderr.includes('deprecated')) {
          this.logger.warn(`FFmpeg stderr: ${stderr}`);
        }

        const videoBuffer = await readFile(outputPath);
        const videoDataUrl = `data:video/mp4;base64,${videoBuffer.toString('base64')}`;

        await this.executionsService.updateNodeResult(executionId, nodeId, 'complete', {
          video: videoDataUrl,
        });

        this.logger.log(`Subtitles added successfully for node ${nodeId}`);

        return { videoUrl: videoDataUrl };
      } catch (error) {
        return this.handleFFmpegError(executionId, nodeId, error, 'add subtitles');
      }
    });
  }

  /**
   * Convert plain text to SRT subtitle format
   * Each line becomes a subtitle entry
   */
  private textToSrt(text: string): string {
    const lines = text.split('\n').filter((line) => line.trim());
    const srtLines: string[] = [];

    // Assume ~3 seconds per line of text
    const secondsPerLine = 3;

    lines.forEach((line, index) => {
      const startTime = index * secondsPerLine;
      const endTime = startTime + secondsPerLine;

      srtLines.push(`${index + 1}`);
      srtLines.push(`${this.formatSrtTime(startTime)} --> ${this.formatSrtTime(endTime)}`);
      srtLines.push(line.trim());
      srtLines.push('');
    });

    return srtLines.join('\n');
  }

  /**
   * Format seconds to SRT time format (HH:MM:SS,mmm)
   */
  private formatSrtTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${millis.toString().padStart(3, '0')}`;
  }

  /**
   * Get subtitle style parameters for FFmpeg
   */
  private getSubtitleStyle(input: SubtitleInput): {
    fontsize: number;
    fontcolor: string;
    boxcolor: string;
    yPosition: number;
  } {
    // Convert hex color to ASS color format (&HAABBGGRR)
    const hexToAssColor = (hex: string): string => {
      const clean = hex.replace('#', '');
      const r = clean.substring(0, 2);
      const g = clean.substring(2, 4);
      const b = clean.substring(4, 6);
      return `&H00${b}${g}${r}`;
    };

    // Parse background color
    let boxcolor = '&H80000000'; // Default semi-transparent black
    if (input.backgroundColor) {
      const rgba = input.backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (rgba) {
        const r = Number.parseInt(rgba[1], 10).toString(16).padStart(2, '0');
        const g = Number.parseInt(rgba[2], 10).toString(16).padStart(2, '0');
        const b = Number.parseInt(rgba[3], 10).toString(16).padStart(2, '0');
        const a = rgba[4]
          ? Math.round(Number.parseFloat(rgba[4]) * 255)
              .toString(16)
              .padStart(2, '0')
          : '80';
        boxcolor = `&H${a}${b}${g}${r}`;
      }
    }

    // Calculate Y position based on position setting
    let yPosition = 20; // Default for bottom
    if (input.position === 'top') {
      yPosition = 400;
    } else if (input.position === 'center') {
      yPosition = 200;
    }

    // Apply style multipliers
    let fontsize = input.fontSize;
    if (input.style === 'bold') {
      fontsize = Math.round(fontsize * 1.2);
    } else if (input.style === 'minimal') {
      fontsize = Math.round(fontsize * 0.9);
    }

    return {
      boxcolor,
      fontcolor: hexToAssColor(input.fontColor),
      fontsize,
      yPosition,
    };
  }

  /**
   * Stitch multiple videos together with transitions
   */
  async stitchVideos(
    executionId: string,
    nodeId: string,
    input: StitchVideosInput
  ): Promise<StitchVideosResult> {
    this.logger.log(
      `Stitching ${input.videos.length} videos with ${input.transitionType} transition for node ${nodeId}`
    );

    const timestamp = Date.now();
    const outputPath = join(this.tempDir, `stitch-${nodeId}-${timestamp}.mp4`);
    const concatFilePath = join(this.tempDir, `concat-${nodeId}-${timestamp}.txt`);

    return this.withTempFiles([outputPath, concatFilePath], async () => {
      try {
        const ffmpegCmd = await this.buildStitchCommand(input, outputPath, concatFilePath);
        this.logger.debug(`Running FFmpeg stitch: ${ffmpegCmd}`);

        const { stderr } = await execAsync(ffmpegCmd, { timeout: 600000 });

        if (stderr?.includes('Error') && !stderr.includes('deprecated')) {
          this.logger.warn(`FFmpeg stderr: ${stderr}`);
        }

        const videoBuffer = await readFile(outputPath);
        const videoDataUrl = `data:video/mp4;base64,${videoBuffer.toString('base64')}`;

        await this.executionsService.updateNodeResult(executionId, nodeId, 'complete', {
          video: videoDataUrl,
        });

        this.logger.log(`Videos stitched successfully for node ${nodeId}`);

        return { videoUrl: videoDataUrl };
      } catch (error) {
        return this.handleFFmpegError(executionId, nodeId, error, 'stitch videos');
      }
    });
  }

  /**
   * Build FFmpeg command for video stitching with transitions
   */
  private async buildStitchCommand(
    input: StitchVideosInput,
    outputPath: string,
    concatFilePath: string
  ): Promise<string> {
    const qualitySettings =
      input.outputQuality === 'draft'
        ? '-vf scale=1280:720:flags=lanczos -b:v 4M -maxrate 4M -bufsize 8M'
        : '-vf scale=-2:1080:flags=lanczos -crf 18';

    const audioCodec = input.audioCodec === 'mp3' ? 'libmp3lame -q:a 2' : 'aac -b:a 192k';
    const frameRateSettings = input.outputQuality === 'draft' ? '-r 30' : '';

    if (input.transitionType === 'cut') {
      const { writeFile } = await import('node:fs/promises');
      const concatContent = input.videos.map((v) => `file '${v}'`).join('\n');
      await writeFile(concatFilePath, concatContent, 'utf-8');

      return `ffmpeg -y -f concat -safe 0 -i "${concatFilePath}" ${qualitySettings} ${frameRateSettings} -c:a ${audioCodec} "${outputPath}"`;
    }

    const filterComplex = this.buildTransitionFilter(input);
    const inputArgs = input.videos.map((v) => `-i "${v}"`).join(' ');

    return `ffmpeg -y ${inputArgs} -filter_complex "${filterComplex}" -map "[vout]" -map "[aout]" ${qualitySettings} ${frameRateSettings} -c:a ${audioCodec} "${outputPath}"`;
  }

  /**
   * Build FFmpeg xfade filter for video transitions
   */
  private buildTransitionFilter(input: StitchVideosInput): string {
    const filterParts: string[] = [];
    const videoCount = input.videos.length;
    const totalTransitions = input.seamlessLoop ? videoCount : videoCount - 1;

    const xfadeTransition = this.getXfadeTransition(input.transitionType);

    for (let i = 0; i < totalTransitions; i++) {
      const toIdx = input.seamlessLoop && i === videoCount - 1 ? 0 : i + 1;
      const fromStream = i === 0 ? `[${i}:v]` : `[v${i - 1}]`;
      const outStream = i === totalTransitions - 1 ? '[vout]' : `[v${i}]`;

      filterParts.push(
        `${fromStream}[${toIdx}:v]xfade=transition=${xfadeTransition}:duration=${input.transitionDuration}:offset=0${outStream}`
      );
    }

    const audioInputs = input.videos.map((_, i) => `[${i}:a]`).join('');
    filterParts.push(`${audioInputs}concat=n=${videoCount}:v=0:a=1[aout]`);

    return filterParts.join(';');
  }

  /**
   * Map transition type to FFmpeg xfade transition name
   */
  private getXfadeTransition(type: StitchVideosInput['transitionType']): string {
    switch (type) {
      case 'crossfade':
        return 'fade';
      case 'fade':
        return 'fadeblack';
      case 'wipe':
        return 'wipeleft';
      default:
        return 'fade';
    }
  }

  /**
   * Convert a static image to a video of specified duration.
   * Used for APIs that require video input (e.g., Sync Labs lip sync).
   */
  async imageToVideo(input: ImageToVideoInput): Promise<ImageToVideoResult> {
    this.logger.log(`Converting image to ${input.duration}s video`);

    const timestamp = Date.now();
    const imagePath = join(this.tempDir, `img-${timestamp}.jpg`);
    const outputPath = join(this.tempDir, `img-video-${timestamp}.mp4`);

    await mkdir(this.tempDir, { recursive: true });

    return this.withTempFiles([imagePath, outputPath], async () => {
      try {
        // Write base64 image to temp file
        const { writeFile } = await import('node:fs/promises');
        const base64Match = input.image.match(/^data:image\/\w+;base64,(.+)$/);
        if (!base64Match) {
          throw new Error('Invalid image format - expected base64 data URL');
        }
        const imageBuffer = Buffer.from(base64Match[1], 'base64');
        await writeFile(imagePath, imageBuffer);

        // Create video from static image with silent audio
        // -loop 1: loop the image
        // -t: duration in seconds
        // -f lavfi -i anullsrc: silent audio source
        // -pix_fmt yuv420p: compatibility format
        // -shortest: end when shortest input ends
        const ffmpegCmd = `ffmpeg -y -loop 1 -i "${imagePath}" -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -c:v libx264 -t ${input.duration} -pix_fmt yuv420p -c:a aac -shortest "${outputPath}"`;

        this.logger.debug(`Running FFmpeg: ${ffmpegCmd}`);
        await execAsync(ffmpegCmd, { timeout: 60000 });

        const videoBuffer = await readFile(outputPath);
        const videoDataUrl = `data:video/mp4;base64,${videoBuffer.toString('base64')}`;

        this.logger.log(`Image converted to video successfully`);

        return { videoUrl: videoDataUrl };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to convert image to video: ${errorMessage}`);
        throw error;
      }
    });
  }
}
