// =============================================================================
// DISTRIBUTION NODE DATA INTERFACES
// =============================================================================

import type { BaseNodeData } from './base';

export interface TelegramPostNodeData extends BaseNodeData {
  // Inputs from connections
  inputVideo: string | null;
  inputImage: string | null;
  inputText: string | null;

  // Configuration
  chatId: string;
  caption: string;
  asVoice: boolean;

  // Runtime
  messageId: string | null;
  postUrl: string | null;
  jobId: string | null;
}

export interface DiscordPostNodeData extends BaseNodeData {
  // Inputs from connections
  inputVideo: string | null;
  inputImage: string | null;
  inputText: string | null;

  // Configuration
  channelId: string;
  message: string;

  // Runtime
  messageId: string | null;
  postUrl: string | null;
  jobId: string | null;
}

export interface TwitterPostNodeData extends BaseNodeData {
  // Inputs from connections
  inputVideo: string | null;
  inputImage: string | null;
  inputText: string | null;

  // Configuration
  caption: string;
  hashtags: string[];

  // Runtime
  tweetId: string | null;
  postUrl: string | null;
  jobId: string | null;
}

export interface InstagramPostNodeData extends BaseNodeData {
  // Inputs from connections
  inputVideo: string | null;
  inputImage: string | null;

  // Configuration
  caption: string;
  hashtags: string[];
  postType: 'reels' | 'stories' | 'feed';

  // Runtime
  postId: string | null;
  postUrl: string | null;
  jobId: string | null;
}

export interface TikTokPostNodeData extends BaseNodeData {
  // Inputs from connections
  inputVideo: string | null;

  // Configuration
  caption: string;
  hashtags: string[];

  // Runtime
  videoId: string | null;
  postUrl: string | null;
  jobId: string | null;
}

export interface YouTubePostNodeData extends BaseNodeData {
  // Inputs from connections
  inputVideo: string | null;

  // Configuration
  title: string;
  description: string;
  tags: string[];
  visibility: 'public' | 'unlisted' | 'private';

  // Runtime
  videoId: string | null;
  postUrl: string | null;
  jobId: string | null;
}

export interface FacebookPostNodeData extends BaseNodeData {
  // Inputs from connections
  inputVideo: string | null;
  inputImage: string | null;
  inputText: string | null;

  // Configuration
  pageId: string;
  caption: string;

  // Runtime
  postId: string | null;
  postUrl: string | null;
  jobId: string | null;
}

export interface LinkedInPostNodeData extends BaseNodeData {
  // Inputs from connections
  inputVideo: string | null;
  inputImage: string | null;
  inputText: string | null;

  // Configuration
  caption: string;

  // Runtime
  postId: string | null;
  postUrl: string | null;
  jobId: string | null;
}

export interface GoogleDriveUploadNodeData extends BaseNodeData {
  // Inputs from connections
  inputVideo: string | null;
  inputImage: string | null;
  inputFile: string | null;

  // Configuration
  folderId: string;
  fileName: string;

  // Runtime
  fileId: string | null;
  driveUrl: string | null;
  jobId: string | null;
}

export interface WebhookPostNodeData extends BaseNodeData {
  // Inputs from connections
  inputVideo: string | null;
  inputImage: string | null;
  inputText: string | null;
  inputData: Record<string, unknown> | null;

  // Configuration
  webhookUrl: string;
  method: 'POST' | 'PUT' | 'PATCH';
  headers: Record<string, string>;

  // Runtime
  response: Record<string, unknown> | null;
  statusCode: number | null;
  jobId: string | null;
}
