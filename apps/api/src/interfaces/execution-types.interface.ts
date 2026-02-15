/**
 * Shared types for execution, job processing, and node I/O.
 *
 * These replace generic `Record<string, unknown>` usages with semantically
 * meaningful types. They extend Record where the shape is inherently dynamic.
 */

// ---------------------------------------------------------------------------
// Execution status
// ---------------------------------------------------------------------------

/** Fields set during updateExecutionStatus — used as MongoDB $set payload. */
export interface ExecutionStatusUpdate {
  status: string;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

// ---------------------------------------------------------------------------
// Node output — the result produced by any processor node
// ---------------------------------------------------------------------------

/**
 * Generic node output stored in execution nodeResults.
 * Each node type writes different keys (image, video, text, etc.),
 * so this is an open record with known optional fields.
 */
export interface NodeOutput extends Record<string, unknown> {
  image?: string;
  images?: string[];
  video?: string;
  text?: string;
  audio?: string;
  localPath?: string;
  localPaths?: string[];
  saveError?: string;
  imageCount?: number;
}

// ---------------------------------------------------------------------------
// Debug payload — recorded when debugMode is enabled
// ---------------------------------------------------------------------------

/** Metadata saved alongside a debug job to record the would-be API call. */
export interface DebugPayload {
  model: string;
  input: Record<string, unknown>;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Pending node — tracked during sequential execution
// ---------------------------------------------------------------------------

/** A node waiting in the execution queue with its dependencies. */
export interface PendingNode {
  nodeId: string;
  nodeType: string;
  nodeData: Record<string, unknown>;
  dependsOn: string[];
}

// ---------------------------------------------------------------------------
// Model input schema — JSON-schema-like structure from Replicate models
// ---------------------------------------------------------------------------

/**
 * Represents a Replicate model's input schema (JSON Schema subset).
 * Used by SchemaMapperService to map canonical field names to model-specific ones.
 */
export interface ModelInputSchema extends Record<string, unknown> {
  properties?: Record<string, SchemaProperty>;
  required?: string[];
  type?: string;
}

/** A single property in a model input schema. */
export interface SchemaProperty extends Record<string, unknown> {
  type?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
}

// ---------------------------------------------------------------------------
// Job status updates — MongoDB update payloads for QueueJob documents
// ---------------------------------------------------------------------------

/** Fields set during updateJobStatus — used as MongoDB $set payload. */
export interface JobStatusUpdatePayload {
  status: string;
  processedAt?: Date;
  finishedAt?: Date;
  result?: NodeOutput;
  error?: string;
  failedReason?: string;
  attemptsMade?: number;
}

// ---------------------------------------------------------------------------
// Dynamic parameter types — semantic aliases for Record<string, unknown>
// ---------------------------------------------------------------------------

/** Dynamic parameters from a model's input schema. Each model defines its own schema. */
export type SchemaParams = Record<string, unknown>;

/** Input payload sent to the Replicate predictions API. Each model accepts different fields. */
export type ReplicateModelInput = Record<string, unknown>;

/** MongoDB query filter object built dynamically from optional parameters. */
export type MongoFilterQuery = Record<string, unknown>;
