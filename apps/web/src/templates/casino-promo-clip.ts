import type { WorkflowTemplate } from '@genfeedai/types';

export const CASINO_PROMO_CLIP_TEMPLATE: WorkflowTemplate = {
  version: 1,
  name: 'Casino Promo Clip',
  description:
    'Short-form promo video from a concept: expand into visual scenes, generate imagery, animate, stitch with CTA voiceover',
  nodes: [
    // Stage 1: Concept Input
    {
      id: 'concept',
      type: 'prompt',
      position: { x: 50, y: 300 },
      data: {
        label: 'Promo Concept',
        status: 'idle',
        prompt:
          'New slot game launch: "Golden Dragon Fortune" — neon-lit casino floor, spinning reels with dragon symbols, big win celebration with gold coins erupting',
        variables: {},
      },
    },

    // Stage 2: LLM — expand concept into 3 scenes + CTA script
    {
      id: 'llm-scenes',
      type: 'llm',
      position: { x: 350, y: 300 },
      data: {
        label: 'Scene & CTA Writer',
        status: 'idle',
        inputPrompt: null,
        outputText: null,
        systemPrompt: `You are a casino marketing creative director. Expand the concept into exactly 3 visual scenes and a short CTA voiceover script.

For each scene, provide a detailed image generation prompt with:
- Neon casino aesthetic, vibrant lighting, rich colors
- 16:9 cinematic composition
- Specific visual elements (slot machines, cards, chips, lights)

Format:
1. [Scene 1 image prompt]
2. [Scene 2 image prompt]
3. [Scene 3 image prompt]

[CTA] A punchy 10-second voiceover script with urgency and excitement [/CTA]`,
        temperature: 0.8,
        maxTokens: 2048,
        topP: 0.9,
        jobId: null,
      },
    },

    // Stage 3: Image Generation — 3 scene visuals
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

    // Stage 4: Video Generation — animate each scene
    {
      id: 'videoGen-1',
      type: 'videoGen',
      position: { x: 1050, y: 100 },
      data: {
        label: 'Scene 1 Video',
        status: 'idle',
        inputImage: null,
        lastFrame: null,
        referenceImages: [],
        inputPrompt: null,
        negativePrompt: 'blurry, distorted, low quality',
        outputVideo: null,
        model: 'veo-3.1',
        duration: 5,
        aspectRatio: '16:9',
        resolution: '1080p',
        generateAudio: false,
        jobId: null,
      },
    },
    {
      id: 'videoGen-2',
      type: 'videoGen',
      position: { x: 1050, y: 300 },
      data: {
        label: 'Scene 2 Video',
        status: 'idle',
        inputImage: null,
        lastFrame: null,
        referenceImages: [],
        inputPrompt: null,
        negativePrompt: 'blurry, distorted, low quality',
        outputVideo: null,
        model: 'veo-3.1',
        duration: 5,
        aspectRatio: '16:9',
        resolution: '1080p',
        generateAudio: false,
        jobId: null,
      },
    },
    {
      id: 'videoGen-3',
      type: 'videoGen',
      position: { x: 1050, y: 500 },
      data: {
        label: 'Scene 3 Video',
        status: 'idle',
        inputImage: null,
        lastFrame: null,
        referenceImages: [],
        inputPrompt: null,
        negativePrompt: 'blurry, distorted, low quality',
        outputVideo: null,
        model: 'veo-3.1',
        duration: 5,
        aspectRatio: '16:9',
        resolution: '1080p',
        generateAudio: false,
        jobId: null,
      },
    },

    // Stage 5: Video Stitch — crossfade transitions
    {
      id: 'stitch',
      type: 'videoStitch',
      position: { x: 1400, y: 300 },
      data: {
        label: 'Video Stitcher',
        status: 'idle',
        inputVideos: [],
        outputVideo: null,
        transitionType: 'crossfade',
        transitionDuration: 0.5,
        seamlessLoop: false,
        audioCodec: 'aac',
        outputQuality: 'full',
      },
    },

    // Stage 6: Text to Speech — CTA voiceover
    {
      id: 'tts',
      type: 'textToSpeech',
      position: { x: 1400, y: 550 },
      data: {
        label: 'CTA Voiceover',
        status: 'idle',
        inputText: null,
        outputAudio: null,
        provider: 'elevenlabs',
        voice: 'adam',
        stability: 0.6,
        similarityBoost: 0.8,
        speed: 1.1,
        jobId: null,
      },
    },

    // Stage 7: Voice Change — mix voiceover onto stitched video
    {
      id: 'voice-mix',
      type: 'voiceChange',
      position: { x: 1750, y: 300 },
      data: {
        label: 'Audio Mixer',
        status: 'idle',
        inputVideo: null,
        inputAudio: null,
        outputVideo: null,
        preserveOriginalAudio: false,
        audioMixLevel: 0.8,
        jobId: null,
      },
    },

    // Output
    {
      id: 'output',
      type: 'output',
      position: { x: 2100, y: 300 },
      data: {
        label: 'Final Promo',
        status: 'idle',
        inputMedia: null,
        inputType: 'video',
        outputName: 'casino-promo-clip',
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
    {
      id: 'e-llm-img3',
      source: 'llm-scenes',
      target: 'imageGen-3',
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
    {
      id: 'e-img3-vid3',
      source: 'imageGen-3',
      target: 'videoGen-3',
      sourceHandle: 'image',
      targetHandle: 'image',
    },

    // LLM → Videos (prompt for motion)
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
    {
      id: 'e-llm-vid3',
      source: 'llm-scenes',
      target: 'videoGen-3',
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
    {
      id: 'e-vid3-stitch',
      source: 'videoGen-3',
      target: 'stitch',
      sourceHandle: 'video',
      targetHandle: 'videos',
    },

    // LLM → TTS (CTA script)
    {
      id: 'e-llm-tts',
      source: 'llm-scenes',
      target: 'tts',
      sourceHandle: 'text',
      targetHandle: 'text',
    },

    // Stitch + TTS → Voice Mix
    {
      id: 'e-stitch-mix',
      source: 'stitch',
      target: 'voice-mix',
      sourceHandle: 'video',
      targetHandle: 'video',
    },
    {
      id: 'e-tts-mix',
      source: 'tts',
      target: 'voice-mix',
      sourceHandle: 'audio',
      targetHandle: 'audio',
    },

    // Voice Mix → Output
    {
      id: 'e-mix-output',
      source: 'voice-mix',
      target: 'output',
      sourceHandle: 'video',
      targetHandle: 'video',
    },
  ],
  edgeStyle: 'smoothstep',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
