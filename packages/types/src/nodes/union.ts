// =============================================================================
// NODE DATA UNION & WORKFLOW TYPES
// =============================================================================

import type { Edge, Node } from '@xyflow/react';

import type { NodeType } from './base';
import type {
  ImageGenNodeData,
  LLMNodeData,
  LipSyncNodeData,
  MotionControlNodeData,
  TextToSpeechNodeData,
  TranscribeNodeData,
  VideoGenNodeData,
  VoiceChangeNodeData,
} from './ai-nodes';
import type {
  WorkflowInputNodeData,
  WorkflowOutputNodeData,
  WorkflowRefNodeData,
} from './composition-nodes';
import type {
  DiscordPostNodeData,
  FacebookPostNodeData,
  GoogleDriveUploadNodeData,
  InstagramPostNodeData,
  LinkedInPostNodeData,
  TelegramPostNodeData,
  TikTokPostNodeData,
  TwitterPostNodeData,
  WebhookPostNodeData,
  YouTubePostNodeData,
} from './distribution-nodes';
import type {
  AudioInputNodeData,
  ImageInputNodeData,
  PromptNodeData,
  TelegramInputNodeData,
  TemplateNodeData,
  VideoInputNodeData,
} from './input-nodes';
import type {
  AnimationNodeData,
  AnnotationNodeData,
  ImageGridSplitNodeData,
  OutputNodeData,
  ReframeNodeData,
  ResizeNodeData,
  SubtitleNodeData,
  UpscaleNodeData,
  VideoFrameExtractNodeData,
  VideoStitchNodeData,
  VideoTrimNodeData,
} from './processing-nodes';

export type WorkflowNodeData =
  | ImageInputNodeData
  | AudioInputNodeData
  | VideoInputNodeData
  | TelegramInputNodeData
  | PromptNodeData
  | TemplateNodeData
  | ImageGenNodeData
  | VideoGenNodeData
  | LLMNodeData
  | LipSyncNodeData
  | VoiceChangeNodeData
  | TextToSpeechNodeData
  | TranscribeNodeData
  | MotionControlNodeData
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
  // Distribution nodes
  | TelegramPostNodeData
  | DiscordPostNodeData
  | TwitterPostNodeData
  | InstagramPostNodeData
  | TikTokPostNodeData
  | YouTubePostNodeData
  | FacebookPostNodeData
  | LinkedInPostNodeData
  | GoogleDriveUploadNodeData
  | WebhookPostNodeData
  // Composition nodes
  | WorkflowInputNodeData
  | WorkflowOutputNodeData
  | WorkflowRefNodeData;

// =============================================================================
// WORKFLOW NODE & EDGE
// =============================================================================

export type WorkflowNode = Node<WorkflowNodeData, NodeType>;

/**
 * Edge data for workflow edges
 */
export interface WorkflowEdgeData {
  /** Index signature for React Flow Edge compatibility */
  [key: string]: unknown;
}

export type WorkflowEdge = Edge<WorkflowEdgeData>;
