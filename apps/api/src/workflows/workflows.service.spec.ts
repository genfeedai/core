import {
  type IWorkflowRepository,
  WORKFLOW_REPOSITORY,
  type WorkflowEntity,
} from '@genfeedai/storage';
import { NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkflowsService } from './workflows.service';

describe('WorkflowsService', () => {
  let service: WorkflowsService;
  let mockRepository: IWorkflowRepository;

  const mockWorkflowId = 'workflow-123';

  const mockWorkflow: WorkflowEntity = {
    id: mockWorkflowId,
    name: 'Test Workflow',
    description: 'A test workflow',
    version: 1,
    nodes: [
      { id: 'node-1', type: 'promptNode', position: { x: 0, y: 0 }, data: {} },
      { id: 'node-2', type: 'imageGenNode', position: { x: 200, y: 0 }, data: {} },
    ],
    edges: [{ id: 'edge-1', source: 'node-1', target: 'node-2' }],
    edgeStyle: 'bezier',
    groups: [],
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockRepository = {
      create: vi.fn().mockResolvedValue(mockWorkflow),
      findById: vi.fn().mockResolvedValue(mockWorkflow),
      findOne: vi.fn().mockResolvedValue(mockWorkflow),
      findAll: vi.fn().mockResolvedValue([mockWorkflow]),
      findAllActive: vi.fn().mockResolvedValue([mockWorkflow]),
      findByName: vi.fn().mockResolvedValue(mockWorkflow),
      update: vi.fn().mockResolvedValue(mockWorkflow),
      softDelete: vi.fn().mockResolvedValue({ ...mockWorkflow, isDeleted: true }),
      hardDelete: vi.fn().mockResolvedValue(true),
      duplicate: vi
        .fn()
        .mockResolvedValue({ ...mockWorkflow, id: 'workflow-456', name: 'Test Workflow (Copy)' }),
      search: vi.fn().mockResolvedValue([mockWorkflow]),
      count: vi.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkflowsService, { provide: WORKFLOW_REPOSITORY, useValue: mockRepository }],
    }).compile();

    service = module.get<WorkflowsService>(WorkflowsService);
  });

  describe('create', () => {
    it('should create a new workflow', async () => {
      const createDto = {
        name: 'New Workflow',
        description: 'A new workflow',
      };

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Workflow');
      expect(mockRepository.create).toHaveBeenCalledWith({
        name: 'New Workflow',
        description: 'A new workflow',
        nodes: undefined,
        edges: undefined,
        edgeStyle: undefined,
        groups: undefined,
      });
    });

    it('should create workflow with nodes and edges', async () => {
      const createDto = {
        name: 'Workflow with nodes',
        nodes: [{ id: 'n1', type: 'test', position: { x: 0, y: 0 } }],
        edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
      };

      await service.create(createDto);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Workflow with nodes',
          nodes: createDto.nodes,
          edges: createDto.edges,
        })
      );
    });

    it('should create workflow with groups', async () => {
      const createDto = {
        name: 'Workflow with groups',
        groups: [{ id: 'g1', name: 'Group 1', nodeIds: ['n1', 'n2'] }],
      };

      await service.create(createDto);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          groups: createDto.groups,
        })
      );
    });
  });

  describe('findAll', () => {
    it('should return all active workflows', async () => {
      const result = await service.findAll();

      expect(result).toEqual([mockWorkflow]);
      expect(mockRepository.findAllActive).toHaveBeenCalledWith({
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      });
    });

    it('should return empty array when no workflows exist', async () => {
      vi.mocked(mockRepository.findAllActive).mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a single workflow by ID', async () => {
      const result = await service.findOne(mockWorkflowId);

      expect(result).toEqual(mockWorkflow);
      expect(mockRepository.findById).toHaveBeenCalledWith(mockWorkflowId);
    });

    it('should throw NotFoundException when workflow not found', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        'Workflow with ID nonexistent-id not found'
      );
    });
  });

  describe('update', () => {
    it('should update workflow name', async () => {
      const updatedWorkflow = { ...mockWorkflow, name: 'Updated Workflow' };
      vi.mocked(mockRepository.update).mockResolvedValue(updatedWorkflow);

      const result = await service.update(mockWorkflowId, { name: 'Updated Workflow' });

      expect(result.name).toBe('Updated Workflow');
      expect(mockRepository.update).toHaveBeenCalledWith(mockWorkflowId, {
        name: 'Updated Workflow',
      });
    });

    it('should update workflow nodes', async () => {
      const newNodes = [{ id: 'node-3', type: 'outputNode', position: { x: 400, y: 0 } }];
      const updatedWorkflow = { ...mockWorkflow, nodes: newNodes };
      vi.mocked(mockRepository.update).mockResolvedValue(updatedWorkflow);

      const result = await service.update(mockWorkflowId, { nodes: newNodes });

      expect(result.nodes).toEqual(newNodes);
    });

    it('should update workflow edges', async () => {
      const newEdges = [{ id: 'edge-2', source: 'node-1', target: 'node-3' }];
      const updatedWorkflow = { ...mockWorkflow, edges: newEdges };
      vi.mocked(mockRepository.update).mockResolvedValue(updatedWorkflow);

      const result = await service.update(mockWorkflowId, { edges: newEdges });

      expect(result.edges).toEqual(newEdges);
    });

    it('should update workflow description', async () => {
      const updatedWorkflow = { ...mockWorkflow, description: 'New description' };
      vi.mocked(mockRepository.update).mockResolvedValue(updatedWorkflow);

      const result = await service.update(mockWorkflowId, { description: 'New description' });

      expect(result.description).toBe('New description');
    });

    it('should throw NotFoundException when workflow not found', async () => {
      vi.mocked(mockRepository.update).mockResolvedValue(null);

      await expect(service.update('nonexistent-id', { name: 'Updated' })).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('remove', () => {
    it('should soft delete workflow', async () => {
      const deletedWorkflow = { ...mockWorkflow, isDeleted: true };
      vi.mocked(mockRepository.softDelete).mockResolvedValue(deletedWorkflow);

      const result = await service.remove(mockWorkflowId);

      expect(result.isDeleted).toBe(true);
      expect(mockRepository.softDelete).toHaveBeenCalledWith(mockWorkflowId);
    });

    it('should throw NotFoundException when workflow not found', async () => {
      vi.mocked(mockRepository.softDelete).mockResolvedValue(null);

      await expect(service.remove('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('duplicate', () => {
    it('should create a copy of the workflow', async () => {
      const duplicatedWorkflow = {
        ...mockWorkflow,
        id: 'workflow-456',
        name: 'Test Workflow (Copy)',
      };
      vi.mocked(mockRepository.duplicate).mockResolvedValue(duplicatedWorkflow);

      const result = await service.duplicate(mockWorkflowId);

      expect(result).toBeDefined();
      expect(result.id).not.toBe(mockWorkflowId);
      expect(result.name).toContain('(Copy)');
      expect(mockRepository.duplicate).toHaveBeenCalledWith(mockWorkflowId);
    });

    it('should preserve nodes and edges in duplicated workflow', async () => {
      const duplicatedWorkflow = {
        ...mockWorkflow,
        id: 'workflow-456',
        name: 'Test Workflow (Copy)',
      };
      vi.mocked(mockRepository.duplicate).mockResolvedValue(duplicatedWorkflow);

      const result = await service.duplicate(mockWorkflowId);

      expect(result.nodes).toEqual(mockWorkflow.nodes);
      expect(result.edges).toEqual(mockWorkflow.edges);
    });
  });
});
