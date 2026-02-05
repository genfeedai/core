import type { WorkflowTemplate } from '@genfeedai/types';

export const AI_INFLUENCER_AVATAR_TEMPLATE: WorkflowTemplate = {
  version: 1,
  name: 'AI Influencer Avatar',
  description:
    'Generate a consistent AI influencer avatar and create multiple scene/pose variations using that avatar as reference for character consistency',
  nodes: [
    // Avatar Description Prompt
    {
      id: 'prompt-avatar',
      type: 'prompt',
      position: { x: 50, y: 50 },
      data: {
        label: 'Avatar Description',
        status: 'idle',
        prompt:
          'A young woman with brown hair, warm smile, modern casual style, approachable and confident',
        variables: {},
      },
    },
    // LLM to refine avatar prompt
    {
      id: 'llm-avatar',
      type: 'llm',
      position: { x: 350, y: 50 },
      data: {
        label: 'Refine Avatar',
        status: 'idle',
        inputPrompt: null,
        outputText: null,
        systemPrompt:
          "You are a portrait photography expert. Take the user's character description and create a detailed, generation-optimized prompt for creating a consistent AI influencer avatar. Focus on: facial features, hair style/color, skin tone, expression, clothing style, and overall aesthetic. Keep it concise (under 100 words). Start directly with the description, no preamble.",
        temperature: 0.7,
        maxTokens: 256,
        topP: 0.9,
        jobId: null,
      },
    },
    // Generate Base Avatar
    {
      id: 'imagegen-avatar',
      type: 'imageGen',
      position: { x: 650, y: 50 },
      data: {
        label: 'Generate Avatar',
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
    // Avatar Output
    {
      id: 'output-avatar',
      type: 'download',
      position: { x: 1250, y: 50 },
      data: {
        label: 'Base Avatar',
        status: 'idle',
        inputMedia: null,
        inputType: 'image',
        outputName: 'base-avatar',
      },
    },
    // Scene 1: Beach
    {
      id: 'prompt-scene-1',
      type: 'prompt',
      position: { x: 50, y: 250 },
      data: {
        label: 'Beach Scene',
        status: 'idle',
        prompt:
          'On a sunny tropical beach, wearing summer outfit, relaxed vacation pose, ocean waves in background',
        variables: {},
      },
    },
    {
      id: 'imagegen-scene-1',
      type: 'imageGen',
      position: { x: 650, y: 250 },
      data: {
        label: 'Beach Variation',
        status: 'idle',
        inputImages: [],
        inputPrompt: null,
        outputImage: null,
        model: 'nano-banana-pro',
        aspectRatio: '4:5',
        resolution: '2K',
        outputFormat: 'jpg',
        jobId: null,
      },
    },
    {
      id: 'output-scene-1',
      type: 'download',
      position: { x: 1250, y: 250 },
      data: {
        label: 'Beach Output',
        status: 'idle',
        inputMedia: null,
        inputType: 'image',
        outputName: 'scene-beach',
      },
    },
    // Scene 2: Office
    {
      id: 'prompt-scene-2',
      type: 'prompt',
      position: { x: 50, y: 450 },
      data: {
        label: 'Office Scene',
        status: 'idle',
        prompt:
          'In a modern office, professional attire, confident business pose, clean minimal workspace background',
        variables: {},
      },
    },
    {
      id: 'imagegen-scene-2',
      type: 'imageGen',
      position: { x: 650, y: 450 },
      data: {
        label: 'Office Variation',
        status: 'idle',
        inputImages: [],
        inputPrompt: null,
        outputImage: null,
        model: 'nano-banana-pro',
        aspectRatio: '4:5',
        resolution: '2K',
        outputFormat: 'jpg',
        jobId: null,
      },
    },
    {
      id: 'output-scene-2',
      type: 'download',
      position: { x: 1250, y: 450 },
      data: {
        label: 'Office Output',
        status: 'idle',
        inputMedia: null,
        inputType: 'image',
        outputName: 'scene-office',
      },
    },
    // Scene 3: Outdoor
    {
      id: 'prompt-scene-3',
      type: 'prompt',
      position: { x: 50, y: 650 },
      data: {
        label: 'Outdoor Scene',
        status: 'idle',
        prompt:
          'In a beautiful park or garden, athleisure wear, active healthy lifestyle pose, natural greenery background',
        variables: {},
      },
    },
    {
      id: 'imagegen-scene-3',
      type: 'imageGen',
      position: { x: 650, y: 650 },
      data: {
        label: 'Outdoor Variation',
        status: 'idle',
        inputImages: [],
        inputPrompt: null,
        outputImage: null,
        model: 'nano-banana-pro',
        aspectRatio: '4:5',
        resolution: '2K',
        outputFormat: 'jpg',
        jobId: null,
      },
    },
    {
      id: 'output-scene-3',
      type: 'download',
      position: { x: 1250, y: 650 },
      data: {
        label: 'Outdoor Output',
        status: 'idle',
        inputMedia: null,
        inputType: 'image',
        outputName: 'scene-outdoor',
      },
    },
    // Scene 4: Casual
    {
      id: 'prompt-scene-4',
      type: 'prompt',
      position: { x: 50, y: 850 },
      data: {
        label: 'Casual Scene',
        status: 'idle',
        prompt:
          'At a cozy cafe, casual streetwear, relaxed candid pose, warm coffee shop ambiance background',
        variables: {},
      },
    },
    {
      id: 'imagegen-scene-4',
      type: 'imageGen',
      position: { x: 650, y: 850 },
      data: {
        label: 'Casual Variation',
        status: 'idle',
        inputImages: [],
        inputPrompt: null,
        outputImage: null,
        model: 'nano-banana-pro',
        aspectRatio: '4:5',
        resolution: '2K',
        outputFormat: 'jpg',
        jobId: null,
      },
    },
    {
      id: 'output-scene-4',
      type: 'download',
      position: { x: 1250, y: 850 },
      data: {
        label: 'Casual Output',
        status: 'idle',
        inputMedia: null,
        inputType: 'image',
        outputName: 'scene-casual',
      },
    },
  ],
  edges: [
    // Avatar generation chain
    {
      id: 'e-avatar-llm',
      source: 'prompt-avatar',
      target: 'llm-avatar',
      sourceHandle: 'text',
      targetHandle: 'prompt',
    },
    {
      id: 'e-llm-imagegen',
      source: 'llm-avatar',
      target: 'imagegen-avatar',
      sourceHandle: 'text',
      targetHandle: 'prompt',
    },
    {
      id: 'e-avatar-output',
      source: 'imagegen-avatar',
      target: 'output-avatar',
      sourceHandle: 'image',
      targetHandle: 'image',
    },
    // Scene prompts → ImageGen
    {
      id: 'e-scene1-prompt',
      source: 'prompt-scene-1',
      target: 'imagegen-scene-1',
      sourceHandle: 'text',
      targetHandle: 'prompt',
    },
    {
      id: 'e-scene2-prompt',
      source: 'prompt-scene-2',
      target: 'imagegen-scene-2',
      sourceHandle: 'text',
      targetHandle: 'prompt',
    },
    {
      id: 'e-scene3-prompt',
      source: 'prompt-scene-3',
      target: 'imagegen-scene-3',
      sourceHandle: 'text',
      targetHandle: 'prompt',
    },
    {
      id: 'e-scene4-prompt',
      source: 'prompt-scene-4',
      target: 'imagegen-scene-4',
      sourceHandle: 'text',
      targetHandle: 'prompt',
    },
    // Avatar reference → All scene ImageGens (character consistency)
    {
      id: 'e-avatar-ref-1',
      source: 'imagegen-avatar',
      target: 'imagegen-scene-1',
      sourceHandle: 'image',
      targetHandle: 'images',
    },
    {
      id: 'e-avatar-ref-2',
      source: 'imagegen-avatar',
      target: 'imagegen-scene-2',
      sourceHandle: 'image',
      targetHandle: 'images',
    },
    {
      id: 'e-avatar-ref-3',
      source: 'imagegen-avatar',
      target: 'imagegen-scene-3',
      sourceHandle: 'image',
      targetHandle: 'images',
    },
    {
      id: 'e-avatar-ref-4',
      source: 'imagegen-avatar',
      target: 'imagegen-scene-4',
      sourceHandle: 'image',
      targetHandle: 'images',
    },
    // Scene ImageGens → Outputs
    {
      id: 'e-scene1-output',
      source: 'imagegen-scene-1',
      target: 'output-scene-1',
      sourceHandle: 'image',
      targetHandle: 'image',
    },
    {
      id: 'e-scene2-output',
      source: 'imagegen-scene-2',
      target: 'output-scene-2',
      sourceHandle: 'image',
      targetHandle: 'image',
    },
    {
      id: 'e-scene3-output',
      source: 'imagegen-scene-3',
      target: 'output-scene-3',
      sourceHandle: 'image',
      targetHandle: 'image',
    },
    {
      id: 'e-scene4-output',
      source: 'imagegen-scene-4',
      target: 'output-scene-4',
      sourceHandle: 'image',
      targetHandle: 'image',
    },
  ],
  edgeStyle: 'smoothstep',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
