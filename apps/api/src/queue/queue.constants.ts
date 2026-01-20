/**
 * Queue names for BullMQ
 */
export const QUEUE_NAMES = {
  WORKFLOW_ORCHESTRATOR: 'workflow-orchestrator',
  IMAGE_GENERATION: 'image-generation',
  VIDEO_GENERATION: 'video-generation',
  LLM_GENERATION: 'llm-generation',
  PROCESSING: 'processing',
  // Dead letter queues
  DLQ_WORKFLOW: 'dlq-workflow-orchestrator',
  DLQ_IMAGE: 'dlq-image-generation',
  DLQ_VIDEO: 'dlq-video-generation',
  DLQ_LLM: 'dlq-llm-generation',
  DLQ_PROCESSING: 'dlq-processing',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/**
 * Job types for each queue
 */
export const JOB_TYPES = {
  // Workflow orchestrator
  EXECUTE_WORKFLOW: 'execute-workflow',
  EXECUTE_NODE: 'execute-node',
  // Generation jobs
  GENERATE_IMAGE: 'generate-image',
  GENERATE_VIDEO: 'generate-video',
  GENERATE_TEXT: 'generate-text',
  // Processing jobs
  REFRAME_IMAGE: 'reframe-image',
  REFRAME_VIDEO: 'reframe-video',
  UPSCALE_IMAGE: 'upscale-image',
  UPSCALE_VIDEO: 'upscale-video',
} as const;

export type JobType = (typeof JOB_TYPES)[keyof typeof JOB_TYPES];

/**
 * Job priority levels (lower = higher priority)
 */
export const JOB_PRIORITY = {
  CRITICAL: 1,
  HIGH: 2,
  NORMAL: 5,
  LOW: 10,
} as const;

/**
 * Default job options for each queue
 */
export const DEFAULT_JOB_OPTIONS = {
  [QUEUE_NAMES.WORKFLOW_ORCHESTRATOR]: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 2000 },
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 86400, count: 5000 },
  },
  [QUEUE_NAMES.IMAGE_GENERATION]: {
    attempts: 3,
    backoff: { type: 'fixed' as const, delay: 1000 },
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 86400, count: 5000 },
  },
  [QUEUE_NAMES.VIDEO_GENERATION]: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 3000 },
    removeOnComplete: { age: 3600, count: 500 },
    removeOnFail: { age: 86400, count: 2000 },
  },
  [QUEUE_NAMES.LLM_GENERATION]: {
    attempts: 3,
    backoff: { type: 'fixed' as const, delay: 500 },
    removeOnComplete: { age: 3600, count: 2000 },
    removeOnFail: { age: 86400, count: 5000 },
  },
  [QUEUE_NAMES.PROCESSING]: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 2000 },
    removeOnComplete: { age: 3600, count: 500 },
    removeOnFail: { age: 86400, count: 2000 },
  },
} as const;

/**
 * Queue concurrency settings
 */
export const QUEUE_CONCURRENCY = {
  [QUEUE_NAMES.WORKFLOW_ORCHESTRATOR]: 10,
  [QUEUE_NAMES.IMAGE_GENERATION]: 5,
  [QUEUE_NAMES.VIDEO_GENERATION]: 2,
  [QUEUE_NAMES.LLM_GENERATION]: 10,
  [QUEUE_NAMES.PROCESSING]: 3,
} as const;

/**
 * Map node types to queue names
 */
export const NODE_TYPE_TO_QUEUE: Record<string, QueueName> = {
  imageGen: QUEUE_NAMES.IMAGE_GENERATION,
  videoGen: QUEUE_NAMES.VIDEO_GENERATION,
  llm: QUEUE_NAMES.LLM_GENERATION,
  reframe: QUEUE_NAMES.PROCESSING,
  upscale: QUEUE_NAMES.PROCESSING,
  videoFrameExtract: QUEUE_NAMES.PROCESSING,
  lipSync: QUEUE_NAMES.PROCESSING,
  voiceChange: QUEUE_NAMES.PROCESSING,
  textToSpeech: QUEUE_NAMES.PROCESSING,
  // Composition: workflowRef triggers nested workflow execution via orchestrator
  workflowRef: QUEUE_NAMES.WORKFLOW_ORCHESTRATOR,
};

/**
 * Job status constants
 */
export const JOB_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  FAILED: 'failed',
  DELAYED: 'delayed',
  WAITING: 'waiting',
  STALLED: 'stalled',
  RECOVERED: 'recovered',
} as const;

export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];
