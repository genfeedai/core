import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryWorkflowDto {
  @IsOptional()
  @Transform(({ value }) => Number.parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Transform(({ value }) => Number.parseInt(value, 10))
  @IsNumber()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  tag?: string;
}
