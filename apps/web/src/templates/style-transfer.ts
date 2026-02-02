import type { WorkflowTemplate } from '@genfeedai/types';

export const STYLE_TRANSFER_TEMPLATE: WorkflowTemplate = {
  version: 1,
  name: 'Style Transfer',
  description: 'Apply a new style to your reference image while preserving the subject identity',
  nodes: [
    {
      id: 'reference-image',
      type: 'imageInput',
      position: { x: 50, y: 100 },
      data: {
        label: 'Reference Image',
        status: 'idle',
        image: null,
        filename: null,
        dimensions: null,
        source: 'upload',
      },
    },
    {
      id: 'style-prompt',
      type: 'prompt',
      position: { x: 50, y: 350 },
      data: {
        label: 'Style Prompt',
        status: 'idle',
        prompt:
          'Transform the subject into a vibrant watercolor painting style with soft brushstrokes and rich colors',
        variables: {},
      },
    },
    {
      id: 'imageGen-1',
      type: 'imageGen',
      position: { x: 400, y: 200 },
      data: {
        label: 'Style Transfer',
        status: 'idle',
        inputImages: [],
        inputPrompt: null,
        outputImage: null,
        model: 'nano-banana-pro',
        aspectRatio: '1:1',
        resolution: '2K',
        outputFormat: 'jpg',
        jobId: null,
      },
    },
    {
      id: 'output-1',
      type: 'output',
      position: { x: 750, y: 200 },
      data: {
        label: 'Styled Output',
        status: 'idle',
        inputMedia: null,
        inputType: 'image',
        outputName: 'style-transfer',
      },
    },
  ],
  edges: [
    {
      id: 'e-ref-gen',
      source: 'reference-image',
      target: 'imageGen-1',
      sourceHandle: 'image',
      targetHandle: 'images',
    },
    {
      id: 'e-prompt-gen',
      source: 'style-prompt',
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
