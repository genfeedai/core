import { PRICING } from '@genfeedai/core';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Replicate from 'replicate';
import { CostCalculatorService } from '@/services/cost-calculator.service';
import { ExecutionsService } from '@/services/executions.service';

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
  latentSync: 'bytedance/latentsync',
  pixverseLipSync: 'pixverse/lipsync',
} as const;

export interface ImageGenInput {
  prompt: string;
  inputImages?: string[];
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
  model: 'sync/lipsync-2' | 'sync/lipsync-2-pro' | 'bytedance/latentsync' | 'pixverse/lipsync';
  syncMode?: 'loop' | 'bounce' | 'cut_off' | 'silence' | 'remap';
  temperature?: number;
  activeSpeaker?: boolean;
}

export interface MotionControlInput {
  image: string;
  prompt?: string;
  mode: 'trajectory' | 'camera' | 'combined';
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
}

export interface PredictionResult {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
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
    'bytedance/latentsync': MODELS.latentSync,
    'pixverse/lipsync': MODELS.pixverseLipSync,
  };

  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => ExecutionsService))
    private readonly executionsService: ExecutionsService,
    private readonly costCalculatorService: CostCalculatorService
  ) {
    this.replicate = new Replicate({
      auth: this.configService.get<string>('REPLICATE_API_TOKEN'),
    });
  }

  /**
   * Generate an image using nano-banana models
   */
  async generateImage(
    executionId: string,
    nodeId: string,
    model: 'nano-banana' | 'nano-banana-pro',
    input: ImageGenInput
  ): Promise<PredictionResult> {
    const modelId = model === 'nano-banana' ? MODELS.nanoBanana : MODELS.nanoBananaPro;

    const prediction = await this.replicate.predictions.create({
      model: modelId,
      input: {
        prompt: input.prompt,
        image_input: input.inputImages ?? [],
        aspect_ratio: input.aspectRatio ?? '1:1',
        output_format: input.outputFormat ?? 'jpg',
        ...(model === 'nano-banana-pro' && {
          resolution: input.resolution ?? '2K',
        }),
      },
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
    model: 'veo-3.1-fast' | 'veo-3.1',
    input: VideoGenInput
  ): Promise<PredictionResult> {
    const modelId = model === 'veo-3.1-fast' ? MODELS.veoFast : MODELS.veo;

    const prediction = await this.replicate.predictions.create({
      model: modelId,
      input: {
        prompt: input.prompt,
        image: input.image,
        last_frame: input.lastFrame,
        reference_images: input.referenceImages,
        duration: input.duration ?? 8,
        aspect_ratio: input.aspectRatio ?? '16:9',
        resolution: input.resolution ?? '1080p',
        generate_audio: input.generateAudio ?? true,
        negative_prompt: input.negativePrompt,
        seed: input.seed,
      },
    });

    // Create job record in database
    await this.executionsService.createJob(executionId, nodeId, prediction.id);

    this.logger.log(`Created video prediction ${prediction.id} for node ${nodeId}`);

    return prediction as PredictionResult;
  }

  /**
   * Generate video with motion control using Kling AI
   * Supports trajectory-based motion paths and camera movements
   */
  async generateMotionControlVideo(
    executionId: string,
    nodeId: string,
    input: MotionControlInput
  ): Promise<PredictionResult> {
    // Build input based on mode
    const baseInput: Record<string, unknown> = {
      image: input.image,
      prompt: input.prompt || '',
      duration: input.duration ?? 5,
      aspect_ratio: input.aspectRatio ?? '16:9',
      motion_strength: (input.motionStrength ?? 50) / 100, // Normalize to 0-1
      negative_prompt: input.negativePrompt || '',
    };

    // Add seed if specified
    if (input.seed !== undefined && input.seed !== null) {
      baseInput.seed = input.seed;
    }

    // Add trajectory points for trajectory or combined mode
    if ((input.mode === 'trajectory' || input.mode === 'combined') && input.trajectoryPoints) {
      // Format trajectory points for the API
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
    const prediction = await this.replicate.predictions.create({
      model: MODELS.lumaReframeImage,
      input: {
        image: input.image,
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
    const prediction = await this.replicate.predictions.create({
      model: MODELS.lumaReframeVideo,
      input: {
        video: input.video,
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
    const prediction = await this.replicate.predictions.create({
      model: MODELS.topazImageUpscale,
      input: {
        image: input.image,
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
    const prediction = await this.replicate.predictions.create({
      model: MODELS.topazVideoUpscale,
      input: {
        video: input.video,
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

    // Build input based on model - different models have different input formats
    const modelInput: Record<string, unknown> = {
      audio: input.audio,
    };

    // Add image or video based on what's provided
    if (input.image) {
      modelInput.image = input.image;
    }
    if (input.video) {
      modelInput.video = input.video;
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
