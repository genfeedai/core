import type { WorkflowFile } from '@genfeedai/types';

export const STREAM_TO_SOCIAL_TEMPLATE: WorkflowFile = {
  version: 1,
  name: 'Stream to Multi-Platform Content',
  description:
    'Transform a 1-hour stream into engaging short-form content: transcribe → extract hot takes → generate intro + trim highlights → stitch → publish to YouTube, TikTok, and Instagram',
  nodes: [
    // Stage 1: Video Input
    {
      id: 'video-input',
      type: 'videoInput',
      position: { x: 50, y: 400 },
      data: {
        label: '1h Stream',
        status: 'idle',
        video: null,
        filename: null,
        duration: null,
        dimensions: null,
        source: 'upload',
      },
    },

    // Stage 2: Transcribe
    {
      id: 'transcribe',
      type: 'transcribe',
      position: { x: 350, y: 400 },
      data: {
        label: 'Transcribe Stream',
        status: 'idle',
        inputVideo: null,
        inputAudio: null,
        outputText: null,
        language: 'auto',
        timestamps: true,
        jobId: null,
      },
    },

    // Stage 3: LLM - Extract Hot Takes & Segment Ideas
    {
      id: 'llm-analysis',
      type: 'llm',
      position: { x: 650, y: 400 },
      data: {
        label: 'Hot Takes Extractor',
        status: 'idle',
        inputPrompt: null,
        outputText: null,
        systemPrompt: `You are a content strategist for viral social media. Analyze this stream transcript and extract:

1. **HOOK (for intro video):** A compelling 30-second hook that captures the stream's best moment
   - Format: [HOOK] ... [/HOOK]

2. **HOT TAKES (3-5):** The most engaging, quotable, or controversial statements
   - Format: [TAKE] timestamp | quote | context [/TAKE]

3. **HIGHLIGHT SEGMENTS (2):** The best continuous segments for clips
   - Format: [SEGMENT] start_time | end_time | reason [/SEGMENT]
   - Segment 1 should be 3-4 minutes
   - Segment 2 should be 4-5 minutes

4. **INTRO PROMPT:** A video generation prompt for a 1-minute AI intro
   - Format: [INTRO_PROMPT] ... [/INTRO_PROMPT]

Focus on content that will hook viewers in the first 3 seconds.`,
        temperature: 0.7,
        maxTokens: 2048,
        topP: 0.9,
        jobId: null,
      },
    },

    // Stage 4a: Video Gen - AI Intro (1 min)
    {
      id: 'video-gen-intro',
      type: 'videoGen',
      position: { x: 1000, y: 200 },
      data: {
        label: 'AI Intro (1 min)',
        status: 'idle',
        inputImage: null,
        lastFrame: null,
        referenceImages: [],
        inputPrompt: null,
        negativePrompt: 'blurry, distorted, low quality, watermark',
        outputVideo: null,
        model: 'veo-3.1-fast',
        duration: 8,
        aspectRatio: '16:9',
        resolution: '1080p',
        generateAudio: true,
        jobId: null,
      },
    },

    // Stage 4b: Video Trim - Segment 1 (3-4 min)
    {
      id: 'trim-segment-1',
      type: 'videoTrim',
      position: { x: 1000, y: 400 },
      data: {
        label: 'Highlight 1 (3-4 min)',
        status: 'idle',
        inputVideo: null,
        outputVideo: null,
        startTime: 300,
        endTime: 540,
        duration: null,
        jobId: null,
      },
    },

    // Stage 4c: Video Trim - Segment 2 (4-5 min)
    {
      id: 'trim-segment-2',
      type: 'videoTrim',
      position: { x: 1000, y: 600 },
      data: {
        label: 'Highlight 2 (4-5 min)',
        status: 'idle',
        inputVideo: null,
        outputVideo: null,
        startTime: 1800,
        endTime: 2100,
        duration: null,
        jobId: null,
      },
    },

    // Stage 5: Video Stitch
    {
      id: 'stitch',
      type: 'videoStitch',
      position: { x: 1350, y: 400 },
      data: {
        label: 'Combine All',
        status: 'idle',
        inputVideos: [],
        outputVideo: null,
        transitionType: 'crossfade',
        transitionDuration: 0.5,
        seamlessLoop: false,
      },
    },

    // Stage 6a: Publish to YouTube
    {
      id: 'publish-youtube',
      type: 'socialPublish',
      position: { x: 1700, y: 200 },
      data: {
        label: 'YouTube',
        status: 'idle',
        inputVideo: null,
        platform: 'youtube',
        title: '',
        description: '',
        tags: [],
        visibility: 'public',
        scheduledTime: null,
        publishedUrl: null,
        jobId: null,
      },
    },

    // Stage 6b: Publish to TikTok
    {
      id: 'publish-tiktok',
      type: 'socialPublish',
      position: { x: 1700, y: 400 },
      data: {
        label: 'TikTok',
        status: 'idle',
        inputVideo: null,
        platform: 'tiktok',
        title: '',
        description: '',
        tags: [],
        visibility: 'public',
        scheduledTime: null,
        publishedUrl: null,
        jobId: null,
      },
    },

    // Stage 6c: Publish to Instagram
    {
      id: 'publish-instagram',
      type: 'socialPublish',
      position: { x: 1700, y: 600 },
      data: {
        label: 'Instagram',
        status: 'idle',
        inputVideo: null,
        platform: 'instagram',
        title: '',
        description: '',
        tags: [],
        visibility: 'public',
        scheduledTime: null,
        publishedUrl: null,
        jobId: null,
      },
    },

    // Final Output/Preview
    {
      id: 'output',
      type: 'output',
      position: { x: 2050, y: 400 },
      data: {
        label: 'Final Output',
        status: 'idle',
        inputMedia: null,
        inputType: 'video',
        outputName: 'stream-highlights',
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

    // Transcribe → LLM Analysis
    {
      id: 'e-transcribe-llm',
      source: 'transcribe',
      target: 'llm-analysis',
      sourceHandle: 'text',
      targetHandle: 'prompt',
    },

    // LLM → Video Gen (for intro prompt)
    {
      id: 'e-llm-videogen',
      source: 'llm-analysis',
      target: 'video-gen-intro',
      sourceHandle: 'text',
      targetHandle: 'prompt',
    },

    // Video Input → Trim Segment 1
    {
      id: 'e-input-trim1',
      source: 'video-input',
      target: 'trim-segment-1',
      sourceHandle: 'video',
      targetHandle: 'video',
    },

    // Video Input → Trim Segment 2
    {
      id: 'e-input-trim2',
      source: 'video-input',
      target: 'trim-segment-2',
      sourceHandle: 'video',
      targetHandle: 'video',
    },

    // Video Gen Intro → Stitch
    {
      id: 'e-intro-stitch',
      source: 'video-gen-intro',
      target: 'stitch',
      sourceHandle: 'video',
      targetHandle: 'videos',
    },

    // Trim Segment 1 → Stitch
    {
      id: 'e-trim1-stitch',
      source: 'trim-segment-1',
      target: 'stitch',
      sourceHandle: 'video',
      targetHandle: 'videos',
    },

    // Trim Segment 2 → Stitch
    {
      id: 'e-trim2-stitch',
      source: 'trim-segment-2',
      target: 'stitch',
      sourceHandle: 'video',
      targetHandle: 'videos',
    },

    // Stitch → YouTube
    {
      id: 'e-stitch-youtube',
      source: 'stitch',
      target: 'publish-youtube',
      sourceHandle: 'video',
      targetHandle: 'video',
    },

    // Stitch → TikTok
    {
      id: 'e-stitch-tiktok',
      source: 'stitch',
      target: 'publish-tiktok',
      sourceHandle: 'video',
      targetHandle: 'video',
    },

    // Stitch → Instagram
    {
      id: 'e-stitch-instagram',
      source: 'stitch',
      target: 'publish-instagram',
      sourceHandle: 'video',
      targetHandle: 'video',
    },

    // Stitch → Output
    {
      id: 'e-stitch-output',
      source: 'stitch',
      target: 'output',
      sourceHandle: 'video',
      targetHandle: 'media',
    },
  ],
  edgeStyle: 'smoothstep',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
