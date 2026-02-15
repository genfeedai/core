import { PRICING } from '@genfeedai/core';
import { KlingQuality } from '@genfeedai/types';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Replicate from 'replicate';
import type {
  DebugPayload,
  ModelInputSchema,
  ReplicateModelInput,
  SchemaParams,
} from '@/interfaces/execution-types.interface';
import { CostCalculatorService } from '@/services/cost-calculator.service';
import { ExecutionsService } from '@/services/executions.service';
import { FilesService } from '@/services/files.service';
import { SchemaMapperService } from '@/services/schema-mapper.service';

// Model identifiers (Replicate official models)
export const MODELS = {
  // Flux Kontext
  fluxKontextDev: 'black-forest-labs/flux-kontext-dev',
  klingMotionControl: 'kwaivgi/kling-v2.6-motion-control',
  klingTurboPro: 'kwaivgi/kling-v2.5-turbo-pro',
  // Lip sync
  lipSync2: 'sync/lipsync-2',
  lipSync2Pro: 'sync/lipsync-2-pro',
  // LLM
  llama: 'meta/meta-llama-3.1-405b-instruct',
  // Luma Reframe
  lumaReframeImage: 'luma/reframe-image',
  lumaReframeVideo: 'luma/reframe-video',
  // Image generation
  nanoBanana: 'google/nano-banana',
  nanoBananaPro: 'google/nano-banana-pro',
  omniHuman: 'bytedance/omni-human',
  pixverseLipSync: 'pixverse/lipsync',
  // Topaz Upscale
  topazImageUpscale: 'topazlabs/image-upscale',
  topazVideoUpscale: 'topazlabs/video-upscale',
  veedFabric: 'veed/fabric-1.0',
  veo: 'google/veo-3.1',
  // Video generation
  veoFast: 'google/veo-3.1-fast',
  // Whisper (transcription)
  whisper: 'openai/whisper',
} as const;

export interface SelectedModel {
  provider: string;
  modelId: string;
  displayName?: string;
  inputSchema?: ModelInputSchema;
}

export interface ImageGenInput {
  prompt: string;
  inputImages?: string[];
  aspectRatio?: string;
  resolution?: string;
  outputFormat?: string;
  selectedModel?: SelectedModel;
  /** Dynamic parameters from model's input schema */
  schemaParams?: SchemaParams;
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
  schemaParams?: SchemaParams;
  /** Debug mode - skip API calls and return mock data */
  debugMode?: boolean;
}

export interface LLMInput {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  selectedModel?: SelectedModel;
  schemaParams?: SchemaParams;
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
  quality?: KlingQuality;
}

export interface TranscribeInput {
  audio: string;
  language?: string;
  translate?: boolean;
}

export interface PredictionResult {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output: unknown;
  error?: string;
  metrics?: {
    predict_time?: number;
  };
  debugPayload?: DebugPayload;
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
    schemaParams: SchemaParams | undefined
  ): SchemaParams | undefined {
    if (!schemaParams) return undefined;

    // Keys that typically contain image/video/audio URLs
    // This list should be comprehensive to handle various model input schemas
    const urlKeys = [
      'image',
      'input_image',
      'image_input',
      'start_image',
      'end_image',
      'last_frame',
      'reference_images',
      'video',
      'input_video',
      'video_input',
      'audio',
      'input_audio',
      'audio_input',
      'mask',
      'mask_image',
      'control_image',
      'init_image',
      'subject_image',
      'face_image',
      'style_image',
      'pose_image',
      'depth_image',
      'canny_image',
      'conditioning_image',
      'ip_adapter_image',
      'tail_image_url',
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
    'topaz-cgi': 'CGI',
    'topaz-high-fidelity-v2': 'High Fidelity V2',
    'topaz-low-res-v2': 'Low Resolution V2',
    'topaz-standard-v2': 'Standard V2',
    'topaz-text-refine': 'Text Refine',
  };

  /** Map lip sync model identifiers to Replicate model IDs */
  private static readonly LIP_SYNC_MODEL_MAP: Record<string, string> = {
    'bytedance/omni-human': MODELS.omniHuman,
    'pixverse/lipsync': MODELS.pixverseLipSync,
    'sync/lipsync-2': MODELS.lipSync2,
    'sync/lipsync-2-pro': MODELS.lipSync2Pro,
    'veed/fabric-1.0': MODELS.veedFabric,
  };

  /** Models that natively support image input (no video required) */
  private static readonly IMAGE_NATIVE_LIP_SYNC_MODELS = [
    'bytedance/omni-human',
    'veed/fabric-1.0',
    'pixverse/lipsync',
  ];

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
    // Note: Don't log full image URLs/base64 data to avoid PII exposure in logs
    this.logger.debug(`Received inputImages: ${input.inputImages?.length ?? 0} items`);
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
        aspectRatio: input.aspectRatio,
        inputImages: inputImages.filter(Boolean) as string[],
        outputFormat: input.outputFormat,
        prompt: input.prompt,
        resolution: input.resolution,
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
        input: predictionInput,
        model: modelId,
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
        debugPayload,
        id: mockId,
        output: mockOutput,
        status: 'succeeded',
      } as PredictionResult;
    }

    const prediction = await this.replicate.predictions.create({
      input: predictionInput,
      model: modelId,
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
        aspectRatio: input.aspectRatio,
        duration: input.duration,
        generateAudio: input.generateAudio,
        image: image ?? undefined,
        lastFrame: lastFrame ?? undefined,
        negativePrompt: input.negativePrompt,
        prompt: input.prompt,
        referenceImages: referenceImages?.filter(Boolean) as string[] | undefined,
        resolution: input.resolution,
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
        input: predictionInput,
        model: modelId,
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
        debugPayload,
        id: mockId,
        output: mockOutput,
        status: 'succeeded',
      } as PredictionResult;
    }

    const prediction = await this.replicate.predictions.create({
      input: predictionInput,
      model: modelId,
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
    const baseInput: ReplicateModelInput = {
      image,
      prompt: input.prompt || '',
    };

    // Add seed if specified
    if (input.seed !== undefined && input.seed !== null) {
      baseInput.seed = input.seed;
    }

    // Handle video transfer mode - only send params accepted by the model
    if (input.mode === 'video_transfer') {
      if (!input.video) {
        throw new Error('Video is required for video transfer mode');
      }
      // Convert video URL to base64 if it's a local URL
      baseInput.video = this.convertLocalUrlToBase64(input.video);
      baseInput.keep_original_sound = input.keepOriginalSound ?? true;
      baseInput.character_orientation = input.characterOrientation ?? 'from_image';
      if (input.quality) {
        baseInput.quality = input.quality;
      }
    } else {
      // Non-video-transfer modes include duration, aspect_ratio, negative_prompt, motion_strength
      baseInput.duration = input.duration ?? 5;
      baseInput.aspect_ratio = input.aspectRatio ?? '16:9';
      baseInput.negative_prompt = input.negativePrompt || '';
      baseInput.motion_strength = (input.motionStrength ?? 50) / 100; // Normalize to 0-1

      // Add trajectory points for trajectory or combined mode
      if ((input.mode === 'trajectory' || input.mode === 'combined') && input.trajectoryPoints) {
        baseInput.trajectory = input.trajectoryPoints.map((pt) => ({
          frame: pt.frame,
          x: pt.x,
          y: pt.y,
        }));
      }

      // Add camera movement for camera or combined mode
      if (input.mode === 'camera' || input.mode === 'combined') {
        baseInput.camera_movement = input.cameraMovement ?? 'static';
        baseInput.camera_intensity = (input.cameraIntensity ?? 50) / 100; // Normalize to 0-1
      }
    }

    const prediction = await this.replicate.predictions.create({
      input: baseInput,
      model: MODELS.klingMotionControl,
    });

    await this.executionsService.createJob(executionId, nodeId, prediction.id);
    this.logger.log(`Created motion control prediction ${prediction.id} for node ${nodeId}`);

    return prediction as PredictionResult;
  }

  /**
   * Generate text using meta-llama or a dynamically selected model
   */
  async generateText(input: LLMInput): Promise<string> {
    const modelId = input.selectedModel?.modelId ?? MODELS.llama;

    const replicateInput: ReplicateModelInput = {
      max_tokens: input.maxTokens ?? 1024,
      prompt: input.prompt,
      system_prompt: input.systemPrompt ?? 'You are a helpful assistant.',
      temperature: input.temperature ?? 0.7,
      top_p: input.topP ?? 0.9,
      ...input.schemaParams,
    };

    const output = await this.replicate.run(modelId as `${string}/${string}`, {
      input: replicateInput,
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
      input: {
        aspect_ratio: input.aspectRatio,
        grid_position_x: input.gridPosition?.x ?? 0.5,
        grid_position_y: input.gridPosition?.y ?? 0.5,
        image,
        model: input.model ?? 'photon-flash-1',
        prompt: input.prompt || undefined,
      },
      model: MODELS.lumaReframeImage,
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
      input: {
        aspect_ratio: input.aspectRatio,
        grid_position_x: input.gridPosition?.x ?? 0.5,
        grid_position_y: input.gridPosition?.y ?? 0.5,
        prompt: input.prompt || undefined,
        video,
      },
      model: MODELS.lumaReframeVideo,
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
      input: {
        enhance_model: input.enhanceModel,
        face_enhancement: input.faceEnhancement ?? false,
        face_enhancement_creativity: (input.faceEnhancementCreativity ?? 0) / 100,
        face_enhancement_strength: (input.faceEnhancementStrength ?? 80) / 100,
        image,
        output_format: input.outputFormat,
        upscale_factor: input.upscaleFactor,
      },
      model: MODELS.topazImageUpscale,
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
      input: {
        target_fps: input.targetFps,
        target_resolution: input.targetResolution,
        video,
      },
      model: MODELS.topazVideoUpscale,
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
        aspectRatio: input.aspectRatio,
        gridPosition: input.gridPosition,
        image: input.image!,
        model: input.model,
        prompt: input.prompt,
      });
    } else {
      return this.reframeVideo(executionId, nodeId, {
        aspectRatio: input.aspectRatio,
        gridPosition: input.gridPosition,
        prompt: input.prompt,
        video: input.video!,
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
        enhanceModel:
          ReplicateService.TOPAZ_ENHANCE_MODEL_MAP[input.model] ??
          input.enhanceModel ??
          'Standard V2',
        faceEnhancement: input.faceEnhancement,
        faceEnhancementCreativity: input.faceEnhancementCreativity,
        faceEnhancementStrength: input.faceEnhancementStrength,
        image: input.image!,
        outputFormat: input.outputFormat ?? 'png',
        upscaleFactor: input.upscaleFactor ?? '2x',
      });
    } else {
      return this.upscaleVideo(executionId, nodeId, {
        targetFps: input.targetFps ?? 30,
        targetResolution: input.targetResolution ?? '1080p',
        video: input.video!,
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
    const isImageNativeModel = ReplicateService.IMAGE_NATIVE_LIP_SYNC_MODELS.includes(input.model);

    // Convert local URLs to base64 (Replicate can't access localhost)
    const audio = this.convertLocalUrlToBase64(input.audio);
    const image = input.image ? this.convertLocalUrlToBase64(input.image) : undefined;
    const video = input.video ? this.convertLocalUrlToBase64(input.video) : undefined;

    // Build input based on model - different models have different input formats
    const modelInput: ReplicateModelInput = {
      audio,
    };

    // Image-native models (OmniHuman, VEED Fabric, Pixverse) use image directly
    // Video-required models (Sync Labs) need video input
    if (isImageNativeModel && image) {
      modelInput.image = image;
    } else if (video) {
      modelInput.video = video;
    } else if (image) {
      // Fallback for models that might accept either
      modelInput.image = image;
    }

    // Add model-specific options for Sync Labs models
    if (input.model.startsWith('sync/')) {
      if (input.syncMode) {
        modelInput.sync_mode = input.syncMode;
      }
      if (input.activeSpeaker !== undefined) {
        modelInput.active_speaker = input.activeSpeaker;
      }
    }

    // Add temperature for models that support it (not for image-native models like OmniHuman/VEED)
    if (input.temperature !== undefined && !isImageNativeModel) {
      modelInput.temperature = input.temperature;
    }

    this.logger.log(
      `Creating lip sync prediction with model ${modelId}, ` +
        `image: ${!!image}, video: ${!!video}, isImageNative: ${isImageNativeModel}`
    );

    const prediction = await this.replicate.predictions.create({
      input: modelInput,
      model: modelId,
    });

    await this.executionsService.createJob(executionId, nodeId, prediction.id);
    this.logger.log(`Created lip sync prediction ${prediction.id} for node ${nodeId}`);

    return prediction as PredictionResult;
  }

  /**
   * Transcribe audio/video using OpenAI Whisper
   */
  async transcribeAudio(
    executionId: string,
    nodeId: string,
    input: TranscribeInput
  ): Promise<PredictionResult> {
    const audio = this.convertLocalUrlToBase64(input.audio);

    const modelInput: ReplicateModelInput = {
      audio,
    };

    if (input.language) {
      modelInput.language = input.language;
    }

    if (input.translate) {
      modelInput.translate = input.translate;
    }

    const prediction = await this.replicate.predictions.create({
      input: modelInput,
      model: MODELS.whisper,
    });

    await this.executionsService.createJob(executionId, nodeId, prediction.id);
    this.logger.log(`Created whisper transcription prediction ${prediction.id} for node ${nodeId}`);

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
