import type { Edge, Node } from '@xyflow/react';

// =============================================================================
// HANDLE TYPES
// =============================================================================

export type HandleType = 'image' | 'text' | 'video' | 'number' | 'audio';

export interface HandleDefinition {
  id: string;
  type: HandleType;
  label: string;
  multiple?: boolean;
  required?: boolean;
}

// Connection validation rules
export const CONNECTION_RULES: Record<HandleType, HandleType[]> = {
  image: ['image'],
  text: ['text'],
  video: ['video'],
  number: ['number'],
  audio: ['audio'],
};

// =============================================================================
// PROVIDER TYPES
// =============================================================================

export type ProviderType = 'replicate' | 'fal' | 'huggingface';

export type ModelCapability =
  | 'text-to-image'
  | 'image-to-image'
  | 'text-to-video'
  | 'image-to-video';

export interface ProviderModel {
  id: string;
  displayName: string;
  provider: ProviderType;
  capabilities: ModelCapability[];
  description?: string;
  thumbnail?: string;
  pricing?: string;
}

export interface SelectedModel {
  provider: ProviderType;
  modelId: string;
  displayName: string;
}

// =============================================================================
// NODE TYPES
// =============================================================================

export type NodeType =
  // Input nodes
  | 'imageInput'
  | 'audioInput'
  | 'videoInput'
  | 'prompt'
  | 'template'
  // AI generation nodes
  | 'imageGen'
  | 'videoGen'
  | 'llm'
  | 'lipSync'
  | 'voiceChange'
  | 'textToSpeech'
  | 'transcribe'
  // Processing nodes
  | 'resize'
  | 'animation'
  | 'videoStitch'
  | 'videoTrim'
  | 'videoFrameExtract'
  | 'reframe'
  | 'upscale'
  | 'imageGridSplit'
  | 'annotation'
  | 'subtitle'
  // Output nodes
  | 'output'
  // Composition nodes (workflow-as-node)
  | 'workflowInput'
  | 'workflowOutput'
  | 'workflowRef';

export type NodeCategory = 'input' | 'ai' | 'processing' | 'output' | 'composition';

export type NodeStatus = 'idle' | 'pending' | 'processing' | 'complete' | 'error';

// NodeStatus constants to avoid 'as NodeStatus' assertions
export const NODE_STATUS: Record<NodeStatus, NodeStatus> = {
  idle: 'idle',
  pending: 'pending',
  processing: 'processing',
  complete: 'complete',
  error: 'error',
} as const;

// =============================================================================
// BASE NODE DATA
// =============================================================================

export interface BaseNodeData extends Record<string, unknown> {
  label: string;
  status: NodeStatus;
  error?: string;
  progress?: number;
  // Lock state for skipping during execution
  isLocked?: boolean;
  cachedOutput?: unknown;
  lockTimestamp?: number;
  // Optional comment/note for the node (used for comment navigation)
  comment?: string;
}

// =============================================================================
// INPUT NODE DATA
// =============================================================================

export interface ImageInputNodeData extends BaseNodeData {
  image: string | null;
  filename: string | null;
  dimensions: { width: number; height: number } | null;
  source: 'upload' | 'url';
  url?: string;
}

export interface PromptNodeData extends BaseNodeData {
  prompt: string;
  variables: Record<string, string>;
}

export interface TemplateNodeData extends BaseNodeData {
  templateId: string;
  templateName: string;
  variables: Record<string, string>;
  resolvedPrompt: string | null;
}

export interface AudioInputNodeData extends BaseNodeData {
  audio: string | null;
  filename: string | null;
  duration: number | null;
  source: 'upload' | 'url';
  url?: string;
}

export interface VideoInputNodeData extends BaseNodeData {
  video: string | null;
  filename: string | null;
  duration: number | null;
  dimensions: { width: number; height: number } | null;
  source: 'upload' | 'url';
  url?: string;
}

// =============================================================================
// AI NODE DATA
// =============================================================================

export type ImageModel = 'nano-banana' | 'nano-banana-pro';
export type VideoModel = 'veo-3.1-fast' | 'veo-3.1';
export type AspectRatio =
  | '1:1'
  | '16:9'
  | '9:16'
  | '4:3'
  | '3:4'
  | '4:5'
  | '5:4'
  | '2:3'
  | '3:2'
  | '21:9';
export type Resolution = '1K' | '2K' | '4K';
export type VideoResolution = '720p' | '1080p';
export type VideoDuration = 4 | 6 | 8;
export type OutputFormat = 'jpg' | 'png' | 'webp';

// Luma Reframe types
export type LumaAspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9' | '9:21' | '21:9';
export type LumaReframeModel = 'photon-flash-1' | 'photon-1';

export interface GridPosition {
  x: number;
  y: number;
}

// Topaz types
export type TopazEnhanceModel =
  | 'Standard V2'
  | 'Low Resolution V2'
  | 'CGI'
  | 'High Fidelity V2'
  | 'Text Refine';
export type TopazUpscaleFactor = 'None' | '2x' | '4x' | '6x';
export type TopazVideoResolution = '720p' | '1080p' | '4k';
export type TopazVideoFPS = 15 | 24 | 30 | 60;

export interface ImageGenNodeData extends BaseNodeData {
  // Inputs from connections
  inputImages: string[];
  inputPrompt: string | null;

  // Output
  outputImage: string | null;

  // Model config
  model: ImageModel;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  outputFormat: OutputFormat;

  // Provider (optional, defaults to replicate)
  provider?: ProviderType;
  selectedModel?: SelectedModel;

  // Job state
  jobId: string | null;
}

export interface VideoGenNodeData extends BaseNodeData {
  // Inputs from connections
  inputImage: string | null;
  lastFrame: string | null;
  referenceImages: string[];
  inputPrompt: string | null;
  negativePrompt: string;

  // Output
  outputVideo: string | null;

  // Model config
  model: VideoModel;
  duration: VideoDuration;
  aspectRatio: AspectRatio;
  resolution: VideoResolution;
  generateAudio: boolean;

  // Provider (optional, defaults to replicate)
  provider?: ProviderType;
  selectedModel?: SelectedModel;

  // Job state
  jobId: string | null;
}

export interface LLMNodeData extends BaseNodeData {
  // Inputs from connections
  inputPrompt: string | null;

  // Output
  outputText: string | null;

  // Model config
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  topP: number;

  // Job state
  jobId: string | null;
}

export type LipSyncModel =
  | 'sync/lipsync-2-pro'
  | 'sync/lipsync-2'
  | 'bytedance/latentsync'
  | 'pixverse/lipsync';

export type LipSyncMode = 'loop' | 'bounce' | 'cut_off' | 'silence' | 'remap';

export interface LipSyncNodeData extends BaseNodeData {
  // Inputs from connections
  inputImage: string | null;
  inputVideo: string | null;
  inputAudio: string | null;

  // Output
  outputVideo: string | null;

  // Config
  model: LipSyncModel;
  syncMode: LipSyncMode;
  temperature: number;
  activeSpeaker: boolean;

  // Job state
  jobId: string | null;
}

export interface VoiceChangeNodeData extends BaseNodeData {
  // Inputs from connections
  inputVideo: string | null;
  inputAudio: string | null;

  // Output
  outputVideo: string | null;

  // Config
  preserveOriginalAudio: boolean;
  audioMixLevel: number;

  // Job state
  jobId: string | null;
}

export type TTSProvider = 'elevenlabs' | 'openai';

export type TTSVoice =
  | 'rachel'
  | 'drew'
  | 'clyde'
  | 'paul'
  | 'domi'
  | 'dave'
  | 'fin'
  | 'sarah'
  | 'antoni'
  | 'thomas'
  | 'charlie'
  | 'george'
  | 'emily'
  | 'elli'
  | 'callum'
  | 'patrick'
  | 'harry'
  | 'liam'
  | 'dorothy'
  | 'josh'
  | 'arnold'
  | 'charlotte'
  | 'matilda'
  | 'matthew'
  | 'james'
  | 'joseph'
  | 'jeremy'
  | 'michael'
  | 'ethan'
  | 'gigi'
  | 'freya'
  | 'grace'
  | 'daniel'
  | 'lily'
  | 'serena'
  | 'adam'
  | 'nicole'
  | 'jessie'
  | 'ryan'
  | 'sam'
  | 'glinda'
  | 'giovanni'
  | 'mimi';

export interface TextToSpeechNodeData extends BaseNodeData {
  // Input from connection
  inputText: string | null;

  // Output
  outputAudio: string | null;

  // Config
  provider: TTSProvider;
  voice: TTSVoice;
  stability: number;
  similarityBoost: number;
  speed: number;

  // Job state
  jobId: string | null;
}

export type TranscribeLanguage = 'auto' | 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh' | 'ko' | 'pt';

export interface TranscribeNodeData extends BaseNodeData {
  // Inputs from connections
  inputVideo: string | null;
  inputAudio: string | null;

  // Output
  outputText: string | null;

  // Config
  language: TranscribeLanguage;
  timestamps: boolean;

  // Job state
  jobId: string | null;
}

// =============================================================================
// PROCESSING NODE DATA
// =============================================================================

export type EasingPreset =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInOutQuad'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic'
  | 'easeInExpo'
  | 'easeOutExpo'
  | 'easeInOutExpo';

export type CubicBezier = [number, number, number, number];

export interface AnimationNodeData extends BaseNodeData {
  // Inputs from connections
  inputVideo: string | null;

  // Output
  outputVideo: string | null;

  // Easing config
  curveType: 'preset' | 'custom';
  preset: EasingPreset;
  customCurve: CubicBezier;

  // Time-warp settings
  speedMultiplier: number;
}

export type TransitionType = 'cut' | 'crossfade' | 'wipe' | 'fade';

// Audio codec options for social media compatibility
// AAC: Best compatibility (Twitter, Instagram, TikTok)
// MP3: Fallback for older players
export type AudioCodec = 'aac' | 'mp3';

// Output quality presets
// full: Original quality, slower encoding
// draft: 720p @ 4Mbps, faster preview (inspired by easy-peasy-ease)
export type OutputQuality = 'full' | 'draft';

export interface VideoStitchNodeData extends BaseNodeData {
  // Inputs from connections
  inputVideos: string[];

  // Output
  outputVideo: string | null;

  // Stitch config
  transitionType: TransitionType;
  transitionDuration: number;
  seamlessLoop: boolean;

  // Audio/quality settings (easy-peasy-ease inspired)
  audioCodec: AudioCodec;
  outputQuality: OutputQuality;
}

export interface ResizeNodeData extends BaseNodeData {
  // Inputs from connections
  inputMedia: string | null;
  inputType: 'image' | 'video' | null;

  // Output
  outputMedia: string | null;

  // Resize config (uses Luma models)
  targetAspectRatio: LumaAspectRatio;
  prompt: string;
  gridPosition: GridPosition;

  // Job state
  jobId: string | null;
}

export interface VideoTrimNodeData extends BaseNodeData {
  // Inputs from connections
  inputVideo: string | null;

  // Output
  outputVideo: string | null;

  // Trim config (in seconds)
  startTime: number;
  endTime: number;
  duration: number | null;

  // Job state
  jobId: string | null;
}

// Frame selection mode for video frame extraction
export type FrameSelectionMode = 'first' | 'last' | 'timestamp' | 'percentage';

export interface VideoFrameExtractNodeData extends BaseNodeData {
  // Input from connection
  inputVideo: string | null;

  // Output
  outputImage: string | null;

  // Config
  selectionMode: FrameSelectionMode;
  timestampSeconds: number;
  percentagePosition: number;

  // Video metadata (populated from input)
  videoDuration: number | null;

  // Job state
  jobId: string | null;
}

// =============================================================================
// REFRAME NODE DATA
// =============================================================================

export type ReframeInputType = 'image' | 'video' | null;

export interface ReframeNodeData extends BaseNodeData {
  // Inputs from connections (accepts either image or video)
  inputImage: string | null;
  inputVideo: string | null;
  inputType: ReframeInputType; // Auto-detected from connection

  // Outputs (matches input type)
  outputImage: string | null;
  outputVideo: string | null;

  // Config
  model: LumaReframeModel; // Model selection dropdown
  aspectRatio: LumaAspectRatio;
  prompt: string;
  gridPosition: GridPosition;

  // Job state
  jobId: string | null;
}

// =============================================================================
// UPSCALE NODE DATA
// =============================================================================

export type UpscaleInputType = 'image' | 'video' | null;

// Available upscale models
export type UpscaleModel =
  | 'topaz-standard-v2'
  | 'topaz-low-res-v2'
  | 'topaz-cgi'
  | 'topaz-high-fidelity-v2'
  | 'topaz-text-refine'
  | 'topaz-video';

export interface UpscaleNodeData extends BaseNodeData {
  // Inputs from connections (accepts either image or video)
  inputImage: string | null;
  inputVideo: string | null;
  inputType: UpscaleInputType; // Auto-detected from connection

  // Outputs (matches input type)
  outputImage: string | null;
  outputVideo: string | null;
  originalPreview: string | null;
  outputPreview: string | null; // For video frame comparison

  // Shared config
  model: UpscaleModel; // Model selection dropdown

  // Image-specific config
  upscaleFactor: TopazUpscaleFactor;
  outputFormat: 'jpg' | 'png';
  faceEnhancement: boolean;
  faceEnhancementStrength: number;
  faceEnhancementCreativity: number;

  // Video-specific config
  targetResolution: TopazVideoResolution;
  targetFps: TopazVideoFPS;

  // Comparison state
  showComparison: boolean;
  comparisonPosition: number;

  // Job state
  jobId: string | null;
}

export type GridOutputFormat = 'jpg' | 'png' | 'webp';

export interface ImageGridSplitNodeData extends BaseNodeData {
  // Input from connection
  inputImage: string | null;

  // Outputs (multiple images)
  outputImages: string[];

  // Config
  gridRows: number; // 1-10
  gridCols: number; // 1-10
  borderInset: number; // Pixels to crop from each cell edge (0-50)
  outputFormat: GridOutputFormat;
  quality: number; // 1-100
}

// Annotation shape types (simplified for node storage)
export interface AnnotationShapeData {
  id: string;
  type: 'rectangle' | 'circle' | 'arrow' | 'freehand' | 'text';
  strokeColor: string;
  strokeWidth: number;
  fillColor: string | null;
  // Shape-specific properties stored as generic record
  props: Record<string, unknown>;
}

export interface AnnotationNodeData extends BaseNodeData {
  // Input from connection
  inputImage: string | null;

  // Output (image with annotations rendered)
  outputImage: string | null;

  // Annotations stored on the node
  annotations: AnnotationShapeData[];
  hasAnnotations: boolean;
}

export type SubtitleStyle = 'default' | 'modern' | 'minimal' | 'bold';
export type SubtitlePosition = 'top' | 'center' | 'bottom';

export interface SubtitleNodeData extends BaseNodeData {
  // Inputs from connections
  inputVideo: string | null;
  inputText: string | null;

  // Output
  outputVideo: string | null;

  // Config
  style: SubtitleStyle;
  position: SubtitlePosition;
  fontSize: number;
  fontColor: string;
  backgroundColor: string | null;
  fontFamily: string;

  // Job state
  jobId: string | null;
}

// =============================================================================
// OUTPUT NODE DATA
// =============================================================================

export interface OutputNodeData extends BaseNodeData {
  // Inputs from connections
  inputMedia: string | null;
  inputType: 'image' | 'video' | 'text' | null;

  // Output name for saving
  outputName: string;
}

// =============================================================================
// COMPOSITION NODE DATA (workflow-as-node)
// =============================================================================

export interface WorkflowInputNodeData extends BaseNodeData {
  // Config for this input boundary
  inputName: string;
  inputType: HandleType;
  required: boolean;
  description?: string;
}

export interface WorkflowOutputNodeData extends BaseNodeData {
  // Config for this output boundary
  outputName: string;
  outputType: HandleType;
  description?: string;

  // Input from connection (what gets returned when workflow completes)
  inputValue: string | null;
}

// Cached interface from referenced workflow
export interface WorkflowInterfaceInput {
  nodeId: string;
  name: string;
  type: HandleType;
  required: boolean;
}

export interface WorkflowInterfaceOutput {
  nodeId: string;
  name: string;
  type: HandleType;
}

export interface WorkflowInterface {
  inputs: WorkflowInterfaceInput[];
  outputs: WorkflowInterfaceOutput[];
}

export interface WorkflowRefNodeData extends BaseNodeData {
  // Reference to child workflow
  referencedWorkflowId: string | null;
  referencedWorkflowName: string | null;

  // Cached interface (refreshed on save or manually)
  cachedInterface: WorkflowInterface | null;

  // Runtime: mapped inputs from parent connections
  inputMappings: Record<string, string | null>;

  // Runtime: outputs received from child execution
  outputMappings: Record<string, string | null>;

  // Child execution tracking
  childExecutionId: string | null;
}

// =============================================================================
// NODE DATA UNION
// =============================================================================

export type WorkflowNodeData =
  | ImageInputNodeData
  | AudioInputNodeData
  | VideoInputNodeData
  | PromptNodeData
  | TemplateNodeData
  | ImageGenNodeData
  | VideoGenNodeData
  | LLMNodeData
  | LipSyncNodeData
  | VoiceChangeNodeData
  | TextToSpeechNodeData
  | TranscribeNodeData
  | AnimationNodeData
  | VideoStitchNodeData
  | ResizeNodeData
  | VideoTrimNodeData
  | VideoFrameExtractNodeData
  | ReframeNodeData
  | UpscaleNodeData
  | ImageGridSplitNodeData
  | AnnotationNodeData
  | SubtitleNodeData
  | OutputNodeData
  // Composition nodes
  | WorkflowInputNodeData
  | WorkflowOutputNodeData
  | WorkflowRefNodeData;

// =============================================================================
// WORKFLOW NODE & EDGE
// =============================================================================

export type WorkflowNode = Node<WorkflowNodeData, NodeType>;
export type WorkflowEdge = Edge;

// =============================================================================
// NODE DEFINITION (for registry)
// =============================================================================

export interface NodeDefinition {
  type: NodeType;
  label: string;
  description: string;
  category: NodeCategory;
  icon: string;
  inputs: HandleDefinition[];
  outputs: HandleDefinition[];
  defaultData: Partial<WorkflowNodeData>;
}

// =============================================================================
// NODE REGISTRY
// =============================================================================

export const NODE_DEFINITIONS: Record<NodeType, NodeDefinition> = {
  // Input nodes
  imageInput: {
    type: 'imageInput',
    label: 'Image',
    description: 'Upload or reference an image',
    category: 'input',
    icon: 'Image',
    inputs: [],
    outputs: [{ id: 'image', type: 'image', label: 'Image' }],
    defaultData: {
      label: 'Image',
      status: 'idle',
      image: null,
      filename: null,
      dimensions: null,
      source: 'upload',
    },
  },
  prompt: {
    type: 'prompt',
    label: 'Prompt',
    description: 'Text prompt for AI generation',
    category: 'input',
    icon: 'MessageSquare',
    inputs: [],
    outputs: [{ id: 'text', type: 'text', label: 'Prompt' }],
    defaultData: {
      label: 'Prompt',
      status: 'idle',
      prompt: '',
      variables: {},
    },
  },
  template: {
    type: 'template',
    label: 'Template',
    description: 'Preset prompt template',
    category: 'input',
    icon: 'FileText',
    inputs: [],
    outputs: [{ id: 'text', type: 'text', label: 'Prompt' }],
    defaultData: {
      label: 'Template',
      status: 'idle',
      templateId: '',
      templateName: '',
      variables: {},
      resolvedPrompt: null,
    },
  },
  audioInput: {
    type: 'audioInput',
    label: 'Audio',
    description: 'Upload an audio file (MP3, WAV)',
    category: 'input',
    icon: 'Volume2',
    inputs: [],
    outputs: [{ id: 'audio', type: 'audio', label: 'Audio' }],
    defaultData: {
      label: 'Audio',
      status: 'idle',
      audio: null,
      filename: null,
      duration: null,
      source: 'upload',
    },
  },
  videoInput: {
    type: 'videoInput',
    label: 'Video',
    description: 'Upload or reference a video file',
    category: 'input',
    icon: 'FileVideo',
    inputs: [],
    outputs: [{ id: 'video', type: 'video', label: 'Video' }],
    defaultData: {
      label: 'Video',
      status: 'idle',
      video: null,
      filename: null,
      duration: null,
      dimensions: null,
      source: 'upload',
    },
  },

  // AI nodes
  imageGen: {
    type: 'imageGen',
    label: 'Image Generator',
    description: 'Generate images with nano-banana models',
    category: 'ai',
    icon: 'Sparkles',
    inputs: [
      { id: 'prompt', type: 'text', label: 'Prompt', required: true },
      { id: 'images', type: 'image', label: 'Reference Images', multiple: true },
    ],
    outputs: [{ id: 'image', type: 'image', label: 'Generated Image' }],
    defaultData: {
      label: 'Image Generator',
      status: 'idle',
      inputImages: [],
      inputPrompt: null,
      outputImage: null,
      model: 'nano-banana-pro',
      aspectRatio: '1:1',
      resolution: '2K',
      outputFormat: 'jpg',
      jobId: null,
    },
  },
  videoGen: {
    type: 'videoGen',
    label: 'Video Generator',
    description: 'Generate videos with veo-3.1 models',
    category: 'ai',
    icon: 'Video',
    inputs: [
      { id: 'prompt', type: 'text', label: 'Prompt', required: true },
      { id: 'image', type: 'image', label: 'Starting Frame' },
      { id: 'lastFrame', type: 'image', label: 'Last Frame (interpolation)' },
    ],
    outputs: [{ id: 'video', type: 'video', label: 'Generated Video' }],
    defaultData: {
      label: 'Video Generator',
      status: 'idle',
      inputImage: null,
      lastFrame: null,
      referenceImages: [],
      inputPrompt: null,
      negativePrompt: '',
      outputVideo: null,
      model: 'veo-3.1-fast',
      duration: 8,
      aspectRatio: '16:9',
      resolution: '1080p',
      generateAudio: true,
      jobId: null,
    },
  },
  llm: {
    type: 'llm',
    label: 'LLM',
    description: 'Generate text with meta-llama',
    category: 'ai',
    icon: 'Brain',
    inputs: [{ id: 'prompt', type: 'text', label: 'Prompt', required: true }],
    outputs: [{ id: 'text', type: 'text', label: 'Generated Text' }],
    defaultData: {
      label: 'LLM',
      status: 'idle',
      inputPrompt: null,
      outputText: null,
      systemPrompt: 'You are a creative assistant helping generate content prompts.',
      temperature: 0.7,
      maxTokens: 1024,
      topP: 0.9,
      jobId: null,
    },
  },
  lipSync: {
    type: 'lipSync',
    label: 'Lip Sync',
    description: 'Generate talking-head video from image/video and audio using Replicate',
    category: 'ai',
    icon: 'Mic',
    inputs: [
      { id: 'image', type: 'image', label: 'Face Image' },
      { id: 'video', type: 'video', label: 'Source Video' },
      { id: 'audio', type: 'audio', label: 'Audio', required: true },
    ],
    outputs: [{ id: 'video', type: 'video', label: 'Generated Video' }],
    defaultData: {
      label: 'Lip Sync',
      status: 'idle',
      inputImage: null,
      inputVideo: null,
      inputAudio: null,
      outputVideo: null,
      model: 'sync/lipsync-2',
      syncMode: 'loop',
      temperature: 0.5,
      activeSpeaker: false,
      jobId: null,
    },
  },
  voiceChange: {
    type: 'voiceChange',
    label: 'Voice Change',
    description: 'Replace or mix audio track in a video',
    category: 'ai',
    icon: 'AudioLines',
    inputs: [
      { id: 'video', type: 'video', label: 'Video', required: true },
      { id: 'audio', type: 'audio', label: 'New Audio', required: true },
    ],
    outputs: [{ id: 'video', type: 'video', label: 'Output Video' }],
    defaultData: {
      label: 'Voice Change',
      status: 'idle',
      inputVideo: null,
      inputAudio: null,
      outputVideo: null,
      preserveOriginalAudio: false,
      audioMixLevel: 0.5,
      jobId: null,
    },
  },
  textToSpeech: {
    type: 'textToSpeech',
    label: 'Text to Speech',
    description: 'Convert text to natural-sounding speech using ElevenLabs',
    category: 'ai',
    icon: 'AudioLines',
    inputs: [{ id: 'text', type: 'text', label: 'Text', required: true }],
    outputs: [{ id: 'audio', type: 'audio', label: 'Audio' }],
    defaultData: {
      label: 'Text to Speech',
      status: 'idle',
      inputText: null,
      outputAudio: null,
      provider: 'elevenlabs',
      voice: 'rachel',
      stability: 0.5,
      similarityBoost: 0.75,
      speed: 1.0,
      jobId: null,
    },
  },
  transcribe: {
    type: 'transcribe',
    label: 'Transcribe',
    description: 'Convert video or audio to text transcript',
    category: 'ai',
    icon: 'FileText',
    inputs: [
      { id: 'video', type: 'video', label: 'Video' },
      { id: 'audio', type: 'audio', label: 'Audio' },
    ],
    outputs: [{ id: 'text', type: 'text', label: 'Transcript' }],
    defaultData: {
      label: 'Transcribe',
      status: 'idle',
      inputVideo: null,
      inputAudio: null,
      outputText: null,
      language: 'auto',
      timestamps: false,
      jobId: null,
    },
  },

  // Processing nodes
  resize: {
    type: 'resize',
    label: 'Resize',
    description: 'Resize images or videos to different aspect ratios using Luma AI',
    category: 'processing',
    icon: 'Maximize2',
    inputs: [{ id: 'media', type: 'image', label: 'Media', required: true }],
    outputs: [{ id: 'media', type: 'image', label: 'Resized Media' }],
    defaultData: {
      label: 'Resize',
      status: 'idle',
      inputMedia: null,
      inputType: null,
      outputMedia: null,
      targetAspectRatio: '16:9',
      prompt: '',
      gridPosition: { x: 0.5, y: 0.5 },
      jobId: null,
    },
  },
  animation: {
    type: 'animation',
    label: 'Animation',
    description: 'Apply easing curve to video',
    category: 'processing',
    icon: 'Wand2',
    inputs: [{ id: 'video', type: 'video', label: 'Video', required: true }],
    outputs: [{ id: 'video', type: 'video', label: 'Animated Video' }],
    defaultData: {
      label: 'Animation',
      status: 'idle',
      inputVideo: null,
      outputVideo: null,
      curveType: 'preset',
      preset: 'easeInOutCubic',
      customCurve: [0.645, 0.045, 0.355, 1],
      speedMultiplier: 1,
    },
  },
  videoStitch: {
    type: 'videoStitch',
    label: 'Video Stitch',
    description: 'Concatenate multiple videos',
    category: 'processing',
    icon: 'Layers',
    inputs: [{ id: 'videos', type: 'video', label: 'Videos', multiple: true, required: true }],
    outputs: [{ id: 'video', type: 'video', label: 'Stitched Video' }],
    defaultData: {
      label: 'Video Stitch',
      status: 'idle',
      inputVideos: [],
      outputVideo: null,
      transitionType: 'crossfade',
      transitionDuration: 0.5,
      seamlessLoop: false,
    },
  },
  videoTrim: {
    type: 'videoTrim',
    label: 'Video Trim',
    description: 'Trim video to a specific time range',
    category: 'processing',
    icon: 'Scissors',
    inputs: [{ id: 'video', type: 'video', label: 'Video', required: true }],
    outputs: [{ id: 'video', type: 'video', label: 'Trimmed Video' }],
    defaultData: {
      label: 'Video Trim',
      status: 'idle',
      inputVideo: null,
      outputVideo: null,
      startTime: 0,
      endTime: 60,
      duration: null,
      jobId: null,
    },
  },
  videoFrameExtract: {
    type: 'videoFrameExtract',
    label: 'Frame Extract',
    description: 'Extract a specific frame from video as image',
    category: 'processing',
    icon: 'Film',
    inputs: [{ id: 'video', type: 'video', label: 'Video', required: true }],
    outputs: [{ id: 'image', type: 'image', label: 'Extracted Frame' }],
    defaultData: {
      label: 'Frame Extract',
      status: 'idle',
      inputVideo: null,
      outputImage: null,
      selectionMode: 'last',
      timestampSeconds: 0,
      percentagePosition: 100,
      videoDuration: null,
      jobId: null,
    },
  },
  reframe: {
    type: 'reframe',
    label: 'Reframe',
    description: 'Reframe images or videos to different aspect ratios with AI outpainting',
    category: 'processing',
    icon: 'Crop',
    inputs: [
      { id: 'image', type: 'image', label: 'Image' },
      { id: 'video', type: 'video', label: 'Video' },
    ],
    outputs: [
      { id: 'image', type: 'image', label: 'Reframed Image' },
      { id: 'video', type: 'video', label: 'Reframed Video' },
    ],
    defaultData: {
      label: 'Reframe',
      status: 'idle',
      inputImage: null,
      inputVideo: null,
      inputType: null,
      outputImage: null,
      outputVideo: null,
      model: 'photon-flash-1',
      aspectRatio: '16:9',
      prompt: '',
      gridPosition: { x: 0.5, y: 0.5 },
      jobId: null,
    },
  },
  upscale: {
    type: 'upscale',
    label: 'Upscale',
    description: 'AI-powered upscaling for images and videos',
    category: 'processing',
    icon: 'Maximize',
    inputs: [
      { id: 'image', type: 'image', label: 'Image' },
      { id: 'video', type: 'video', label: 'Video' },
    ],
    outputs: [
      { id: 'image', type: 'image', label: 'Upscaled Image' },
      { id: 'video', type: 'video', label: 'Upscaled Video' },
    ],
    defaultData: {
      label: 'Upscale',
      status: 'idle',
      inputImage: null,
      inputVideo: null,
      inputType: null,
      outputImage: null,
      outputVideo: null,
      originalPreview: null,
      outputPreview: null,
      model: 'topaz-standard-v2',
      upscaleFactor: '2x',
      outputFormat: 'png',
      faceEnhancement: false,
      faceEnhancementStrength: 80,
      faceEnhancementCreativity: 0,
      targetResolution: '1080p',
      targetFps: 30,
      showComparison: true,
      comparisonPosition: 50,
      jobId: null,
    },
  },
  imageGridSplit: {
    type: 'imageGridSplit',
    label: 'Grid Split',
    description: 'Split image into grid cells',
    category: 'processing',
    icon: 'Grid3X3',
    inputs: [{ id: 'image', type: 'image', label: 'Image', required: true }],
    outputs: [{ id: 'images', type: 'image', label: 'Split Images', multiple: true }],
    defaultData: {
      label: 'Grid Split',
      status: 'idle',
      inputImage: null,
      outputImages: [],
      gridRows: 2,
      gridCols: 3,
      borderInset: 10,
      outputFormat: 'jpg',
      quality: 95,
    },
  },
  annotation: {
    type: 'annotation',
    label: 'Annotation',
    description: 'Add shapes, arrows, and text to images',
    category: 'processing',
    icon: 'Pencil',
    inputs: [{ id: 'image', type: 'image', label: 'Image', required: true }],
    outputs: [{ id: 'image', type: 'image', label: 'Annotated Image' }],
    defaultData: {
      label: 'Annotation',
      status: 'idle',
      inputImage: null,
      outputImage: null,
      annotations: [],
      hasAnnotations: false,
    },
  },
  subtitle: {
    type: 'subtitle',
    label: 'Subtitle',
    description: 'Burn subtitles into video using FFmpeg',
    category: 'processing',
    icon: 'Subtitles',
    inputs: [
      { id: 'video', type: 'video', label: 'Video', required: true },
      { id: 'text', type: 'text', label: 'Subtitle Text', required: true },
    ],
    outputs: [{ id: 'video', type: 'video', label: 'Video with Subtitles' }],
    defaultData: {
      label: 'Subtitle',
      status: 'idle',
      inputVideo: null,
      inputText: null,
      outputVideo: null,
      style: 'modern',
      position: 'bottom',
      fontSize: 24,
      fontColor: '#FFFFFF',
      backgroundColor: 'rgba(0,0,0,0.7)',
      fontFamily: 'Arial',
      jobId: null,
    },
  },

  // Output nodes
  output: {
    type: 'output',
    label: 'Output',
    description: 'Final workflow output',
    category: 'output',
    icon: 'CheckCircle',
    inputs: [{ id: 'media', type: 'image', label: 'Media', required: true }],
    outputs: [],
    defaultData: {
      label: 'Output',
      status: 'idle',
      inputMedia: null,
      inputType: null,
      outputName: 'output',
    },
  },

  // Composition nodes (workflow-as-node)
  workflowInput: {
    type: 'workflowInput',
    label: 'Workflow Input',
    description: 'Define an input port for when this workflow is used as a subworkflow',
    category: 'composition',
    icon: 'ArrowRightToLine',
    inputs: [],
    outputs: [{ id: 'value', type: 'image', label: 'Value' }], // Type is dynamic based on inputType
    defaultData: {
      label: 'Workflow Input',
      status: 'idle',
      inputName: 'input',
      inputType: 'image',
      required: true,
      description: '',
    },
  },
  workflowOutput: {
    type: 'workflowOutput',
    label: 'Workflow Output',
    description: 'Define an output port for when this workflow is used as a subworkflow',
    category: 'composition',
    icon: 'ArrowLeftFromLine',
    inputs: [{ id: 'value', type: 'image', label: 'Value', required: true }], // Type is dynamic based on outputType
    outputs: [],
    defaultData: {
      label: 'Workflow Output',
      status: 'idle',
      outputName: 'output',
      outputType: 'image',
      description: '',
      inputValue: null,
    },
  },
  workflowRef: {
    type: 'workflowRef',
    label: 'Subworkflow',
    description: 'Reference another workflow as a subworkflow',
    category: 'composition',
    icon: 'GitBranch',
    inputs: [], // Dynamic based on referenced workflow interface
    outputs: [], // Dynamic based on referenced workflow interface
    defaultData: {
      label: 'Subworkflow',
      status: 'idle',
      referencedWorkflowId: null,
      referencedWorkflowName: null,
      cachedInterface: null,
      inputMappings: {},
      outputMappings: {},
      childExecutionId: null,
    },
  },
};

// Explicit ordering for each category (most used first)
const NODE_ORDER: Record<NodeCategory, NodeType[]> = {
  input: ['imageInput', 'videoInput', 'audioInput', 'prompt', 'template'],
  ai: ['imageGen', 'videoGen', 'llm', 'lipSync', 'textToSpeech', 'transcribe', 'voiceChange'],
  processing: [
    'reframe',
    'upscale',
    'resize',
    'videoStitch',
    'videoTrim',
    'videoFrameExtract',
    'imageGridSplit',
    'annotation',
    'subtitle',
    'animation',
  ],
  output: ['output'],
  composition: ['workflowRef', 'workflowInput', 'workflowOutput'],
};

// Helper to get nodes by category with explicit ordering
export function getNodesByCategory(): Record<NodeCategory, NodeDefinition[]> {
  const categories: Record<NodeCategory, NodeDefinition[]> = {
    input: [],
    ai: [],
    processing: [],
    output: [],
    composition: [],
  };

  for (const category of Object.keys(NODE_ORDER) as NodeCategory[]) {
    for (const nodeType of NODE_ORDER[category]) {
      const def = NODE_DEFINITIONS[nodeType];
      if (def) {
        categories[category].push(def);
      }
    }
  }

  return categories;
}
