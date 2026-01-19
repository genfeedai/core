import type { WorkflowFile } from '@genfeedai/types';

export const EXTENDED_VIDEO_TEMPLATE: WorkflowFile = {
  version: 1,
  name: 'Extended Video Pipeline',
  description:
    'Generate a longer video by chaining video segments: create first segment, extract last frame, generate continuation prompt, create second segment, and stitch together',
  nodes: [
    // Input: Initial Prompt
    {
      id: 'prompt-1',
      type: 'prompt',
      position: { x: 50, y: 200 },
      data: {
        label: 'Scene Prompt',
        status: 'idle',
        prompt:
          'A majestic eagle soaring through mountain clouds at sunrise, cinematic drone shot, golden hour lighting',
        variables: {},
      },
    },
    // First Video Generation
    {
      id: 'videoGen-1',
      type: 'videoGen',
      position: { x: 350, y: 200 },
      data: {
        label: 'Video Segment 1',
        status: 'idle',
        inputImage: null,
        lastFrame: null,
        referenceImages: [],
        inputPrompt: null,
        negativePrompt: '',
        outputVideo: null,
        model: 'veo-3.1-fast',
        duration: 8,
        aspectRatio: '16:9',
        resolution: '1080p',
        generateAudio: true,
        jobId: null,
      },
    },
    // Frame Extraction from first video
    {
      id: 'frameExtract-1',
      type: 'videoFrameExtract',
      position: { x: 650, y: 200 },
      data: {
        label: 'Extract Last Frame',
        status: 'idle',
        inputVideo: null,
        outputImage: null,
        selectionMode: 'last',
        timestampSeconds: 0,
        percentagePosition: 100,
        videoDuration: null,
        jobId: null,
      },
    },
    // LLM for continuation prompt
    {
      id: 'llm-1',
      type: 'llm',
      position: { x: 650, y: 400 },
      data: {
        label: 'Continuation Prompt',
        status: 'idle',
        inputPrompt: null,
        outputText: null,
        systemPrompt:
          'You are a video director. Given a scene description, write a continuation that naturally follows the action. Keep the same style, setting, and subject. Output only the prompt, no explanations. The continuation should feel like a seamless extension of the scene.',
        temperature: 0.7,
        maxTokens: 256,
        topP: 0.9,
        jobId: null,
      },
    },
    // Second Video Generation (uses last frame + continuation prompt)
    {
      id: 'videoGen-2',
      type: 'videoGen',
      position: { x: 950, y: 300 },
      data: {
        label: 'Video Segment 2',
        status: 'idle',
        inputImage: null,
        lastFrame: null,
        referenceImages: [],
        inputPrompt: null,
        negativePrompt: '',
        outputVideo: null,
        model: 'veo-3.1-fast',
        duration: 8,
        aspectRatio: '16:9',
        resolution: '1080p',
        generateAudio: true,
        jobId: null,
      },
    },
    // Video Stitch
    {
      id: 'stitch-1',
      type: 'videoStitch',
      position: { x: 1250, y: 250 },
      data: {
        label: 'Combine Segments',
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
    // Output
    {
      id: 'output-1',
      type: 'output',
      position: { x: 1550, y: 250 },
      data: {
        label: 'Extended Video',
        status: 'idle',
        inputMedia: null,
        inputType: 'video',
        outputName: 'extended-video-output',
      },
    },
  ],
  edges: [
    // Prompt -> First VideoGen
    {
      id: 'e1',
      source: 'prompt-1',
      target: 'videoGen-1',
      sourceHandle: 'text',
      targetHandle: 'prompt',
    },
    // First VideoGen -> Frame Extract
    {
      id: 'e2',
      source: 'videoGen-1',
      target: 'frameExtract-1',
      sourceHandle: 'video',
      targetHandle: 'video',
    },
    // Original Prompt -> LLM (for context)
    {
      id: 'e3',
      source: 'prompt-1',
      target: 'llm-1',
      sourceHandle: 'text',
      targetHandle: 'prompt',
    },
    // Frame Extract -> Second VideoGen (as starting image)
    {
      id: 'e4',
      source: 'frameExtract-1',
      target: 'videoGen-2',
      sourceHandle: 'image',
      targetHandle: 'image',
    },
    // LLM -> Second VideoGen (continuation prompt)
    {
      id: 'e5',
      source: 'llm-1',
      target: 'videoGen-2',
      sourceHandle: 'text',
      targetHandle: 'prompt',
    },
    // First VideoGen -> Stitch
    {
      id: 'e6',
      source: 'videoGen-1',
      target: 'stitch-1',
      sourceHandle: 'video',
      targetHandle: 'videos',
    },
    // Second VideoGen -> Stitch
    {
      id: 'e7',
      source: 'videoGen-2',
      target: 'stitch-1',
      sourceHandle: 'video',
      targetHandle: 'videos',
    },
    // Stitch -> Output
    {
      id: 'e8',
      source: 'stitch-1',
      target: 'output-1',
      sourceHandle: 'video',
      targetHandle: 'media',
    },
  ],
  edgeStyle: 'smoothstep',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
