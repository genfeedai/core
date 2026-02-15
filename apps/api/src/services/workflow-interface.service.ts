import type {
  HandleType,
  WorkflowInputNodeData,
  WorkflowInterface,
  WorkflowOutputNodeData,
  WorkflowRefNodeData,
} from '@genfeedai/types';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { MongoFilterQuery } from '@/interfaces/execution-types.interface';
import type { WorkflowNode } from '@/interfaces/workflow.interface';
import { Workflow, type WorkflowDocument } from '@/schemas/workflow.schema';

@Injectable()
export class WorkflowInterfaceService {
  private readonly logger = new Logger(WorkflowInterfaceService.name);

  constructor(
    @InjectModel(Workflow.name)
    private readonly workflowModel: Model<WorkflowDocument>
  ) {}

  /**
   * Compute the interface of a workflow by extracting WorkflowInput and WorkflowOutput nodes
   */
  computeWorkflowInterface(nodes: WorkflowNode[]): WorkflowInterface {
    const inputs: WorkflowInterface['inputs'] = [];
    const outputs: WorkflowInterface['outputs'] = [];

    for (const node of nodes) {
      if (node.type === 'workflowInput') {
        const data = node.data as WorkflowInputNodeData;
        inputs.push({
          name: data.inputName || 'input',
          nodeId: node.id,
          required: data.required ?? true,
          type: (data.inputType as HandleType) || 'image',
        });
      } else if (node.type === 'workflowOutput') {
        const data = node.data as WorkflowOutputNodeData;
        outputs.push({
          name: data.outputName || 'output',
          nodeId: node.id,
          type: (data.outputType as HandleType) || 'image',
        });
      }
    }

    return { inputs, outputs };
  }

  /**
   * Get the interface of a workflow by ID
   */
  async getWorkflowInterface(workflowId: string): Promise<WorkflowInterface> {
    const workflow = await this.workflowModel.findOne({ _id: workflowId, isDeleted: false }).exec();
    if (!workflow) {
      throw new NotFoundException(`Workflow ${workflowId} not found`);
    }

    // Return cached interface if available, otherwise compute from nodes
    if (
      workflow.interface &&
      (workflow.interface.inputs.length > 0 || workflow.interface.outputs.length > 0)
    ) {
      return workflow.interface as unknown as WorkflowInterface;
    }

    return this.computeWorkflowInterface(workflow.nodes as WorkflowNode[]);
  }

  /**
   * Update the workflow's cached interface and isReusable flag
   */
  async updateWorkflowInterface(workflowId: string): Promise<WorkflowDocument> {
    const workflow = await this.workflowModel.findOne({ _id: workflowId, isDeleted: false }).exec();
    if (!workflow) {
      throw new NotFoundException(`Workflow ${workflowId} not found`);
    }

    const workflowInterface = this.computeWorkflowInterface(workflow.nodes as WorkflowNode[]);
    const isReusable = workflowInterface.inputs.length > 0 || workflowInterface.outputs.length > 0;

    const updated = await this.workflowModel
      .findByIdAndUpdate(
        workflowId,
        {
          $set: {
            interface: workflowInterface,
            isReusable,
          },
        },
        { new: true }
      )
      .exec();

    if (!updated) {
      throw new NotFoundException(`Workflow ${workflowId} not found`);
    }

    this.logger.log(
      `Updated interface for workflow ${workflowId}: ${workflowInterface.inputs.length} inputs, ${workflowInterface.outputs.length} outputs`
    );

    return updated;
  }

  /**
   * Find all workflows that can be referenced as subworkflows (have defined interface)
   * Excludes a specific workflow ID (to prevent self-reference)
   */
  async findReferencableWorkflows(excludeWorkflowId?: string): Promise<WorkflowDocument[]> {
    const query: MongoFilterQuery = {
      isDeleted: false,
      isReusable: true,
    };

    if (excludeWorkflowId) {
      query._id = { $ne: excludeWorkflowId };
    }

    return this.workflowModel.find(query).select('_id name description interface').exec();
  }

  /**
   * Detect if referencing childWorkflowId from parentWorkflowId would create a cycle
   * Uses DFS to traverse the reference graph
   */
  async detectCircularReference(
    parentWorkflowId: string,
    childWorkflowId: string
  ): Promise<boolean> {
    // Same workflow = immediate cycle
    if (parentWorkflowId === childWorkflowId) {
      return true;
    }

    // DFS to find if child eventually references parent
    const visited = new Set<string>();
    const stack = [childWorkflowId];

    while (stack.length > 0) {
      const currentId = stack.pop()!;

      if (visited.has(currentId)) {
        continue;
      }
      visited.add(currentId);

      // If we reach the parent, we have a cycle
      if (currentId === parentWorkflowId) {
        return true;
      }

      // Get the workflow and find all workflowRef nodes
      const workflow = await this.workflowModel
        .findOne({ _id: currentId, isDeleted: false })
        .exec();

      if (!workflow) {
        continue;
      }

      for (const node of workflow.nodes as WorkflowNode[]) {
        if (node.type === 'workflowRef') {
          const data = node.data as WorkflowRefNodeData;
          if (data.referencedWorkflowId && !visited.has(data.referencedWorkflowId)) {
            stack.push(data.referencedWorkflowId);
          }
        }
      }
    }

    return false;
  }

  /**
   * Validate a workflow reference and return the referenced workflow's interface
   * Throws if circular reference detected or workflow not found
   */
  async validateWorkflowReference(
    parentWorkflowId: string,
    childWorkflowId: string
  ): Promise<WorkflowInterface> {
    // Check for circular reference
    const hasCircle = await this.detectCircularReference(parentWorkflowId, childWorkflowId);
    if (hasCircle) {
      throw new BadRequestException(
        `Circular reference detected: cannot reference workflow ${childWorkflowId} from workflow ${parentWorkflowId}`
      );
    }

    // Get the child workflow's interface
    return this.getWorkflowInterface(childWorkflowId);
  }

  /**
   * Check if a workflow has any boundary nodes (WorkflowInput or WorkflowOutput)
   */
  hasBoundaryNodes(nodes: WorkflowNode[]): boolean {
    return nodes.some((node) => node.type === 'workflowInput' || node.type === 'workflowOutput');
  }
}
