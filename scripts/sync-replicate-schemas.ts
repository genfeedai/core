#!/usr/bin/env bun
/**
 * Sync Replicate Model Schemas
 *
 * Downloads OpenAPI schemas from Replicate models and generates TypeScript types.
 * Run with: bun run sync:replicate
 *
 * Reads REPLICATE_API_TOKEN from apps/api/.env
 */

/// <reference types="bun-types" />

import { join } from 'node:path';

// Load env from apps/api/.env
const envPath = join(import.meta.dirname, '../apps/api/.env');
const envFile = Bun.file(envPath);
if (await envFile.exists()) {
  const content = await envFile.text();
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key] = valueParts.join('=');
      }
    }
  }
}

// ============================================================================
// Configuration
// ============================================================================

const REPLICATE_API_BASE = 'https://api.replicate.com/v1';

const OUTPUT_DIR = `${import.meta.dirname}/../packages/types/src/replicate`;
const SCHEMA_CACHE_FILE = `${OUTPUT_DIR}/schemas.json`;
const TYPES_OUTPUT_FILE = `${OUTPUT_DIR}/models.ts`;
const INDEX_FILE = `${OUTPUT_DIR}/index.ts`;

// Models to sync - matches the MODELS constant in replicate client
const MODELS_TO_SYNC = [
  // Image generation
  { id: 'google/nano-banana', name: 'NanoBanana', category: 'image' },
  { id: 'google/nano-banana-pro', name: 'NanoBananaPro', category: 'image' },
  { id: 'prunaai/z-image-turbo', name: 'ZImageTurbo', category: 'image' },
  // Video generation
  { id: 'google/veo-3.1-fast', name: 'Veo31Fast', category: 'video' },
  { id: 'google/veo-3.1', name: 'Veo31', category: 'video' },
  { id: 'kwaivgi/kling-v2.5-turbo-pro', name: 'KlingV25TurboPro', category: 'video' },
  { id: 'kwaivgi/kling-v2.6-motion-control', name: 'KlingV26MotionControl', category: 'video' },

  // LLM
  { id: 'meta/meta-llama-3.1-405b-instruct', name: 'MetaLlama31', category: 'llm' },

  // Luma reframe
  { id: 'luma/reframe-image', name: 'LumaReframeImage', category: 'reframe' },
  { id: 'luma/reframe-video', name: 'LumaReframeVideo', category: 'reframe' },

  // Lip-sync models
  { id: 'sync/lipsync-2', name: 'Lipsync2', category: 'lipsync' },
  { id: 'sync/lipsync-2-pro', name: 'Lipsync2Pro', category: 'lipsync' },
  { id: 'bytedance/latentsync', name: 'LatentSync', category: 'lipsync' },
  { id: 'pixverse/lipsync', name: 'PixverseLipsync', category: 'lipsync' },
] as const;

// ============================================================================
// Types
// ============================================================================

interface JSONSchemaProperty {
  type?: string | string[];
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  items?: JSONSchemaProperty;
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  'x-order'?: number;
  allOf?: JSONSchemaProperty[];
  anyOf?: JSONSchemaProperty[];
  oneOf?: JSONSchemaProperty[];
  $ref?: string;
}

interface JSONSchema {
  type?: string;
  title?: string;
  description?: string;
  required?: string[];
  properties?: Record<string, JSONSchemaProperty>;
  definitions?: Record<string, JSONSchemaProperty>;
}

interface ReplicateModelResponse {
  url: string;
  owner: string;
  name: string;
  description: string;
  visibility: string;
  github_url: string | null;
  paper_url: string | null;
  license_url: string | null;
  run_count: number;
  cover_image_url: string | null;
  default_example: unknown;
  latest_version: {
    id: string;
    created_at: string;
    cog_version: string;
    openapi_schema: {
      openapi: string;
      info: { title: string; version: string };
      paths: Record<string, unknown>;
      components: {
        schemas: {
          Input: JSONSchema;
          Output: JSONSchema;
          [key: string]: JSONSchema;
        };
      };
    };
  } | null;
}

interface ModelSchema {
  modelId: string;
  name: string;
  category: string;
  description: string;
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
  fetchedAt: string;
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchModelSchema(modelId: string): Promise<ReplicateModelResponse> {
  const token = Bun.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error('REPLICATE_API_TOKEN environment variable is required');
  }

  const url = `${REPLICATE_API_BASE}/models/${modelId}`;
  console.log(`  Fetching: ${url}`);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch ${modelId}: ${response.status} ${text}`);
  }

  return response.json();
}

// ============================================================================
// Type Generation
// ============================================================================

function jsonSchemaTypeToTS(prop: JSONSchemaProperty, definitions?: Record<string, JSONSchemaProperty>): string {
  // Handle $ref
  if (prop.$ref) {
    const refName = prop.$ref.split('/').pop();
    if (refName && definitions?.[refName]) {
      return jsonSchemaTypeToTS(definitions[refName], definitions);
    }
    return 'unknown';
  }

  // Handle allOf/anyOf/oneOf
  if (prop.allOf && prop.allOf.length > 0) {
    return prop.allOf.map((s) => jsonSchemaTypeToTS(s, definitions)).join(' & ');
  }
  if (prop.anyOf && prop.anyOf.length > 0) {
    return prop.anyOf.map((s) => jsonSchemaTypeToTS(s, definitions)).join(' | ');
  }
  if (prop.oneOf && prop.oneOf.length > 0) {
    return prop.oneOf.map((s) => jsonSchemaTypeToTS(s, definitions)).join(' | ');
  }

  // Handle enum
  if (prop.enum) {
    return prop.enum.map((v) => (typeof v === 'string' ? `'${v}'` : String(v))).join(' | ');
  }

  // Handle array type (can be union)
  const typeValue = Array.isArray(prop.type) ? prop.type : [prop.type];

  const types = typeValue
    .filter((t): t is string => Boolean(t))
    .map((t) => {
      switch (t) {
        case 'string':
          if (prop.format === 'uri') return 'string';
          return 'string';
        case 'number':
        case 'integer':
          return 'number';
        case 'boolean':
          return 'boolean';
        case 'array':
          if (prop.items) {
            return `${jsonSchemaTypeToTS(prop.items, definitions)}[]`;
          }
          return 'unknown[]';
        case 'object':
          return 'Record<string, unknown>';
        case 'null':
          return 'null';
        default:
          return 'unknown';
      }
    });

  if (types.length === 0) return 'unknown';
  if (types.length === 1) return types[0];
  return types.join(' | ');
}

function generateInterfaceFromSchema(
  name: string,
  schema: JSONSchema,
  description?: string
): string {
  const lines: string[] = [];

  if (description) {
    lines.push('/**');
    lines.push(` * ${description}`);
    lines.push(' */');
  }

  lines.push(`export interface ${name} {`);

  if (schema.properties) {
    const required = new Set(schema.required ?? []);
    const orderedProps = Object.entries(schema.properties).sort((a, b) => {
      const orderA = a[1]['x-order'] ?? 999;
      const orderB = b[1]['x-order'] ?? 999;
      return orderA - orderB;
    });

    for (const [propName, prop] of orderedProps) {
      const isRequired = required.has(propName);
      const tsType = jsonSchemaTypeToTS(prop, schema.definitions);

      // Add JSDoc comment
      if (prop.description || prop.default !== undefined) {
        lines.push('  /**');
        if (prop.description) {
          lines.push(`   * ${prop.description}`);
        }
        if (prop.default !== undefined) {
          lines.push(`   * @default ${JSON.stringify(prop.default)}`);
        }
        if (prop.minimum !== undefined || prop.maximum !== undefined) {
          const range = [prop.minimum !== undefined ? `min: ${prop.minimum}` : null, prop.maximum !== undefined ? `max: ${prop.maximum}` : null]
            .filter(Boolean)
            .join(', ');
          lines.push(`   * @range ${range}`);
        }
        lines.push('   */');
      }

      const optional = isRequired ? '' : '?';
      lines.push(`  ${propName}${optional}: ${tsType};`);
    }
  }

  lines.push('}');

  return lines.join('\n');
}

function generateTypesFile(schemas: ModelSchema[]): string {
  const lines: string[] = [
    '/**',
    ' * Auto-generated Replicate model types',
    ' * DO NOT EDIT - Run `bun run sync:replicate` to regenerate',
    ` * Generated at: ${new Date().toISOString()}`,
    ' */',
    '',
    '// This file is auto-generated. Do not edit manually.',
    '',
  ];

  // Group schemas by category
  const categories = new Map<string, ModelSchema[]>();
  for (const schema of schemas) {
    const existing = categories.get(schema.category) ?? [];
    existing.push(schema);
    categories.set(schema.category, existing);
  }

  // Generate types for each category
  for (const [category, categorySchemas] of categories) {
    lines.push(`// =============================================================================`);
    lines.push(`// ${category.toUpperCase()} MODELS`);
    lines.push(`// =============================================================================`);
    lines.push('');

    for (const schema of categorySchemas) {
      // Input interface
      lines.push(
        generateInterfaceFromSchema(
          `${schema.name}Input`,
          schema.inputSchema,
          `Input parameters for ${schema.modelId}`
        )
      );
      lines.push('');

      // Output type
      if (schema.outputSchema.type) {
        const outputType = jsonSchemaTypeToTS(schema.outputSchema);
        lines.push(`/** Output type for ${schema.modelId} */`);
        lines.push(`export type ${schema.name}Output = ${outputType};`);
        lines.push('');
      }
    }
  }

  // Generate model ID union type
  lines.push('// =============================================================================');
  lines.push('// MODEL IDS');
  lines.push('// =============================================================================');
  lines.push('');
  lines.push('/** All supported Replicate model IDs */');
  lines.push('export type ReplicateModelId =');
  for (let i = 0; i < schemas.length; i++) {
    const isLast = i === schemas.length - 1;
    lines.push(`  | '${schemas[i].modelId}'${isLast ? ';' : ''}`);
  }
  lines.push('');

  // Generate model input map
  lines.push('/** Map from model ID to input type */');
  lines.push('export interface ReplicateModelInputMap {');
  for (const schema of schemas) {
    lines.push(`  '${schema.modelId}': ${schema.name}Input;`);
  }
  lines.push('}');
  lines.push('');

  // Generate model output map
  lines.push('/** Map from model ID to output type */');
  lines.push('export interface ReplicateModelOutputMap {');
  for (const schema of schemas) {
    const hasOutput = schema.outputSchema.type;
    lines.push(`  '${schema.modelId}': ${hasOutput ? `${schema.name}Output` : 'unknown'};`);
  }
  lines.push('}');
  lines.push('');

  // Helper type for getting input type
  lines.push('/** Get input type for a model */');
  lines.push('export type ModelInput<T extends ReplicateModelId> = ReplicateModelInputMap[T];');
  lines.push('');
  lines.push('/** Get output type for a model */');
  lines.push('export type ModelOutput<T extends ReplicateModelId> = ReplicateModelOutputMap[T];');
  lines.push('');

  return lines.join('\n');
}

function generateIndexFile(): string {
  return `/**
 * Replicate model types - auto-generated
 * @module @genfeedai/types/replicate
 */

export * from './models';
`;
}

// ============================================================================
// File System Helpers
// ============================================================================

async function ensureDir(path: string): Promise<void> {
  const file = Bun.file(path);
  const exists = await file.exists();
  if (!exists) {
    // Create by writing to a file in the directory
    await Bun.write(`${path}/.gitkeep`, '');
  }
}

async function writeFile(path: string, content: string): Promise<void> {
  await Bun.write(path, content);
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('🔄 Syncing Replicate model schemas...\n');

  const token = Bun.env.REPLICATE_API_TOKEN;
  if (!token) {
    console.error('❌ Error: REPLICATE_API_TOKEN environment variable is required');
    console.error('   Set it in your .env file or export it in your shell');
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(1);
  }

  // Ensure output directory exists
  await ensureDir(OUTPUT_DIR);
  console.log(`📁 Output directory: ${OUTPUT_DIR}\n`);

  const schemas: ModelSchema[] = [];
  const errors: { modelId: string; error: string }[] = [];

  for (const model of MODELS_TO_SYNC) {
    console.log(`📥 ${model.name} (${model.id})`);

    try {
      const response = await fetchModelSchema(model.id);

      if (!response.latest_version?.openapi_schema) {
        console.log(`  ⚠️  No schema available, skipping`);
        continue;
      }

      const openapi = response.latest_version.openapi_schema;
      const inputSchema = openapi.components?.schemas?.Input ?? { type: 'object', properties: {} };
      const outputSchema = openapi.components?.schemas?.Output ?? { type: 'unknown' };

      schemas.push({
        modelId: model.id,
        name: model.name,
        category: model.category,
        description: response.description ?? '',
        inputSchema,
        outputSchema,
        fetchedAt: new Date().toISOString(),
      });

      console.log(`  ✅ Success`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`  ❌ Failed: ${message}`);
      errors.push({ modelId: model.id, error: message });
    }
  }

  console.log('');

  if (schemas.length === 0) {
    console.error('❌ No schemas fetched successfully');
    process.exit(1);
  }

  // Write schema cache (for debugging/reference)
  await writeFile(SCHEMA_CACHE_FILE, JSON.stringify(schemas, null, 2));
  console.log(`💾 Saved raw schemas to: ${SCHEMA_CACHE_FILE}`);

  // Generate TypeScript types
  const typesContent = generateTypesFile(schemas);
  await writeFile(TYPES_OUTPUT_FILE, typesContent);
  console.log(`📝 Generated types: ${TYPES_OUTPUT_FILE}`);

  // Generate index file
  const indexContent = generateIndexFile();
  await writeFile(INDEX_FILE, indexContent);
  console.log(`📝 Generated index: ${INDEX_FILE}`);

  console.log('');
  console.log(`✅ Successfully synced ${schemas.length}/${MODELS_TO_SYNC.length} models`);

  if (errors.length > 0) {
    console.log('');
    console.log('⚠️  Failed models:');
    for (const e of errors) {
      console.log(`   - ${e.modelId}: ${e.error}`);
    }
  }

  console.log('');
  console.log('💡 Usage: Import types from @genfeedai/types/replicate');
  console.log("   import type { NanoBananaProInput, Veo31FastInput } from '@genfeedai/types/replicate';");
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
