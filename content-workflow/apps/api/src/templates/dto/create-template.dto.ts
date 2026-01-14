import { IsString, IsOptional, IsArray, IsEnum, IsBoolean } from "class-validator";

export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(["images", "video", "full-pipeline"])
  category: string;

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
