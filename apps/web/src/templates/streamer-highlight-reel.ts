import type { WorkflowTemplate } from '@genfeedai/types';

export const STREAMER_HIGHLIGHT_REEL_TEMPLATE: WorkflowTemplate = {
  version: 1,
  name: 'Streamer Highlight Reel',
  description:
    'Repurpose stream footage into social-ready clips: transcribe key moments, trim highlights, stitch with captions, resize for TikTok/Reels',
  nodes: [
    // Stage 1: Video Input — raw stream footage
    {
      id: 'video-input',
      type: 'videoInput',
      position: { x: 50, y: 300 },
      data: {
        label: 'Stream Footage',
        status: 'idle',
        video: null,
        filename: null,
        duration: null,
        dimensions: null,
        source: 'upload',
      },
    },

    // Stage 2: Transcribe — find key moments
    {
      id: 'transcribe',
      type: 'transcribe',
      position: { x: 350, y: 300 },
      data: {
        label: 'Find Key Moments',
        status: 'idle',
        inputVideo: null,
        inputAudio: null,
        outputText: null,
        language: 'auto',
        timestamps: true,
        jobId: null,
      },
    },

    // Stage 3: Video Trim — extract 3 highlights
    {
      id: 'trim-1',
      type: 'videoTrim',
      position: { x: 700, y: 100 },
      data: {
        label: 'Highlight 1',
        status: 'idle',
        inputVideo: null,
        outputVideo: null,
        startTime: 0,
        endTime: 60,
        duration: null,
        jobId: null,
      },
    },
    {
      id: 'trim-2',
      type: 'videoTrim',
      position: { x: 700, y: 300 },
      data: {
        label: 'Highlight 2',
        status: 'idle',
        inputVideo: null,
        outputVideo: null,
        startTime: 300,
        endTime: 360,
        duration: null,
        jobId: null,
      },
    },
    {
      id: 'trim-3',
      type: 'videoTrim',
      position: { x: 700, y: 500 },
      data: {
        label: 'Highlight 3',
        status: 'idle',
        inputVideo: null,
        outputVideo: null,
        startTime: 900,
        endTime: 960,
        duration: null,
        jobId: null,
      },
    },

    // Stage 4: Video Stitch — crossfade compilation
    {
      id: 'stitch',
      type: 'videoStitch',
      position: { x: 1050, y: 300 },
      data: {
        label: 'Compilation Stitch',
        status: 'idle',
        inputVideos: [],
        outputVideo: null,
        transitionType: 'crossfade',
        transitionDuration: 0.3,
        seamlessLoop: false,
        audioCodec: 'aac',
        outputQuality: 'full',
      },
    },

    // Stage 5: Subtitle — modern captions
    {
      id: 'subtitle',
      type: 'subtitle',
      position: { x: 1400, y: 200 },
      data: {
        label: 'Modern Captions',
        status: 'idle',
        inputVideo: null,
        inputText: null,
        outputVideo: null,
        style: 'modern',
        position: 'bottom',
        fontSize: 32,
        fontColor: '#FFFFFF',
        backgroundColor: 'rgba(0,0,0,0.5)',
        fontFamily: 'Arial',
        jobId: null,
      },
    },

    // Stage 6: Resize — 9:16 for TikTok/Reels
    {
      id: 'resize',
      type: 'resize',
      position: { x: 1400, y: 450 },
      data: {
        label: 'Resize 9:16',
        status: 'idle',
        inputImage: null,
        inputVideo: null,
        inputType: 'video',
        outputMedia: null,
        aspectRatio: '9:16',
        gridPosition: 'center',
        jobId: null,
      },
    },

    // Output
    {
      id: 'output',
      type: 'output',
      position: { x: 1750, y: 300 },
      data: {
        label: 'Final Reel',
        status: 'idle',
        inputMedia: null,
        inputType: 'video',
        outputName: 'streamer-highlight-reel',
      },
    },
  ],
  edges: [
    // Video Input → Transcribe
    {
      id: 'e-input-transcribe',
      source: 'video-input',
      target: 'transcribe',
      sourceHandle: 'video',
      targetHandle: 'video',
    },

    // Video Input → Trims
    {
      id: 'e-input-trim1',
      source: 'video-input',
      target: 'trim-1',
      sourceHandle: 'video',
      targetHandle: 'video',
    },
    {
      id: 'e-input-trim2',
      source: 'video-input',
      target: 'trim-2',
      sourceHandle: 'video',
      targetHandle: 'video',
    },
    {
      id: 'e-input-trim3',
      source: 'video-input',
      target: 'trim-3',
      sourceHandle: 'video',
      targetHandle: 'video',
    },

    // Trims → Stitch
    {
      id: 'e-trim1-stitch',
      source: 'trim-1',
      target: 'stitch',
      sourceHandle: 'video',
      targetHandle: 'videos',
    },
    {
      id: 'e-trim2-stitch',
      source: 'trim-2',
      target: 'stitch',
      sourceHandle: 'video',
      targetHandle: 'videos',
    },
    {
      id: 'e-trim3-stitch',
      source: 'trim-3',
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

    // Transcribe → Subtitle (caption text)
    {
      id: 'e-transcribe-subtitle',
      source: 'transcribe',
      target: 'subtitle',
      sourceHandle: 'text',
      targetHandle: 'text',
    },

    // Subtitle → Resize
    {
      id: 'e-subtitle-resize',
      source: 'subtitle',
      target: 'resize',
      sourceHandle: 'video',
      targetHandle: 'video',
    },

    // Resize → Output
    {
      id: 'e-resize-output',
      source: 'resize',
      target: 'output',
      sourceHandle: 'video',
      targetHandle: 'video',
    },
  ],
  edgeStyle: 'smoothstep',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
