import type { WorkflowTemplate } from '@genfeedai/types';

export const IMAGE_REMIX_TEMPLATE: WorkflowTemplate = {
  version: 1,
  name: 'Image Remix',
  description: 'Reimagine your image in a new style while keeping the overall composition',
  nodes: [
    {
      id: 'source-image',
      type: 'imageInput',
      position: { x: 50, y: 150 },
      data: {
        label: 'Source Image',
        status: 'idle',
        image: null,
        filename: null,
        dimensions: null,
        source: 'upload',
      },
    },
    {
      id: 'remix-prompt',
      type: 'prompt',
      position: { x: 50, y: 400 },
      data: {
        label: 'Remix Prompt',
        status: 'idle',
        prompt:
          'Reimagine this image as a stylized digital illustration with bold colors and sharp details',
        variables: {},
      },
    },
    {
      id: 'imageGen-1',
      type: 'imageGen',
      position: { x: 400, y: 200 },
      data: {
        label: 'Image Remix',
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
      id: 'output-1',
      type: 'download',
      position: { x: 750, y: 200 },
      data: {
        label: 'Remixed Output',
        status: 'idle',
        inputMedia: null,
        inputType: 'image',
        outputName: 'image-remix',
      },
    },
  ],
  edges: [
    {
      id: 'e-src-gen',
      source: 'source-image',
      target: 'imageGen-1',
      sourceHandle: 'image',
      targetHandle: 'images',
    },
    {
      id: 'e-prompt-gen',
      source: 'remix-prompt',
      target: 'imageGen-1',
      sourceHandle: 'text',
      targetHandle: 'prompt',
    },
    {
      id: 'e-gen-output',
      source: 'imageGen-1',
      target: 'output-1',
      sourceHandle: 'image',
      targetHandle: 'image',
    },
  ],
  edgeStyle: 'smoothstep',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
