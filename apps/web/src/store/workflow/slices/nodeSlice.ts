import type { NodeType, WorkflowNode, WorkflowNodeData } from '@genfeedai/types';
import { NODE_DEFINITIONS } from '@genfeedai/types';
import type { XYPosition } from '@xyflow/react';
import type { StateCreator } from 'zustand';
import { generateId } from '../helpers/nodeHelpers';
import type { WorkflowStore } from '../types';

/**
 * Extract output value from a node based on its type
 */
function getNodeOutput(node: WorkflowNode): string | null {
  const data = node.data as Record<string, unknown>;
  // Check standard outputs first, then input-type nodes that pass through their values
  const output =
    data.outputImage ??
    data.outputVideo ??
    data.outputText ??
    data.outputAudio ??
    data.prompt ?? // Prompt node outputs its prompt value
    data.extractedTweet ?? // TweetParser outputs extracted tweet
    data.image ?? // Image/ImageInput node outputs its image
    data.video ?? // Video/VideoInput node outputs its video
    data.audio ?? // Audio/AudioInput node outputs its audio
    null;
  if (output === null) return null;
  if (typeof output === 'string') return output;
  if (Array.isArray(output) && output.length > 0) return String(output[0]);
  return null;
}

/**
 * Determine output type from source node
 */
function getOutputType(sourceType: string): 'text' | 'image' | 'video' | 'audio' | null {
  // Text output nodes
  if (['prompt', 'llm', 'tweetParser', 'template', 'transcribe'].includes(sourceType)) {
    return 'text';
  }
  // Image output nodes (including imageInput for templates)
  if (
    ['imageGen', 'image', 'imageInput', 'upscale', 'resize', 'reframe', 'imageGridSplit'].includes(
      sourceType
    )
  ) {
    return 'image';
  }
  // Video output nodes (including videoInput for templates)
  if (
    [
      'videoGen',
      'video',
      'videoInput',
      'animation',
      'videoStitch',
      'lipSync',
      'voiceChange',
      'motionControl',
      'videoTrim',
      'videoFrameExtract',
      'subtitle',
    ].includes(sourceType)
  ) {
    return 'video';
  }
  // Audio output nodes (including audioInput for templates)
  if (['textToSpeech', 'audio', 'audioInput'].includes(sourceType)) {
    return 'audio';
  }
  return null;
}

/**
 * Map source node output to target node input field based on node types
 */
function mapOutputToInput(
  output: string,
  sourceType: string,
  targetType: string
): Record<string, unknown> | null {
  const outputType = getOutputType(sourceType);

  // Handle output node (deprecated but kept for backwards compatibility)
  if (targetType === 'output') {
    if (outputType === 'video') {
      return { inputVideo: output, inputImage: null, inputType: 'video' };
    }
    if (outputType === 'image') {
      return { inputImage: output, inputVideo: null, inputType: 'image' };
    }
    return null;
  }

  // Text propagation: prompt/llm/tweetParser → nodes with text input
  if (outputType === 'text') {
    // Nodes that use inputText
    if (['textToSpeech', 'subtitle'].includes(targetType)) {
      return { inputText: output };
    }
    // Nodes that use inputPrompt
    if (['imageGen', 'videoGen', 'llm', 'motionControl'].includes(targetType)) {
      return { inputPrompt: output };
    }
  }

  // Image propagation
  if (outputType === 'image') {
    // Nodes that accept single image input
    if (
      [
        'videoGen',
        'lipSync',
        'voiceChange',
        'motionControl',
        'reframe',
        'upscale',
        'resize',
        'animation',
      ].includes(targetType)
    ) {
      return { inputImage: output };
    }
    // Image gen accepts array of images
    if (targetType === 'imageGen') {
      return { inputImages: [output] };
    }
  }

  // Video propagation
  if (outputType === 'video') {
    if (
      [
        'lipSync',
        'voiceChange',
        'reframe',
        'upscale',
        'resize',
        'videoStitch',
        'videoTrim',
        'videoFrameExtract',
        'subtitle',
        'transcribe',
      ].includes(targetType)
    ) {
      return { inputVideo: output };
    }
  }

  // Audio propagation
  if (outputType === 'audio') {
    if (['lipSync', 'voiceChange', 'transcribe'].includes(targetType)) {
      return { inputAudio: output };
    }
  }

  return null;
}

export interface NodeSlice {
  addNode: (type: NodeType, position: XYPosition) => string;
  updateNodeData: <T extends WorkflowNodeData>(nodeId: string, data: Partial<T>) => void;
  removeNode: (nodeId: string) => void;
  duplicateNode: (nodeId: string) => string | null;
  propagateOutputsDownstream: (sourceNodeId: string, outputValue?: string) => void;
}

export const createNodeSlice: StateCreator<WorkflowStore, [], [], NodeSlice> = (set, get) => ({
  addNode: (type, position) => {
    const nodeDef = NODE_DEFINITIONS[type];
    if (!nodeDef) return '';

    const id = generateId();
    const newNode: WorkflowNode = {
      id,
      type,
      position,
      data: {
        ...nodeDef.defaultData,
        label: nodeDef.label,
        status: 'idle',
      } as WorkflowNodeData,
      // Set default dimensions for output nodes (larger preview area)
      ...(type === 'output' && { width: 280, height: 320 }),
    };

    set((state) => ({
      nodes: [...state.nodes, newNode],
      isDirty: true,
    }));

    return id;
  },

  updateNodeData: (nodeId, data) => {
    const { nodes, propagateOutputsDownstream } = get();
    const node = nodes.find((n) => n.id === nodeId);

    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n)),
      isDirty: true,
    }));

    // Propagate outputs when:
    // 1. Input nodes update (their value IS the output)
    // 2. Any node receives an output field (outputImage, outputVideo, outputAudio, outputText)
    const inputNodeTypes = [
      'prompt',
      'image',
      'imageInput',
      'video',
      'videoInput',
      'audio',
      'audioInput',
      'template',
      'tweetParser',
    ];
    const hasOutputUpdate =
      'outputImage' in data ||
      'outputVideo' in data ||
      'outputAudio' in data ||
      'outputText' in data;

    if (node && (inputNodeTypes.includes(node.type as string) || hasOutputUpdate)) {
      // For output updates, pass the value directly to avoid stale state reads
      // This fixes timing issues where get() reads state before set() commits
      if (hasOutputUpdate) {
        const dataRecord = data as Record<string, unknown>;
        const outputValue =
          dataRecord.outputImage ??
          dataRecord.outputVideo ??
          dataRecord.outputAudio ??
          dataRecord.outputText;
        if (typeof outputValue === 'string') {
          propagateOutputsDownstream(nodeId, outputValue);
        }
      } else {
        propagateOutputsDownstream(nodeId);
      }
    }
  },

  removeNode: (nodeId) => {
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== nodeId),
      edges: state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      isDirty: true,
    }));
  },

  duplicateNode: (nodeId) => {
    const { nodes } = get();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return null;

    const newId = generateId();
    const newNode: WorkflowNode = {
      ...node,
      id: newId,
      position: {
        x: node.position.x + 50,
        y: node.position.y + 50,
      },
      data: {
        ...node.data,
        status: 'idle',
        jobId: null,
      } as WorkflowNodeData,
    };

    set((state) => ({
      nodes: [...state.nodes, newNode],
      isDirty: true,
    }));

    return newId;
  },

  propagateOutputsDownstream: (sourceNodeId, outputValue?) => {
    const { nodes, edges } = get();
    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode) return;

    // Use passed value (for output updates) or read from node (for edge connections)
    const output = outputValue ?? getNodeOutput(sourceNode);
    if (!output) return;

    // Collect all updates using BFS traversal, then apply in a single state change
    const updates: Map<string, Record<string, unknown>> = new Map();
    const visited = new Set<string>();
    const queue: Array<{ nodeId: string; output: string }> = [{ nodeId: sourceNodeId, output }];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.nodeId)) continue;
      visited.add(current.nodeId);

      const currentNode = nodes.find((n) => n.id === current.nodeId);
      if (!currentNode) continue;

      // Find downstream edges
      const downstreamEdges = edges.filter((e) => e.source === current.nodeId);

      for (const edge of downstreamEdges) {
        const targetNode = nodes.find((n) => n.id === edge.target);
        if (!targetNode) continue;

        const inputUpdate = mapOutputToInput(current.output, currentNode.type, targetNode.type);
        if (inputUpdate) {
          // Merge with existing updates for this node
          const existing = updates.get(edge.target) ?? {};
          updates.set(edge.target, { ...existing, ...inputUpdate });

          // Check if target node will produce output that needs further propagation
          // Only continue if this is an input-passthrough node
          const _targetData = targetNode.data as Record<string, unknown>;
          const targetOutput = getNodeOutput(targetNode);
          if (targetOutput && !visited.has(edge.target)) {
            queue.push({ nodeId: edge.target, output: targetOutput });
          }
        }
      }
    }

    // Apply all updates in a single state change
    if (updates.size > 0) {
      set((state) => ({
        nodes: state.nodes.map((n) => {
          const update = updates.get(n.id);
          if (update) {
            return { ...n, data: { ...n.data, ...update } };
          }
          return n;
        }),
        isDirty: true,
      }));
    }
  },
});
