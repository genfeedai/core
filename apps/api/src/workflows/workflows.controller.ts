import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import type { CostCalculatorService } from '../cost/cost-calculator.service';
import type { CostEstimate, WorkflowNodeForCost } from '../cost/interfaces/cost.interface';
import type { CreateWorkflowDto } from './dto/create-workflow.dto';
import type { UpdateWorkflowDto } from './dto/update-workflow.dto';
import type { GenerateWorkflowDto, WorkflowGeneratorService } from './workflow-generator.service';
import type { WorkflowsService } from './workflows.service';

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
  findAll() {
    return this.workflowsService.findAll();
  }

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

  @Get(':id/cost-estimate')
  async getCostEstimate(@Param('id') id: string): Promise<CostEstimate> {
    const workflow = await this.workflowsService.findOne(id);
    const nodes = workflow.nodes as WorkflowNodeForCost[];
    return this.costCalculatorService.calculateWorkflowEstimate(nodes);
  }

  @Post('generate')
  generate(@Body() generateDto: GenerateWorkflowDto) {
    return this.workflowGeneratorService.generate(generateDto);
  }
}
