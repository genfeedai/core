import type { useWorkflowStore } from '@/store/workflowStore';

/**
 * Map output to correct node data field based on node type
 */
export function getOutputUpdate(
  nodeId: string,
  output: Record<string, unknown>,
  workflowStore: ReturnType<typeof useWorkflowStore.getState>
): Record<string, unknown> {
  const node = workflowStore.getNodeById(nodeId);
  if (!node) return {};

  const nodeType = node.type;

  // Image output nodes
  if (['imageGen'].includes(nodeType)) {
    return { outputImage: output };
  }

  // Unified nodes - output type matches input type
  if (['reframe', 'upscale'].includes(nodeType)) {
    const inputType = (node.data as { inputType?: string }).inputType;
    if (inputType === 'video') {
      return { outputVideo: output };
    }
    return { outputImage: output };
  }

  // Video output nodes
  if (['videoGen', 'animation', 'videoStitch', 'lipSync', 'voiceChange'].includes(nodeType)) {
    return { outputVideo: output };
  }

  // Audio output nodes
  if (nodeType === 'textToSpeech') {
    return { outputAudio: output };
  }

  // LLM nodes
  if (nodeType === 'llm') {
    return { outputText: output };
  }

  // Resize nodes
  if (nodeType === 'resize') {
    return { outputMedia: output };
  }

  return { output };
}
