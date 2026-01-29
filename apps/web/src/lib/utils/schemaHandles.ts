import type { HandleDefinition, HandleType } from '@genfeedai/types';

/**
 * Schema fields that should be exposed as connectable handles.
 * These are inputs that commonly accept connections from other nodes.
 */
const HANDLE_FIELDS = new Set([
  // Text inputs
  'prompt',
  'negative_prompt',
  'subject_reference',
  // Image inputs (single)
  'image',
  'image_input',
  'start_image',
  'first_frame_image',
  'end_image',
  'last_frame',
  'mask',
  'mask_image',
  'control_image',
  'init_image',
  'subject_image',
  'face_image',
  'style_image',
  'pose_image',
  'image_url',
  'tail_image_url',
  // Image inputs (array)
  'reference_images',
  // Video inputs
  'video',
  'video_url',
  // Audio inputs
  'audio',
  'audio_url',
]);

/**
 * Maps schema field names to their corresponding handle types.
 */
const FIELD_TO_HANDLE_TYPE: Record<string, HandleType> = {
  // Text fields
  prompt: 'text',
  negative_prompt: 'text',
  subject_reference: 'text',
  // Image fields (single)
  image: 'image',
  image_input: 'image',
  start_image: 'image',
  first_frame_image: 'image',
  end_image: 'image',
  last_frame: 'image',
  mask: 'image',
  mask_image: 'image',
  control_image: 'image',
  init_image: 'image',
  subject_image: 'image',
  face_image: 'image',
  style_image: 'image',
  pose_image: 'image',
  image_url: 'image',
  tail_image_url: 'image',
  // Image fields (array)
  reference_images: 'image',
  // Video fields
  video: 'video',
  video_url: 'video',
  // Audio fields
  audio: 'audio',
  audio_url: 'audio',
};

interface SchemaProperty {
  title?: string;
  type?: string;
  description?: string;
}

interface InputSchema {
  properties?: Record<string, SchemaProperty>;
  required?: string[];
}

/**
 * Generates dynamic input handles from a model's input schema.
 *
 * Merges dynamically discovered handles with static handles defined in NODE_DEFINITIONS.
 * Static handles take precedence - dynamic handles are only added if not already present.
 *
 * @param inputSchema - The model's input schema containing properties
 * @param staticHandles - Static handles from NODE_DEFINITIONS
 * @returns Combined array of handles (static + dynamic)
 */
export function generateHandlesFromSchema(
  inputSchema: Record<string, unknown> | undefined,
  staticHandles: HandleDefinition[]
): HandleDefinition[] {
  if (!inputSchema) return staticHandles;

  const schema = inputSchema as InputSchema;
  if (!schema.properties) return staticHandles;

  // Build set of existing static handle IDs to avoid duplicates
  const staticIds = new Set(staticHandles.map((h) => h.id));
  const dynamicHandles: HandleDefinition[] = [];

  for (const [fieldName, prop] of Object.entries(schema.properties)) {
    // Skip if not a handle-able field or already defined statically
    if (!HANDLE_FIELDS.has(fieldName) || staticIds.has(fieldName)) continue;

    const handleType = FIELD_TO_HANDLE_TYPE[fieldName];
    if (!handleType) continue;

    // Generate a display label from field name or schema title
    const label =
      prop.title || fieldName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    dynamicHandles.push({
      id: fieldName,
      type: handleType,
      label,
      multiple: prop.type === 'array',
      required: schema.required?.includes(fieldName),
      fromSchema: true,
    });
  }

  return [...staticHandles, ...dynamicHandles];
}

/**
 * Check if a handle was dynamically generated from schema.
 */
export function isSchemaHandle(handle: HandleDefinition): boolean {
  return handle.fromSchema === true;
}
