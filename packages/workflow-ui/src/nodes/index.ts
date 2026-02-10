export * from './ai';
export { BaseNode } from './BaseNode';
export { NodeDetailModal } from './NodeDetailModal';
export * from './composition';
export * from './input';
export * from './output';
export * from './processing';

// Node type mapping for React Flow
import type { NodeTypes } from '@xyflow/react';
import {
  ImageGenNode,
  LipSyncNode,
  LLMNode,
  MotionControlNode,
  TextToSpeechNode,
  TranscribeNode,
  VideoGenNode,
  VoiceChangeNode,
} from './ai';
import { WorkflowInputNode, WorkflowOutputNode, WorkflowRefNode } from './composition';
import {
  AudioInputNode,
  ImageInputNode,
  PromptConstructorNode,
  PromptNode,
  VideoInputNode,
} from './input';
import { DownloadNode } from './output';
import {
  AnimationNode,
  AnnotationNode,
  ImageCompareNode,
  ImageGridSplitNode,
  OutputGalleryNode,
  ReframeNode,
  ResizeNode,
  SubtitleNode,
  UpscaleNode,
  VideoFrameExtractNode,
  VideoStitchNode,
  VideoTrimNode,
} from './processing';

export const nodeTypes: NodeTypes = {
  // Input nodes
  audioInput: AudioInputNode,
  imageInput: ImageInputNode,
  videoInput: VideoInputNode,
  prompt: PromptNode,
  promptConstructor: PromptConstructorNode,
  // AI nodes
  imageGen: ImageGenNode,
  videoGen: VideoGenNode,
  llm: LLMNode,
  lipSync: LipSyncNode,
  voiceChange: VoiceChangeNode,
  textToSpeech: TextToSpeechNode,
  transcribe: TranscribeNode,
  motionControl: MotionControlNode,
  // Processing nodes
  resize: ResizeNode,
  animation: AnimationNode,
  annotation: AnnotationNode,
  imageGridSplit: ImageGridSplitNode,
  outputGallery: OutputGalleryNode,
  imageCompare: ImageCompareNode,
  videoStitch: VideoStitchNode,
  videoTrim: VideoTrimNode,
  videoFrameExtract: VideoFrameExtractNode,
  reframe: ReframeNode,
  upscale: UpscaleNode,
  subtitle: SubtitleNode,
  // Output nodes
  download: DownloadNode,
  // Composition nodes (workflow-as-node)
  workflowInput: WorkflowInputNode,
  workflowOutput: WorkflowOutputNode,
  workflowRef: WorkflowRefNode,
};
