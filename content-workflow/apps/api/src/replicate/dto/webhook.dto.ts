import { IsString, IsOptional, ValidateNested, IsNumber } from "class-validator";
import { Type } from "class-transformer";

class MetricsDto {
  @IsOptional()
  @IsNumber()
  predict_time?: number;
}

export class WebhookDto {
  @IsString()
  id: string;

  @IsString()
  status: string;

  @IsOptional()
  output?: unknown;

  @IsOptional()
  @IsString()
  error?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => MetricsDto)
  metrics?: MetricsDto;
}
