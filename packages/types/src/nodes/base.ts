// =============================================================================
// NODE TYPES & BASE NODE DATA
// =============================================================================

export type NodeType =
  // Input nodes
  | 'imageInput'
  | 'audioInput'
  | 'videoInput'
  | 'telegramInput'
  | 'prompt'
  | 'template'
  // AI generation nodes
  | 'imageGen'
  | 'videoGen'
  | 'llm'
  | 'lipSync'
  | 'voiceChange'
  | 'textToSpeech'
  | 'transcribe'
  | 'motionControl' // Kling Motion Control for advanced video animation
  // Processing nodes
  | 'resize'
  | 'animation'
  | 'videoStitch'
  | 'videoTrim'
  | 'videoFrameExtract'
  | 'reframe'
  | 'upscale'
  | 'imageGridSplit'
  | 'annotation'
  | 'subtitle'
  // Output nodes (deprecated - outputs auto-save now)
  | 'output' // @deprecated - kept for backwards compatibility with existing workflows
  // Distribution nodes
  | 'telegramPost'
  | 'discordPost'
  | 'twitterPost'
  | 'instagramPost'
  | 'tiktokPost'
  | 'youtubePost'
  | 'facebookPost'
  | 'linkedinPost'
  | 'googleDriveUpload'
  | 'webhookPost'
  // Composition nodes (workflow-as-node)
  | 'workflowInput'
  | 'workflowOutput'
  | 'workflowRef';

export type NodeCategory =
  | 'input'
  | 'ai'
  | 'processing'
  | 'output'
  | 'distribution'
  | 'composition';

export type NodeStatus = 'idle' | 'pending' | 'processing' | 'complete' | 'error';

export enum NodeStatusEnum {
  IDLE = 'idle',
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETE = 'complete',
  ERROR = 'error',
}

// NodeStatus constants to avoid 'as NodeStatus' assertions
export const NODE_STATUS: Record<NodeStatus, NodeStatus> = {
  idle: 'idle',
  pending: 'pending',
  processing: 'processing',
  complete: 'complete',
  error: 'error',
} as const;

export interface BaseNodeData extends Record<string, unknown> {
  label: string;
  status: NodeStatus;
  error?: string;
  progress?: number;
  // Lock state for skipping during execution
  isLocked?: boolean;
  cachedOutput?: unknown;
  lockTimestamp?: number;
  // Optional comment/note for the node (used for comment navigation)
  comment?: string;
}
