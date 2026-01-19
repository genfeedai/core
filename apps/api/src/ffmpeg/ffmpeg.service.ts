import { exec } from 'node:child_process';
import { mkdir, readFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ExecutionsService } from '../executions/executions.service';

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

@Injectable()
export class FFmpegService {
  private readonly logger = new Logger(FFmpegService.name);

  constructor(
    @Inject(forwardRef(() => ExecutionsService))
    private readonly executionsService: ExecutionsService
  ) {}

  /**
   * Extract a frame from a video using FFmpeg
   */
  async extractFrame(
    executionId: string,
    nodeId: string,
    input: FrameExtractInput
  ): Promise<FrameExtractResult> {
    this.logger.log(`Extracting ${input.selectionMode} frame for node ${nodeId}`);

    const tempDir = join(tmpdir(), 'genfeed-ffmpeg');
    const outputPath = join(tempDir, `frame-${nodeId}-${Date.now()}.jpg`);

    try {
      // Ensure temp directory exists
      await mkdir(tempDir, { recursive: true });

      // Build FFmpeg command based on selection mode
      let ffmpegCmd: string;

      switch (input.selectionMode) {
        case 'first':
          // Extract first frame
          ffmpegCmd = `ffmpeg -y -i "${input.video}" -vframes 1 -q:v 2 "${outputPath}"`;
          break;

        case 'timestamp':
          // Extract frame at specific timestamp
          if (input.timestampSeconds !== undefined) {
            ffmpegCmd = `ffmpeg -y -ss ${input.timestampSeconds} -i "${input.video}" -vframes 1 -q:v 2 "${outputPath}"`;
          } else {
            // Fallback to last frame if no timestamp provided
            ffmpegCmd = `ffmpeg -y -sseof -1 -i "${input.video}" -vframes 1 -q:v 2 "${outputPath}"`;
          }
          break;

        case 'percentage':
          // Extract frame at percentage position
          if (input.percentagePosition !== undefined && input.videoDuration !== undefined) {
            const seekTime = (input.percentagePosition / 100) * input.videoDuration;
            ffmpegCmd = `ffmpeg -y -ss ${seekTime} -i "${input.video}" -vframes 1 -q:v 2 "${outputPath}"`;
          } else {
            // Fallback to last frame if percentage can't be calculated
            ffmpegCmd = `ffmpeg -y -sseof -1 -i "${input.video}" -vframes 1 -q:v 2 "${outputPath}"`;
          }
          break;
        default:
          // Extract last frame - seek to near end and get first frame from there
          ffmpegCmd = `ffmpeg -y -sseof -1 -i "${input.video}" -vframes 1 -q:v 2 "${outputPath}"`;
          break;
      }

      this.logger.debug(`Running FFmpeg: ${ffmpegCmd}`);

      // Execute FFmpeg
      const { stderr } = await execAsync(ffmpegCmd, {
        timeout: 60000, // 60 second timeout
      });

      if (stderr?.includes('Error')) {
        this.logger.warn(`FFmpeg stderr: ${stderr}`);
      }

      // Read the output file and convert to base64 data URL
      const imageBuffer = await readFile(outputPath);
      const imageBase64 = imageBuffer.toString('base64');
      const imageDataUrl = `data:image/jpeg;base64,${imageBase64}`;

      // Update execution with result
      await this.executionsService.updateNodeResult(executionId, nodeId, 'complete', {
        image: imageDataUrl,
      });

      this.logger.log(`Frame extracted successfully for node ${nodeId}`);

      // Clean up temp file
      await unlink(outputPath).catch(() => {});

      return {
        imageUrl: imageDataUrl,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to extract frame for node ${nodeId}: ${errorMessage}`);

      // Clean up temp file on error
      await unlink(outputPath).catch(() => {});

      await this.executionsService.updateNodeResult(
        executionId,
        nodeId,
        'error',
        undefined,
        errorMessage
      );

      throw error;
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
    this.logger.log(
      `${input.preserveOriginalAudio ? 'Mixing' : 'Replacing'} audio for node ${nodeId}`
    );

    const tempDir = join(tmpdir(), 'genfeed-ffmpeg');
    const outputPath = join(tempDir, `video-${nodeId}-${Date.now()}.mp4`);

    try {
      // Ensure temp directory exists
      await mkdir(tempDir, { recursive: true });

      let ffmpegCmd: string;

      if (input.preserveOriginalAudio && input.audioMixLevel !== undefined) {
        // Mix original and new audio
        // audioMixLevel: 0 = all original, 1 = all new
        const originalVolume = 1 - input.audioMixLevel;
        const newVolume = input.audioMixLevel;

        ffmpegCmd = `ffmpeg -y -i "${input.video}" -i "${input.audio}" -filter_complex "[0:a]volume=${originalVolume}[a1];[1:a]volume=${newVolume}[a2];[a1][a2]amix=inputs=2:duration=first[aout]" -map 0:v -map "[aout]" -c:v copy -c:a aac "${outputPath}"`;
      } else {
        // Replace audio completely
        ffmpegCmd = `ffmpeg -y -i "${input.video}" -i "${input.audio}" -map 0:v -map 1:a -c:v copy -c:a aac -shortest "${outputPath}"`;
      }

      this.logger.debug(`Running FFmpeg: ${ffmpegCmd}`);

      // Execute FFmpeg
      const { stderr } = await execAsync(ffmpegCmd, {
        timeout: 300000, // 5 minute timeout for video processing
      });

      if (stderr?.includes('Error')) {
        this.logger.warn(`FFmpeg stderr: ${stderr}`);
      }

      // Read the output file and convert to base64 data URL
      const videoBuffer = await readFile(outputPath);
      const videoBase64 = videoBuffer.toString('base64');
      const videoDataUrl = `data:video/mp4;base64,${videoBase64}`;

      // Update execution with result
      await this.executionsService.updateNodeResult(executionId, nodeId, 'complete', {
        video: videoDataUrl,
      });

      this.logger.log(`Audio replaced successfully for node ${nodeId}`);

      // Clean up temp file
      await unlink(outputPath).catch(() => {});

      return {
        videoUrl: videoDataUrl,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to replace audio for node ${nodeId}: ${errorMessage}`);

      // Clean up temp file on error
      await unlink(outputPath).catch(() => {});

      await this.executionsService.updateNodeResult(
        executionId,
        nodeId,
        'error',
        undefined,
        errorMessage
      );

      throw error;
    }
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

    const tempDir = join(tmpdir(), 'genfeed-ffmpeg');
    const outputPath = join(tempDir, `subtitle-${nodeId}-${Date.now()}.mp4`);
    const subtitlePath = join(tempDir, `subtitle-${nodeId}-${Date.now()}.srt`);

    try {
      // Ensure temp directory exists
      await mkdir(tempDir, { recursive: true });

      // Convert plain text to simple SRT format
      const srtContent = this.textToSrt(input.text);
      const { writeFile } = await import('node:fs/promises');
      await writeFile(subtitlePath, srtContent, 'utf-8');

      // Build subtitle style based on input
      const { fontsize, fontcolor, boxcolor, yPosition } = this.getSubtitleStyle(input);

      // Build FFmpeg command with subtitles filter
      // Use subtitles filter for SRT files
      const escapedSubtitlePath = subtitlePath.replace(/'/g, "'\\''").replace(/:/g, '\\:');

      const ffmpegCmd = `ffmpeg -y -i "${input.video}" -vf "subtitles='${escapedSubtitlePath}':force_style='FontSize=${fontsize},FontName=${input.fontFamily},PrimaryColour=${fontcolor},BackColour=${boxcolor},BorderStyle=4,Outline=0,Shadow=0,MarginV=${yPosition}'" -c:a copy "${outputPath}"`;

      this.logger.debug(`Running FFmpeg: ${ffmpegCmd}`);

      // Execute FFmpeg
      const { stderr } = await execAsync(ffmpegCmd, {
        timeout: 600000, // 10 minute timeout for subtitle burning
      });

      if (stderr?.includes('Error') && !stderr.includes('deprecated')) {
        this.logger.warn(`FFmpeg stderr: ${stderr}`);
      }

      // Read the output file and convert to base64 data URL
      const videoBuffer = await readFile(outputPath);
      const videoBase64 = videoBuffer.toString('base64');
      const videoDataUrl = `data:video/mp4;base64,${videoBase64}`;

      // Update execution with result
      await this.executionsService.updateNodeResult(executionId, nodeId, 'complete', {
        video: videoDataUrl,
      });

      this.logger.log(`Subtitles added successfully for node ${nodeId}`);

      // Clean up temp files
      await unlink(outputPath).catch(() => {});
      await unlink(subtitlePath).catch(() => {});

      return {
        videoUrl: videoDataUrl,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to add subtitles for node ${nodeId}: ${errorMessage}`);

      // Clean up temp files on error
      await unlink(outputPath).catch(() => {});
      await unlink(subtitlePath).catch(() => {});

      await this.executionsService.updateNodeResult(
        executionId,
        nodeId,
        'error',
        undefined,
        errorMessage
      );

      throw error;
    }
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
        const r = Number.parseInt(rgba[1]).toString(16).padStart(2, '0');
        const g = Number.parseInt(rgba[2]).toString(16).padStart(2, '0');
        const b = Number.parseInt(rgba[3]).toString(16).padStart(2, '0');
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
      fontsize,
      fontcolor: hexToAssColor(input.fontColor),
      boxcolor,
      yPosition,
    };
  }

  /**
   * Stitch multiple videos together with transitions
   * Inspired by easy-peasy-ease patterns
   */
  async stitchVideos(
    executionId: string,
    nodeId: string,
    input: StitchVideosInput
  ): Promise<StitchVideosResult> {
    this.logger.log(
      `Stitching ${input.videos.length} videos with ${input.transitionType} transition for node ${nodeId}`
    );

    const tempDir = join(tmpdir(), 'genfeed-ffmpeg');
    const outputPath = join(tempDir, `stitch-${nodeId}-${Date.now()}.mp4`);
    const concatFilePath = join(tempDir, `concat-${nodeId}-${Date.now()}.txt`);

    try {
      // Ensure temp directory exists
      await mkdir(tempDir, { recursive: true });

      // Quality settings (inspired by easy-peasy-ease preview mode)
      const qualitySettings =
        input.outputQuality === 'draft'
          ? '-vf scale=1280:720:flags=lanczos -b:v 4M -maxrate 4M -bufsize 8M'
          : '-vf scale=-2:1080:flags=lanczos -crf 18';

      // Audio codec settings
      const audioCodec = input.audioCodec === 'mp3' ? 'libmp3lame -q:a 2' : 'aac -b:a 192k';

      // Frame rate cap (30fps for smoother playback, per easy-peasy-ease)
      const frameRateSettings = input.outputQuality === 'draft' ? '-r 30' : '';

      let ffmpegCmd: string;

      if (input.transitionType === 'cut') {
        // Simple concatenation without transitions
        const { writeFile } = await import('node:fs/promises');
        const concatContent = input.videos.map((v) => `file '${v}'`).join('\n');
        await writeFile(concatFilePath, concatContent, 'utf-8');

        ffmpegCmd = `ffmpeg -y -f concat -safe 0 -i "${concatFilePath}" ${qualitySettings} ${frameRateSettings} -c:a ${audioCodec} "${outputPath}"`;
      } else {
        // Build complex filter for transitions
        const filterParts: string[] = [];
        const videoCount = input.videos.length;
        const transitionDur = input.transitionDuration;

        // Input streams
        const inputArgs = input.videos.map((v) => `-i "${v}"`).join(' ');

        // Build xfade chain for transitions
        // For seamless loop, we also need to transition last -> first
        const totalTransitions = input.seamlessLoop ? videoCount : videoCount - 1;

        for (let i = 0; i < totalTransitions; i++) {
          const fromIdx = i;
          const toIdx = input.seamlessLoop && i === videoCount - 1 ? 0 : i + 1;

          // Select transition type
          let xfadeTransition: string;
          switch (input.transitionType) {
            case 'crossfade':
              xfadeTransition = 'fade';
              break;
            case 'fade':
              xfadeTransition = 'fadeblack';
              break;
            case 'wipe':
              xfadeTransition = 'wipeleft';
              break;
            default:
              xfadeTransition = 'fade';
          }

          if (i === 0) {
            // First transition: [0:v][1:v]
            filterParts.push(
              `[${fromIdx}:v][${toIdx}:v]xfade=transition=${xfadeTransition}:duration=${transitionDur}:offset=0[v${i}]`
            );
          } else if (i < totalTransitions - 1) {
            // Middle transitions
            filterParts.push(
              `[v${i - 1}][${toIdx}:v]xfade=transition=${xfadeTransition}:duration=${transitionDur}:offset=0[v${i}]`
            );
          } else {
            // Last transition
            filterParts.push(
              `[v${i - 1}][${toIdx}:v]xfade=transition=${xfadeTransition}:duration=${transitionDur}:offset=0[vout]`
            );
          }
        }

        // Audio mixing (concat all audio streams)
        const audioInputs = input.videos.map((_, i) => `[${i}:a]`).join('');
        filterParts.push(`${audioInputs}concat=n=${videoCount}:v=0:a=1[aout]`);

        const filterComplex = filterParts.join(';');

        ffmpegCmd = `ffmpeg -y ${inputArgs} -filter_complex "${filterComplex}" -map "[vout]" -map "[aout]" ${qualitySettings} ${frameRateSettings} -c:a ${audioCodec} "${outputPath}"`;
      }

      this.logger.debug(`Running FFmpeg stitch: ${ffmpegCmd}`);

      // Execute FFmpeg with longer timeout for video processing
      const { stderr } = await execAsync(ffmpegCmd, {
        timeout: 600000, // 10 minute timeout
      });

      if (stderr?.includes('Error') && !stderr.includes('deprecated')) {
        this.logger.warn(`FFmpeg stderr: ${stderr}`);
      }

      // Read the output file and convert to base64 data URL
      const videoBuffer = await readFile(outputPath);
      const videoBase64 = videoBuffer.toString('base64');
      const videoDataUrl = `data:video/mp4;base64,${videoBase64}`;

      // Update execution with result
      await this.executionsService.updateNodeResult(executionId, nodeId, 'complete', {
        video: videoDataUrl,
      });

      this.logger.log(`Videos stitched successfully for node ${nodeId}`);

      // Clean up temp files
      await unlink(outputPath).catch(() => {});
      await unlink(concatFilePath).catch(() => {});

      return {
        videoUrl: videoDataUrl,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to stitch videos for node ${nodeId}: ${errorMessage}`);

      // Clean up temp files on error
      await unlink(outputPath).catch(() => {});
      await unlink(concatFilePath).catch(() => {});

      await this.executionsService.updateNodeResult(
        executionId,
        nodeId,
        'error',
        undefined,
        errorMessage
      );

      throw error;
    }
  }
}
