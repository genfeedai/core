import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

class GridPositionDto {
  @IsNumber()
  x: number;

  @IsNumber()
  y: number;
}

export class ProcessDto {
  @IsString()
  executionId: string;

  @IsString()
  nodeId: string;

  @IsString()
  @IsIn(['lumaReframeImage', 'lumaReframeVideo', 'topazImageUpscale', 'topazVideoUpscale'])
  nodeType: 'lumaReframeImage' | 'lumaReframeVideo' | 'topazImageUpscale' | 'topazVideoUpscale';

  // Luma Reframe Image fields
  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  @IsIn(['1:1', '3:4', '4:3', '9:16', '16:9', '9:21', '21:9'])
  aspectRatio?: string;

  @IsOptional()
  @IsString()
  @IsIn(['photon-flash-1', 'photon-1'])
  model?: 'photon-flash-1' | 'photon-1';

  @IsOptional()
  @IsString()
  prompt?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => GridPositionDto)
  gridPosition?: GridPositionDto;

  // Luma Reframe Video fields
  @IsOptional()
  @IsString()
  video?: string;

  // Topaz Image Upscale fields
  @IsOptional()
  @IsString()
  @IsIn(['Standard V2', 'Low Resolution V2', 'CGI', 'High Fidelity V2', 'Text Refine'])
  enhanceModel?: string;

  @IsOptional()
  @IsString()
  @IsIn(['None', '2x', '4x', '6x'])
  upscaleFactor?: string;

  @IsOptional()
  @IsString()
  @IsIn(['jpg', 'png'])
  outputFormat?: string;

  @IsOptional()
  @IsBoolean()
  faceEnhancement?: boolean;

  @IsOptional()
  @IsNumber()
  faceEnhancementStrength?: number;

  @IsOptional()
  @IsNumber()
  faceEnhancementCreativity?: number;

  // Topaz Video Upscale fields
  @IsOptional()
  @IsString()
  @IsIn(['720p', '1080p', '4k'])
  targetResolution?: string;

  @IsOptional()
  @IsNumber()
  @IsIn([15, 24, 30, 60])
  targetFps?: number;
}
