import type { GenerateImageDto } from '@/dto/generate-image.dto';
import type { GenerateTextDto } from '@/dto/generate-text.dto';
import type { GenerateVideoDto } from '@/dto/generate-video.dto';
import type { ProcessDto } from '@/dto/process.dto';
import { FilesService } from '@/services/files.service';
import { ReplicateService } from '@/services/replicate.service';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
} from '@nestjs/common';

@Controller('replicate')
export class ReplicateController {
  private readonly logger = new Logger(ReplicateController.name);

  constructor(
    private readonly replicateService: ReplicateService,
    private readonly filesService: FilesService
  ) {}

  @Post('image')
  async generateImage(@Body() dto: GenerateImageDto) {
    const prediction = await this.replicateService.generateImage(
      dto.executionId,
      dto.nodeId,
      dto.model,
      {
        aspectRatio: dto.aspectRatio,
        debugMode: dto.debugMode,
        inputImages: dto.inputImages,
        outputFormat: dto.outputFormat,
        prompt: dto.prompt,
        resolution: dto.resolution,
        schemaParams: dto.schemaParams,
        selectedModel: dto.selectedModel,
      }
    );

    return {
      debugPayload: prediction.debugPayload,
      output: prediction.debugPayload ? prediction.output : undefined,
      predictionId: prediction.id,
      status: prediction.status,
    };
  }

  @Post('video')
  async generateVideo(@Body() dto: GenerateVideoDto) {
    const prediction = await this.replicateService.generateVideo(
      dto.executionId,
      dto.nodeId,
      dto.model,
      {
        aspectRatio: dto.aspectRatio,
        debugMode: dto.debugMode,
        duration: dto.duration,
        generateAudio: dto.generateAudio,
        image: dto.image,
        lastFrame: dto.lastFrame,
        negativePrompt: dto.negativePrompt,
        prompt: dto.prompt,
        referenceImages: dto.referenceImages,
        resolution: dto.resolution,
        schemaParams: dto.schemaParams,
        seed: dto.seed,
        selectedModel: dto.selectedModel,
      }
    );

    return {
      debugPayload: prediction.debugPayload,
      output: prediction.debugPayload ? prediction.output : undefined,
      predictionId: prediction.id,
      status: prediction.status,
    };
  }

  @Post('llm')
  async generateText(@Body() dto: GenerateTextDto) {
    const output = await this.replicateService.generateText({
      maxTokens: dto.maxTokens,
      prompt: dto.prompt,
      systemPrompt: dto.systemPrompt,
      temperature: dto.temperature,
      topP: dto.topP,
    });

    return {
      output,
      status: 'succeeded',
    };
  }

  @Post('processing')
  async processMedia(@Body() dto: ProcessDto) {
    let prediction: { id: string; status: string };

    switch (dto.nodeType) {
      case 'reframe':
        // Unified reframe node - detect input type
        if (dto.inputType === 'video') {
          prediction = await this.replicateService.reframeVideo(dto.executionId, dto.nodeId, {
            aspectRatio: dto.aspectRatio!,
            gridPosition: dto.gridPosition,
            prompt: dto.prompt,
            video: dto.video!,
          });
        } else {
          prediction = await this.replicateService.reframeImage(dto.executionId, dto.nodeId, {
            aspectRatio: dto.aspectRatio!,
            gridPosition: dto.gridPosition,
            image: dto.image!,
            model: dto.model,
            prompt: dto.prompt,
          });
        }
        break;

      case 'upscale':
        // Unified upscale node - detect input type
        if (dto.inputType === 'video') {
          prediction = await this.replicateService.upscaleVideo(dto.executionId, dto.nodeId, {
            targetFps: dto.targetFps ?? 30,
            targetResolution: dto.targetResolution ?? '1080p',
            video: dto.video!,
          });
        } else {
          prediction = await this.replicateService.upscaleImage(dto.executionId, dto.nodeId, {
            enhanceModel: dto.enhanceModel ?? 'Standard V2',
            faceEnhancement: dto.faceEnhancement,
            faceEnhancementCreativity: dto.faceEnhancementCreativity,
            faceEnhancementStrength: dto.faceEnhancementStrength,
            image: dto.image!,
            outputFormat: dto.outputFormat ?? 'jpg',
            upscaleFactor: dto.upscaleFactor ?? '2x',
          });
        }
        break;
    }

    return {
      predictionId: prediction.id,
      status: prediction.status,
    };
  }

  @Get('predictions/:id')
  async getPredictionStatus(
    @Param('id') predictionId: string,
    @Query('workflowId') workflowId?: string,
    @Query('nodeId') nodeId?: string
  ) {
    const prediction = await this.replicateService.getPredictionStatus(predictionId);

    // If prediction succeeded and we have workflowId/nodeId, save the output locally
    if (prediction.status === 'succeeded' && workflowId && nodeId && prediction.output) {
      try {
        const output = prediction.output;
        let savedOutput: unknown = output;

        // Handle array output (most common from Replicate)
        if (Array.isArray(output) && output.length > 0) {
          const urls = output as string[];
          if (urls.length === 1) {
            const saved = await this.filesService.downloadAndSaveOutput(
              workflowId,
              nodeId,
              urls[0],
              predictionId
            );
            savedOutput = {
              image: saved.url,
              images: [saved.url],
              localPath: saved.path,
            };
            this.logger.log(`Saved output to ${saved.path}`);
          } else {
            const savedFiles = await this.filesService.downloadAndSaveMultipleOutputs(
              workflowId,
              nodeId,
              urls,
              predictionId
            );
            savedOutput = {
              image: savedFiles[0].url,
              images: savedFiles.map((f) => f.url),
              localPaths: savedFiles.map((f) => f.path),
            };
            this.logger.log(`Saved ${savedFiles.length} outputs for node ${nodeId}`);
          }
        } else if (typeof output === 'string') {
          // Single URL string
          const saved = await this.filesService.downloadAndSaveOutput(
            workflowId,
            nodeId,
            output,
            predictionId
          );
          savedOutput = {
            image: saved.url,
            images: [saved.url],
            localPath: saved.path,
          };
          this.logger.log(`Saved output to ${saved.path}`);
        }

        return {
          error: prediction.error,
          id: prediction.id,
          output: savedOutput,
          status: prediction.status,
        };
      } catch (saveError) {
        this.logger.error(`Failed to save output: ${(saveError as Error).message}`);
        // Fall through to return original output
      }
    }

    return {
      error: prediction.error,
      id: prediction.id,
      output: prediction.output,
      status: prediction.status,
    };
  }

  @Post('predictions/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelPrediction(@Param('id') predictionId: string) {
    await this.replicateService.cancelPrediction(predictionId);
    return { cancelled: true };
  }
}
