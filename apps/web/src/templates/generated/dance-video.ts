import type { WorkflowFile } from '@genfeedai/types';

export const DANCE_VIDEO_TEMPLATE: WorkflowFile = {
  version: 1,
  name: 'Dance Video',
  description:
    'Apply dance or motion from a reference video to a static image using Kling v2.6 motion control',
  nodes: [
    // Subject Image Input
    {
      id: 'subject-image',
      type: 'imageInput',
      position: { x: 50, y: 100 },
      data: {
        label: 'Subject Image',
        status: 'idle',
        image: null,
        filename: null,
        dimensions: null,
        source: 'upload',
      },
    },
    // Motion Video Input
    {
      id: 'motion-video',
      type: 'videoInput',
      position: { x: 50, y: 350 },
      data: {
        label: 'Dance/Motion Video',
        status: 'idle',
        video: null,
        filename: null,
        duration: null,
        dimensions: null,
        source: 'upload',
      },
    },
    // Optional Prompt
    {
      id: 'prompt',
      type: 'prompt',
      position: { x: 50, y: 550 },
      data: {
        label: 'Enhancement Prompt',
        status: 'idle',
        prompt: 'Professional dance performance, smooth motion, high quality, detailed',
        variables: {},
      },
    },
    // Motion Control Node (Kling v2.6)
    {
      id: 'motion-control',
      type: 'motionControl',
      position: { x: 400, y: 200 },
      data: {
        label: 'Motion Control',
        status: 'idle',
        inputImage: null,
        inputVideo: null,
        inputPrompt: null,
        outputVideo: null,
        mode: 'video_transfer',
        duration: 5,
        aspectRatio: '9:16',
        trajectoryPoints: [],
        cameraMovement: 'static',
        cameraIntensity: 50,
        qualityMode: 'pro',
        characterOrientation: 'image',
        keepOriginalSound: true,
        motionStrength: 50,
        negativePrompt: 'blurry, distorted, low quality',
        seed: null,
        jobId: null,
      },
    },
    // Output
    {
      id: 'output',
      type: 'output',
      position: { x: 750, y: 200 },
      data: {
        label: 'Dance Video',
        status: 'idle',
        inputMedia: null,
        inputType: 'video',
        outputName: 'dance-video',
      },
    },
  ],
  edges: [
    // Subject Image → Motion Control
    {
      id: 'e1',
      source: 'subject-image',
      target: 'motion-control',
      sourceHandle: 'image',
      targetHandle: 'image',
    },
    // Motion Video → Motion Control
    {
      id: 'e2',
      source: 'motion-video',
      target: 'motion-control',
      sourceHandle: 'video',
      targetHandle: 'video',
    },
    // Prompt → Motion Control
    {
      id: 'e3',
      source: 'prompt',
      target: 'motion-control',
      sourceHandle: 'text',
      targetHandle: 'prompt',
    },
    // Motion Control → Output
    {
      id: 'e4',
      source: 'motion-control',
      target: 'output',
      sourceHandle: 'video',
      targetHandle: 'media',
    },
  ],
  edgeStyle: 'smoothstep',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
