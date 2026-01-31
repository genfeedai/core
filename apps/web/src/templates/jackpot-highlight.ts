import type { WorkflowTemplate } from '@genfeedai/types';

export const JACKPOT_HIGHLIGHT_TEMPLATE: WorkflowTemplate = {
  version: 1,
  name: 'Jackpot Highlight',
  description:
    'Big win celebration clip: generate hero visual from win details, animate with zoom/pan, overlay winner amount, add excitement voiceover',
  nodes: [
    // Stage 1: Win Details Input
    {
      id: 'concept',
      type: 'prompt',
      position: { x: 50, y: 300 },
      data: {
        label: 'Win Details',
        status: 'idle',
        prompt:
          '$250,000 JACKPOT on Mega Fortune slot — progressive jackpot hit, gold coins explosion, luxury lifestyle theme',
        variables: {},
      },
    },

    // Stage 2: LLM — visual scene + celebration script
    {
      id: 'llm-scene',
      type: 'llm',
      position: { x: 350, y: 300 },
      data: {
        label: 'Scene & Script Writer',
        status: 'idle',
        inputPrompt: null,
        outputText: null,
        systemPrompt: `You are a casino content creator specializing in jackpot celebration videos. Generate:

1. A detailed hero image prompt for the winning moment:
   - Explosive, celebratory visual with gold/neon aesthetic
   - 16:9 cinematic format
   - Include slot machine, coins, lights, confetti

Format: [VISUAL] detailed image prompt [/VISUAL]

2. A 10-second excitement voiceover script:
   - Announce the win amount dramatically
   - Build hype and congratulations
   - End with a CTA

Format: [VOICE] voiceover script [/VOICE]`,
        temperature: 0.8,
        maxTokens: 1024,
        topP: 0.9,
        jobId: null,
      },
    },

    // Stage 3: Image Generation — hero visual
    {
      id: 'imageGen',
      type: 'imageGen',
      position: { x: 700, y: 200 },
      data: {
        label: 'Hero Visual',
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

    // Stage 4: Video Generation — zoom/pan animation
    {
      id: 'videoGen',
      type: 'videoGen',
      position: { x: 1050, y: 200 },
      data: {
        label: 'Animated Scene',
        status: 'idle',
        inputImage: null,
        lastFrame: null,
        referenceImages: [],
        inputPrompt: null,
        negativePrompt: 'blurry, distorted, low quality',
        outputVideo: null,
        model: 'veo-3.1',
        duration: 8,
        aspectRatio: '16:9',
        resolution: '1080p',
        generateAudio: false,
        jobId: null,
      },
    },

    // Stage 5: Annotation — winner amount overlay
    {
      id: 'annotation',
      type: 'annotation',
      position: { x: 1050, y: 450 },
      data: {
        label: 'Amount Overlay',
        status: 'idle',
        inputImage: null,
        outputImage: null,
        annotations: [],
        hasAnnotations: false,
      },
    },

    // Stage 6: Text to Speech — excitement voiceover
    {
      id: 'tts',
      type: 'textToSpeech',
      position: { x: 700, y: 500 },
      data: {
        label: 'Excitement Voiceover',
        status: 'idle',
        inputText: null,
        outputAudio: null,
        provider: 'elevenlabs',
        voice: 'adam',
        stability: 0.4,
        similarityBoost: 0.9,
        speed: 1.2,
        jobId: null,
      },
    },

    // Stage 7: Voice Change — mix voiceover onto video
    {
      id: 'voice-mix',
      type: 'voiceChange',
      position: { x: 1400, y: 300 },
      data: {
        label: 'Audio Mixer',
        status: 'idle',
        inputVideo: null,
        inputAudio: null,
        outputVideo: null,
        preserveOriginalAudio: false,
        audioMixLevel: 0.9,
        jobId: null,
      },
    },

    // Output
    {
      id: 'output',
      type: 'output',
      position: { x: 1750, y: 300 },
      data: {
        label: 'Final Highlight',
        status: 'idle',
        inputMedia: null,
        inputType: 'video',
        outputName: 'jackpot-highlight',
      },
    },
  ],
  edges: [
    // Concept → LLM
    {
      id: 'e-concept-llm',
      source: 'concept',
      target: 'llm-scene',
      sourceHandle: 'text',
      targetHandle: 'prompt',
    },

    // LLM → Image
    {
      id: 'e-llm-img',
      source: 'llm-scene',
      target: 'imageGen',
      sourceHandle: 'text',
      targetHandle: 'prompt',
    },

    // Image → Video
    {
      id: 'e-img-vid',
      source: 'imageGen',
      target: 'videoGen',
      sourceHandle: 'image',
      targetHandle: 'image',
    },

    // LLM → Video (motion prompt)
    {
      id: 'e-llm-vid',
      source: 'llm-scene',
      target: 'videoGen',
      sourceHandle: 'text',
      targetHandle: 'prompt',
    },

    // Image → Annotation (for overlay editing)
    {
      id: 'e-img-annotation',
      source: 'imageGen',
      target: 'annotation',
      sourceHandle: 'image',
      targetHandle: 'image',
    },

    // LLM → TTS (celebration script)
    {
      id: 'e-llm-tts',
      source: 'llm-scene',
      target: 'tts',
      sourceHandle: 'text',
      targetHandle: 'text',
    },

    // Video + TTS → Voice Mix
    {
      id: 'e-vid-mix',
      source: 'videoGen',
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
