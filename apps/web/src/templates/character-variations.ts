import type { WorkflowTemplate } from '@genfeedai/types';

export const CHARACTER_VARIATIONS_TEMPLATE: WorkflowTemplate = {
  version: 1,
  name: 'Character Variations',
  description: 'Generate multiple scenes with a consistent character from a single reference photo',
  nodes: [
    // Reference Image
    {
      id: 'reference-image',
      type: 'imageInput',
      position: { x: 50, y: 250 },
      data: {
        label: 'Character Reference',
        status: 'idle',
        image: null,
        filename: null,
        dimensions: null,
        source: 'upload',
      },
    },
    // Scene Prompts
    {
      id: 'prompt-scene-1',
      type: 'prompt',
      position: { x: 50, y: 50 },
      data: {
        label: 'Scene 1',
        status: 'idle',
        prompt:
          'The character walking confidently down a city street at golden hour, cinematic lighting',
        variables: {},
      },
    },
    {
      id: 'prompt-scene-2',
      type: 'prompt',
      position: { x: 50, y: 450 },
      data: {
        label: 'Scene 2',
        status: 'idle',
        prompt:
          'The character sitting in a cozy cafe with warm ambient lighting, natural relaxed pose',
        variables: {},
      },
    },
    {
      id: 'prompt-scene-3',
      type: 'prompt',
      position: { x: 50, y: 650 },
      data: {
        label: 'Scene 3',
        status: 'idle',
        prompt:
          'The character standing on a rooftop overlooking the skyline at sunset, dramatic silhouette',
        variables: {},
      },
    },
    // Image Gen Nodes (3 parallel)
    {
      id: 'imageGen-1',
      type: 'imageGen',
      position: { x: 400, y: 50 },
      data: {
        label: 'Scene 1 Gen',
        status: 'idle',
        inputImages: [],
        inputPrompt: null,
        outputImage: null,
        model: 'nano-banana-pro',
        aspectRatio: '16:9',
        resolution: '2K',
        outputFormat: 'jpg',
        jobId: null,
      },
    },
    {
      id: 'imageGen-2',
      type: 'imageGen',
      position: { x: 400, y: 350 },
      data: {
        label: 'Scene 2 Gen',
        status: 'idle',
        inputImages: [],
        inputPrompt: null,
        outputImage: null,
        model: 'nano-banana-pro',
        aspectRatio: '16:9',
        resolution: '2K',
        outputFormat: 'jpg',
        jobId: null,
      },
    },
    {
      id: 'imageGen-3',
      type: 'imageGen',
      position: { x: 400, y: 650 },
      data: {
        label: 'Scene 3 Gen',
        status: 'idle',
        inputImages: [],
        inputPrompt: null,
        outputImage: null,
        model: 'nano-banana-pro',
        aspectRatio: '16:9',
        resolution: '2K',
        outputFormat: 'jpg',
        jobId: null,
      },
    },
    // Output Nodes
    {
      id: 'output-1',
      type: 'download',
      position: { x: 750, y: 50 },
      data: {
        label: 'Scene 1 Output',
        status: 'idle',
        inputMedia: null,
        inputType: 'image',
        outputName: 'character-scene-1',
      },
    },
    {
      id: 'output-2',
      type: 'download',
      position: { x: 750, y: 350 },
      data: {
        label: 'Scene 2 Output',
        status: 'idle',
        inputMedia: null,
        inputType: 'image',
        outputName: 'character-scene-2',
      },
    },
    {
      id: 'output-3',
      type: 'download',
      position: { x: 750, y: 650 },
      data: {
        label: 'Scene 3 Output',
        status: 'idle',
        inputMedia: null,
        inputType: 'image',
        outputName: 'character-scene-3',
      },
    },
  ],
  edges: [
    // Reference Image → all 3 image gen nodes
    {
      id: 'e-ref-gen-1',
      source: 'reference-image',
      target: 'imageGen-1',
      sourceHandle: 'image',
      targetHandle: 'images',
    },
    {
      id: 'e-ref-gen-2',
      source: 'reference-image',
      target: 'imageGen-2',
      sourceHandle: 'image',
      targetHandle: 'images',
    },
    {
      id: 'e-ref-gen-3',
      source: 'reference-image',
      target: 'imageGen-3',
      sourceHandle: 'image',
      targetHandle: 'images',
    },
    // Scene prompts → image gen nodes
    {
      id: 'e-prompt-gen-1',
      source: 'prompt-scene-1',
      target: 'imageGen-1',
      sourceHandle: 'text',
      targetHandle: 'prompt',
    },
    {
      id: 'e-prompt-gen-2',
      source: 'prompt-scene-2',
      target: 'imageGen-2',
      sourceHandle: 'text',
      targetHandle: 'prompt',
    },
    {
      id: 'e-prompt-gen-3',
      source: 'prompt-scene-3',
      target: 'imageGen-3',
      sourceHandle: 'text',
      targetHandle: 'prompt',
    },
    // Image gen → outputs
    {
      id: 'e-gen-out-1',
      source: 'imageGen-1',
      target: 'output-1',
      sourceHandle: 'image',
      targetHandle: 'image',
    },
    {
      id: 'e-gen-out-2',
      source: 'imageGen-2',
      target: 'output-2',
      sourceHandle: 'image',
      targetHandle: 'image',
    },
    {
      id: 'e-gen-out-3',
      source: 'imageGen-3',
      target: 'output-3',
      sourceHandle: 'image',
      targetHandle: 'image',
    },
  ],
  edgeStyle: 'smoothstep',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
