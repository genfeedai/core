import type { PromptCategory } from '@genfeedai/types';

interface SystemPrompt {
  name: string;
  description: string;
  promptText: string;
  styleSettings: {
    mood?: string;
    style?: string;
    camera?: string;
    lighting?: string;
    scene?: string;
  };
  aspectRatio: string;
  preferredModel: string;
  category: PromptCategory;
  tags: string[];
  isFeatured: boolean;
  isSystem: boolean;
}

// System prompts to seed on startup
export const SYSTEM_PROMPTS: SystemPrompt[] = [
  // ============================================
  // PORTRAIT (3)
  // ============================================
  {
    aspectRatio: '4:5',
    category: 'portrait',
    description: 'Dramatic portrait with cinematic lighting and shallow depth of field',
    isFeatured: true,
    isSystem: true,
    name: 'Cinematic Portrait',
    preferredModel: 'nano-banana-pro',
    promptText:
      'Cinematic portrait photograph, dramatic side lighting with deep shadows, shallow depth of field f/1.4, film grain, moody atmosphere, professional studio quality, 85mm lens, bokeh background',
    styleSettings: {
      camera: 'portrait',
      lighting: 'dramatic',
      mood: 'cinematic',
      scene: 'studio',
      style: 'photorealistic',
    },
    tags: ['cinematic', 'dramatic', 'portrait', 'studio', 'moody'],
  },
  {
    aspectRatio: '3:4',
    category: 'fashion',
    description: 'High-fashion magazine style portrait with elegant styling',
    isFeatured: true,
    isSystem: true,
    name: 'Fashion Editorial',
    preferredModel: 'nano-banana-pro',
    promptText:
      'High-fashion editorial portrait, Vogue magazine style, elegant pose, professional studio lighting, clean background, sharp focus on subject, fashion photography, couture aesthetic, 70mm lens',
    styleSettings: {
      camera: 'portrait',
      lighting: 'studio',
      mood: 'dramatic',
      scene: 'studio',
      style: 'photorealistic',
    },
    tags: ['fashion', 'editorial', 'magazine', 'elegant', 'professional'],
  },
  {
    aspectRatio: '3:2',
    category: 'portrait',
    description: 'Subject photographed in their natural environment with context',
    isFeatured: true,
    isSystem: true,
    name: 'Environmental Portrait',
    preferredModel: 'nano-banana-pro',
    promptText:
      'Environmental portrait, subject in their natural setting, storytelling composition, natural lighting, context-rich background, documentary style, authentic moment, 35mm lens wide perspective',
    styleSettings: {
      camera: 'wide-angle',
      lighting: 'natural',
      mood: 'peaceful',
      scene: 'outdoor',
      style: 'photorealistic',
    },
    tags: ['environmental', 'documentary', 'natural', 'storytelling', 'authentic'],
  },

  // ============================================
  // PRODUCT (2)
  // ============================================
  {
    aspectRatio: '1:1',
    category: 'product',
    description: 'Clean product photography on white background for online stores',
    isFeatured: true,
    isSystem: true,
    name: 'E-commerce Product Shot',
    preferredModel: 'nano-banana-pro',
    promptText:
      'Professional e-commerce product photography, pure white background, soft studio lighting, sharp product focus, clean shadows, commercial quality, high detail, packshot style, 100mm macro lens',
    styleSettings: {
      camera: 'macro',
      lighting: 'studio',
      mood: 'peaceful',
      scene: 'studio',
      style: 'photorealistic',
    },
    tags: ['ecommerce', 'product', 'white-background', 'commercial', 'clean'],
  },
  {
    aspectRatio: '4:5',
    category: 'product',
    description: 'Product showcased in a natural lifestyle setting',
    isFeatured: true,
    isSystem: true,
    name: 'Lifestyle Product',
    preferredModel: 'nano-banana-pro',
    promptText:
      'Lifestyle product photography, product in natural home setting, warm ambient lighting, cozy atmosphere, styled scene with props, Instagram aesthetic, soft shadows, inviting composition',
    styleSettings: {
      camera: 'eye-level',
      lighting: 'natural',
      mood: 'peaceful',
      scene: 'domestic',
      style: 'photorealistic',
    },
    tags: ['lifestyle', 'product', 'natural', 'cozy', 'instagram'],
  },

  // ============================================
  // LANDSCAPE (2)
  // ============================================
  {
    aspectRatio: '16:9',
    category: 'landscape',
    description: 'Warm sunset landscape with dramatic golden light',
    isFeatured: true,
    isSystem: true,
    name: 'Golden Hour Landscape',
    preferredModel: 'nano-banana-pro',
    promptText:
      'Golden hour landscape photography, warm sunset light, long shadows, vibrant orange and gold tones, dramatic sky, epic vista, wide angle composition, nature photography, 16mm ultra-wide lens',
    styleSettings: {
      camera: 'wide-angle',
      lighting: 'golden-hour',
      mood: 'peaceful',
      scene: 'nature',
      style: 'photorealistic',
    },
    tags: ['landscape', 'golden-hour', 'sunset', 'nature', 'dramatic'],
  },
  {
    aspectRatio: '21:9',
    category: 'landscape',
    description: 'Atmospheric landscape with dramatic weather and mood',
    isFeatured: true,
    isSystem: true,
    name: 'Moody Landscape',
    preferredModel: 'nano-banana-pro',
    promptText:
      'Moody landscape photography, dramatic storm clouds, fog and mist, desaturated colors, atmospheric perspective, brooding atmosphere, fine art style, dramatic weather, cinematic composition',
    styleSettings: {
      camera: 'wide-angle',
      lighting: 'dramatic',
      mood: 'moody',
      scene: 'nature',
      style: 'photorealistic',
    },
    tags: ['landscape', 'moody', 'atmospheric', 'dramatic', 'fine-art'],
  },

  // ============================================
  // ANIME (1)
  // ============================================
  {
    aspectRatio: '3:4',
    category: 'anime',
    description: 'High-quality anime character illustration in Studio Ghibli style',
    isFeatured: true,
    isSystem: true,
    name: 'Anime Character',
    preferredModel: 'nano-banana-pro',
    promptText:
      'Studio Ghibli style anime character, soft watercolor textures, hand-drawn aesthetic, expressive eyes, gentle color palette, whimsical atmosphere, detailed background, Hayao Miyazaki inspired, cel-shaded lighting',
    styleSettings: {
      camera: 'eye-level',
      lighting: 'soft',
      mood: 'whimsical',
      scene: 'outdoor',
      style: 'anime',
    },
    tags: ['anime', 'ghibli', 'character', 'illustration', 'japanese'],
  },

  // ============================================
  // FOOD (1)
  // ============================================
  {
    aspectRatio: '1:1',
    category: 'food',
    description: 'Appetizing food photography with professional lighting',
    isFeatured: true,
    isSystem: true,
    name: 'Food Photography',
    preferredModel: 'nano-banana-pro',
    promptText:
      'Professional food photography, appetizing presentation, soft diffused lighting, shallow depth of field, fresh ingredients, steam and texture details, restaurant quality, overhead angle, food styling',
    styleSettings: {
      camera: 'high-angle',
      lighting: 'soft',
      mood: 'peaceful',
      scene: 'indoor',
      style: 'photorealistic',
    },
    tags: ['food', 'culinary', 'appetizing', 'restaurant', 'professional'],
  },

  // ============================================
  // ABSTRACT (1)
  // ============================================
  {
    aspectRatio: '1:1',
    category: 'abstract',
    description: 'Creative non-representational abstract artwork',
    isFeatured: true,
    isSystem: true,
    name: 'Abstract Art',
    preferredModel: 'nano-banana-pro',
    promptText:
      'Abstract art composition, bold geometric shapes, vibrant color contrasts, dynamic movement, non-representational forms, contemporary art style, textured brushstrokes, artistic expression, gallery quality',
    styleSettings: {
      camera: 'eye-level',
      lighting: 'studio',
      mood: 'energetic',
      scene: 'abstract',
      style: 'digital-art',
    },
    tags: ['abstract', 'art', 'geometric', 'contemporary', 'creative'],
  },

  // ============================================
  // ADS / MARKETING (2)
  // ============================================
  {
    aspectRatio: '9:16',
    category: 'ads',
    description: 'Attention-grabbing visual for social media advertising',
    isFeatured: true,
    isSystem: true,
    name: 'Social Media Ad',
    preferredModel: 'nano-banana-pro',
    promptText:
      'Eye-catching social media advertisement, bold vibrant colors, clean modern design, attention-grabbing composition, Instagram/TikTok optimized, trendy aesthetic, high contrast, clear focal point, marketing visual',
    styleSettings: {
      camera: 'eye-level',
      lighting: 'studio',
      mood: 'energetic',
      scene: 'studio',
      style: 'digital-art',
    },
    tags: ['social-media', 'advertising', 'marketing', 'trendy', 'bold'],
  },
  {
    aspectRatio: '21:9',
    category: 'ads',
    description: 'Wide format impactful banner for websites and campaigns',
    isFeatured: true,
    isSystem: true,
    name: 'Hero Banner',
    preferredModel: 'nano-banana-pro',
    promptText:
      'Website hero banner, wide panoramic format, impactful visual, professional marketing quality, clean negative space for text overlay, gradient lighting, brand-friendly aesthetic, high resolution, corporate style',
    styleSettings: {
      camera: 'wide-angle',
      lighting: 'dramatic',
      mood: 'dramatic',
      scene: 'studio',
      style: 'photorealistic',
    },
    tags: ['banner', 'hero', 'website', 'marketing', 'corporate'],
  },
];
