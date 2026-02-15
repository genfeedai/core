import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import type { SchemaParams } from '@/interfaces/execution-types.interface';

class SelectedModelDto {
  @IsString()
  provider: string;

  @IsString()
  modelId: string;

  @IsOptional()
  @IsString()
  displayName?: string;
}

export class GenerateImageDto {
  @IsString()
  executionId: string;

  @IsString()
  nodeId: string;

  @IsOptional()
  @IsString()
  @IsIn(['nano-banana', 'nano-banana-pro'])
  model?: 'nano-banana' | 'nano-banana-pro';

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SelectedModelDto)
  selectedModel?: SelectedModelDto;

  @IsString()
  prompt: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  inputImages?: string[];

  @IsOptional()
  @IsString()
  aspectRatio?: string;

  @IsOptional()
  @IsString()
  resolution?: string;

  @IsOptional()
  @IsString()
  outputFormat?: string;

  @IsOptional()
  @IsObject()
  schemaParams?: SchemaParams;

  @IsOptional()
  @IsBoolean()
  debugMode?: boolean;
}
