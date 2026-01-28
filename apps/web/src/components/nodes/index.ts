export * from './ai';
export { BaseNode } from './BaseNode';
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
import { AudioInputNode, ImageInputNode, PromptNode, TemplateNode, VideoInputNode } from './input';
import { OutputNode } from './output';
import {
  AnimationNode,
  AnnotationNode,
  ImageGridSplitNode,
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
  template: TemplateNode,
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
  videoStitch: VideoStitchNode,
  videoTrim: VideoTrimNode,
  videoFrameExtract: VideoFrameExtractNode,
  reframe: ReframeNode,
  upscale: UpscaleNode,
  subtitle: SubtitleNode,
  // Output nodes (deprecated - kept for backwards compatibility with existing workflows)
  output: OutputNode,
  // Composition nodes (workflow-as-node)
  workflowInput: WorkflowInputNode,
  workflowOutput: WorkflowOutputNode,
  workflowRef: WorkflowRefNode,
};
