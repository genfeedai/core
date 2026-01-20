import type { WorkflowInterface } from '@genfeedai/types';
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import type { CreateWorkflowDto } from '@/dto/create-workflow.dto';
import { ImportWorkflowDto } from '@/dto/import-workflow.dto';
import { QueryWorkflowDto } from '@/dto/query-workflow.dto';
import type { UpdateWorkflowDto } from '@/dto/update-workflow.dto';
import type { CostEstimate, WorkflowNodeForCost } from '@/interfaces/cost.interface';
import type { WorkflowExport } from '@/interfaces/workflow-export.interface';
import { CostCalculatorService } from '@/services/cost-calculator.service';
import {
  type GenerateWorkflowDto,
  WorkflowGeneratorService,
} from '@/services/workflow-generator.service';
import { WorkflowsService } from '@/services/workflows.service';

@Controller('workflows')
export class WorkflowsController {
  constructor(
    private readonly workflowsService: WorkflowsService,
    private readonly costCalculatorService: CostCalculatorService,
    private readonly workflowGeneratorService: WorkflowGeneratorService
  ) {}

  @Post()
  create(@Body() createWorkflowDto: CreateWorkflowDto) {
    return this.workflowsService.create(createWorkflowDto);
  }

  @Get()
  findAll(@Query() query: QueryWorkflowDto) {
    return this.workflowsService.findAll(query);
  }

  // Static routes must come before parameterized routes (:id)
  // Otherwise NestJS treats 'referencable' as an :id value

  /**
   * Get workflows that can be referenced as subworkflows (have defined interface)
   */
  @Get('referencable')
  findReferencable(@Query('exclude') excludeWorkflowId?: string) {
    return this.workflowsService.findReferencable(excludeWorkflowId);
  }

  @Post('generate')
  generate(@Body() generateDto: GenerateWorkflowDto) {
    return this.workflowGeneratorService.generate(generateDto);
  }

  /**
   * Import a workflow from JSON export
   */
  @Post('import')
  import(@Body() importDto: ImportWorkflowDto) {
    return this.workflowsService.importWorkflow(importDto);
  }

  // Parameterized routes below

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workflowsService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateWorkflowDto: UpdateWorkflowDto) {
    return this.workflowsService.update(id, updateWorkflowDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.workflowsService.remove(id);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id') id: string) {
    return this.workflowsService.duplicate(id);
  }

  /**
   * Export a workflow to JSON format for sharing
   */
  @Get(':id/export')
  async exportWorkflow(@Param('id') id: string): Promise<WorkflowExport> {
    return this.workflowsService.exportWorkflow(id);
  }

  @Get(':id/cost-estimate')
  async getCostEstimate(@Param('id') id: string): Promise<CostEstimate> {
    const workflow = await this.workflowsService.findOne(id);
    const nodes = workflow.nodes as WorkflowNodeForCost[];
    return this.costCalculatorService.calculateWorkflowEstimate(nodes);
  }

  /**
   * Get the interface of a workflow (inputs/outputs defined by boundary nodes)
   */
  @Get(':id/interface')
  async getInterface(@Param('id') id: string): Promise<WorkflowInterface> {
    return this.workflowsService.getInterface(id);
  }

  /**
   * Validate a workflow reference (checks for circular references)
   * Returns the child workflow's interface if valid
   */
  @Post(':id/validate-reference')
  async validateReference(
    @Param('id') parentWorkflowId: string,
    @Body('childWorkflowId') childWorkflowId: string
  ): Promise<WorkflowInterface> {
    return this.workflowsService.validateReference(parentWorkflowId, childWorkflowId);
  }
}
