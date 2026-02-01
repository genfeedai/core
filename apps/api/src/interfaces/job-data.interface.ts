import type { Types } from 'mongoose';
import { ReframeNodeType, UpscaleNodeType } from '@genfeedai/types';

/**
 * Base job data interface
 */
export interface BaseJobData {
  executionId: string;
  workflowId: string;
  timestamp: string;
  /** Debug mode - skip API calls and return mock data */
  debugMode?: boolean;
}

/**
 * Workflow orchestrator job data
 */
export interface WorkflowJobData extends BaseJobData {
  /** Selected node IDs for partial execution (empty = execute all) */
  selectedNodeIds?: string[];
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
 * Selected model info from frontend
 */
export interface SelectedModelInfo {
  provider: string;
  modelId: string;
  displayName?: string;
  inputSchema?: Record<string, unknown>;
}

/**
 * Image generation job data
 */
export interface ImageJobData extends NodeJobData {
  nodeType: 'imageGen';
  nodeData: {
    model: 'nano-banana' | 'nano-banana-pro';
    prompt?: string; // Legacy direct prompt field
    inputPrompt?: string; // Prompt from connection
    inputImages?: string[];
    aspectRatio?: string;
    resolution?: string;
    outputFormat?: string;
    selectedModel?: SelectedModelInfo;
    schemaParams?: Record<string, unknown>;
  };
}

/**
 * Video generation job data
 */
export interface VideoJobData extends NodeJobData {
  nodeType: 'videoGen';
  nodeData: {
    model: 'veo-3.1-fast' | 'veo-3.1';
    prompt?: string; // Legacy direct prompt field
    inputPrompt?: string; // Prompt from connection
    image?: string; // Legacy direct image field
    inputImage?: string; // Image from connection
    lastFrame?: string;
    referenceImages?: string[];
    duration?: number;
    aspectRatio?: string;
    resolution?: string;
    generateAudio?: boolean;
    negativePrompt?: string;
    seed?: number;
    selectedModel?: SelectedModelInfo;
    schemaParams?: Record<string, unknown>;
  };
}

/**
 * LLM provider type for selecting inference backend
 */
export type LLMProvider = 'replicate' | 'ollama';

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
    // Ollama-specific options
    provider?: LLMProvider;
    ollamaModel?: string; // e.g., 'llama3.1', 'mistral', 'codellama'
  };
}

/**
 * Motion Control job data (Kling AI)
 */
export interface MotionControlJobData extends NodeJobData {
  nodeType: 'motionControl';
  nodeData: {
    image: string; // Legacy direct image field
    inputImage?: string; // Image from connection
    video?: string; // Legacy direct video field (for video transfer mode)
    inputVideo?: string; // Video from connection (for video transfer mode)
    prompt?: string; // Legacy direct prompt field
    inputPrompt?: string; // Prompt from connection
    mode: 'trajectory' | 'camera' | 'combined' | 'video_transfer';
    duration: 5 | 10;
    aspectRatio: '16:9' | '9:16' | '1:1';
    // Trajectory points for path-based motion
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
  };
}

/**
 * Reframe job data
 */
export interface ReframeJobData extends NodeJobData {
  nodeType: ReframeNodeType;
  nodeData: {
    inputType: 'image' | 'video';
    // Image input (when inputType === 'image')
    image?: string;
    // Video input (when inputType === 'video')
    video?: string;
    aspectRatio: string;
    model?: 'photon-flash-1' | 'photon-1';
    prompt?: string;
    gridPosition?: { x: number; y: number };
  };
}

/**
 * Upscale job data
 */
export interface UpscaleJobData extends NodeJobData {
  nodeType: UpscaleNodeType;
  nodeData: {
    inputType: 'image' | 'video';
    // Image input (when inputType === 'image')
    image?: string;
    // Video input (when inputType === 'video')
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
    audio?: string;
    inputImage?: string; // From upstream connection
    inputVideo?: string; // From upstream connection
    inputAudio?: string; // From upstream connection (TextToSpeech, etc.)
    model: 'sync/lipsync-2' | 'sync/lipsync-2-pro' | 'pixverse/lipsync';
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
    text?: string;
    inputText?: string; // From upstream connection (Prompt, LLM, etc.)
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
 * Workflow reference (subworkflow) job data
 */
export interface WorkflowRefJobData extends NodeJobData {
  nodeType: 'workflowRef';
  nodeData: {
    referencedWorkflowId: string;
    inputMappings: Record<string, string | null>; // Maps child input names to values from parent
    cachedInterface: {
      inputs: Array<{ nodeId: string; name: string; type: string; required: boolean }>;
      outputs: Array<{ nodeId: string; name: string; type: string }>;
    };
  };
  // Nested execution tracking
  parentExecutionId: string;
  parentNodeId: string;
  depth: number;
}

/**
 * Union type for all processing job data
 */
export type ProcessingJobData =
  | ReframeJobData
  | UpscaleJobData
  | VideoFrameExtractJobData
  | LipSyncJobData
  | VoiceChangeJobData
  | TextToSpeechJobData
  | SubtitleJobData
  | VideoStitchJobData
  | WorkflowRefJobData;

/**
 * Job result interface
 */
export interface JobResult {
  success: boolean;
  output?: string | string[] | Record<string, unknown>;
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
