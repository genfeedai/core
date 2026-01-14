export { BaseNode } from "./BaseNode";
export * from "./input";
export * from "./ai";
export * from "./processing";
export * from "./output";

// Node type mapping for React Flow
import type { NodeTypes } from "@xyflow/react";
import { ImageInputNode, PromptNode, TemplateNode } from "./input";
import { ImageGenNode, VideoGenNode, LLMNode } from "./ai";
import { AnimationNode, VideoStitchNode } from "./processing";
import { OutputNode, PreviewNode } from "./output";

export const nodeTypes: NodeTypes = {
  imageInput: ImageInputNode,
  prompt: PromptNode,
  template: TemplateNode,
  imageGen: ImageGenNode,
  videoGen: VideoGenNode,
  llm: LLMNode,
  animation: AnimationNode,
  videoStitch: VideoStitchNode,
  output: OutputNode,
  preview: PreviewNode,
};
