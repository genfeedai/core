import type { WorkflowTemplate } from '@genfeedai/types';

export const SPORTS_BETTING_TEASER_TEMPLATE: WorkflowTemplate = {
  version: 1,
  name: 'Sports Betting Teaser',
  description:
    'Hype clip for sports betting events: generate dramatic scenes, animate with fast cuts, overlay odds/CTA text',
  nodes: [
    // Stage 1: Event Description
    {
      id: 'concept',
      type: 'prompt',
      position: { x: 50, y: 300 },
      data: {
        label: 'Event Description',
        status: 'idle',
        prompt:
          'UFC 310 Main Event: Champion vs Challenger — explosive knockout odds, electric arena atmosphere, dramatic walkout',
        variables: {},
      },
    },

    // Stage 2: LLM — generate 2 dramatic scene prompts + headline text
    {
      id: 'llm-scenes',
      type: 'llm',
      position: { x: 350, y: 300 },
      data: {
        label: 'Scene & Headline Writer',
        status: 'idle',
        inputPrompt: null,
        outputText: null,
        systemPrompt: `You are a sports betting content creator. Generate exactly 2 dramatic scene prompts and a bold headline for a betting teaser.

For each scene, provide a detailed image generation prompt with:
- High-energy action shots, dramatic lighting
- 9:16 vertical format for social media
- Sports-specific visual elements

Format:
1. [Scene 1 image prompt — the build-up/anticipation]
2. [Scene 2 image prompt — the climactic action moment]

[HEADLINE] Short, punchy betting CTA with odds format (e.g. "+250 KNOCKOUT") [/HEADLINE]`,
        temperature: 0.8,
        maxTokens: 1024,
        topP: 0.9,
        jobId: null,
      },
    },

    // Stage 3: Image Generation — 2 action shots (9:16 vertical)
    {
      id: 'imageGen-1',
      type: 'imageGen',
      position: { x: 700, y: 150 },
      data: {
        label: 'Scene 1 Image',
        status: 'idle',
        inputImages: [],
        inputPrompt: null,
        outputImage: null,
        model: 'nano-banana-pro',
        aspectRatio: '9:16',
        resolution: '2K',
        outputFormat: 'jpg',
        jobId: null,
      },
    },
    {
      id: 'imageGen-2',
      type: 'imageGen',
      position: { x: 700, y: 450 },
      data: {
        label: 'Scene 2 Image',
        status: 'idle',
        inputImages: [],
        inputPrompt: null,
        outputImage: null,
        model: 'nano-banana-pro',
        aspectRatio: '9:16',
        resolution: '2K',
        outputFormat: 'jpg',
        jobId: null,
      },
    },

    // Stage 4: Video Generation — dynamic motion
    {
      id: 'videoGen-1',
      type: 'videoGen',
      position: { x: 1050, y: 150 },
      data: {
        label: 'Scene 1 Video',
        status: 'idle',
        inputImage: null,
        lastFrame: null,
        referenceImages: [],
        inputPrompt: null,
        negativePrompt: 'blurry, distorted, low quality, static',
        outputVideo: null,
        model: 'veo-3.1',
        duration: 5,
        aspectRatio: '9:16',
        resolution: '1080p',
        generateAudio: false,
        jobId: null,
      },
    },
    {
      id: 'videoGen-2',
      type: 'videoGen',
      position: { x: 1050, y: 450 },
      data: {
        label: 'Scene 2 Video',
        status: 'idle',
        inputImage: null,
        lastFrame: null,
        referenceImages: [],
        inputPrompt: null,
        negativePrompt: 'blurry, distorted, low quality, static',
        outputVideo: null,
        model: 'veo-3.1',
        duration: 5,
        aspectRatio: '9:16',
        resolution: '1080p',
        generateAudio: false,
        jobId: null,
      },
    },

    // Stage 5: Video Stitch — fast cut transitions
    {
      id: 'stitch',
      type: 'videoStitch',
      position: { x: 1400, y: 300 },
      data: {
        label: 'Fast Cut Stitch',
        status: 'idle',
        inputVideos: [],
        outputVideo: null,
        transitionType: 'crossfade',
        transitionDuration: 0.2,
        seamlessLoop: false,
        audioCodec: 'aac',
        outputQuality: 'full',
      },
    },

    // Stage 6: Subtitle — bold overlay with odds/CTA text
    {
      id: 'subtitle',
      type: 'subtitle',
      position: { x: 1750, y: 300 },
      data: {
        label: 'Odds Overlay',
        status: 'idle',
        inputVideo: null,
        inputText: null,
        outputVideo: null,
        style: 'modern',
        position: 'center',
        fontSize: 48,
        fontColor: '#FFD700',
        backgroundColor: 'rgba(0,0,0,0.6)',
        fontFamily: 'Arial',
        jobId: null,
      },
    },

    // Output
    {
      id: 'output',
      type: 'output',
      position: { x: 2100, y: 300 },
      data: {
        label: 'Final Teaser',
        status: 'idle',
        inputMedia: null,
        inputType: 'video',
        outputName: 'sports-betting-teaser',
      },
    },
  ],
  edges: [
    // Concept → LLM
    {
      id: 'e-concept-llm',
      source: 'concept',
      target: 'llm-scenes',
      sourceHandle: 'text',
      targetHandle: 'prompt',
    },

    // LLM → Images
    {
      id: 'e-llm-img1',
      source: 'llm-scenes',
      target: 'imageGen-1',
      sourceHandle: 'text',
      targetHandle: 'prompt',
    },
    {
      id: 'e-llm-img2',
      source: 'llm-scenes',
      target: 'imageGen-2',
      sourceHandle: 'text',
      targetHandle: 'prompt',
    },

    // Images → Videos
    {
      id: 'e-img1-vid1',
      source: 'imageGen-1',
      target: 'videoGen-1',
      sourceHandle: 'image',
      targetHandle: 'image',
    },
    {
      id: 'e-img2-vid2',
      source: 'imageGen-2',
      target: 'videoGen-2',
      sourceHandle: 'image',
      targetHandle: 'image',
    },

    // LLM → Videos (motion prompts)
    {
      id: 'e-llm-vid1',
      source: 'llm-scenes',
      target: 'videoGen-1',
      sourceHandle: 'text',
      targetHandle: 'prompt',
    },
    {
      id: 'e-llm-vid2',
      source: 'llm-scenes',
      target: 'videoGen-2',
      sourceHandle: 'text',
      targetHandle: 'prompt',
    },

    // Videos → Stitch
    {
      id: 'e-vid1-stitch',
      source: 'videoGen-1',
      target: 'stitch',
      sourceHandle: 'video',
      targetHandle: 'videos',
    },
    {
      id: 'e-vid2-stitch',
      source: 'videoGen-2',
      target: 'stitch',
      sourceHandle: 'video',
      targetHandle: 'videos',
    },

    // Stitch → Subtitle
    {
      id: 'e-stitch-subtitle',
      source: 'stitch',
      target: 'subtitle',
      sourceHandle: 'video',
      targetHandle: 'video',
    },

    // LLM → Subtitle (headline text)
    {
      id: 'e-llm-subtitle',
      source: 'llm-scenes',
      target: 'subtitle',
      sourceHandle: 'text',
      targetHandle: 'text',
    },

    // Subtitle → Output
    {
      id: 'e-subtitle-output',
      source: 'subtitle',
      target: 'output',
      sourceHandle: 'video',
      targetHandle: 'video',
    },
  ],
  edgeStyle: 'smoothstep',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
