import { Injectable, Logger } from '@nestjs/common';
import type {
  ModelInputSchema,
  ReplicateModelInput,
  SchemaParams,
} from '@/interfaces/execution-types.interface';

/**
 * Canonical input field names used internally
 * These get mapped to model-specific field names based on inputSchema
 */
export interface CanonicalVideoInput {
  prompt: string;
  image?: string; // Starting frame
  lastFrame?: string; // Ending frame for interpolation
  referenceImages?: string[];
  duration?: number;
  aspectRatio?: string;
  resolution?: string;
  generateAudio?: boolean;
  negativePrompt?: string;
  seed?: number;
}

export interface CanonicalImageInput {
  prompt: string;
  inputImages?: string[];
  aspectRatio?: string;
  resolution?: string;
  outputFormat?: string;
}

/**
 * Field mapping configuration for different model naming conventions
 */
interface FieldMapping {
  canonical: string;
  alternatives: string[];
}

/**
 * Common field mappings across video models
 * Maps our canonical names to various model-specific alternatives
 */
const VIDEO_FIELD_MAPPINGS: FieldMapping[] = [
  // Starting image
  {
    alternatives: ['start_image', 'first_frame_image', 'first_frame', 'init_image', 'source_image'],
    canonical: 'image',
  },
  // Ending image
  {
    alternatives: ['end_image', 'last_frame', 'tail_image', 'final_frame', 'target_image'],
    canonical: 'lastFrame',
  },
  // Reference images
  {
    alternatives: ['reference_images', 'ref_images', 'style_images'],
    canonical: 'referenceImages',
  },
  // Duration
  { alternatives: ['length', 'video_length', 'duration_seconds'], canonical: 'duration' },
  // Aspect ratio
  { alternatives: ['aspect_ratio', 'ratio'], canonical: 'aspectRatio' },
  // Resolution
  { alternatives: ['output_resolution', 'video_resolution'], canonical: 'resolution' },
  // Audio generation
  { alternatives: ['generate_audio', 'audio', 'with_audio', 'sound'], canonical: 'generateAudio' },
  // Negative prompt
  { alternatives: ['negative_prompt', 'negative', 'neg_prompt'], canonical: 'negativePrompt' },
];

/**
 * Common field mappings across image models
 */
const IMAGE_FIELD_MAPPINGS: FieldMapping[] = [
  // Input images
  {
    alternatives: [
      'input_image',
      'image_input',
      'images',
      'source_images',
      'reference_images',
      'init_image',
    ],
    canonical: 'inputImages',
  },
  // Aspect ratio
  { alternatives: ['aspect_ratio', 'ratio'], canonical: 'aspectRatio' },
  // Resolution
  { alternatives: ['output_resolution', 'image_resolution', 'size'], canonical: 'resolution' },
  // Output format
  { alternatives: ['output_format', 'format', 'image_format'], canonical: 'outputFormat' },
];

@Injectable()
export class SchemaMapperService {
  private readonly logger = new Logger(SchemaMapperService.name);

  /**
   * Build a mapping from canonical field names to model-specific field names
   * based on the model's input schema
   */
  buildFieldMap(
    inputSchema: ModelInputSchema | undefined,
    fieldMappings: FieldMapping[]
  ): Map<string, string> {
    const fieldMap = new Map<string, string>();
    const schemaProps = inputSchema?.properties ?? {};

    for (const mapping of fieldMappings) {
      // Check if any alternative name exists in schema
      for (const alt of mapping.alternatives) {
        // Case-insensitive check
        const foundKey = Object.keys(schemaProps).find(
          (k) => k.toLowerCase() === alt.toLowerCase()
        );
        if (foundKey) {
          fieldMap.set(mapping.canonical, foundKey);
          break;
        }
      }

      // If no alternative found, check if canonical name exists directly
      if (!fieldMap.has(mapping.canonical)) {
        const foundKey = Object.keys(schemaProps).find(
          (k) => k.toLowerCase() === mapping.canonical.toLowerCase()
        );
        if (foundKey) {
          fieldMap.set(mapping.canonical, foundKey);
        }
      }
    }

    return fieldMap;
  }

  /**
   * Check if a value is valid for a schema property (handles enum constraints)
   */
  private isValidForSchema(
    value: unknown,
    fieldName: string,
    inputSchema: ModelInputSchema | undefined
  ): boolean {
    if (!inputSchema) return true;

    const schemaProps = inputSchema.properties;
    if (!schemaProps) return true;

    const fieldSchema = schemaProps[fieldName];
    if (!fieldSchema) return true;

    // Check enum constraint
    if (fieldSchema.enum && Array.isArray(fieldSchema.enum)) {
      const isValid = fieldSchema.enum.includes(value);
      if (!isValid) {
        this.logger.debug(
          `Value "${value}" not in enum [${fieldSchema.enum.join(', ')}] for field "${fieldName}"`
        );
      }
      return isValid;
    }

    return true;
  }

  /**
   * Map video generation input to model-specific format
   * Uses inputSchema to determine correct field names
   * Only includes fields that exist in the model's schema
   */
  mapVideoInput(
    input: CanonicalVideoInput,
    inputSchema: ModelInputSchema | undefined,
    schemaParams?: SchemaParams
  ): ReplicateModelInput {
    const fieldMap = this.buildFieldMap(inputSchema, VIDEO_FIELD_MAPPINGS);
    const schemaProps = inputSchema?.properties ?? {};
    const result: ReplicateModelInput = {};

    // Start with schemaParams if provided (user-set values)
    if (schemaParams) {
      Object.assign(result, schemaParams);
    }

    // Always include prompt
    result.prompt = input.prompt;

    // Map each canonical field - only if schema supports it
    if (input.image !== undefined && input.image !== null) {
      const fieldName = fieldMap.get('image');
      if (fieldName) {
        result[fieldName] = input.image;
      }
    }

    if (input.lastFrame !== undefined && input.lastFrame !== null) {
      const fieldName = fieldMap.get('lastFrame');
      if (fieldName) {
        result[fieldName] = input.lastFrame;
      }
    }

    if (input.referenceImages?.length) {
      const fieldName = fieldMap.get('referenceImages');
      if (fieldName) {
        result[fieldName] = input.referenceImages;
      }
    }

    // Only set other fields if they exist in schema AND not already in schemaParams
    if (input.duration !== undefined && !('duration' in result)) {
      const fieldName = fieldMap.get('duration');
      if (fieldName) {
        result[fieldName] = input.duration;
      }
    }

    if (input.aspectRatio !== undefined && !('aspect_ratio' in result)) {
      const fieldName = fieldMap.get('aspectRatio');
      if (fieldName) {
        result[fieldName] = input.aspectRatio;
      }
    }

    if (input.resolution !== undefined && !('resolution' in result)) {
      const fieldName = fieldMap.get('resolution');
      if (fieldName) {
        result[fieldName] = input.resolution;
      }
    }

    if (input.generateAudio !== undefined && !('generate_audio' in result)) {
      const fieldName = fieldMap.get('generateAudio');
      if (fieldName) {
        result[fieldName] = input.generateAudio;
      }
    }

    if (input.negativePrompt !== undefined && !('negative_prompt' in result)) {
      const fieldName = fieldMap.get('negativePrompt');
      if (fieldName) {
        result[fieldName] = input.negativePrompt;
      }
    }

    // Seed is common, check if schema has it
    if (input.seed !== undefined && !('seed' in result) && 'seed' in schemaProps) {
      result.seed = input.seed;
    }

    this.logger.debug(`Mapped video input fields: ${JSON.stringify(Object.keys(result))}`);
    return result;
  }

  /**
   * Map image generation input to model-specific format
   * Only includes fields that exist in the model's schema
   */
  mapImageInput(
    input: CanonicalImageInput,
    inputSchema: ModelInputSchema | undefined,
    schemaParams?: SchemaParams
  ): ReplicateModelInput {
    const fieldMap = this.buildFieldMap(inputSchema, IMAGE_FIELD_MAPPINGS);
    const schemaProps =
      (inputSchema as { properties?: Record<string, { type?: string }> })?.properties ?? {};
    const result: ReplicateModelInput = {};

    // Start with schemaParams if provided
    if (schemaParams) {
      Object.assign(result, schemaParams);
    }

    // Always include prompt
    result.prompt = input.prompt;

    // Map input images - only if field exists in schema
    if (input.inputImages?.length) {
      const fieldName = fieldMap.get('inputImages');
      if (fieldName) {
        // Check if schema expects array or single value (e.g., flux-kontext-dev uses single input_image)
        const fieldSchema = schemaProps[fieldName];
        const expectsArray = fieldSchema?.type === 'array';
        result[fieldName] = expectsArray ? input.inputImages : input.inputImages[0];
      }
    }

    // Only set other fields if they exist in schema AND not already in schemaParams
    if (input.aspectRatio !== undefined && !('aspect_ratio' in result)) {
      const fieldName = fieldMap.get('aspectRatio');
      if (fieldName) {
        result[fieldName] = input.aspectRatio;
      }
    }

    if (input.resolution !== undefined && !('resolution' in result)) {
      const fieldName = fieldMap.get('resolution');
      if (fieldName) {
        result[fieldName] = input.resolution;
      }
    }

    if (input.outputFormat !== undefined && !('output_format' in result)) {
      const fieldName = fieldMap.get('outputFormat');
      if (fieldName && this.isValidForSchema(input.outputFormat, fieldName, inputSchema)) {
        result[fieldName] = input.outputFormat;
      }
    }

    this.logger.debug(`Mapped image input fields: ${JSON.stringify(Object.keys(result))}`);
    return result;
  }

  /**
   * Get the model-specific field name for a canonical field
   * Useful for checking what field name a model uses
   */
  getModelFieldName(
    canonicalName: string,
    inputSchema: ModelInputSchema | undefined,
    isVideo = true
  ): string | undefined {
    const mappings = isVideo ? VIDEO_FIELD_MAPPINGS : IMAGE_FIELD_MAPPINGS;
    const fieldMap = this.buildFieldMap(inputSchema, mappings);
    return fieldMap.get(canonicalName);
  }
}
