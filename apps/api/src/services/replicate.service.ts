import { PRICING } from '@genfeedai/core';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Replicate from 'replicate';
import { CostCalculatorService } from '@/services/cost-calculator.service';
import { ExecutionsService } from '@/services/executions.service';
import { FilesService } from '@/services/files.service';
import { SchemaMapperService } from '@/services/schema-mapper.service';

// Model identifiers (Replicate official models)
export const MODELS = {
  // Image generation
  nanoBanana: 'google/nano-banana',
  nanoBananaPro: 'google/nano-banana-pro',
  // Video generation
  veoFast: 'google/veo-3.1-fast',
  veo: 'google/veo-3.1',
  klingTurboPro: 'kwaivgi/kling-v2.5-turbo-pro',
  klingMotionControl: 'kwaivgi/kling-v2.6-motion-control',
  // LLM
  llama: 'meta/meta-llama-3.1-405b-instruct',
  // Luma Reframe
  lumaReframeImage: 'luma/reframe-image',
  lumaReframeVideo: 'luma/reframe-video',
  // Topaz Upscale
  topazImageUpscale: 'topazlabs/image-upscale',
  topazVideoUpscale: 'topazlabs/video-upscale',
  // Lip sync
  lipSync2: 'sync/lipsync-2',
  lipSync2Pro: 'sync/lipsync-2-pro',
  pixverseLipSync: 'pixverse/lipsync',
  // Flux Kontext
  fluxKontextDev: 'black-forest-labs/flux-kontext-dev',
} as const;

export interface SelectedModel {
  provider: string;
  modelId: string;
  displayName?: string;
  inputSchema?: Record<string, unknown>;
}

export interface ImageGenInput {
  prompt: string;
  inputImages?: string[];
  aspectRatio?: string;
  resolution?: string;
  outputFormat?: string;
  selectedModel?: SelectedModel;
  /** Dynamic parameters from model's input schema */
  schemaParams?: Record<string, unknown>;
  /** Debug mode - skip API calls and return mock data */
  debugMode?: boolean;
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
  selectedModel?: SelectedModel;
  /** Dynamic parameters from model's input schema */
  schemaParams?: Record<string, unknown>;
  /** Debug mode - skip API calls and return mock data */
  debugMode?: boolean;
}

export interface LLMInput {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

export interface LumaReframeImageInput {
  image: string;
  aspectRatio: string;
  model?: 'photon-flash-1' | 'photon-1';
  prompt?: string;
  gridPosition?: { x: number; y: number };
}

export interface LumaReframeVideoInput {
  video: string;
  aspectRatio: string;
  prompt?: string;
  gridPosition?: { x: number; y: number };
}

export interface TopazImageUpscaleInput {
  image: string;
  enhanceModel: string;
  upscaleFactor: string;
  outputFormat: string;
  faceEnhancement?: boolean;
  faceEnhancementStrength?: number;
  faceEnhancementCreativity?: number;
}

export interface TopazVideoUpscaleInput {
  video: string;
  targetResolution: string;
  targetFps: number;
}

export interface ReframeInput {
  inputType: 'image' | 'video';
  image?: string;
  video?: string;
  aspectRatio: string;
  model?: 'photon-flash-1' | 'photon-1';
  prompt?: string;
  gridPosition?: { x: number; y: number };
}

export interface UpscaleInput {
  inputType: 'image' | 'video';
  image?: string;
  video?: string;
  model: string;
  // Image-specific
  enhanceModel?: string;
  upscaleFactor?: string;
  outputFormat?: string;
  faceEnhancement?: boolean;
  faceEnhancementStrength?: number;
  faceEnhancementCreativity?: number;
  // Video-specific
  targetResolution?: string;
  targetFps?: number;
}

export interface LipSyncInput {
  image?: string;
  video?: string;
  audio: string;
  model: 'sync/lipsync-2' | 'sync/lipsync-2-pro' | 'pixverse/lipsync';
  syncMode?: 'loop' | 'bounce' | 'cut_off' | 'silence' | 'remap';
  temperature?: number;
  activeSpeaker?: boolean;
}

export interface MotionControlInput {
  image: string;
  video?: string; // Reference video for video transfer mode
  prompt?: string;
  mode: 'trajectory' | 'camera' | 'combined' | 'video_transfer';
  duration: 5 | 10;
  aspectRatio: '16:9' | '9:16' | '1:1';
  // Trajectory points for path-based motion control
  trajectoryPoints?: Array<{ x: number; y: number; frame: number }>;
  // Camera movement settings
  cameraMovement?: string;
  cameraIntensity?: number;
  // Motion settings
  motionStrength?: number;
  negativePrompt?: string;
  seed?: number;
  // Video transfer settings
  keepOriginalSound?: boolean;
  characterOrientation?: 'from_image' | 'left' | 'right';
  quality?: 'standard' | 'pro';
}

export interface PredictionResult {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output: unknown;
  error?: string;
  metrics?: {
    predict_time?: number;
  };
  debugPayload?: {
    model: string;
    input: Record<string, unknown>;
    timestamp: string;
  };
}

@Injectable()
export class ReplicateService {
  private readonly logger = new Logger(ReplicateService.name);
  private readonly replicate: Replicate;

  /**
   * Convert a local file URL to base64 data URI
   * Replicate can't access localhost URLs, so we need to send the actual file data
   */
  private convertLocalUrlToBase64(url: string | undefined): string | undefined {
    if (!url) return undefined;
    const result = this.filesService.urlToBase64(url);
    // Log if conversion didn't happen (still a URL)
    if (result && !result.startsWith('data:') && result.includes('localhost')) {
      this.logger.warn(`Failed to convert URL to base64: ${url.substring(0, 100)}`);
    }
    return result;
  }

  /**
   * Convert all local URLs in schemaParams to base64
   * This handles cases where image URLs are passed via schemaParams
   */
  private convertSchemaParamsUrls(
    schemaParams: Record<string, unknown> | undefined
  ): Record<string, unknown> | undefined {
    if (!schemaParams) return undefined;

    // Keys that typically contain image/video URLs
    const urlKeys = [
      'image',
      'input_image',
      'image_input',
      'start_image',
      'end_image',
      'last_frame',
      'reference_images',
      'video',
      'audio',
    ];

    const converted = { ...schemaParams };

    for (const key of urlKeys) {
      if (key in converted) {
        const value = converted[key];
        if (typeof value === 'string') {
          converted[key] = this.convertLocalUrlToBase64(value);
        } else if (Array.isArray(value)) {
          converted[key] = value.map((v) =>
            typeof v === 'string' ? this.convertLocalUrlToBase64(v) : v
          );
        }
      }
    }

    return converted;
  }

  /** Map Topaz model names to enhance model display names */
  private static readonly TOPAZ_ENHANCE_MODEL_MAP: Record<string, string> = {
    'topaz-standard-v2': 'Standard V2',
    'topaz-low-res-v2': 'Low Resolution V2',
    'topaz-cgi': 'CGI',
    'topaz-high-fidelity-v2': 'High Fidelity V2',
    'topaz-text-refine': 'Text Refine',
  };

  /** Map lip sync model identifiers to Replicate model IDs */
  private static readonly LIP_SYNC_MODEL_MAP: Record<string, string> = {
    'sync/lipsync-2': MODELS.lipSync2,
    'sync/lipsync-2-pro': MODELS.lipSync2Pro,
    'pixverse/lipsync': MODELS.pixverseLipSync,
  };

  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => ExecutionsService))
    private readonly executionsService: ExecutionsService,
    readonly _costCalculatorService: CostCalculatorService,
    private readonly filesService: FilesService,
    private readonly schemaMapper: SchemaMapperService
  ) {
    this.replicate = new Replicate({
      auth: this.configService.get<string>('REPLICATE_API_TOKEN'),
    });
  }

  /**
   * Generate an image using various image generation models
   * Supports dynamic model selection via selectedModel, with fallback to legacy model field
   */
  async generateImage(
    executionId: string,
    nodeId: string,
    model: 'nano-banana' | 'nano-banana-pro' | undefined,
    input: ImageGenInput
  ): Promise<PredictionResult> {
    // Use selectedModel.modelId if available, otherwise fall back to legacy model mapping
    let modelId: string;
    if (input.selectedModel?.modelId) {
      modelId = input.selectedModel.modelId;
    } else {
      modelId = model === 'nano-banana' ? MODELS.nanoBanana : MODELS.nanoBananaPro;
    }

    // Convert local URLs to base64 (Replicate can't access localhost)
    this.logger.debug(`Received inputImages: ${JSON.stringify(input.inputImages)}`);
    const inputImages = input.inputImages
      ? input.inputImages.map((url) => this.convertLocalUrlToBase64(url))
      : [];
    this.logger.debug(`Converted images count: ${inputImages.filter(Boolean).length}`);

    // Get the model's input schema
    const inputSchema = input.selectedModel?.inputSchema;

    // Convert schemaParams URLs to base64 if present
    const convertedSchemaParams = this.convertSchemaParamsUrls(input.schemaParams);

    // Use schema mapper to build prediction input with correct field names
    const predictionInput = this.schemaMapper.mapImageInput(
      {
        prompt: input.prompt,
        inputImages: inputImages.filter(Boolean) as string[],
        aspectRatio: input.aspectRatio,
        resolution: input.resolution,
        outputFormat: input.outputFormat,
      },
      inputSchema,
      convertedSchemaParams
    );

    this.logger.debug(
      `Image prediction input for ${modelId}: ${JSON.stringify(Object.keys(predictionInput))}`
    );

    // Debug mode: skip actual API call and return mock data
    if (input.debugMode) {
      const mockId = `debug-img-${Date.now()}`;
      const mockOutput = 'https://placehold.co/1024x1024/1a1a2e/ffd700?text=DEBUG+IMAGE';
      const debugPayload = {
        model: modelId,
        input: predictionInput,
        timestamp: new Date().toISOString(),
      };

      this.logger.log(`[DEBUG] Mock image prediction ${mockId} for node ${nodeId}`);

      // Create debug job record so SSE stream can return it
      await this.executionsService.createDebugJob(
        executionId,
        nodeId,
        mockId,
        { image: mockOutput },
        debugPayload
      );

      return {
        id: mockId,
        status: 'succeeded',
        output: mockOutput,
        debugPayload,
      } as PredictionResult;
    }

    const prediction = await this.replicate.predictions.create({
      model: modelId,
      input: predictionInput,
    });

    // Create job record in database
    await this.executionsService.createJob(executionId, nodeId, prediction.id);

    this.logger.log(
      `Created image prediction ${prediction.id} with model ${modelId} for node ${nodeId}`
    );

    return prediction as PredictionResult;
  }

  /**
   * Generate a video using veo-3.1 models
   */
  async generateVideo(
    executionId: string,
    nodeId: string,
    model: 'veo-3.1-fast' | 'veo-3.1',
    input: VideoGenInput
  ): Promise<PredictionResult> {
    // Use selectedModel.modelId if available, otherwise fall back to legacy model mapping
    let modelId: string;
    if (input.selectedModel?.modelId) {
      modelId = input.selectedModel.modelId;
    } else {
      modelId = model === 'veo-3.1-fast' ? MODELS.veoFast : MODELS.veo;
    }

    // Convert local URLs to base64 (Replicate can't access localhost)
    const image = this.convertLocalUrlToBase64(input.image);
    const lastFrame = this.convertLocalUrlToBase64(input.lastFrame);
    const referenceImages = input.referenceImages
      ? input.referenceImages.map((url) => this.convertLocalUrlToBase64(url))
      : undefined;

    // Get the model's input schema
    const inputSchema = input.selectedModel?.inputSchema;

    // Convert schemaParams URLs to base64 if present
    const convertedSchemaParams = this.convertSchemaParamsUrls(input.schemaParams);

    // Use schema mapper to build prediction input with correct field names
    const predictionInput = this.schemaMapper.mapVideoInput(
      {
        prompt: input.prompt,
        image: image ?? undefined,
        lastFrame: lastFrame ?? undefined,
        referenceImages: referenceImages?.filter(Boolean) as string[] | undefined,
        duration: input.duration,
        aspectRatio: input.aspectRatio,
        resolution: input.resolution,
        generateAudio: input.generateAudio,
        negativePrompt: input.negativePrompt,
        seed: input.seed,
      },
      inputSchema,
      convertedSchemaParams
    );

    this.logger.debug(
      `Video prediction input for ${modelId}: ${JSON.stringify(Object.keys(predictionInput))}`
    );

    // Debug mode: skip actual API call and return mock data
    if (input.debugMode) {
      const mockId = `debug-vid-${Date.now()}`;
      const mockOutput = 'https://placehold.co/1920x1080/1a1a2e/ffd700?text=DEBUG+VIDEO';
      const debugPayload = {
        model: modelId,
        input: predictionInput,
        timestamp: new Date().toISOString(),
      };

      this.logger.log(`[DEBUG] Mock video prediction ${mockId} for node ${nodeId}`);

      // Create debug job record so SSE stream can return it
      await this.executionsService.createDebugJob(
        executionId,
        nodeId,
        mockId,
        { video: mockOutput },
        debugPayload
      );

      return {
        id: mockId,
        status: 'succeeded',
        output: mockOutput,
        debugPayload,
      } as PredictionResult;
    }

    const prediction = await this.replicate.predictions.create({
      model: modelId,
      input: predictionInput,
    });

    // Create job record in database
    await this.executionsService.createJob(executionId, nodeId, prediction.id);

    this.logger.log(
      `Created video prediction ${prediction.id} with model ${modelId} for node ${nodeId}`
    );

    return prediction as PredictionResult;
  }

  /**
   * Generate video with motion control using Kling AI
   * Supports trajectory-based motion paths, camera movements, and video transfer
   */
  async generateMotionControlVideo(
    executionId: string,
    nodeId: string,
    input: MotionControlInput
  ): Promise<PredictionResult> {
    // Convert local URL to base64 (Replicate can't access localhost)
    const image = this.convertLocalUrlToBase64(input.image);

    // Build input based on mode
    const baseInput: Record<string, unknown> = {
      image,
      prompt: input.prompt || '',
      duration: input.duration ?? 5,
      aspect_ratio: input.aspectRatio ?? '16:9',
      negative_prompt: input.negativePrompt || '',
    };

    // Add seed if specified
    if (input.seed !== undefined && input.seed !== null) {
      baseInput.seed = input.seed;
    }

    // Handle video transfer mode
    if (input.mode === 'video_transfer') {
      if (!input.video) {
        throw new Error('Video is required for video transfer mode');
      }
      // Convert video URL to base64 if it's a local URL
      baseInput.video = this.convertLocalUrlToBase64(input.video);
      baseInput.keep_original_sound = input.keepOriginalSound ?? true;
      baseInput.character_orientation = input.characterOrientation ?? 'from_image';
      // Quality: 'standard' or 'pro' maps to model tier
      if (input.quality === 'pro') {
        baseInput.quality = 'pro';
      }
    } else {
      // Non-video-transfer modes use motion_strength
      baseInput.motion_strength = (input.motionStrength ?? 50) / 100; // Normalize to 0-1

      // Add trajectory points for trajectory or combined mode
      if ((input.mode === 'trajectory' || input.mode === 'combined') && input.trajectoryPoints) {
        baseInput.trajectory = input.trajectoryPoints.map((pt) => ({
          x: pt.x,
          y: pt.y,
          frame: pt.frame,
        }));
      }

      // Add camera movement for camera or combined mode
      if (input.mode === 'camera' || input.mode === 'combined') {
        baseInput.camera_movement = input.cameraMovement ?? 'static';
        baseInput.camera_intensity = (input.cameraIntensity ?? 50) / 100; // Normalize to 0-1
      }
    }

    const prediction = await this.replicate.predictions.create({
      model: MODELS.klingMotionControl,
      input: baseInput,
    });

    await this.executionsService.createJob(executionId, nodeId, prediction.id);
    this.logger.log(`Created motion control prediction ${prediction.id} for node ${nodeId}`);

    return prediction as PredictionResult;
  }

  /**
   * Generate text using meta-llama
   */
  async generateText(input: LLMInput): Promise<string> {
    const output = await this.replicate.run(MODELS.llama, {
      input: {
        prompt: input.prompt,
        system_prompt: input.systemPrompt ?? 'You are a helpful assistant.',
        max_tokens: input.maxTokens ?? 1024,
        temperature: input.temperature ?? 0.7,
        top_p: input.topP ?? 0.9,
      },
    });

    // Output is typically an array of strings
    if (Array.isArray(output)) {
      return output.join('');
    }

    return String(output);
  }

  /**
   * Reframe an image using Luma AI
   */
  async reframeImage(
    executionId: string,
    nodeId: string,
    input: LumaReframeImageInput
  ): Promise<PredictionResult> {
    const image = this.convertLocalUrlToBase64(input.image);

    const prediction = await this.replicate.predictions.create({
      model: MODELS.lumaReframeImage,
      input: {
        image,
        aspect_ratio: input.aspectRatio,
        model: input.model ?? 'photon-flash-1',
        prompt: input.prompt || undefined,
        grid_position_x: input.gridPosition?.x ?? 0.5,
        grid_position_y: input.gridPosition?.y ?? 0.5,
      },
    });

    await this.executionsService.createJob(executionId, nodeId, prediction.id);
    this.logger.log(`Created Luma reframe image prediction ${prediction.id} for node ${nodeId}`);

    return prediction as PredictionResult;
  }

  /**
   * Reframe a video using Luma AI
   */
  async reframeVideo(
    executionId: string,
    nodeId: string,
    input: LumaReframeVideoInput
  ): Promise<PredictionResult> {
    const video = this.convertLocalUrlToBase64(input.video);

    const prediction = await this.replicate.predictions.create({
      model: MODELS.lumaReframeVideo,
      input: {
        video,
        aspect_ratio: input.aspectRatio,
        prompt: input.prompt || undefined,
        grid_position_x: input.gridPosition?.x ?? 0.5,
        grid_position_y: input.gridPosition?.y ?? 0.5,
      },
    });

    await this.executionsService.createJob(executionId, nodeId, prediction.id);
    this.logger.log(`Created Luma reframe video prediction ${prediction.id} for node ${nodeId}`);

    return prediction as PredictionResult;
  }

  /**
   * Upscale an image using Topaz Labs
   */
  async upscaleImage(
    executionId: string,
    nodeId: string,
    input: TopazImageUpscaleInput
  ): Promise<PredictionResult> {
    const image = this.convertLocalUrlToBase64(input.image);

    const prediction = await this.replicate.predictions.create({
      model: MODELS.topazImageUpscale,
      input: {
        image,
        enhance_model: input.enhanceModel,
        upscale_factor: input.upscaleFactor,
        output_format: input.outputFormat,
        face_enhancement: input.faceEnhancement ?? false,
        face_enhancement_strength: (input.faceEnhancementStrength ?? 80) / 100,
        face_enhancement_creativity: (input.faceEnhancementCreativity ?? 0) / 100,
      },
    });

    await this.executionsService.createJob(executionId, nodeId, prediction.id);
    this.logger.log(`Created Topaz image upscale prediction ${prediction.id} for node ${nodeId}`);

    return prediction as PredictionResult;
  }

  /**
   * Upscale a video using Topaz Labs
   */
  async upscaleVideo(
    executionId: string,
    nodeId: string,
    input: TopazVideoUpscaleInput
  ): Promise<PredictionResult> {
    const video = this.convertLocalUrlToBase64(input.video);

    const prediction = await this.replicate.predictions.create({
      model: MODELS.topazVideoUpscale,
      input: {
        video,
        target_resolution: input.targetResolution,
        target_fps: input.targetFps,
      },
    });

    await this.executionsService.createJob(executionId, nodeId, prediction.id);
    this.logger.log(`Created Topaz video upscale prediction ${prediction.id} for node ${nodeId}`);

    return prediction as PredictionResult;
  }

  /**
   * Unified reframe method - handles both images and videos
   */
  async reframe(
    executionId: string,
    nodeId: string,
    input: ReframeInput
  ): Promise<PredictionResult> {
    if (input.inputType === 'image') {
      return this.reframeImage(executionId, nodeId, {
        image: input.image!,
        aspectRatio: input.aspectRatio,
        model: input.model,
        prompt: input.prompt,
        gridPosition: input.gridPosition,
      });
    } else {
      return this.reframeVideo(executionId, nodeId, {
        video: input.video!,
        aspectRatio: input.aspectRatio,
        prompt: input.prompt,
        gridPosition: input.gridPosition,
      });
    }
  }

  /**
   * Unified upscale method - handles both images and videos
   */
  async upscale(
    executionId: string,
    nodeId: string,
    input: UpscaleInput
  ): Promise<PredictionResult> {
    if (input.inputType === 'image') {
      return this.upscaleImage(executionId, nodeId, {
        image: input.image!,
        enhanceModel:
          ReplicateService.TOPAZ_ENHANCE_MODEL_MAP[input.model] ??
          input.enhanceModel ??
          'Standard V2',
        upscaleFactor: input.upscaleFactor ?? '2x',
        outputFormat: input.outputFormat ?? 'png',
        faceEnhancement: input.faceEnhancement,
        faceEnhancementStrength: input.faceEnhancementStrength,
        faceEnhancementCreativity: input.faceEnhancementCreativity,
      });
    } else {
      return this.upscaleVideo(executionId, nodeId, {
        video: input.video!,
        targetResolution: input.targetResolution ?? '1080p',
        targetFps: input.targetFps ?? 30,
      });
    }
  }

  /**
   * Generate lip-synced video from image/video and audio
   */
  async generateLipSync(
    executionId: string,
    nodeId: string,
    input: LipSyncInput
  ): Promise<PredictionResult> {
    const modelId = ReplicateService.LIP_SYNC_MODEL_MAP[input.model] ?? MODELS.lipSync2;

    // Convert local URLs to base64 (Replicate can't access localhost)
    const audio = this.convertLocalUrlToBase64(input.audio);
    const image = input.image ? this.convertLocalUrlToBase64(input.image) : undefined;
    const video = input.video ? this.convertLocalUrlToBase64(input.video) : undefined;

    // Build input based on model - different models have different input formats
    const modelInput: Record<string, unknown> = {
      audio,
    };

    // Add image or video based on what's provided
    if (image) {
      modelInput.image = image;
    }
    if (video) {
      modelInput.video = video;
    }

    // Add model-specific options for sync labs models
    if (input.model.startsWith('sync/')) {
      if (input.syncMode) {
        modelInput.sync_mode = input.syncMode;
      }
      if (input.activeSpeaker !== undefined) {
        modelInput.active_speaker = input.activeSpeaker;
      }
    }

    // Add temperature for models that support it
    if (input.temperature !== undefined) {
      modelInput.temperature = input.temperature;
    }

    const prediction = await this.replicate.predictions.create({
      model: modelId,
      input: modelInput,
    });

    await this.executionsService.createJob(executionId, nodeId, prediction.id);
    this.logger.log(`Created lip sync prediction ${prediction.id} for node ${nodeId}`);

    return prediction as PredictionResult;
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
   * Calculate cost estimate for a workflow
   */
  calculateWorkflowCost(
    imageCount: number,
    imageModel: 'nano-banana' | 'nano-banana-pro',
    imageResolution: string,
    videoSeconds: number,
    videoModel: 'veo-3.1-fast' | 'veo-3.1',
    withAudio: boolean
  ): number {
    let cost = 0;

    // Image cost
    if (imageModel === 'nano-banana') {
      cost += imageCount * PRICING['nano-banana'];
    } else {
      const res = imageResolution as keyof (typeof PRICING)['nano-banana-pro'];
      cost += imageCount * (PRICING['nano-banana-pro'][res] ?? 0.15);
    }

    // Video cost (per second)
    const videoKey = withAudio ? 'withAudio' : 'withoutAudio';
    cost += videoSeconds * PRICING[videoModel][videoKey];

    return cost;
  }

  /**
   * Calculate cost for LLM generation based on token count
   */
  calculateLLMCost(inputTokens: number, outputTokens: number): number {
    return (inputTokens + outputTokens) * PRICING.llama;
  }
}
