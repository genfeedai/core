import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

class VoiceConfigDto {
  @IsString()
  @IsIn([
    'rachel',
    'drew',
    'clyde',
    'paul',
    'domi',
    'dave',
    'fin',
    'sarah',
    'antoni',
    'thomas',
    'charlie',
    'george',
    'emily',
    'elli',
    'callum',
    'patrick',
    'harry',
    'liam',
    'dorothy',
    'josh',
    'arnold',
    'charlotte',
    'matilda',
    'matthew',
    'james',
    'joseph',
    'jeremy',
    'michael',
    'ethan',
    'gigi',
    'freya',
    'grace',
    'daniel',
    'lily',
    'serena',
    'adam',
    'nicole',
    'jessie',
    'ryan',
    'sam',
    'glinda',
    'giovanni',
    'mimi',
  ])
  voice_id: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  stability?: number = 0.5;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  similarity_boost?: number = 0.75;

  @IsOptional()
  @IsNumber()
  @Min(0.25)
  @Max(4.0)
  speed?: number = 1.0;
}

class TelegramDeliveryDto {
  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targets?: string[]; // [@channel_username, chat_id, group_id]
}

class DiscordDeliveryDto {
  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channels?: string[]; // [channel_id_1, channel_id_2]
}

class TwitterDeliveryDto {
  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hashtags?: string[];
}

class InstagramDeliveryDto {
  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsArray()
  @IsIn(['reels', 'stories'], { each: true })
  post_to?: ('reels' | 'stories')[] = ['reels'];

  @IsOptional()
  @IsString()
  caption?: string;
}

class TikTokDeliveryDto {
  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hashtags?: string[];
}

class YouTubeShortsDeliveryDto {
  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsIn(['public', 'unlisted', 'private'])
  visibility?: 'public' | 'unlisted' | 'private' = 'public';
}

class FacebookDeliveryDto {
  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsString()
  page_id?: string;

  @IsOptional()
  @IsString()
  caption?: string;
}

class LinkedInDeliveryDto {
  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsString()
  caption?: string;
}

class GoogleDriveDeliveryDto {
  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsString()
  folder_name?: string; // Custom folder name
}

class WebhookDeliveryDto {
  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsUrl()
  endpoint?: string;

  @IsOptional()
  @IsBoolean()
  include_metadata?: boolean = true;
}

class DeliveryConfigDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => TelegramDeliveryDto)
  telegram?: TelegramDeliveryDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DiscordDeliveryDto)
  discord?: DiscordDeliveryDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TwitterDeliveryDto)
  twitter?: TwitterDeliveryDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => InstagramDeliveryDto)
  instagram?: InstagramDeliveryDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TikTokDeliveryDto)
  tiktok?: TikTokDeliveryDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => YouTubeShortsDeliveryDto)
  youtube_shorts?: YouTubeShortsDeliveryDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FacebookDeliveryDto)
  facebook?: FacebookDeliveryDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LinkedInDeliveryDto)
  linkedin?: LinkedInDeliveryDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => GoogleDriveDeliveryDto)
  google_drive?: GoogleDriveDeliveryDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => WebhookDeliveryDto)
  webhook?: WebhookDeliveryDto;
}

export class CreateUGCBatchDto {
  @IsString()
  script: string;

  @IsUrl()
  avatar_image: string;

  @ValidateNested()
  @Type(() => VoiceConfigDto)
  voice_config: VoiceConfigDto;

  @IsString()
  @IsIn(['casual_talking', 'enthusiastic', 'professional'])
  motion_preset: 'casual_talking' | 'enthusiastic' | 'professional';

  @IsOptional()
  @IsArray()
  @IsIn(['16:9', '9:16', '1:1'], { each: true })
  output_formats?: ('16:9' | '9:16' | '1:1')[] = ['16:9', '9:16', '1:1'];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  variations?: number = 3;

  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryConfigDto)
  delivery?: DeliveryConfigDto;

  @IsOptional()
  @IsBoolean()
  debug_mode?: boolean = false;

  @IsOptional()
  @IsString()
  customer_id?: string; // For cost tracking

  @IsOptional()
  @IsString()
  batch_name?: string; // Custom batch identifier
}

export interface UGCBatchResult {
  batch_id: string;
  jobs_queued: number;
  estimated_completion: string;
  total_estimated_cost: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  created_at: Date;
}

export interface UGCVideoResult {
  batch_id: string;
  variation: number;
  format: '16:9' | '9:16' | '1:1';
  video_url: string;
  generation_time_ms: number;
  cost: number;
  delivery_results?: DeliveryResults;
}

export interface DeliveryResults {
  telegram?: {
    success: boolean;
    results: any[];
    error?: string;
    delivered_count?: number;
    total_targets?: number;
  };
  discord?: {
    success: boolean;
    results: any[];
    error?: string;
    delivered_count?: number;
    total_targets?: number;
  };
  twitter?: { success: boolean; tweet_id?: string; url?: string; error?: string };
  instagram?: { success: boolean; reels_id?: string; stories?: any[]; error?: string };
  tiktok?: { success: boolean; video_id?: string; url?: string; error?: string };
  youtube_shorts?: { success: boolean; video_id?: string; url?: string; error?: string };
  facebook?: { success: boolean; post_id?: string; error?: string };
  linkedin?: { success: boolean; post_id?: string; error?: string };
  google_drive?: { success: boolean; folder_url?: string; error?: string; files_uploaded?: number };
  webhook?: { success: boolean; response?: any; error?: string };
}
