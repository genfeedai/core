import type { WorkflowTemplate } from '@genfeedai/types';

export const CAM_PROFILE_PROMO_TEMPLATE: WorkflowTemplate = {
  version: 1,
  name: 'Cam Profile Promo',
  description:
    'Auto-generate profile promo video from photos: animate with cinematic motion, stitch with crossfade, add intro voiceover and handle overlay',
  nodes: [
    // Stage 1: Image Inputs — 3 model/streamer photos
    {
      id: 'image-1',
      type: 'imageInput',
      position: { x: 50, y: 100 },
      data: {
        label: 'Photo 1',
        status: 'idle',
        image: null,
        filename: null,
        dimensions: null,
        source: 'upload',
      },
    },
    {
      id: 'image-2',
      type: 'imageInput',
      position: { x: 50, y: 300 },
      data: {
        label: 'Photo 2',
        status: 'idle',
        image: null,
        filename: null,
        dimensions: null,
        source: 'upload',
      },
    },
    {
      id: 'image-3',
      type: 'imageInput',
      position: { x: 50, y: 500 },
      data: {
        label: 'Photo 3',
        status: 'idle',
        image: null,
        filename: null,
        dimensions: null,
        source: 'upload',
      },
    },

    // Stage 2: Video Generation — subtle cinematic motion from each photo
    {
      id: 'videoGen-1',
      type: 'videoGen',
      position: { x: 400, y: 100 },
      data: {
        label: 'Animate Photo 1',
        status: 'idle',
        inputImage: null,
        lastFrame: null,
        referenceImages: [],
        inputPrompt: null,
        negativePrompt: 'blurry, distorted, low quality',
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
      position: { x: 400, y: 300 },
      data: {
        label: 'Animate Photo 2',
        status: 'idle',
        inputImage: null,
        lastFrame: null,
        referenceImages: [],
        inputPrompt: null,
        negativePrompt: 'blurry, distorted, low quality',
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
      id: 'videoGen-3',
      type: 'videoGen',
      position: { x: 400, y: 500 },
      data: {
        label: 'Animate Photo 3',
        status: 'idle',
        inputImage: null,
        lastFrame: null,
        referenceImages: [],
        inputPrompt: null,
        negativePrompt: 'blurry, distorted, low quality',
        outputVideo: null,
        model: 'veo-3.1',
        duration: 5,
        aspectRatio: '9:16',
        resolution: '1080p',
        generateAudio: false,
        jobId: null,
      },
    },

    // Stage 3: Video Stitch — smooth crossfade
    {
      id: 'stitch',
      type: 'videoStitch',
      position: { x: 750, y: 300 },
      data: {
        label: 'Crossfade Stitch',
        status: 'idle',
        inputVideos: [],
        outputVideo: null,
        transitionType: 'crossfade',
        transitionDuration: 0.8,
        seamlessLoop: true,
        audioCodec: 'aac',
        outputQuality: 'full',
      },
    },

    // Stage 4: Prompt — streamer name/handle for TTS
    {
      id: 'handle-prompt',
      type: 'prompt',
      position: { x: 50, y: 700 },
      data: {
        label: 'Handle & Schedule',
        status: 'idle',
        prompt:
          "Hey, I'm @StarletStream — catch me live every Friday and Saturday night at 10 PM. Follow for exclusive content!",
        variables: {},
      },
    },

    // Stage 5: Text to Speech — intro voiceover
    {
      id: 'tts',
      type: 'textToSpeech',
      position: { x: 400, y: 700 },
      data: {
        label: 'Intro Voiceover',
        status: 'idle',
        inputText: null,
        outputAudio: null,
        provider: 'elevenlabs',
        voice: 'rachel',
        stability: 0.5,
        similarityBoost: 0.75,
        speed: 1.0,
        jobId: null,
      },
    },

    // Stage 6: Subtitle — handle/schedule overlay
    {
      id: 'subtitle',
      type: 'subtitle',
      position: { x: 1100, y: 200 },
      data: {
        label: 'Handle Overlay',
        status: 'idle',
        inputVideo: null,
        inputText: null,
        outputVideo: null,
        style: 'modern',
        position: 'bottom',
        fontSize: 28,
        fontColor: '#FF69B4',
        backgroundColor: 'rgba(0,0,0,0.5)',
        fontFamily: 'Arial',
        jobId: null,
      },
    },

    // Stage 7: Voice Change — mix voiceover onto video
    {
      id: 'voice-mix',
      type: 'voiceChange',
      position: { x: 1100, y: 450 },
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
      position: { x: 1450, y: 350 },
      data: {
        label: 'Final Promo',
        status: 'idle',
        inputMedia: null,
        inputType: 'video',
        outputName: 'cam-profile-promo',
      },
    },
  ],
  edges: [
    // Images → Videos
    {
      id: 'e-img1-vid1',
      source: 'image-1',
      target: 'videoGen-1',
      sourceHandle: 'image',
      targetHandle: 'image',
    },
    {
      id: 'e-img2-vid2',
      source: 'image-2',
      target: 'videoGen-2',
      sourceHandle: 'image',
      targetHandle: 'image',
    },
    {
      id: 'e-img3-vid3',
      source: 'image-3',
      target: 'videoGen-3',
      sourceHandle: 'image',
      targetHandle: 'image',
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

    // Handle Prompt → TTS
    {
      id: 'e-handle-tts',
      source: 'handle-prompt',
      target: 'tts',
      sourceHandle: 'text',
      targetHandle: 'text',
    },

    // Stitch → Subtitle
    {
      id: 'e-stitch-subtitle',
      source: 'stitch',
      target: 'subtitle',
      sourceHandle: 'video',
      targetHandle: 'video',
    },

    // Handle Prompt → Subtitle (overlay text)
    {
      id: 'e-handle-subtitle',
      source: 'handle-prompt',
      target: 'subtitle',
      sourceHandle: 'text',
      targetHandle: 'text',
    },

    // Subtitle → Voice Mix
    {
      id: 'e-subtitle-mix',
      source: 'subtitle',
      target: 'voice-mix',
      sourceHandle: 'video',
      targetHandle: 'video',
    },

    // TTS → Voice Mix
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
