import type { WorkflowTemplate } from '@genfeedai/types';

export const FULL_PIPELINE_TEMPLATE: WorkflowTemplate = {
  version: 1,
  name: 'Full Content Pipeline',
  description: 'Complete workflow: concept → images → videos → animation → stitched output',
  nodes: [
    // Stage 1: Concept Development
    {
      id: 'concept',
      type: 'prompt',
      position: { x: 50, y: 300 },
      data: {
        label: 'Concept',
        status: 'idle',
        prompt:
          'Create a 3-scene story about a robot discovering nature for the first time. Scene 1: Robot in city. Scene 2: Robot enters forest. Scene 3: Robot watches sunset.',
        variables: {},
      },
    },
    {
      id: 'llm-story',
      type: 'llm',
      position: { x: 350, y: 300 },
      data: {
        label: 'Story Expander',
        status: 'idle',
        inputPrompt: null,
        outputText: null,
        systemPrompt:
          'Expand the concept into 3 detailed visual prompts. For each scene, include: setting, lighting, mood, camera angle, and specific details. Number each 1., 2., 3.',
        temperature: 0.8,
        maxTokens: 2048,
        topP: 0.9,
        jobId: null,
      },
    },

    // Stage 2: Image Generation
    {
      id: 'imageGen-1',
      type: 'imageGen',
      position: { x: 700, y: 100 },
      data: {
        label: 'Scene 1 Image',
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
      position: { x: 700, y: 300 },
      data: {
        label: 'Scene 2 Image',
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
      position: { x: 700, y: 500 },
      data: {
        label: 'Scene 3 Image',
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

    // Stage 3: Video Generation (interpolation between scenes)
    {
      id: 'videoGen-1',
      type: 'videoGen',
      position: { x: 1050, y: 150 },
      data: {
        label: 'Scene 1→2 Video',
        status: 'idle',
        inputImage: null,
        lastFrame: null,
        referenceImages: [],
        inputPrompt: null,
        negativePrompt: '',
        outputVideo: null,
        model: 'veo-3.1',
        duration: 6,
        aspectRatio: '16:9',
        resolution: '1080p',
        generateAudio: true,
        jobId: null,
      },
    },
    {
      id: 'videoGen-2',
      type: 'videoGen',
      position: { x: 1050, y: 400 },
      data: {
        label: 'Scene 2→3 Video',
        status: 'idle',
        inputImage: null,
        lastFrame: null,
        referenceImages: [],
        inputPrompt: null,
        negativePrompt: '',
        outputVideo: null,
        model: 'veo-3.1',
        duration: 6,
        aspectRatio: '16:9',
        resolution: '1080p',
        generateAudio: true,
        jobId: null,
      },
    },

    // Stage 4: Animation (easing)
    {
      id: 'animation-1',
      type: 'animation',
      position: { x: 1400, y: 150 },
      data: {
        label: 'Ease Animation 1',
        status: 'idle',
        inputVideo: null,
        outputVideo: null,
        curveType: 'preset',
        preset: 'easeInOutCubic',
        customCurve: [0.645, 0.045, 0.355, 1],
        speedMultiplier: 1,
      },
    },
    {
      id: 'animation-2',
      type: 'animation',
      position: { x: 1400, y: 400 },
      data: {
        label: 'Ease Animation 2',
        status: 'idle',
        inputVideo: null,
        outputVideo: null,
        curveType: 'preset',
        preset: 'easeInOutCubic',
        customCurve: [0.645, 0.045, 0.355, 1],
        speedMultiplier: 1,
      },
    },

    // Stage 5: Stitching
    {
      id: 'stitch-1',
      type: 'videoStitch',
      position: { x: 1750, y: 275 },
      data: {
        label: 'Video Stitcher',
        status: 'idle',
        inputVideos: [],
        outputVideo: null,
        transitionType: 'crossfade',
        transitionDuration: 0.5,
        seamlessLoop: true,
        audioCodec: 'aac',
        outputQuality: 'full',
      },
    },

    // Output
    {
      id: 'output-1',
      type: 'download',
      position: { x: 2100, y: 275 },
      data: {
        label: 'Final Video',
        status: 'idle',
        inputMedia: null,
        inputType: 'video',
        outputName: 'full-pipeline-output',
      },
    },
  ],
  edges: [
    // Concept → LLM
    {
      id: 'e1',
      source: 'concept',
      target: 'llm-story',
      sourceHandle: 'text',
      targetHandle: 'prompt',
    },

    // LLM → Images
    {
      id: 'e2',
      source: 'llm-story',
      target: 'imageGen-1',
      sourceHandle: 'text',
      targetHandle: 'prompt',
    },
    {
      id: 'e3',
      source: 'llm-story',
      target: 'imageGen-2',
      sourceHandle: 'text',
      targetHandle: 'prompt',
    },
    {
      id: 'e4',
      source: 'llm-story',
      target: 'imageGen-3',
      sourceHandle: 'text',
      targetHandle: 'prompt',
    },

    // Images → Videos (interpolation)
    {
      id: 'e5',
      source: 'imageGen-1',
      target: 'videoGen-1',
      sourceHandle: 'image',
      targetHandle: 'image',
    },
    {
      id: 'e6',
      source: 'imageGen-2',
      target: 'videoGen-1',
      sourceHandle: 'image',
      targetHandle: 'lastFrame',
    },
    {
      id: 'e7',
      source: 'imageGen-2',
      target: 'videoGen-2',
      sourceHandle: 'image',
      targetHandle: 'image',
    },
    {
      id: 'e8',
      source: 'imageGen-3',
      target: 'videoGen-2',
      sourceHandle: 'image',
      targetHandle: 'lastFrame',
    },

    // LLM prompts → Videos
    {
      id: 'e9',
      source: 'llm-story',
      target: 'videoGen-1',
      sourceHandle: 'text',
      targetHandle: 'prompt',
    },
    {
      id: 'e10',
      source: 'llm-story',
      target: 'videoGen-2',
      sourceHandle: 'text',
      targetHandle: 'prompt',
    },

    // Videos → Animation
    {
      id: 'e11',
      source: 'videoGen-1',
      target: 'animation-1',
      sourceHandle: 'video',
      targetHandle: 'video',
    },
    {
      id: 'e12',
      source: 'videoGen-2',
      target: 'animation-2',
      sourceHandle: 'video',
      targetHandle: 'video',
    },

    // Animation → Stitch
    {
      id: 'e13',
      source: 'animation-1',
      target: 'stitch-1',
      sourceHandle: 'video',
      targetHandle: 'videos',
    },
    {
      id: 'e14',
      source: 'animation-2',
      target: 'stitch-1',
      sourceHandle: 'video',
      targetHandle: 'videos',
    },

    // Stitch → Output
    {
      id: 'e15',
      source: 'stitch-1',
      target: 'output-1',
      sourceHandle: 'video',
      targetHandle: 'video',
    },
  ],
  edgeStyle: 'smoothstep',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
