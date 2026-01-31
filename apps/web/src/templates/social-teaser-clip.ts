import type { WorkflowTemplate } from '@genfeedai/types';

export const SOCIAL_TEASER_CLIP_TEMPLATE: WorkflowTemplate = {
  version: 1,
  name: 'Social Teaser Clip',
  description:
    'Quick teaser clip for Twitter/Instagram: animate a single photo, upscale quality, add bold CTA overlay',
  nodes: [
    // Stage 1: Image Input — single photo
    {
      id: 'image-input',
      type: 'imageInput',
      position: { x: 50, y: 200 },
      data: {
        label: 'Photo',
        status: 'idle',
        image: null,
        filename: null,
        dimensions: null,
        source: 'upload',
      },
    },

    // Stage 2: Video Generation — cinematic motion (9:16)
    {
      id: 'videoGen',
      type: 'videoGen',
      position: { x: 400, y: 200 },
      data: {
        label: 'Cinematic Motion',
        status: 'idle',
        inputImage: null,
        lastFrame: null,
        referenceImages: [],
        inputPrompt: null,
        negativePrompt: 'blurry, distorted, low quality, static',
        outputVideo: null,
        model: 'veo-3.1',
        duration: 6,
        aspectRatio: '9:16',
        resolution: '1080p',
        generateAudio: false,
        jobId: null,
      },
    },

    // Stage 3: Upscale — enhance quality
    {
      id: 'upscale',
      type: 'upscale',
      position: { x: 750, y: 200 },
      data: {
        label: 'Enhance Quality',
        status: 'idle',
        inputImage: null,
        inputVideo: null,
        inputType: 'video',
        outputImage: null,
        outputVideo: null,
        model: 'topaz-video',
        upscaleFactor: '2x',
        jobId: null,
      },
    },

    // Stage 4: CTA Prompt
    {
      id: 'cta-prompt',
      type: 'prompt',
      position: { x: 50, y: 450 },
      data: {
        label: 'CTA Text',
        status: 'idle',
        prompt:
          'Generate a short, catchy hook line for a social media teaser — something that grabs attention',
        variables: {},
      },
    },

    // Stage 5: LLM — generate short hook line
    {
      id: 'llm-hook',
      type: 'llm',
      position: { x: 400, y: 450 },
      data: {
        label: 'Hook Generator',
        status: 'idle',
        inputPrompt: null,
        outputText: null,
        systemPrompt:
          'You are a social media copywriter. Generate a single punchy hook line (max 10 words) that creates urgency and curiosity. No hashtags. Output only the hook text.',
        temperature: 0.9,
        maxTokens: 128,
        topP: 0.9,
        jobId: null,
      },
    },

    // Stage 6: Subtitle — bold CTA overlay at bottom
    {
      id: 'subtitle',
      type: 'subtitle',
      position: { x: 1100, y: 300 },
      data: {
        label: 'CTA Overlay',
        status: 'idle',
        inputVideo: null,
        inputText: null,
        outputVideo: null,
        style: 'modern',
        position: 'bottom',
        fontSize: 40,
        fontColor: '#FFFFFF',
        backgroundColor: 'rgba(0,0,0,0.7)',
        fontFamily: 'Arial',
        jobId: null,
      },
    },

    // Output
    {
      id: 'output',
      type: 'output',
      position: { x: 1450, y: 300 },
      data: {
        label: 'Final Teaser',
        status: 'idle',
        inputMedia: null,
        inputType: 'video',
        outputName: 'social-teaser-clip',
      },
    },
  ],
  edges: [
    // Image → Video
    {
      id: 'e-img-vid',
      source: 'image-input',
      target: 'videoGen',
      sourceHandle: 'image',
      targetHandle: 'image',
    },

    // Video → Upscale
    {
      id: 'e-vid-upscale',
      source: 'videoGen',
      target: 'upscale',
      sourceHandle: 'video',
      targetHandle: 'video',
    },

    // CTA Prompt → LLM
    {
      id: 'e-cta-llm',
      source: 'cta-prompt',
      target: 'llm-hook',
      sourceHandle: 'text',
      targetHandle: 'prompt',
    },

    // Upscale → Subtitle
    {
      id: 'e-upscale-subtitle',
      source: 'upscale',
      target: 'subtitle',
      sourceHandle: 'video',
      targetHandle: 'video',
    },

    // LLM → Subtitle (hook text)
    {
      id: 'e-llm-subtitle',
      source: 'llm-hook',
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
