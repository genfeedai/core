import type { NodeType, WorkflowEdge, WorkflowNode, WorkflowNodeData } from '@genfeedai/types';
import { NODE_DEFINITIONS } from '@genfeedai/types';
import type { XYPosition } from '@xyflow/react';
import type { StateCreator } from 'zustand';
import { generateId } from '../helpers/nodeHelpers';
import type { WorkflowStore } from '../types';

function getNodeOutput(node: WorkflowNode): string | null {
  const data = node.data as Record<string, unknown>;
  // outputImages array before outputImage — multi-output nodes store results in array
  const outputImages = data.outputImages as string[] | undefined;
  if (outputImages?.length) return outputImages[0];

  const output =
    data.outputImage ??
    data.outputVideo ??
    data.outputText ??
    data.outputAudio ??
    data.prompt ??
    data.extractedTweet ??
    data.image ??
    data.video ??
    data.audio ??
    null;
  if (output === null) return null;
  if (typeof output === 'string') return output;
  if (Array.isArray(output) && output.length > 0) return String(output[0]);
  return null;
}

function getOutputType(sourceType: string): 'text' | 'image' | 'video' | 'audio' | null {
  if (['prompt', 'llm', 'tweetParser', 'template', 'transcribe'].includes(sourceType)) {
    return 'text';
  }
  if (
    ['imageGen', 'image', 'imageInput', 'upscale', 'resize', 'reframe', 'imageGridSplit'].includes(
      sourceType
    )
  ) {
    return 'image';
  }
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
  if (['textToSpeech', 'audio', 'audioInput'].includes(sourceType)) {
    return 'audio';
  }
  return null;
}

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

  if (outputType === 'text') {
    if (['textToSpeech', 'subtitle'].includes(targetType)) {
      return { inputText: output };
    }
    if (['imageGen', 'videoGen', 'llm', 'motionControl'].includes(targetType)) {
      return { inputPrompt: output };
    }
  }

  if (outputType === 'image') {
    if (['upscale', 'reframe'].includes(targetType)) {
      return { inputImage: output, inputVideo: null, inputType: 'image' };
    }
    if (
      ['videoGen', 'lipSync', 'voiceChange', 'motionControl', 'resize', 'animation'].includes(
        targetType
      )
    ) {
      return { inputImage: output };
    }
    if (targetType === 'imageGen') {
      return { inputImages: [output] };
    }
  }

  if (outputType === 'video') {
    if (['upscale', 'reframe'].includes(targetType)) {
      return { inputVideo: output, inputImage: null, inputType: 'video' };
    }
    if (
      [
        'lipSync',
        'voiceChange',
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

    const TRANSIENT_KEYS = new Set(['status', 'progress', 'error', 'jobId']);
    const dataKeys = Object.keys(data as Record<string, unknown>);
    const hasPersistedChange = dataKeys.some((key) => !TRANSIENT_KEYS.has(key));

    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n)),
      ...(hasPersistedChange && { isDirty: true }),
    }));

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
      'outputImages' in data ||
      'outputVideo' in data ||
      'outputAudio' in data ||
      'outputText' in data;

    if (node && (inputNodeTypes.includes(node.type as string) || hasOutputUpdate)) {
      if (hasOutputUpdate) {
        const dataRecord = data as Record<string, unknown>;
        if ('outputImages' in dataRecord) {
          propagateOutputsDownstream(nodeId);
        } else {
          const outputValue =
            dataRecord.outputImage ??
            dataRecord.outputVideo ??
            dataRecord.outputAudio ??
            dataRecord.outputText;
          if (typeof outputValue === 'string') {
            propagateOutputsDownstream(nodeId, outputValue);
          }
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
    const { nodes, edges, edgeStyle, propagateOutputsDownstream } = get();
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

    const incomingEdges = edges.filter((e) => e.target === nodeId && e.source !== nodeId);
    const clonedEdges: WorkflowEdge[] = incomingEdges.map((edge) => ({
      ...edge,
      id: generateId(),
      target: newId,
      type: edgeStyle,
    }));

    set((state) => ({
      nodes: [...state.nodes, newNode],
      edges: [...state.edges, ...clonedEdges],
      isDirty: true,
    }));

    const sourcesNotified = new Set<string>();
    for (const edge of incomingEdges) {
      if (!sourcesNotified.has(edge.source)) {
        sourcesNotified.add(edge.source);
        propagateOutputsDownstream(edge.source);
      }
    }

    return newId;
  },

  propagateOutputsDownstream: (sourceNodeId, outputValue?) => {
    const { nodes, edges } = get();
    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode) return;

    const output = outputValue ?? getNodeOutput(sourceNode);
    if (!output) return;

    const updates: Map<string, Record<string, unknown>> = new Map();
    const visited = new Set<string>();
    const queue: Array<{ nodeId: string; output: string }> = [{ nodeId: sourceNodeId, output }];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.nodeId)) continue;
      visited.add(current.nodeId);

      const currentNode = nodes.find((n) => n.id === current.nodeId);
      if (!currentNode) continue;

      const downstreamEdges = edges.filter((e) => e.source === current.nodeId);

      for (const edge of downstreamEdges) {
        const targetNode = nodes.find((n) => n.id === edge.target);
        if (!targetNode) continue;

        if (targetNode.type === 'outputGallery') {
          const sourceData = currentNode.data as Record<string, unknown>;
          const allImages: string[] = [];

          const outputImagesArr = sourceData.outputImages as string[] | undefined;
          if (outputImagesArr?.length) {
            allImages.push(...outputImagesArr);
          } else if (typeof current.output === 'string') {
            allImages.push(current.output);
          }

          if (allImages.length > 0) {
            const existing = updates.get(edge.target) ?? {};
            const existingImages = (existing.images as string[]) ?? [];
            const targetData = targetNode.data as Record<string, unknown>;
            const galleryExisting = (targetData.images as string[]) ?? [];
            updates.set(edge.target, {
              ...existing,
              images: [...new Set([...galleryExisting, ...existingImages, ...allImages])],
            });
          }
          continue;
        }

        const inputUpdate = mapOutputToInput(current.output, currentNode.type, targetNode.type);
        if (inputUpdate) {
          const existing = updates.get(edge.target) ?? {};
          updates.set(edge.target, { ...existing, ...inputUpdate });

          const targetOutput = getNodeOutput(targetNode);
          if (targetOutput && !visited.has(edge.target)) {
            queue.push({ nodeId: edge.target, output: targetOutput });
          }
        }
      }
    }

    if (updates.size > 0) {
      let hasRealChange = false;
      for (const [nodeId, update] of updates) {
        const existingNode = nodes.find((n) => n.id === nodeId);
        if (!existingNode) continue;
        const existingData = existingNode.data as Record<string, unknown>;
        for (const [key, value] of Object.entries(update)) {
          const prev = existingData[key];
          if (Array.isArray(prev) && Array.isArray(value)) {
            if (prev.length !== value.length || prev.some((v, i) => v !== value[i])) {
              hasRealChange = true;
              break;
            }
          } else if (prev !== value) {
            hasRealChange = true;
            break;
          }
        }
        if (hasRealChange) break;
      }

      if (hasRealChange) {
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
    }
  },
});
