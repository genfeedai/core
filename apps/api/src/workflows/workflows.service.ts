import {
  type IWorkflowRepository,
  WORKFLOW_REPOSITORY,
  type WorkflowEntity,
} from '@genfeedai/storage';
import { Inject, Injectable } from '@nestjs/common';
import { throwIfNotFound } from '../common/utils';
import type { CreateWorkflowDto } from './dto/create-workflow.dto';
import type { UpdateWorkflowDto } from './dto/update-workflow.dto';

@Injectable()
export class WorkflowsService {
  constructor(
    @Inject(WORKFLOW_REPOSITORY)
    private readonly workflowRepository: IWorkflowRepository
  ) {}

  async create(createWorkflowDto: CreateWorkflowDto): Promise<WorkflowEntity> {
    return this.workflowRepository.create({
      name: createWorkflowDto.name,
      description: createWorkflowDto.description,
      nodes: createWorkflowDto.nodes,
      edges: createWorkflowDto.edges,
      edgeStyle: createWorkflowDto.edgeStyle,
      groups: createWorkflowDto.groups,
    });
  }

  async findAll(): Promise<WorkflowEntity[]> {
    return this.workflowRepository.findAllActive({ sortBy: 'updatedAt', sortOrder: 'desc' });
  }

  async findOne(id: string): Promise<WorkflowEntity> {
    const workflow = await this.workflowRepository.findById(id);
    return throwIfNotFound(workflow, 'Workflow', id);
  }

  async update(id: string, updateWorkflowDto: UpdateWorkflowDto): Promise<WorkflowEntity> {
    const workflow = await this.workflowRepository.update(id, updateWorkflowDto);
    return throwIfNotFound(workflow, 'Workflow', id);
  }

  async remove(id: string): Promise<WorkflowEntity> {
    const workflow = await this.workflowRepository.softDelete(id);
    return throwIfNotFound(workflow, 'Workflow', id);
  }

  async duplicate(id: string): Promise<WorkflowEntity> {
    return this.workflowRepository.duplicate(id);
  }
}
