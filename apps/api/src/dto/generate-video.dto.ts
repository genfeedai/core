import { Type } from 'class-transformer';
import type { ModelInputSchema, SchemaParams } from '@/interfaces/execution-types.interface';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class SelectedModelDto {
  @IsString()
  provider: string;

  @IsString()
  modelId: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsObject()
  inputSchema?: ModelInputSchema;
}

export class GenerateVideoDto {
  @IsString()
  executionId: string;

  @IsString()
  nodeId: string;

  @IsString()
  @IsIn(['veo-3.1-fast', 'veo-3.1'])
  model: 'veo-3.1-fast' | 'veo-3.1';

  @IsString()
  prompt: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  lastFrame?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  referenceImages?: string[];

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsString()
  aspectRatio?: string;

  @IsOptional()
  @IsString()
  resolution?: string;

  @IsOptional()
  @IsBoolean()
  generateAudio?: boolean;

  @IsOptional()
  @IsString()
  negativePrompt?: string;

  @IsOptional()
  @IsNumber()
  seed?: number;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SelectedModelDto)
  selectedModel?: SelectedModelDto;

  @IsOptional()
  @IsObject()
  schemaParams?: SchemaParams;

  @IsOptional()
  @IsBoolean()
  debugMode?: boolean;
}
