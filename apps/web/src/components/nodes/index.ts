export * from './ai';
export { BaseNode } from './BaseNode';
export * from './input';
export * from './output';
export * from './processing';

// Node type mapping for React Flow
import type { NodeTypes } from '@xyflow/react';
import { ImageGenNode, LLMNode, TranscribeNode, TweetRemixNode, VideoGenNode } from './ai';
import { ImageInputNode, PromptNode, TemplateNode, TweetInputNode, VideoInputNode } from './input';
import { OutputNode, PreviewNode, SocialPublishNode } from './output';
import {
  AnimationNode,
  AnnotationNode,
  ImageGridSplitNode,
  LumaReframeImageNode,
  LumaReframeVideoNode,
  TopazImageUpscaleNode,
  TopazVideoUpscaleNode,
  VideoStitchNode,
  VideoTrimNode,
} from './processing';

export const nodeTypes: NodeTypes = {
  imageInput: ImageInputNode,
  videoInput: VideoInputNode,
  prompt: PromptNode,
  template: TemplateNode,
  tweetInput: TweetInputNode,
  imageGen: ImageGenNode,
  videoGen: VideoGenNode,
  llm: LLMNode,
  tweetRemix: TweetRemixNode,
  transcribe: TranscribeNode,
  animation: AnimationNode,
  annotation: AnnotationNode,
  imageGridSplit: ImageGridSplitNode,
  videoStitch: VideoStitchNode,
  videoTrim: VideoTrimNode,
  lumaReframeImage: LumaReframeImageNode,
  lumaReframeVideo: LumaReframeVideoNode,
  topazImageUpscale: TopazImageUpscaleNode,
  topazVideoUpscale: TopazVideoUpscaleNode,
  output: OutputNode,
  preview: PreviewNode,
  socialPublish: SocialPublishNode,
};
