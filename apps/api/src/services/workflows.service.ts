import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { CreateWorkflowDto } from '@/dto/create-workflow.dto';
import type { ImportWorkflowDto } from '@/dto/import-workflow.dto';
import type { QueryWorkflowDto } from '@/dto/query-workflow.dto';
import type { UpdateWorkflowDto } from '@/dto/update-workflow.dto';
import {
  WORKFLOW_EXPORT_VERSION,
  type WorkflowExport,
} from '@/interfaces/workflow-export.interface';
import type { WorkflowNode } from '@/interfaces/workflow.interface';
import { Workflow, type WorkflowDocument } from '@/schemas/workflow.schema';
import { WorkflowInterfaceService } from '@/services/workflow-interface.service';

// Node types that can produce media outputs for thumbnails
const MEDIA_OUTPUT_NODE_TYPES = new Set([
  'imageGen',
  'videoGen',
  'imageInput',
  'videoInput',
  'download',
]);

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
      description: dto.description ?? '',
      edgeStyle: dto.edgeStyle ?? 'smoothstep',
      edges: dto.edges ?? [],
      groups: dto.groups ?? [],
      interface: workflowInterface,
      isReusable,
      name: dto.name,
      nodes: dto.nodes ?? [],
      thumbnail: dto.thumbnail ?? null,
      thumbnailNodeId: dto.thumbnailNodeId ?? null,
    });
    return workflow.save();
  }

  async findAll(query?: QueryWorkflowDto): Promise<WorkflowDocument[]> {
    return this.workflowModel
      .find({ isDeleted: false })
      .select(
        'name thumbnail thumbnailNodeId updatedAt createdAt nodes.id nodes.type nodes.position edges.id edges.source edges.target'
      )
      .sort({ updatedAt: -1 })
      .skip(query?.offset ?? 0)
      .limit(query?.limit ?? 20)
      .lean()
      .exec();
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

      // Auto-select thumbnail if not set and nodes have media outputs
      const existingWorkflow = await this.workflowModel.findOne({ _id: id, isDeleted: false });
      if (existingWorkflow && !existingWorkflow.thumbnail) {
        const autoThumbnail = this.findAutoThumbnail(nodes);
        if (autoThumbnail) {
          updates.thumbnail = autoThumbnail.url;
          updates.thumbnailNodeId = autoThumbnail.nodeId;
          this.logger.log(
            `Auto-selected thumbnail for workflow ${id} from node ${autoThumbnail.nodeId}`
          );
        }
      }
    }

    const workflow = await this.workflowModel
      .findOneAndUpdate({ _id: id, isDeleted: false }, { $set: updates }, { new: true })
      .exec();
    if (!workflow) {
      throw new NotFoundException(`Workflow ${id} not found`);
    }
    return workflow;
  }

  /**
   * Find a node with media output to use as auto-thumbnail
   * Priority: video outputs > image outputs
   */
  private findAutoThumbnail(nodes: WorkflowNode[]): { url: string; nodeId: string } | null {
    // First, look for video outputs
    for (const node of nodes) {
      if (!MEDIA_OUTPUT_NODE_TYPES.has(node.type)) continue;

      const data = node.data as Record<string, unknown>;
      if (data.status !== 'complete') continue;

      if (data.outputVideo && typeof data.outputVideo === 'string') {
        return { nodeId: node.id, url: data.outputVideo };
      }
    }

    // Then, look for image outputs
    for (const node of nodes) {
      if (!MEDIA_OUTPUT_NODE_TYPES.has(node.type)) continue;

      const data = node.data as Record<string, unknown>;
      if (data.status !== 'complete') continue;

      if (data.outputImage && typeof data.outputImage === 'string') {
        return { nodeId: node.id, url: data.outputImage };
      }
    }

    return null;
  }

  /**
   * Set the thumbnail for a workflow
   */
  async setThumbnail(id: string, thumbnailUrl: string, nodeId: string): Promise<WorkflowDocument> {
    const workflow = await this.workflowModel
      .findOneAndUpdate(
        { _id: id, isDeleted: false },
        { $set: { thumbnail: thumbnailUrl, thumbnailNodeId: nodeId } },
        { new: true }
      )
      .exec();

    if (!workflow) {
      throw new NotFoundException(`Workflow ${id} not found`);
    }

    this.logger.log(`Set thumbnail for workflow ${id} from node ${nodeId}`);
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
      description: original.description,
      edgeStyle: original.edgeStyle,
      edges: original.edges,
      groups: original.groups,
      interface: workflowInterface,
      isReusable,
      name: `${original.name} (copy)`,
      nodes: original.nodes,
      thumbnail: original.thumbnail,
      thumbnailNodeId: original.thumbnailNodeId,
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

  /**
   * Export a workflow to JSON format for sharing
   * Strips internal IDs and metadata, keeps only portable data
   */
  async exportWorkflow(id: string): Promise<WorkflowExport> {
    const workflow = await this.findOne(id);

    // Strip sensitive/internal data from nodes
    const exportNodes = (workflow.nodes as WorkflowNode[]).map((node) => {
      const cleanData = { ...node.data };

      // Remove execution-specific data
      delete cleanData.status;
      delete cleanData.error;
      delete cleanData.progress;
      delete cleanData.cachedOutput;
      delete cleanData.lockTimestamp;

      // Remove uploaded file data (users must re-upload)
      // Log warnings so users know some data was stripped during export
      if (cleanData.image && typeof cleanData.image === 'string') {
        if (cleanData.image.startsWith('data:') || cleanData.image.startsWith('blob:')) {
          this.logger.warn(
            `Stripped data/blob URL from workflow export: nodeId=${node.id}, field=image (users must re-upload)`
          );
          cleanData.image = null;
        }
      }
      if (cleanData.video && typeof cleanData.video === 'string') {
        if (cleanData.video.startsWith('data:') || cleanData.video.startsWith('blob:')) {
          this.logger.warn(
            `Stripped data/blob URL from workflow export: nodeId=${node.id}, field=video (users must re-upload)`
          );
          cleanData.video = null;
        }
      }
      if (cleanData.audio && typeof cleanData.audio === 'string') {
        if (cleanData.audio.startsWith('data:') || cleanData.audio.startsWith('blob:')) {
          this.logger.warn(
            `Stripped data/blob URL from workflow export: nodeId=${node.id}, field=audio (users must re-upload)`
          );
          cleanData.audio = null;
        }
      }

      return {
        data: cleanData,
        id: node.id,
        position: (node as unknown as { position: { x: number; y: number } }).position,
        type: node.type,
      };
    });

    const exportEdges = (
      workflow.edges as Array<{
        id: string;
        source: string;
        target: string;
        sourceHandle?: string;
        targetHandle?: string;
        type?: string;
      }>
    ).map((edge) => ({
      id: edge.id,
      source: edge.source,
      sourceHandle: edge.sourceHandle,
      target: edge.target,
      targetHandle: edge.targetHandle,
      type: edge.type,
    }));

    const exportGroups = (
      workflow.groups as Array<{
        id: string;
        name: string;
        nodeIds: string[];
        isLocked: boolean;
        color?: string;
        collapsed?: boolean;
      }>
    ).map((group) => ({
      collapsed: group.collapsed,
      color: group.color,
      id: group.id,
      isLocked: group.isLocked,
      name: group.name,
      nodeIds: group.nodeIds,
    }));

    this.logger.log(`Exported workflow ${id}: ${workflow.name}`);

    return {
      description: workflow.description ?? '',
      edgeStyle: workflow.edgeStyle ?? 'smoothstep',
      edges: exportEdges,
      groups: exportGroups,
      metadata: {
        exportedAt: new Date().toISOString(),
        exportedFrom: 'genfeed-core',
        originalId: id,
      },
      name: workflow.name,
      nodes: exportNodes,
      version: WORKFLOW_EXPORT_VERSION,
    };
  }

  /**
   * Import a workflow from JSON export
   * Creates a new workflow with regenerated IDs
   */
  async importWorkflow(dto: ImportWorkflowDto): Promise<WorkflowDocument> {
    this.logger.log(`Importing workflow: ${dto.name} (version ${dto.version})`);

    // Generate new IDs for nodes to avoid conflicts
    const idMap = new Map<string, string>();

    const importedNodes = dto.nodes.map((node) => {
      const newId = `${node.type}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      idMap.set(node.id, newId);

      return {
        ...node,
        data: {
          ...node.data,
          status: 'idle', // Reset status
        },
        id: newId,
      };
    });

    // Update edge references to use new node IDs
    const importedEdges = dto.edges.map((edge) => ({
      ...edge,
      id: `edge-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      source: idMap.get(edge.source) ?? edge.source,
      target: idMap.get(edge.target) ?? edge.target,
    }));

    // Update group references to use new node IDs
    const importedGroups = (dto.groups ?? []).map((group) => ({
      ...group,
      id: `group-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      nodeIds: group.nodeIds.map((nodeId) => idMap.get(nodeId) ?? nodeId),
    }));

    // Create the workflow
    const createDto: CreateWorkflowDto = {
      description: dto.description,
      edgeStyle: dto.edgeStyle ?? 'smoothstep',
      edges: importedEdges,
      groups: importedGroups,
      name: dto.name,
      nodes: importedNodes,
    };

    const workflow = await this.create(createDto);
    this.logger.log(`Imported workflow created: ${workflow._id}`);

    return workflow;
  }
}
