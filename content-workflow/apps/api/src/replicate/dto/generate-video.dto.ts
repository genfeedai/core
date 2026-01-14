import { IsString, IsOptional, IsArray, IsIn, IsNumber, IsBoolean } from "class-validator";

export class GenerateVideoDto {
  @IsString()
  executionId: string;

  @IsString()
  nodeId: string;

  @IsString()
  @IsIn(["veo-3.1-fast", "veo-3.1"])
  model: "veo-3.1-fast" | "veo-3.1";

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
}
