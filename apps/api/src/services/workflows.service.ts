import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { CreateWorkflowDto } from '@/dto/create-workflow.dto';
import type { UpdateWorkflowDto } from '@/dto/update-workflow.dto';
import { Workflow, type WorkflowDocument } from '@/schemas/workflow.schema';
import { WorkflowInterfaceService } from '@/services/workflow-interface.service';

interface WorkflowNode {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

@Injectable()
export class WorkflowsService {
  private readonly logger = new Logger(WorkflowsService.name);

  constructor(
    @InjectModel(Workflow.name)
    private readonly workflowModel: Model<WorkflowDocument>,
    private readonly workflowInterfaceService: WorkflowInterfaceService
  ) {}

  async create(dto: CreateWorkflowDto): Promise<WorkflowDocument> {
    // Compute interface from boundary nodes if present
    const nodes = (dto.nodes ?? []) as WorkflowNode[];
    const workflowInterface = this.workflowInterfaceService.computeWorkflowInterface(nodes);
    const isReusable = workflowInterface.inputs.length > 0 || workflowInterface.outputs.length > 0;

    const workflow = new this.workflowModel({
      name: dto.name,
      description: dto.description ?? '',
      nodes: dto.nodes ?? [],
      edges: dto.edges ?? [],
      edgeStyle: dto.edgeStyle ?? 'smoothstep',
      groups: dto.groups ?? [],
      interface: workflowInterface,
      isReusable,
    });
    return workflow.save();
  }

  async findAll(): Promise<WorkflowDocument[]> {
    return this.workflowModel.find({ isDeleted: false }).sort({ updatedAt: -1 }).exec();
  }

  async findOne(id: string): Promise<WorkflowDocument> {
    const workflow = await this.workflowModel.findOne({ _id: id, isDeleted: false }).exec();
    if (!workflow) {
      throw new NotFoundException(`Workflow ${id} not found`);
    }
    return workflow;
  }

  async update(id: string, dto: UpdateWorkflowDto): Promise<WorkflowDocument> {
    // If nodes are being updated, recompute the interface
    const updates: Record<string, unknown> = { ...dto };

    if (dto.nodes) {
      const nodes = dto.nodes as WorkflowNode[];
      const workflowInterface = this.workflowInterfaceService.computeWorkflowInterface(nodes);
      const isReusable =
        workflowInterface.inputs.length > 0 || workflowInterface.outputs.length > 0;

      updates.interface = workflowInterface;
      updates.isReusable = isReusable;

      this.logger.log(
        `Workflow ${id} interface updated: ${workflowInterface.inputs.length} inputs, ${workflowInterface.outputs.length} outputs`
      );
    }

    const workflow = await this.workflowModel
      .findOneAndUpdate({ _id: id, isDeleted: false }, { $set: updates }, { new: true })
      .exec();
    if (!workflow) {
      throw new NotFoundException(`Workflow ${id} not found`);
    }
    return workflow;
  }

  async remove(id: string): Promise<WorkflowDocument> {
    const workflow = await this.workflowModel
      .findOneAndUpdate({ _id: id, isDeleted: false }, { $set: { isDeleted: true } }, { new: true })
      .exec();
    if (!workflow) {
      throw new NotFoundException(`Workflow ${id} not found`);
    }
    return workflow;
  }

  async duplicate(id: string): Promise<WorkflowDocument> {
    const original = await this.findOne(id);

    // Compute interface for the duplicate
    const nodes = original.nodes as WorkflowNode[];
    const workflowInterface = this.workflowInterfaceService.computeWorkflowInterface(nodes);
    const isReusable = workflowInterface.inputs.length > 0 || workflowInterface.outputs.length > 0;

    const duplicate = new this.workflowModel({
      name: `${original.name} (copy)`,
      description: original.description,
      nodes: original.nodes,
      edges: original.edges,
      edgeStyle: original.edgeStyle,
      groups: original.groups,
      interface: workflowInterface,
      isReusable,
    });
    return duplicate.save();
  }

  /**
   * Get the interface of a workflow (inputs/outputs defined by boundary nodes)
   */
  async getInterface(id: string) {
    return this.workflowInterfaceService.getWorkflowInterface(id);
  }

  /**
   * Find all workflows that can be referenced as subworkflows
   */
  async findReferencable(excludeWorkflowId?: string) {
    return this.workflowInterfaceService.findReferencableWorkflows(excludeWorkflowId);
  }

  /**
   * Validate a workflow reference (checks for circular references)
   */
  async validateReference(parentWorkflowId: string, childWorkflowId: string) {
    return this.workflowInterfaceService.validateWorkflowReference(
      parentWorkflowId,
      childWorkflowId
    );
  }
}
