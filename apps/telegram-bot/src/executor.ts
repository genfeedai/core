/**
 * Workflow executor using Replicate npm package directly.
 * No cloud dependency — just needs REPLICATE_API_TOKEN.
 */
import * as Sentry from '@sentry/node';
import Replicate from 'replicate';
import type { WorkflowJson } from './state';

const MODEL_MAP: Record<string, `${string}/${string}`> = {
  'nano-banana-pro': 'google/nano-banana-pro',
  'flux-schnell': 'black-forest-labs/flux-schnell',
  'flux-2-pro': 'black-forest-labs/flux-2-pro',
  'imagen-3-fast': 'google/imagen-3-fast',
  'imagen-4-fast': 'google/imagen-4-fast',
  'veo-2': 'google/veo-2',
  'veo-3': 'google/veo-3',
  'veo-3-fast': 'google/veo-3-fast',
  'veo-3.1': 'google/veo-3.1',
  'veo-3.1-fast': 'google/veo-3.1-fast',
  'kling-v2.1': 'kwaivgi/kling-v2.1',
  'wan-2.2-i2v-fast': 'wan-video/wan-2.2-i2v-fast',
};

export interface ExecutionResult {
  success: boolean;
  outputs: Array<{ type: 'image' | 'video'; url: string }>;
  error?: string;
  modelUsed?: string;
  durationMs: number;
}

export type ProgressCallback = (message: string, pct: number) => void;

export interface ModelOverrides {
  imageModel?: string;
  videoModel?: string;
}

/**
 * Execute a workflow with collected inputs using Replicate directly.
 *
 * Strategy: topological traversal of the workflow graph.
 * - Input/prompt nodes: return collected values
 * - imageGen/videoGen: call replicate.run()
 * - animation/output: passthrough
 */
export async function executeWorkflow(
  workflow: WorkflowJson,
  collectedInputs: Map<string, string>,
  onProgress?: ProgressCallback,
  modelOverrides?: ModelOverrides
): Promise<ExecutionResult> {
  const replicate = new Replicate();
  const startTime = Date.now();

  // Build adjacency: nodeId → outputs from that node
  const nodeOutputs = new Map<string, Record<string, unknown>>();
  const nodeMap = new Map(workflow.nodes.map((n) => [n.id, n]));

  // Topological sort via Kahn's algorithm
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const node of workflow.nodes) {
    inDegree.set(node.id, 0);
    adj.set(node.id, []);
  }
  for (const edge of workflow.edges) {
    adj.get(edge.source)!.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }
  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const next of adj.get(id) || []) {
      const newDeg = (inDegree.get(next) || 1) - 1;
      inDegree.set(next, newDeg);
      if (newDeg === 0) queue.push(next);
    }
  }

  const totalNodes = order.length;
  let completedNodes = 0;
  const outputs: ExecutionResult['outputs'] = [];
  let modelUsed = '';

  try {
    for (const nodeId of order) {
      const node = nodeMap.get(nodeId)!;
      const label = (node.data.label as string) || node.type;

      onProgress?.(`🔧 ${label}...`, Math.round((completedNodes / totalNodes) * 100));

      // Gather inputs from upstream edges
      const inputValues = new Map<string, Record<string, unknown>>();
      for (const edge of workflow.edges) {
        if (edge.target === nodeId) {
          const upstream = nodeOutputs.get(edge.source);
          if (upstream) {
            inputValues.set(`${edge.source}:${edge.targetHandle}`, upstream);
          }
        }
      }

      let result: Record<string, unknown> = {};

      switch (node.type) {
        case 'imageInput': {
          const url = collectedInputs.get(nodeId);
          if (!url) throw new Error(`No image provided for ${label}`);
          result = { image: url };
          break;
        }

        case 'prompt': {
          const text = collectedInputs.get(nodeId) || (node.data.prompt as string);
          if (!text) throw new Error(`No prompt provided for ${label}`);
          result = { text };
          break;
        }

        case 'imageGen': {
          let promptText = '';
          let imageUrl = '';
          for (const [, val] of inputValues) {
            if (val.text) promptText = val.text as string;
            if (val.image) imageUrl = val.image as string;
          }

          // Use model override if provided, otherwise fall back to workflow default
          const model =
            modelOverrides?.imageModel || (node.data.model as string) || 'nano-banana-pro';
          const replicateModel = MODEL_MAP[model] || (model as `${string}/${string}`);
          modelUsed = replicateModel;

          const input: Record<string, unknown> = {
            prompt: promptText,
            aspect_ratio: (node.data.aspectRatio as string) || '1:1',
          };
          if (imageUrl) input.image = imageUrl;

          onProgress?.(
            `🎨 Generating image with ${model}...`,
            Math.round((completedNodes / totalNodes) * 100)
          );

          const output = await replicate.run(replicateModel, { input });
          const outputUrl = Array.isArray(output) ? String(output[0]) : String(output);
          result = { image: outputUrl };
          outputs.push({ type: 'image', url: outputUrl });
          break;
        }

        case 'videoGen': {
          let promptText = '';
          let imageUrl = '';
          let lastFrameUrl = '';
          for (const [key, val] of inputValues) {
            if (val.text) promptText = val.text as string;
            if (val.image) {
              if (key.includes('lastFrame') || key.includes('image-2')) {
                lastFrameUrl = val.image as string;
              } else if (!imageUrl) {
                imageUrl = val.image as string;
              }
            }
          }

          // Use model override if provided, otherwise fall back to workflow default
          const model = modelOverrides?.videoModel || (node.data.model as string) || 'veo-3.1-fast';
          const replicateModel = MODEL_MAP[model] || (model as `${string}/${string}`);
          modelUsed = replicateModel;

          const input: Record<string, unknown> = {
            prompt: promptText,
            aspect_ratio: (node.data.aspectRatio as string) || '16:9',
            duration: (node.data.duration as number) || 8,
          };
          if (imageUrl) input.image = imageUrl;
          if (lastFrameUrl) input.last_frame = lastFrameUrl;

          onProgress?.(
            `🎬 Generating video with ${model}...`,
            Math.round((completedNodes / totalNodes) * 100)
          );

          const output = await replicate.run(replicateModel, { input });
          const outputUrl = Array.isArray(output) ? String(output[0]) : String(output);
          result = { video: outputUrl };
          outputs.push({ type: 'video', url: outputUrl });
          break;
        }

        case 'llm': {
          // LLM node — for now skip (full-pipeline uses this)
          // Just pass through any prompt input
          for (const [, val] of inputValues) {
            if (val.text) result = { text: val.text as string };
          }
          break;
        }

        case 'animation': {
          // Passthrough — easing is client-side
          for (const [, val] of inputValues) {
            if (val.video) {
              result = val;
              break;
            }
          }
          break;
        }

        case 'output': {
          // Collect final outputs
          for (const [, val] of inputValues) {
            Object.assign(result, val);
          }
          break;
        }

        case 'audioInput': {
          const url = collectedInputs.get(nodeId);
          result = { audio: url || '' };
          break;
        }

        case 'videoInput': {
          const url = collectedInputs.get(nodeId);
          result = { video: url || '' };
          break;
        }

        default:
          // Unknown node type — passthrough
          for (const [, val] of inputValues) {
            Object.assign(result, val);
          }
      }

      nodeOutputs.set(nodeId, result);
      completedNodes++;
    }

    onProgress?.('✅ Complete!', 100);

    return {
      success: true,
      outputs,
      modelUsed,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { component: 'workflow-executor' },
      extra: { modelUsed, completedNodes, totalNodes },
    });
    return {
      success: false,
      outputs,
      error: error instanceof Error ? error.message : String(error),
      modelUsed,
      durationMs: Date.now() - startTime,
    };
  }
}
