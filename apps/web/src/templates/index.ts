import type { WorkflowFile } from '@genfeedai/types';
import { FULL_PIPELINE_TEMPLATE } from './full-pipeline';
import { GRID_TO_VIDEO_TEMPLATE } from './generated/grid-to-video';
import { SOCIAL_BRAND_KIT_TEMPLATE } from './generated/social-brand-kit';
import { STREAM_TO_SOCIAL_TEMPLATE } from './generated/stream-to-social';
import { VOICE_TO_VIDEO_TEMPLATE } from './generated/voice-to-video';
import { YOUTUBE_THUMBNAIL_SCRIPT_TEMPLATE } from './generated/youtube-thumbnail-script';
import { YOUTUBE_VIDEO_GENERATOR_TEMPLATE } from './generated/youtube-video-generator';
import { IMAGE_SERIES_TEMPLATE } from './image-series';
import { IMAGE_TO_VIDEO_TEMPLATE } from './image-to-video';

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  category: 'images' | 'video' | 'full-pipeline' | 'audio';
  thumbnail?: string;
}

export const TEMPLATE_REGISTRY: Record<string, WorkflowFile> = {
  'image-series': IMAGE_SERIES_TEMPLATE,
  'image-to-video': IMAGE_TO_VIDEO_TEMPLATE,
  'full-pipeline': FULL_PIPELINE_TEMPLATE,
  'grid-to-video': GRID_TO_VIDEO_TEMPLATE,
  'voice-to-video': VOICE_TO_VIDEO_TEMPLATE,
  'youtube-thumbnail-script': YOUTUBE_THUMBNAIL_SCRIPT_TEMPLATE,
  'youtube-video-generator': YOUTUBE_VIDEO_GENERATOR_TEMPLATE,
  'stream-to-social': STREAM_TO_SOCIAL_TEMPLATE,
  'social-brand-kit': SOCIAL_BRAND_KIT_TEMPLATE,
};

export const TEMPLATE_INFO: TemplateInfo[] = [
  {
    id: 'image-series',
    name: 'Image Series',
    description: 'Generate a series of related images from a concept prompt using LLM expansion',
    category: 'images',
  },
  {
    id: 'image-to-video',
    name: 'Image to Video',
    description: 'Create interpolated video between two images with easing animation',
    category: 'video',
  },
  {
    id: 'full-pipeline',
    name: 'Full Content Pipeline',
    description: 'Complete workflow: concept → images → videos → animation → stitched output',
    category: 'full-pipeline',
  },
  {
    id: 'grid-to-video',
    name: 'Grid to Video Pipeline',
    description:
      'Generate a 3x3 grid image, split into 9 cells, create video from each, apply easing, and stitch into final video',
    category: 'full-pipeline',
  },
  {
    id: 'voice-to-video',
    name: 'Voice to Video',
    description: 'Generate a talking-head video from an image and audio file using lip-sync AI',
    category: 'audio',
  },
  {
    id: 'youtube-thumbnail-script',
    name: 'YouTube Thumbnail & Script',
    description:
      'Generate multiple thumbnail variations using character and reference images, plus a livestream script from topic context',
    category: 'images',
  },
  {
    id: 'youtube-video-generator',
    name: 'YouTube 10-Min Video Generator',
    description:
      'Generate a complete 10-minute YouTube video: script → images → videos with camera movements → stitch → music → subtitles → publish',
    category: 'full-pipeline',
  },
  {
    id: 'stream-to-social',
    name: 'Stream to Multi-Platform Content',
    description:
      'Transform a 1-hour stream into short-form content: transcribe → extract hot takes → generate intro + trim highlights → publish to YouTube, TikTok, and Instagram',
    category: 'full-pipeline',
  },
  {
    id: 'social-brand-kit',
    name: 'Social Media Brand Kit',
    description:
      'Generate a complete brand kit: profile picture, YouTube banner, Facebook cover, and X header with automatic platform resizing',
    category: 'images',
  },
];

export function getTemplate(id: string): WorkflowFile | undefined {
  return TEMPLATE_REGISTRY[id];
}

export function getTemplatesByCategory(category: string): TemplateInfo[] {
  if (category === 'all') return TEMPLATE_INFO;
  return TEMPLATE_INFO.filter((t) => t.category === category);
}

export {
  IMAGE_SERIES_TEMPLATE,
  IMAGE_TO_VIDEO_TEMPLATE,
  FULL_PIPELINE_TEMPLATE,
  GRID_TO_VIDEO_TEMPLATE,
  VOICE_TO_VIDEO_TEMPLATE,
  YOUTUBE_THUMBNAIL_SCRIPT_TEMPLATE,
  YOUTUBE_VIDEO_GENERATOR_TEMPLATE,
  STREAM_TO_SOCIAL_TEMPLATE,
  SOCIAL_BRAND_KIT_TEMPLATE,
};
