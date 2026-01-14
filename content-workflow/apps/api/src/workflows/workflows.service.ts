import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Workflow, WorkflowDocument } from "./schemas/workflow.schema";
import { CreateWorkflowDto } from "./dto/create-workflow.dto";
import { UpdateWorkflowDto } from "./dto/update-workflow.dto";

@Injectable()
export class WorkflowsService {
  constructor(
    @InjectModel(Workflow.name) private workflowModel: Model<WorkflowDocument>,
  ) {}

  async create(createWorkflowDto: CreateWorkflowDto): Promise<Workflow> {
    const workflow = new this.workflowModel({
      ...createWorkflowDto,
      nodes: createWorkflowDto.nodes ?? [],
      edges: createWorkflowDto.edges ?? [],
    });
    return workflow.save();
  }

  async findAll(): Promise<Workflow[]> {
    return this.workflowModel
      .find({ isDeleted: false })
      .sort({ updatedAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Workflow> {
    const workflow = await this.workflowModel
      .findOne({ _id: id, isDeleted: false })
      .exec();

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }

    return workflow;
  }

  async update(id: string, updateWorkflowDto: UpdateWorkflowDto): Promise<Workflow> {
    const workflow = await this.workflowModel
      .findOneAndUpdate(
        { _id: id, isDeleted: false },
        { $set: updateWorkflowDto },
        { new: true },
      )
      .exec();

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }

    return workflow;
  }

  async remove(id: string): Promise<Workflow> {
    const workflow = await this.workflowModel
      .findOneAndUpdate(
        { _id: id, isDeleted: false },
        { $set: { isDeleted: true } },
        { new: true },
      )
      .exec();

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }

    return workflow;
  }

  async duplicate(id: string): Promise<Workflow> {
    const original = await this.findOne(id);

    const duplicateData = {
      name: `${original.name} (Copy)`,
      description: original.description,
      nodes: original.nodes,
      edges: original.edges,
      edgeStyle: original.edgeStyle,
    };

    return this.create(duplicateData);
  }
}
