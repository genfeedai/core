import type { Types } from 'mongoose';

/**
 * Base job data interface
 */
export interface BaseJobData {
  executionId: string;
  workflowId: string;
  timestamp: string;
}

/**
 * Workflow orchestrator job data
 */
export interface WorkflowJobData extends BaseJobData {
  // Workflow execution metadata
}

/**
 * Node execution job data
 */
export interface NodeJobData extends BaseJobData {
  nodeId: string;
  nodeType: string;
  nodeData: Record<string, unknown>;
  dependsOn?: string[]; // Node IDs this depends on
}

/**
 * Image generation job data
 */
export interface ImageJobData extends NodeJobData {
  nodeType: 'imageGen';
  nodeData: {
    model: 'nano-banana' | 'nano-banana-pro';
    prompt: string;
    imageInput?: string[];
    aspectRatio?: string;
    resolution?: string;
    outputFormat?: string;
  };
}

/**
 * Video generation job data
 */
export interface VideoJobData extends NodeJobData {
  nodeType: 'videoGen';
  nodeData: {
    model: 'veo-3.1-fast' | 'veo-3.1';
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
  };
}

/**
 * LLM generation job data
 */
export interface LLMJobData extends NodeJobData {
  nodeType: 'llm';
  nodeData: {
    prompt: string;
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
    topP?: number;
  };
}

/**
 * Luma Reframe Image job data
 */
export interface LumaReframeImageJobData extends NodeJobData {
  nodeType: 'lumaReframeImage';
  nodeData: {
    image: string;
    aspectRatio: string;
    model?: 'photon-flash-1' | 'photon-1';
    prompt?: string;
    gridPosition?: { x: number; y: number };
  };
}

/**
 * Luma Reframe Video job data
 */
export interface LumaReframeVideoJobData extends NodeJobData {
  nodeType: 'lumaReframeVideo';
  nodeData: {
    video: string;
    aspectRatio: string;
    prompt?: string;
    gridPosition?: { x: number; y: number };
  };
}

/**
 * Topaz Image Upscale job data
 */
export interface TopazImageUpscaleJobData extends NodeJobData {
  nodeType: 'topazImageUpscale';
  nodeData: {
    image: string;
    enhanceModel: string;
    upscaleFactor: string;
    outputFormat: string;
    faceEnhancement?: boolean;
    faceEnhancementStrength?: number;
    faceEnhancementCreativity?: number;
  };
}

/**
 * Topaz Video Upscale job data
 */
export interface TopazVideoUpscaleJobData extends NodeJobData {
  nodeType: 'topazVideoUpscale';
  nodeData: {
    video: string;
    targetResolution: string;
    targetFps: number;
  };
}

/**
 * Video Frame Extract job data
 */
export interface VideoFrameExtractJobData extends NodeJobData {
  nodeType: 'videoFrameExtract';
  nodeData: {
    video: string;
    selectionMode: 'first' | 'last' | 'timestamp' | 'percentage';
    timestampSeconds?: number;
    percentagePosition?: number;
  };
}

/**
 * Lip Sync job data
 */
export interface LipSyncJobData extends NodeJobData {
  nodeType: 'lipSync';
  nodeData: {
    image?: string;
    video?: string;
    audio: string;
    model: 'sync/lipsync-2' | 'sync/lipsync-2-pro' | 'bytedance/latentsync' | 'pixverse/lipsync';
    syncMode?: 'loop' | 'bounce' | 'cut_off' | 'silence' | 'remap';
    temperature?: number;
    activeSpeaker?: boolean;
  };
}

/**
 * Voice Change job data
 */
export interface VoiceChangeJobData extends NodeJobData {
  nodeType: 'voiceChange';
  nodeData: {
    video: string;
    audio: string;
    preserveOriginalAudio?: boolean;
    audioMixLevel?: number;
  };
}

/**
 * Text to Speech job data
 */
export interface TextToSpeechJobData extends NodeJobData {
  nodeType: 'textToSpeech';
  nodeData: {
    text: string;
    provider: 'elevenlabs' | 'openai';
    voice: string;
    stability?: number;
    similarityBoost?: number;
    speed?: number;
  };
}

/**
 * Subtitle job data
 */
export interface SubtitleJobData extends NodeJobData {
  nodeType: 'subtitle';
  nodeData: {
    video: string;
    text: string;
    style: 'default' | 'modern' | 'minimal' | 'bold';
    position: 'top' | 'center' | 'bottom';
    fontSize: number;
    fontColor: string;
    backgroundColor: string | null;
    fontFamily: string;
  };
}

/**
 * Video Stitch job data (easy-peasy-ease inspired)
 */
export interface VideoStitchJobData extends NodeJobData {
  nodeType: 'videoStitch';
  nodeData: {
    inputVideos: string[];
    transitionType: 'cut' | 'crossfade' | 'wipe' | 'fade';
    transitionDuration: number;
    seamlessLoop: boolean;
    audioCodec: 'aac' | 'mp3';
    outputQuality: 'full' | 'draft';
  };
}

/**
 * Union type for all processing job data
 */
export type ProcessingJobData =
  | LumaReframeImageJobData
  | LumaReframeVideoJobData
  | TopazImageUpscaleJobData
  | TopazVideoUpscaleJobData
  | VideoFrameExtractJobData
  | LipSyncJobData
  | VoiceChangeJobData
  | TextToSpeechJobData
  | SubtitleJobData
  | VideoStitchJobData;

/**
 * Job result interface
 */
export interface JobResult {
  success: boolean;
  output?: Record<string, unknown>;
  error?: string;
  cost?: number;
  predictTime?: number;
  predictionId?: string;
}

/**
 * Job progress update
 */
export interface JobProgress {
  percent: number;
  message?: string;
  timestamp: string;
}

/**
 * Dead letter queue job data
 */
export interface DLQJobData {
  originalJobId: string;
  originalQueue: string;
  data: BaseJobData | NodeJobData;
  error: string;
  stack?: string;
  attemptsMade: number;
  failedAt: string;
}

/**
 * Queue job document for MongoDB persistence
 */
export interface QueueJobDocument {
  _id: Types.ObjectId;
  bullJobId: string;
  queueName: string;
  executionId: Types.ObjectId;
  nodeId: string;
  status: string;
  data: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  attemptsMade: number;
  processedAt?: Date;
  finishedAt?: Date;
  failedReason?: string;
  logs: Array<{ timestamp: Date; message: string; level: string }>;
  movedToDlq: boolean;
  createdAt: Date;
  updatedAt: Date;
}
