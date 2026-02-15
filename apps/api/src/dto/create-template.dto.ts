import { WorkflowTemplateCategory } from '@genfeedai/types';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(WorkflowTemplateCategory)
  category: WorkflowTemplateCategory;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsArray()
  nodes?: Record<string, unknown>[];

  @IsOptional()
  @IsArray()
  edges?: Record<string, unknown>[];

  @IsOptional()
  @IsString()
  edgeStyle?: string;

  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;
}
