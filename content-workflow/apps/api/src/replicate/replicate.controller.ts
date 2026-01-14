import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ReplicateService } from "./replicate.service";
import { GenerateImageDto } from "./dto/generate-image.dto";
import { GenerateVideoDto } from "./dto/generate-video.dto";
import { GenerateTextDto } from "./dto/generate-text.dto";
import { WebhookDto } from "./dto/webhook.dto";

@Controller("replicate")
export class ReplicateController {
  constructor(private readonly replicateService: ReplicateService) {}

  @Post("image")
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
      },
    );

    return {
      predictionId: prediction.id,
      status: prediction.status,
    };
  }

  @Post("video")
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
      },
    );

    return {
      predictionId: prediction.id,
      status: prediction.status,
    };
  }

  @Post("llm")
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
      status: "succeeded",
    };
  }

  @Get("predictions/:id")
  async getPredictionStatus(@Param("id") predictionId: string) {
    const prediction = await this.replicateService.getPredictionStatus(predictionId);
    return {
      id: prediction.id,
      status: prediction.status,
      output: prediction.output,
      error: prediction.error,
    };
  }

  @Post("predictions/:id/cancel")
  @HttpCode(HttpStatus.OK)
  async cancelPrediction(@Param("id") predictionId: string) {
    await this.replicateService.cancelPrediction(predictionId);
    return { cancelled: true };
  }

  @Post("webhook")
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
