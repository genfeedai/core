import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class GenerateImageDto {
  @IsString()
  executionId: string;

  @IsString()
  nodeId: string;

  @IsString()
  @IsIn(['nano-banana', 'nano-banana-pro'])
  model: 'nano-banana' | 'nano-banana-pro';

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
}
