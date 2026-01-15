import type { WorkflowFile } from '@genfeedai/types';

// NOTE: This template uses placeholder node types (subtitle, youtubeUpload)
// that need to be implemented in apps/web/src/types/nodes.ts before use.
// Using type assertion to allow template definition while nodes are pending.
export const YOUTUBE_VIDEO_GENERATOR_TEMPLATE = {
  version: 1,
  name: 'YouTube 10-Min Video Generator',
  description:
    'Generate a complete 10-minute YouTube video: script → images → videos with camera movements → stitch → music → subtitles → publish',
  nodes: [
    // Stage 1: Script Input & Generation
    {
      id: 'script-input',
      type: 'prompt',
      position: { x: 50, y: 600 },
      data: {
        label: 'Script/Topic',
        status: 'idle',
        prompt:
          'Create a 10-minute educational video about the history of artificial intelligence, from its origins in the 1950s to modern deep learning breakthroughs.',
        variables: {},
      },
    },
    {
      id: 'llm-script',
      type: 'llm',
      position: { x: 350, y: 500 },
      data: {
        label: 'Script Generator',
        status: 'idle',
        inputPrompt: null,
        outputText: null,
        systemPrompt:
          'You are a professional YouTube scriptwriter. Generate a complete 10-minute video script with clear narration, engaging hooks, and natural transitions. Include timestamps and speaker directions. The script should be compelling and educational.',
        temperature: 0.8,
        maxTokens: 4096,
        topP: 0.9,
        jobId: null,
      },
    },
    {
      id: 'llm-scenes',
      type: 'llm',
      position: { x: 650, y: 500 },
      data: {
        label: 'Scene Expander',
        status: 'idle',
        inputPrompt: null,
        outputText: null,
        systemPrompt: `You are a video director. Break this script into exactly 20 scenes for video generation.

For each scene, provide:
1. SCENE NUMBER (1-20)
2. VISUAL DESCRIPTION: Detailed image prompt for the key frame
3. CAMERA MOVEMENT: One of: slow zoom in, slow zoom out, pan left, pan right, dolly forward, dolly back, static, subtle drift
4. DURATION: 30 seconds each
5. MOOD: The emotional tone

Format each scene as:
---SCENE [N]---
VISUAL: [detailed image description, style, lighting, composition]
CAMERA: [camera movement instruction]
MOOD: [emotional tone]
---END SCENE---

Ensure visual continuity between scenes. Total runtime: 10 minutes (20 × 30 seconds).`,
        temperature: 0.7,
        maxTokens: 8192,
        topP: 0.9,
        jobId: null,
      },
    },

    // Stage 2: Image Generation (20 scenes)
    ...Array.from({ length: 20 }, (_, i) => ({
      id: `img-${i + 1}`,
      type: 'imageGen' as const,
      position: { x: 1000, y: 50 + i * 120 },
      data: {
        label: `Scene ${i + 1} Image`,
        status: 'idle' as const,
        inputImages: [],
        inputPrompt: null,
        outputImage: null,
        model: 'nano-banana-pro' as const,
        aspectRatio: '16:9' as const,
        resolution: '2K' as const,
        outputFormat: 'jpg' as const,
        jobId: null,
      },
    })),

    // Stage 3: Video Generation (20 scenes with camera movements)
    ...Array.from({ length: 20 }, (_, i) => ({
      id: `vid-${i + 1}`,
      type: 'videoGen' as const,
      position: { x: 1350, y: 50 + i * 120 },
      data: {
        label: `Scene ${i + 1} Video`,
        status: 'idle' as const,
        inputImage: null,
        lastFrame: null,
        referenceImages: [],
        inputPrompt: null,
        negativePrompt: 'blurry, distorted, low quality, watermark, text overlay',
        outputVideo: null,
        model: 'veo-3.1' as const,
        duration: 8 as const,
        aspectRatio: '16:9' as const,
        resolution: '1080p' as const,
        generateAudio: false,
        jobId: null,
      },
    })),

    // Stage 4: Video Stitching
    {
      id: 'stitch',
      type: 'videoStitch',
      position: { x: 1700, y: 600 },
      data: {
        label: 'Video Stitcher',
        status: 'idle',
        inputVideos: [],
        outputVideo: null,
        transitionType: 'crossfade',
        transitionDuration: 0.5,
        seamlessLoop: false,
      },
    },

    // Stage 5: Audio Input (Background Music)
    {
      id: 'audio-music',
      type: 'audioInput',
      position: { x: 1700, y: 300 },
      data: {
        label: 'Background Music',
        status: 'idle',
        audio: null,
        filename: null,
        duration: null,
        source: 'upload',
      },
    },

    // Stage 6: Subtitle (placeholder - needs implementation)
    {
      id: 'subtitle',
      type: 'subtitle',
      position: { x: 2050, y: 500 },
      data: {
        label: 'Subtitles',
        status: 'idle',
        inputVideo: null,
        inputText: null,
        outputVideo: null,
        style: 'modern',
        position: 'bottom',
        fontSize: 24,
        fontColor: '#FFFFFF',
        backgroundColor: 'rgba(0,0,0,0.7)',
      },
    },

    // Stage 7: Voice Change (Audio Mixer)
    {
      id: 'voice-change',
      type: 'voiceChange',
      position: { x: 2050, y: 700 },
      data: {
        label: 'Audio Mixer',
        status: 'idle',
        inputVideo: null,
        inputAudio: null,
        outputVideo: null,
        preserveOriginalAudio: false,
        audioMixLevel: 0.3,
      },
    },

    // Stage 8: YouTube Upload (placeholder - needs implementation)
    {
      id: 'youtube',
      type: 'youtubeUpload',
      position: { x: 2400, y: 600 },
      data: {
        label: 'YouTube Upload',
        status: 'idle',
        inputVideo: null,
        title: '',
        description: '',
        tags: [],
        category: 'Education',
        visibility: 'private',
        scheduledTime: null,
        thumbnailImage: null,
        uploadStatus: null,
        videoUrl: null,
      },
    },

    // Final Output
    {
      id: 'output',
      type: 'output',
      position: { x: 2750, y: 600 },
      data: {
        label: 'Final Video',
        status: 'idle',
        inputMedia: null,
        inputType: 'video',
        outputName: 'youtube-video-10min',
      },
    },
  ],
  edges: [
    // Script flow
    {
      id: 'e-script-1',
      source: 'script-input',
      target: 'llm-script',
      sourceHandle: 'text',
      targetHandle: 'prompt',
    },
    {
      id: 'e-script-2',
      source: 'llm-script',
      target: 'llm-scenes',
      sourceHandle: 'text',
      targetHandle: 'prompt',
    },

    // LLM → Images (20 edges)
    ...Array.from({ length: 20 }, (_, i) => ({
      id: `e-img-prompt-${i + 1}`,
      source: 'llm-scenes',
      target: `img-${i + 1}`,
      sourceHandle: 'text',
      targetHandle: 'prompt',
    })),

    // Images → Videos (20 edges)
    ...Array.from({ length: 20 }, (_, i) => ({
      id: `e-img-vid-${i + 1}`,
      source: `img-${i + 1}`,
      target: `vid-${i + 1}`,
      sourceHandle: 'image',
      targetHandle: 'image',
    })),

    // LLM → Videos for camera prompts (20 edges)
    ...Array.from({ length: 20 }, (_, i) => ({
      id: `e-vid-prompt-${i + 1}`,
      source: 'llm-scenes',
      target: `vid-${i + 1}`,
      sourceHandle: 'text',
      targetHandle: 'prompt',
    })),

    // Videos → Stitch (20 edges)
    ...Array.from({ length: 20 }, (_, i) => ({
      id: `e-stitch-${i + 1}`,
      source: `vid-${i + 1}`,
      target: 'stitch',
      sourceHandle: 'video',
      targetHandle: 'videos',
    })),

    // Stitch → Voice Change (add music)
    {
      id: 'e-stitch-voice',
      source: 'stitch',
      target: 'voice-change',
      sourceHandle: 'video',
      targetHandle: 'video',
    },
    {
      id: 'e-audio-voice',
      source: 'audio-music',
      target: 'voice-change',
      sourceHandle: 'audio',
      targetHandle: 'audio',
    },

    // Script → Subtitle
    {
      id: 'e-script-subtitle',
      source: 'llm-script',
      target: 'subtitle',
      sourceHandle: 'text',
      targetHandle: 'text',
    },

    // Voice Change → Subtitle
    {
      id: 'e-voice-subtitle',
      source: 'voice-change',
      target: 'subtitle',
      sourceHandle: 'video',
      targetHandle: 'video',
    },

    // Subtitle → YouTube
    {
      id: 'e-subtitle-youtube',
      source: 'subtitle',
      target: 'youtube',
      sourceHandle: 'video',
      targetHandle: 'video',
    },

    // YouTube → Output
    {
      id: 'e-youtube-output',
      source: 'youtube',
      target: 'output',
      sourceHandle: 'video',
      targetHandle: 'media',
    },
  ],
  edgeStyle: 'smoothstep',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
} as WorkflowFile;
