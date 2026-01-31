/**
 * Prompt Registry for @genfeedai/prompts
 */

import * as fs from 'fs';
import * as path from 'path';
import { PromptTemplate, PromptCategory } from './types.js';

/**
 * Registry of all available prompt templates
 */
export const PROMPT_REGISTRY: Record<string, PromptTemplate> = {
  'product-photography': {
    id: 'product-photography',
    title: 'Product Photography',
    description: 'Professional product shots perfect for e-commerce and marketing',
    category: 'image-generation',
    tier: 'free',
    template:
      'A professional product photograph of {product}, shot on {background}, {lighting} lighting, {angle} angle, high resolution, commercial quality',
    variables: [
      {
        name: 'product',
        label: 'Product',
        type: 'text',
        required: true,
        placeholder: 'e.g., wireless headphones',
      },
      {
        name: 'background',
        label: 'Background',
        type: 'select',
        options: ['white', 'gradient', 'lifestyle', 'studio'],
        default: 'white',
      },
      {
        name: 'lighting',
        label: 'Lighting',
        type: 'select',
        options: ['soft', 'dramatic', 'natural', 'studio'],
        default: 'soft',
      },
      {
        name: 'angle',
        label: 'Camera Angle',
        type: 'select',
        options: ['front', '45-degree', 'top-down', 'eye-level'],
        default: '45-degree',
      },
    ],
    tags: ['product', 'ecommerce', 'photography', 'commercial'],
    icon: '📦',
    version: 1,
  },
  'social-media-post': {
    id: 'social-media-post',
    title: 'Social Media Post',
    description: 'Eye-catching images optimized for social media engagement',
    category: 'image-generation',
    tier: 'free',
    template:
      'A {style} social media post featuring {subject}, {mood} mood, {platform} optimized, trending design, vibrant colors',
    variables: [
      {
        name: 'subject',
        label: 'Subject',
        type: 'text',
        required: true,
        placeholder: 'e.g., coffee shop, workout',
      },
      {
        name: 'style',
        label: 'Style',
        type: 'select',
        options: ['minimalist', 'vibrant', 'artistic', 'corporate'],
        default: 'vibrant',
      },
      {
        name: 'mood',
        label: 'Mood',
        type: 'select',
        options: ['energetic', 'calm', 'professional', 'playful'],
        default: 'energetic',
      },
      {
        name: 'platform',
        label: 'Platform',
        type: 'select',
        options: ['Instagram', 'Facebook', 'Twitter', 'LinkedIn'],
        default: 'Instagram',
      },
    ],
    tags: ['social', 'media', 'marketing', 'engagement'],
    icon: '📱',
    version: 1,
  },
  'brand-ad': {
    id: 'brand-ad',
    title: 'Brand Advertisement',
    description: 'Professional brand advertisements that convert and engage',
    category: 'image-generation',
    tier: 'free',
    template:
      'A {style} advertisement for {brand}, showcasing {product}, {tone} tone, {target} audience, professional marketing photography',
    variables: [
      {
        name: 'brand',
        label: 'Brand Name',
        type: 'text',
        required: true,
        placeholder: 'e.g., Nike, Apple',
      },
      {
        name: 'product',
        label: 'Product/Service',
        type: 'text',
        required: true,
        placeholder: 'e.g., running shoes',
      },
      {
        name: 'style',
        label: 'Ad Style',
        type: 'select',
        options: ['luxury', 'casual', 'tech', 'lifestyle'],
        default: 'lifestyle',
      },
      {
        name: 'tone',
        label: 'Brand Tone',
        type: 'select',
        options: ['premium', 'friendly', 'innovative', 'trustworthy'],
        default: 'premium',
      },
      {
        name: 'target',
        label: 'Target Audience',
        type: 'select',
        options: ['young adults', 'professionals', 'families', 'athletes'],
        default: 'young adults',
      },
    ],
    tags: ['brand', 'advertising', 'marketing', 'commercial'],
    icon: '🎯',
    version: 1,
  },
  'portrait-headshot': {
    id: 'portrait-headshot',
    title: 'Portrait Headshot',
    description: 'Professional headshots perfect for LinkedIn and business use',
    category: 'image-generation',
    tier: 'free',
    template:
      'A professional {style} headshot of a {subject}, {background} background, {lighting} lighting, confident expression, business attire',
    variables: [
      {
        name: 'subject',
        label: 'Subject',
        type: 'text',
        required: true,
        placeholder: 'e.g., business executive, entrepreneur',
      },
      {
        name: 'style',
        label: 'Style',
        type: 'select',
        options: ['corporate', 'creative', 'casual', 'formal'],
        default: 'corporate',
      },
      {
        name: 'background',
        label: 'Background',
        type: 'select',
        options: ['neutral', 'office', 'outdoor', 'studio'],
        default: 'neutral',
      },
      {
        name: 'lighting',
        label: 'Lighting',
        type: 'select',
        options: ['natural', 'studio', 'window', 'soft'],
        default: 'natural',
      },
    ],
    tags: ['portrait', 'headshot', 'professional', 'business'],
    icon: '👤',
    version: 1,
  },
  'product-demo': {
    id: 'product-demo',
    title: 'Product Demo Video',
    description: 'Engaging product demonstration videos that showcase features',
    category: 'video-generation',
    tier: 'free',
    template:
      'Create a {duration} product demo video for {product}, highlighting {features}, {style} presentation, clear call-to-action',
    variables: [
      {
        name: 'product',
        label: 'Product',
        type: 'text',
        required: true,
        placeholder: 'e.g., smartphone app',
      },
      {
        name: 'features',
        label: 'Key Features',
        type: 'text',
        required: true,
        placeholder: 'e.g., ease of use, speed',
      },
      {
        name: 'duration',
        label: 'Duration',
        type: 'select',
        options: ['15-second', '30-second', '60-second'],
        default: '30-second',
      },
      {
        name: 'style',
        label: 'Presentation Style',
        type: 'select',
        options: ['animated', 'live-action', 'screen-recording', 'hybrid'],
        default: 'animated',
      },
    ],
    tags: ['product', 'demo', 'video', 'marketing'],
    icon: '🎥',
    version: 1,
  },
  'social-clip': {
    id: 'social-clip',
    title: 'Social Media Clip',
    description: 'Short-form video content optimized for social platforms',
    category: 'video-generation',
    tier: 'free',
    template:
      'A {duration} social media clip about {topic}, {style} style, {platform} optimized, engaging hook, trending format',
    variables: [
      {
        name: 'topic',
        label: 'Topic/Theme',
        type: 'text',
        required: true,
        placeholder: 'e.g., cooking tips, workout routine',
      },
      {
        name: 'duration',
        label: 'Duration',
        type: 'select',
        options: ['15 seconds', '30 seconds', '60 seconds'],
        default: '30 seconds',
      },
      {
        name: 'style',
        label: 'Video Style',
        type: 'select',
        options: ['educational', 'entertaining', 'inspiring', 'promotional'],
        default: 'entertaining',
      },
      {
        name: 'platform',
        label: 'Target Platform',
        type: 'select',
        options: ['TikTok', 'Instagram Reels', 'YouTube Shorts', 'Twitter'],
        default: 'Instagram Reels',
      },
    ],
    tags: ['social', 'short-form', 'viral', 'content'],
    icon: '📹',
    version: 1,
  },
  'ugc-testimonial': {
    id: 'ugc-testimonial',
    title: 'UGC Testimonial',
    description: 'Authentic user-generated content style testimonial videos',
    category: 'video-generation',
    tier: 'free',
    template:
      'A {style} UGC testimonial video for {product}, featuring {scenario}, authentic {tone} delivery, mobile-first format',
    variables: [
      {
        name: 'product',
        label: 'Product/Service',
        type: 'text',
        required: true,
        placeholder: 'e.g., skincare routine',
      },
      {
        name: 'scenario',
        label: 'Usage Scenario',
        type: 'text',
        required: true,
        placeholder: 'e.g., morning routine',
      },
      {
        name: 'style',
        label: 'UGC Style',
        type: 'select',
        options: ['before-after', 'day-in-life', 'review', 'tutorial'],
        default: 'review',
      },
      {
        name: 'tone',
        label: 'Delivery Tone',
        type: 'select',
        options: ['casual', 'enthusiastic', 'honest', 'expert'],
        default: 'casual',
      },
    ],
    tags: ['ugc', 'testimonial', 'authentic', 'conversion'],
    icon: '🗣️',
    version: 1,
  },
  'blog-outline': {
    id: 'blog-outline',
    title: 'Blog Post Outline',
    description: 'Comprehensive blog post outlines for content marketing',
    category: 'content',
    tier: 'free',
    template:
      'Create a detailed blog post outline about {topic} for {audience}, {tone} tone, {format} format, SEO-optimized structure',
    variables: [
      {
        name: 'topic',
        label: 'Blog Topic',
        type: 'text',
        required: true,
        placeholder: 'e.g., AI in marketing',
      },
      {
        name: 'audience',
        label: 'Target Audience',
        type: 'select',
        options: ['beginners', 'professionals', 'experts', 'general'],
        default: 'professionals',
      },
      {
        name: 'tone',
        label: 'Writing Tone',
        type: 'select',
        options: ['informative', 'conversational', 'authoritative', 'friendly'],
        default: 'informative',
      },
      {
        name: 'format',
        label: 'Content Format',
        type: 'select',
        options: ['how-to', 'listicle', 'guide', 'analysis'],
        default: 'how-to',
      },
    ],
    tags: ['blog', 'content', 'seo', 'marketing'],
    icon: '📝',
    version: 1,
  },
  'social-caption': {
    id: 'social-caption',
    title: 'Social Media Caption',
    description: 'Engaging captions that drive interaction and engagement',
    category: 'content',
    tier: 'free',
    template:
      'Write a {style} caption for {platform} about {topic}, {tone} voice, include {cta}, optimized for engagement',
    variables: [
      {
        name: 'topic',
        label: 'Post Topic',
        type: 'text',
        required: true,
        placeholder: 'e.g., new product launch',
      },
      {
        name: 'platform',
        label: 'Social Platform',
        type: 'select',
        options: ['Instagram', 'Facebook', 'Twitter', 'LinkedIn'],
        default: 'Instagram',
      },
      {
        name: 'style',
        label: 'Caption Style',
        type: 'select',
        options: ['storytelling', 'promotional', 'educational', 'humorous'],
        default: 'storytelling',
      },
      {
        name: 'tone',
        label: 'Brand Voice',
        type: 'select',
        options: ['casual', 'professional', 'playful', 'inspirational'],
        default: 'casual',
      },
      {
        name: 'cta',
        label: 'Call-to-Action',
        type: 'select',
        options: ['like & comment', 'share your story', 'visit link', 'tag friends'],
        default: 'like & comment',
      },
    ],
    tags: ['social', 'caption', 'engagement', 'copywriting'],
    icon: '💬',
    version: 1,
  },
  'email-sequence': {
    id: 'email-sequence',
    title: 'Email Marketing Sequence',
    description: 'Effective email sequences for nurturing and conversion',
    category: 'content',
    tier: 'free',
    template:
      'Design a {type} email sequence for {goal}, {length} emails, {audience} audience, {tone} approach, conversion-focused',
    variables: [
      {
        name: 'type',
        label: 'Sequence Type',
        type: 'select',
        options: ['welcome', 'nurture', 'sales', 'onboarding'],
        default: 'welcome',
      },
      {
        name: 'goal',
        label: 'Primary Goal',
        type: 'text',
        required: true,
        placeholder: 'e.g., increase product adoption',
      },
      {
        name: 'length',
        label: 'Number of Emails',
        type: 'select',
        options: ['3-email', '5-email', '7-email', '10-email'],
        default: '5-email',
      },
      {
        name: 'audience',
        label: 'Target Audience',
        type: 'select',
        options: ['new subscribers', 'existing customers', 'leads', 'inactive users'],
        default: 'new subscribers',
      },
      {
        name: 'tone',
        label: 'Email Tone',
        type: 'select',
        options: ['friendly', 'professional', 'urgent', 'educational'],
        default: 'friendly',
      },
    ],
    tags: ['email', 'marketing', 'sequence', 'automation'],
    icon: '📧',
    version: 1,
  },
};

/**
 * Available prompt categories
 */
export const PROMPT_CATEGORIES: PromptCategory[] = [
  {
    id: 'image-generation',
    name: 'Image Generation',
    description: 'Prompts for creating AI-generated images',
    icon: '🎨',
    count: 4,
  },
  {
    id: 'video-generation',
    name: 'Video Generation',
    description: 'Prompts for creating AI-generated videos',
    icon: '🎬',
    count: 3,
  },
  {
    id: 'content',
    name: 'Content Creation',
    description: 'Prompts for text and content generation',
    icon: '✍️',
    count: 3,
  },
];

/**
 * Get all prompt templates
 */
export function getAllPrompts(): PromptTemplate[] {
  return Object.values(PROMPT_REGISTRY);
}

/**
 * Get prompt template by ID
 */
export function getPrompt(id: string): PromptTemplate | undefined {
  return PROMPT_REGISTRY[id];
}

/**
 * Get prompt template JSON by ID
 */
export function getPromptJson(id: string): PromptTemplate | undefined {
  try {
    const category = PROMPT_REGISTRY[id]?.category;
    if (!category) return undefined;

    const promptPath = path.join(__dirname, '..', 'prompts', category, `${id}.json`);
    const jsonContent = fs.readFileSync(promptPath, 'utf-8');
    return JSON.parse(jsonContent);
  } catch (error) {
    return PROMPT_REGISTRY[id];
  }
}

/**
 * Get prompts by category
 */
export function getPromptsByCategory(category: string): PromptTemplate[] {
  return Object.values(PROMPT_REGISTRY).filter((p) => p.category === category);
}

/**
 * Search prompts by tag
 */
export function searchPromptsByTag(tag: string): PromptTemplate[] {
  return Object.values(PROMPT_REGISTRY).filter((p) =>
    p.tags.some((t) => t.toLowerCase().includes(tag.toLowerCase()))
  );
}

/**
 * Get all prompt categories
 */
export function getPromptCategories(): PromptCategory[] {
  return PROMPT_CATEGORIES;
}
