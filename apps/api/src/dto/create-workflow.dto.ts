import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

class PositionDto {
  @IsNumber()
  x: number;

  @IsNumber()
  y: number;
}

class WorkflowNodeDto {
  @IsString()
  id: string;

  @IsString()
  type: string;

  @ValidateNested()
  @Type(() => PositionDto)
  position: PositionDto;

  @IsOptional()
  data?: Record<string, unknown>;
}

class WorkflowEdgeDto {
  @IsString()
  id: string;

  @IsString()
  source: string;

  @IsString()
  target: string;

  @IsOptional()
  @IsString()
  sourceHandle?: string;

  @IsOptional()
  @IsString()
  targetHandle?: string;

  @IsOptional()
  @IsString()
  type?: string;
}

class NodeGroupDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsArray()
  @IsString({ each: true })
  nodeIds: string[];

  @IsOptional()
  isLocked?: boolean;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  collapsed?: boolean;
}

export class CreateWorkflowDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowNodeDto)
  nodes?: WorkflowNodeDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowEdgeDto)
  edges?: WorkflowEdgeDto[];

  @IsOptional()
  @IsString()
  edgeStyle?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NodeGroupDto)
  groups?: NodeGroupDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsString()
  thumbnailNodeId?: string;
}
