import type { Node, Edge, XYPosition } from "@xyflow/react";

// =============================================================================
// HANDLE TYPES
// =============================================================================

export type HandleType = "image" | "text" | "video" | "number";

export interface HandleDefinition {
  id: string;
  type: HandleType;
  label: string;
  multiple?: boolean;
  required?: boolean;
}

// Connection validation rules
export const CONNECTION_RULES: Record<HandleType, HandleType[]> = {
  image: ["image"],
  text: ["text"],
  video: ["video"],
  number: ["number"],
};

// =============================================================================
// NODE TYPES
// =============================================================================

export type NodeType =
  // Input nodes
  | "imageInput"
  | "prompt"
  | "template"
  // AI generation nodes
  | "imageGen"
  | "videoGen"
  | "llm"
  // Processing nodes
  | "resize"
  | "animation"
  | "videoStitch"
  // Output nodes
  | "output"
  | "preview"
  | "download";

export type NodeCategory = "input" | "ai" | "processing" | "output";

export type NodeStatus =
  | "idle"
  | "pending"
  | "processing"
  | "complete"
  | "error";

// =============================================================================
// BASE NODE DATA
// =============================================================================

export interface BaseNodeData extends Record<string, unknown> {
  label: string;
  status: NodeStatus;
  error?: string;
  progress?: number;
}

// =============================================================================
// INPUT NODE DATA
// =============================================================================

export interface ImageInputNodeData extends BaseNodeData {
  image: string | null;
  filename: string | null;
  dimensions: { width: number; height: number } | null;
  source: "upload" | "url";
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

// =============================================================================
// AI NODE DATA
// =============================================================================

export type ImageModel = "nano-banana" | "nano-banana-pro";
export type VideoModel = "veo-3.1-fast" | "veo-3.1";
export type AspectRatio =
  | "1:1"
  | "16:9"
  | "9:16"
  | "4:3"
  | "3:4"
  | "4:5"
  | "5:4"
  | "2:3"
  | "3:2"
  | "21:9";
export type Resolution = "1K" | "2K" | "4K";
export type VideoResolution = "720p" | "1080p";
export type VideoDuration = 4 | 6 | 8;
export type OutputFormat = "jpg" | "png" | "webp";

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

// =============================================================================
// PROCESSING NODE DATA
// =============================================================================

export type EasingPreset =
  | "linear"
  | "easeIn"
  | "easeOut"
  | "easeInOut"
  | "easeInQuad"
  | "easeOutQuad"
  | "easeInOutQuad"
  | "easeInCubic"
  | "easeOutCubic"
  | "easeInOutCubic"
  | "easeInExpo"
  | "easeOutExpo"
  | "easeInOutExpo";

export type CubicBezier = [number, number, number, number];

export interface AnimationNodeData extends BaseNodeData {
  // Inputs from connections
  inputVideo: string | null;

  // Output
  outputVideo: string | null;

  // Easing config
  curveType: "preset" | "custom";
  preset: EasingPreset;
  customCurve: CubicBezier;

  // Time-warp settings
  speedMultiplier: number;
}

export type TransitionType = "cut" | "crossfade" | "wipe" | "fade";

export interface VideoStitchNodeData extends BaseNodeData {
  // Inputs from connections
  inputVideos: string[];

  // Output
  outputVideo: string | null;

  // Stitch config
  transitionType: TransitionType;
  transitionDuration: number;
  seamlessLoop: boolean;
}

export interface ResizeNodeData extends BaseNodeData {
  // Inputs from connections
  inputMedia: string | null;
  inputType: "image" | "video" | null;

  // Output
  outputMedia: string | null;

  // Resize config
  targetAspectRatio: AspectRatio;
  targetWidth: number | null;
  targetHeight: number | null;
  fitMode: "contain" | "cover" | "fill";
}

// =============================================================================
// OUTPUT NODE DATA
// =============================================================================

export interface OutputNodeData extends BaseNodeData {
  // Inputs from connections
  inputMedia: string | null;
  inputType: "image" | "video" | "text" | null;

  // Output name for saving
  outputName: string;
}

export interface PreviewNodeData extends BaseNodeData {
  // Inputs from connections
  inputMedia: string | null;
  inputType: "image" | "video" | null;

  // Preview state
  isPlaying: boolean;
  volume: number;
}

export interface DownloadNodeData extends BaseNodeData {
  // Inputs from connections
  inputMedia: string | null;
  inputType: "image" | "video" | null;

  // Download config
  filename: string;
  format: string;
}

// =============================================================================
// NODE DATA UNION
// =============================================================================

export type WorkflowNodeData =
  | ImageInputNodeData
  | PromptNodeData
  | TemplateNodeData
  | ImageGenNodeData
  | VideoGenNodeData
  | LLMNodeData
  | AnimationNodeData
  | VideoStitchNodeData
  | ResizeNodeData
  | OutputNodeData
  | PreviewNodeData
  | DownloadNodeData;

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
    type: "imageInput",
    label: "Image Input",
    description: "Upload or reference an image",
    category: "input",
    icon: "Image",
    inputs: [],
    outputs: [{ id: "image", type: "image", label: "Image" }],
    defaultData: {
      label: "Image Input",
      status: "idle",
      image: null,
      filename: null,
      dimensions: null,
      source: "upload",
    },
  },
  prompt: {
    type: "prompt",
    label: "Prompt",
    description: "Text prompt for AI generation",
    category: "input",
    icon: "MessageSquare",
    inputs: [],
    outputs: [{ id: "text", type: "text", label: "Prompt" }],
    defaultData: {
      label: "Prompt",
      status: "idle",
      prompt: "",
      variables: {},
    },
  },
  template: {
    type: "template",
    label: "Template",
    description: "Preset prompt template",
    category: "input",
    icon: "FileText",
    inputs: [],
    outputs: [{ id: "text", type: "text", label: "Prompt" }],
    defaultData: {
      label: "Template",
      status: "idle",
      templateId: "",
      templateName: "",
      variables: {},
      resolvedPrompt: null,
    },
  },

  // AI nodes
  imageGen: {
    type: "imageGen",
    label: "Image Generator",
    description: "Generate images with nano-banana models",
    category: "ai",
    icon: "Sparkles",
    inputs: [
      { id: "prompt", type: "text", label: "Prompt", required: true },
      { id: "images", type: "image", label: "Reference Images", multiple: true },
    ],
    outputs: [{ id: "image", type: "image", label: "Generated Image" }],
    defaultData: {
      label: "Image Generator",
      status: "idle",
      inputImages: [],
      inputPrompt: null,
      outputImage: null,
      model: "nano-banana-pro",
      aspectRatio: "1:1",
      resolution: "2K",
      outputFormat: "jpg",
      jobId: null,
    },
  },
  videoGen: {
    type: "videoGen",
    label: "Video Generator",
    description: "Generate videos with veo-3.1 models",
    category: "ai",
    icon: "Video",
    inputs: [
      { id: "prompt", type: "text", label: "Prompt", required: true },
      { id: "image", type: "image", label: "Starting Frame" },
      { id: "lastFrame", type: "image", label: "Last Frame (interpolation)" },
    ],
    outputs: [{ id: "video", type: "video", label: "Generated Video" }],
    defaultData: {
      label: "Video Generator",
      status: "idle",
      inputImage: null,
      lastFrame: null,
      referenceImages: [],
      inputPrompt: null,
      negativePrompt: "",
      outputVideo: null,
      model: "veo-3.1-fast",
      duration: 8,
      aspectRatio: "16:9",
      resolution: "1080p",
      generateAudio: true,
      jobId: null,
    },
  },
  llm: {
    type: "llm",
    label: "LLM",
    description: "Generate text with meta-llama",
    category: "ai",
    icon: "Brain",
    inputs: [{ id: "prompt", type: "text", label: "Prompt", required: true }],
    outputs: [{ id: "text", type: "text", label: "Generated Text" }],
    defaultData: {
      label: "LLM",
      status: "idle",
      inputPrompt: null,
      outputText: null,
      systemPrompt:
        "You are a creative assistant helping generate content prompts.",
      temperature: 0.7,
      maxTokens: 1024,
      topP: 0.9,
      jobId: null,
    },
  },

  // Processing nodes
  resize: {
    type: "resize",
    label: "Resize",
    description: "Resize images or videos",
    category: "processing",
    icon: "Maximize2",
    inputs: [{ id: "media", type: "image", label: "Media", required: true }],
    outputs: [{ id: "media", type: "image", label: "Resized Media" }],
    defaultData: {
      label: "Resize",
      status: "idle",
      inputMedia: null,
      inputType: null,
      outputMedia: null,
      targetAspectRatio: "16:9",
      targetWidth: null,
      targetHeight: null,
      fitMode: "cover",
    },
  },
  animation: {
    type: "animation",
    label: "Animation",
    description: "Apply easing curve to video",
    category: "processing",
    icon: "Wand2",
    inputs: [{ id: "video", type: "video", label: "Video", required: true }],
    outputs: [{ id: "video", type: "video", label: "Animated Video" }],
    defaultData: {
      label: "Animation",
      status: "idle",
      inputVideo: null,
      outputVideo: null,
      curveType: "preset",
      preset: "easeInOutCubic",
      customCurve: [0.645, 0.045, 0.355, 1],
      speedMultiplier: 1,
    },
  },
  videoStitch: {
    type: "videoStitch",
    label: "Video Stitch",
    description: "Concatenate multiple videos",
    category: "processing",
    icon: "Layers",
    inputs: [
      { id: "videos", type: "video", label: "Videos", multiple: true, required: true },
    ],
    outputs: [{ id: "video", type: "video", label: "Stitched Video" }],
    defaultData: {
      label: "Video Stitch",
      status: "idle",
      inputVideos: [],
      outputVideo: null,
      transitionType: "crossfade",
      transitionDuration: 0.5,
      seamlessLoop: false,
    },
  },

  // Output nodes
  output: {
    type: "output",
    label: "Output",
    description: "Final workflow output",
    category: "output",
    icon: "CheckCircle",
    inputs: [{ id: "media", type: "image", label: "Media", required: true }],
    outputs: [],
    defaultData: {
      label: "Output",
      status: "idle",
      inputMedia: null,
      inputType: null,
      outputName: "output",
    },
  },
  preview: {
    type: "preview",
    label: "Preview",
    description: "Preview media with playback controls",
    category: "output",
    icon: "Eye",
    inputs: [{ id: "media", type: "image", label: "Media", required: true }],
    outputs: [],
    defaultData: {
      label: "Preview",
      status: "idle",
      inputMedia: null,
      inputType: null,
      isPlaying: false,
      volume: 1,
    },
  },
  download: {
    type: "download",
    label: "Download",
    description: "Download output file",
    category: "output",
    icon: "Download",
    inputs: [{ id: "media", type: "image", label: "Media", required: true }],
    outputs: [],
    defaultData: {
      label: "Download",
      status: "idle",
      inputMedia: null,
      inputType: null,
      filename: "output",
      format: "mp4",
    },
  },
};

// Helper to get nodes by category
export function getNodesByCategory(): Record<NodeCategory, NodeDefinition[]> {
  const categories: Record<NodeCategory, NodeDefinition[]> = {
    input: [],
    ai: [],
    processing: [],
    output: [],
  };

  for (const def of Object.values(NODE_DEFINITIONS)) {
    categories[def.category].push(def);
  }

  return categories;
}
