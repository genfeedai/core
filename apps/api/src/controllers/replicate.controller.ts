import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import type { GenerateImageDto } from '@/dto/generate-image.dto';
import type { GenerateTextDto } from '@/dto/generate-text.dto';
import type { GenerateVideoDto } from '@/dto/generate-video.dto';
import type { ProcessDto } from '@/dto/process.dto';
import type { WebhookDto } from '@/dto/webhook.dto';
import { ReplicateService } from '@/services/replicate.service';

@Controller('replicate')
export class ReplicateController {
  constructor(private readonly replicateService: ReplicateService) {}

  @Post('image')
  async generateImage(@Body() dto: GenerateImageDto) {
    const prediction = await this.replicateService.generateImage(
      dto.executionId,
      dto.nodeId,
      dto.model,
      {
        prompt: dto.prompt,
        imageInput: dto.imageInput,
        aspectRatio: dto.aspectRatio,
        resolution: dto.resolution,
        outputFormat: dto.outputFormat,
      }
    );

    return {
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
        prompt: dto.prompt,
        image: dto.image,
        lastFrame: dto.lastFrame,
        referenceImages: dto.referenceImages,
        duration: dto.duration,
        aspectRatio: dto.aspectRatio,
        resolution: dto.resolution,
        generateAudio: dto.generateAudio,
        negativePrompt: dto.negativePrompt,
        seed: dto.seed,
      }
    );

    return {
      predictionId: prediction.id,
      status: prediction.status,
    };
  }

  @Post('llm')
  async generateText(@Body() dto: GenerateTextDto) {
    const output = await this.replicateService.generateText({
      prompt: dto.prompt,
      systemPrompt: dto.systemPrompt,
      maxTokens: dto.maxTokens,
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
            video: dto.video!,
            aspectRatio: dto.aspectRatio!,
            prompt: dto.prompt,
            gridPosition: dto.gridPosition,
          });
        } else {
          prediction = await this.replicateService.reframeImage(dto.executionId, dto.nodeId, {
            image: dto.image!,
            aspectRatio: dto.aspectRatio!,
            model: dto.model,
            prompt: dto.prompt,
            gridPosition: dto.gridPosition,
          });
        }
        break;

      case 'upscale':
        // Unified upscale node - detect input type
        if (dto.inputType === 'video') {
          prediction = await this.replicateService.upscaleVideo(dto.executionId, dto.nodeId, {
            video: dto.video!,
            targetResolution: dto.targetResolution ?? '1080p',
            targetFps: dto.targetFps ?? 30,
          });
        } else {
          prediction = await this.replicateService.upscaleImage(dto.executionId, dto.nodeId, {
            image: dto.image!,
            enhanceModel: dto.enhanceModel ?? 'Standard V2',
            upscaleFactor: dto.upscaleFactor ?? '2x',
            outputFormat: dto.outputFormat ?? 'jpg',
            faceEnhancement: dto.faceEnhancement,
            faceEnhancementStrength: dto.faceEnhancementStrength,
            faceEnhancementCreativity: dto.faceEnhancementCreativity,
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
  async getPredictionStatus(@Param('id') predictionId: string) {
    const prediction = await this.replicateService.getPredictionStatus(predictionId);
    return {
      id: prediction.id,
      status: prediction.status,
      output: prediction.output,
      error: prediction.error,
    };
  }

  @Post('predictions/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelPrediction(@Param('id') predictionId: string) {
    await this.replicateService.cancelPrediction(predictionId);
    return { cancelled: true };
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() dto: WebhookDto) {
    await this.replicateService.handleWebhook({
      id: dto.id,
      status: dto.status,
      output: dto.output,
      error: dto.error,
      metrics: dto.metrics,
    });

    return { received: true };
  }
}
