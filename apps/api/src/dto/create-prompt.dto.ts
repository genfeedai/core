import { PROMPT_CATEGORIES, type PromptCategory } from '@genfeedai/types';
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

export class StyleSettingsDto {
  @IsOptional()
  @IsString()
  mood?: string;

  @IsOptional()
  @IsString()
  style?: string;

  @IsOptional()
  @IsString()
  camera?: string;

  @IsOptional()
  @IsString()
  lighting?: string;

  @IsOptional()
  @IsString()
  scene?: string;
}

export class CreatePromptDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  promptText: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => StyleSettingsDto)
  styleSettings?: StyleSettingsDto;

  @IsOptional()
  @IsString()
  aspectRatio?: string;

  @IsOptional()
  @IsString()
  preferredModel?: string;

  @IsOptional()
  @IsIn(PROMPT_CATEGORIES)
  category?: PromptCategory;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
