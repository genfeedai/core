import type { WorkflowFile } from '@genfeedai/types';

export const FACECAM_AVATAR_TEMPLATE: WorkflowFile = {
  version: 1,
  name: 'Facecam Avatar',
  description: 'Generate talking head videos from text scripts using ElevenLabs TTS and lip sync',
  nodes: [
    // Script Input
    {
      id: 'script-input',
      type: 'prompt',
      position: { x: 50, y: 100 },
      data: {
        label: 'Script',
        status: 'idle',
        prompt: 'Hello! Welcome to my channel. Today I want to share something exciting with you.',
        variables: {},
      },
    },
    // Face Image Input
    {
      id: 'face-image',
      type: 'imageInput',
      position: { x: 50, y: 350 },
      data: {
        label: 'Face Image',
        status: 'idle',
        image: null,
        filename: null,
        dimensions: null,
        source: 'upload',
      },
    },
    // Text to Speech
    {
      id: 'tts',
      type: 'textToSpeech',
      position: { x: 400, y: 100 },
      data: {
        label: 'Text to Speech',
        status: 'idle',
        inputText: null,
        outputAudio: null,
        provider: 'elevenlabs',
        voice: 'rachel',
        stability: 0.5,
        similarityBoost: 0.75,
        speed: 1.0,
        jobId: null,
        comment: 'Requires ELEVENLABS_API_KEY. Use Audio Input below as alternative.',
      },
    },
    // Alternative: Audio Input (for when TTS is not configured)
    {
      id: 'audio-alt',
      type: 'audioInput',
      position: { x: 400, y: 350 },
      data: {
        label: 'Voice Audio (Alternative)',
        status: 'idle',
        audio: null,
        filename: null,
        duration: null,
        source: 'upload',
        comment: 'Upload your own audio instead of TTS. Connect to Lip Sync audio input.',
      },
    },
    // Lip Sync
    {
      id: 'lipSync',
      type: 'lipSync',
      position: { x: 750, y: 200 },
      data: {
        label: 'Lip Sync Generator',
        status: 'idle',
        inputImage: null,
        inputVideo: null,
        inputAudio: null,
        outputVideo: null,
        model: 'sync/lipsync-2',
        syncMode: 'loop',
        temperature: 0.5,
        activeSpeaker: false,
        jobId: null,
      },
    },
    // Output
    {
      id: 'output',
      type: 'output',
      position: { x: 1100, y: 200 },
      data: {
        label: 'Talking Head Video',
        status: 'idle',
        inputMedia: null,
        inputType: 'video',
        outputName: 'facecam-avatar',
      },
    },
  ],
  edges: [
    // Script → Text to Speech
    {
      id: 'e1',
      source: 'script-input',
      target: 'tts',
      sourceHandle: 'text',
      targetHandle: 'text',
    },
    // Text to Speech → Lip Sync (audio)
    {
      id: 'e2',
      source: 'tts',
      target: 'lipSync',
      sourceHandle: 'audio',
      targetHandle: 'audio',
    },
    // Face Image → Lip Sync (image)
    {
      id: 'e3',
      source: 'face-image',
      target: 'lipSync',
      sourceHandle: 'image',
      targetHandle: 'image',
    },
    // Lip Sync → Output
    {
      id: 'e4',
      source: 'lipSync',
      target: 'output',
      sourceHandle: 'video',
      targetHandle: 'media',
    },
  ],
  edgeStyle: 'smoothstep',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
