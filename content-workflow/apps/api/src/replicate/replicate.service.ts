import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Replicate from "replicate";
import { ExecutionsService } from "../executions/executions.service";

// Model identifiers
export const MODELS = {
  nanoBanana: "google/nano-banana",
  nanoBananaPro: "google/nano-banana-pro",
  veoFast: "google/veo-3.1-fast",
  veo: "google/veo-3.1",
  llama: "meta/meta-llama-3.1-405b-instruct",
} as const;

// Pricing per unit
export const PRICING = {
  "nano-banana": 0.039,
  "nano-banana-pro": {
    "1K": 0.15,
    "2K": 0.2,
    "4K": 0.3,
  },
  "veo-3.1-fast": {
    withAudio: 0.15,
    withoutAudio: 0.1,
  },
  "veo-3.1": {
    withAudio: 0.4,
    withoutAudio: 0.2,
  },
  llama: 0.0001,
} as const;

export interface ImageGenInput {
  prompt: string;
  imageInput?: string[];
  aspectRatio?: string;
  resolution?: string;
  outputFormat?: string;
}

export interface VideoGenInput {
  prompt: string;
  image?: string;
  lastFrame?: string;
  referenceImages?: string[];
  duration?: number;
  aspectRatio?: string;
  resolution?: string;
  generateAudio?: boolean;
  negativePrompt?: string;
  seed?: number;
}

export interface LLMInput {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

export interface PredictionResult {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output: unknown;
  error?: string;
  metrics?: {
    predict_time?: number;
  };
}

@Injectable()
export class ReplicateService {
  private readonly logger = new Logger(ReplicateService.name);
  private readonly replicate: Replicate;
  private readonly webhookBaseUrl: string | undefined;

  constructor(
    private readonly configService: ConfigService,
    private readonly executionsService: ExecutionsService,
  ) {
    this.replicate = new Replicate({
      auth: this.configService.get<string>("REPLICATE_API_TOKEN"),
    });
    this.webhookBaseUrl = this.configService.get<string>("WEBHOOK_BASE_URL");
  }

  /**
   * Generate an image using nano-banana models
   */
  async generateImage(
    executionId: string,
    nodeId: string,
    model: "nano-banana" | "nano-banana-pro",
    input: ImageGenInput,
  ): Promise<PredictionResult> {
    const modelId = model === "nano-banana" ? MODELS.nanoBanana : MODELS.nanoBananaPro;

    const webhookUrl = this.webhookBaseUrl
      ? `${this.webhookBaseUrl}/api/replicate/webhook`
      : undefined;

    const prediction = await this.replicate.predictions.create({
      model: modelId,
      input: {
        prompt: input.prompt,
        image_input: input.imageInput ?? [],
        aspect_ratio: input.aspectRatio ?? "1:1",
        output_format: input.outputFormat ?? "jpg",
        ...(model === "nano-banana-pro" && {
          resolution: input.resolution ?? "2K",
        }),
      },
      ...(webhookUrl && {
        webhook: webhookUrl,
        webhook_events_filter: ["completed"],
      }),
    });

    // Create job record in database
    await this.executionsService.createJob(executionId, nodeId, prediction.id);

    this.logger.log(`Created image prediction ${prediction.id} for node ${nodeId}`);

    return prediction as PredictionResult;
  }

  /**
   * Generate a video using veo-3.1 models
   */
  async generateVideo(
    executionId: string,
    nodeId: string,
    model: "veo-3.1-fast" | "veo-3.1",
    input: VideoGenInput,
  ): Promise<PredictionResult> {
    const modelId = model === "veo-3.1-fast" ? MODELS.veoFast : MODELS.veo;

    const webhookUrl = this.webhookBaseUrl
      ? `${this.webhookBaseUrl}/api/replicate/webhook`
      : undefined;

    const prediction = await this.replicate.predictions.create({
      model: modelId,
      input: {
        prompt: input.prompt,
        image: input.image,
        last_frame: input.lastFrame,
        reference_images: input.referenceImages,
        duration: input.duration ?? 8,
        aspect_ratio: input.aspectRatio ?? "16:9",
        resolution: input.resolution ?? "1080p",
        generate_audio: input.generateAudio ?? true,
        negative_prompt: input.negativePrompt,
        seed: input.seed,
      },
      ...(webhookUrl && {
        webhook: webhookUrl,
        webhook_events_filter: ["completed"],
      }),
    });

    // Create job record in database
    await this.executionsService.createJob(executionId, nodeId, prediction.id);

    this.logger.log(`Created video prediction ${prediction.id} for node ${nodeId}`);

    return prediction as PredictionResult;
  }

  /**
   * Generate text using meta-llama
   */
  async generateText(input: LLMInput): Promise<string> {
    const output = await this.replicate.run(MODELS.llama, {
      input: {
        prompt: input.prompt,
        system_prompt: input.systemPrompt ?? "You are a helpful assistant.",
        max_tokens: input.maxTokens ?? 1024,
        temperature: input.temperature ?? 0.7,
        top_p: input.topP ?? 0.9,
      },
    });

    // Output is typically an array of strings
    if (Array.isArray(output)) {
      return output.join("");
    }

    return String(output);
  }

  /**
   * Get prediction status from Replicate API
   */
  async getPredictionStatus(predictionId: string): Promise<PredictionResult> {
    const prediction = await this.replicate.predictions.get(predictionId);
    return prediction as PredictionResult;
  }

  /**
   * Cancel a prediction
   */
  async cancelPrediction(predictionId: string): Promise<void> {
    await this.replicate.predictions.cancel(predictionId);
    this.logger.log(`Cancelled prediction ${predictionId}`);
  }

  /**
   * Process webhook from Replicate
   */
  async handleWebhook(data: {
    id: string;
    status: string;
    output: unknown;
    error?: string;
    metrics?: { predict_time?: number };
  }): Promise<void> {
    const { id, status, output, error, metrics } = data;

    this.logger.log(`Received webhook for prediction ${id}: ${status}`);

    // Update job in database
    const job = await this.executionsService.findJobByPredictionId(id);
    if (!job) {
      this.logger.warn(`Job not found for prediction ${id}`);
      return;
    }

    // Calculate cost based on prediction time and model
    const cost = this.calculateJobCost(metrics?.predict_time ?? 0);

    await this.executionsService.updateJob(id, {
      status,
      output: output as Record<string, unknown>,
      error,
      cost,
    });

    // Update execution node result if this is the final status
    if (status === "succeeded" || status === "failed" || status === "canceled") {
      const executionStatus = status === "succeeded" ? "complete" : "error";
      await this.executionsService.updateNodeResult(
        job.executionId.toString(),
        job.nodeId,
        executionStatus,
        output as Record<string, unknown>,
        error,
        cost,
      );
    }
  }

  /**
   * Calculate cost for a job based on prediction time
   */
  private calculateJobCost(predictTimeSeconds: number): number {
    // Simplified cost calculation - in production, would depend on model
    return predictTimeSeconds * 0.05; // $0.05 per second base rate
  }

  /**
   * Calculate cost estimate for a workflow
   */
  calculateWorkflowCost(
    imageCount: number,
    imageModel: "nano-banana" | "nano-banana-pro",
    imageResolution: string,
    videoSeconds: number,
    videoModel: "veo-3.1-fast" | "veo-3.1",
    withAudio: boolean,
  ): number {
    let cost = 0;

    // Image cost
    if (imageModel === "nano-banana") {
      cost += imageCount * PRICING["nano-banana"];
    } else {
      const res = imageResolution as keyof typeof PRICING["nano-banana-pro"];
      cost += imageCount * (PRICING["nano-banana-pro"][res] ?? 0.2);
    }

    // Video cost
    const videoKey = withAudio ? "withAudio" : "withoutAudio";
    cost += videoSeconds * PRICING[videoModel][videoKey];

    return cost;
  }
}
