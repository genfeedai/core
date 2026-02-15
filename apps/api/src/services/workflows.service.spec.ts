import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Workflow } from '@/schemas/workflow.schema';
import { WorkflowInterfaceService } from '@/services/workflow-interface.service';
import { WorkflowsService } from '@/services/workflows.service';
import {
  createConstructableMockModel,
  createMockWorkflow,
  createObjectId,
} from '@/test/mocks/mongoose.mock';

describe('WorkflowsService', () => {
  let service: WorkflowsService;
  let mockWorkflow: ReturnType<typeof createMockWorkflow>;

  const createMockWorkflowModel = () => {
    mockWorkflow = createMockWorkflow();
    return createConstructableMockModel(
      {
        find: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            sort: vi.fn().mockReturnValue({
              skip: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  lean: vi.fn().mockReturnValue({
                    exec: vi.fn().mockResolvedValue([mockWorkflow]),
                  }),
                }),
              }),
            }),
          }),
        }),
        findOne: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockWorkflow),
        }),
        findOneAndUpdate: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockWorkflow),
        }),
      },
      () => ({
        ...mockWorkflow,
        save: vi.fn().mockResolvedValue(mockWorkflow),
      })
    );
  };

  beforeEach(async () => {
    const mockModel = createMockWorkflowModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowsService,
        {
          provide: getModelToken(Workflow.name),
          useValue: mockModel,
        },
        {
          provide: WorkflowInterfaceService,
          useValue: {
            computeWorkflowInterface: vi.fn().mockReturnValue({ inputs: [], outputs: [] }),
          },
        },
      ],
    }).compile();

    service = module.get<WorkflowsService>(WorkflowsService);
  });

  describe('create', () => {
    it('should create a new workflow', async () => {
      const dto = {
        description: 'A test workflow',
        edges: [],
        name: 'Test Workflow',
        nodes: [],
      };

      const result = await service.create(dto);

      expect(result).toBeDefined();
      expect(result.name).toBe(mockWorkflow.name);
    });

    it('should create workflow with default values', async () => {
      const dto = { name: 'Minimal Workflow' };

      const result = await service.create(dto);

      expect(result).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return all non-deleted workflows', async () => {
      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockWorkflow);
    });
  });

  describe('findOne', () => {
    it('should return a workflow by id', async () => {
      const id = createObjectId().toString();

      const result = await service.findOne(id);

      expect(result).toEqual(mockWorkflow);
    });

    it('should throw NotFoundException when workflow not found', async () => {
      const mockModel = createMockWorkflowModel();
      mockModel.findOne = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WorkflowsService,
          {
            provide: getModelToken(Workflow.name),
            useValue: mockModel,
          },
          {
            provide: WorkflowInterfaceService,
            useValue: {
              computeWorkflowInterface: vi.fn().mockReturnValue({ inputs: [], outputs: [] }),
            },
          },
        ],
      }).compile();

      const serviceWithNullFind = module.get<WorkflowsService>(WorkflowsService);
      const id = createObjectId().toString();

      await expect(serviceWithNullFind.findOne(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a workflow', async () => {
      const id = createObjectId().toString();
      const dto = { name: 'Updated Name' };

      const result = await service.update(id, dto);

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when updating non-existent workflow', async () => {
      const mockModel = createMockWorkflowModel();
      mockModel.findOneAndUpdate = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WorkflowsService,
          {
            provide: getModelToken(Workflow.name),
            useValue: mockModel,
          },
          {
            provide: WorkflowInterfaceService,
            useValue: {
              computeWorkflowInterface: vi.fn().mockReturnValue({ inputs: [], outputs: [] }),
            },
          },
        ],
      }).compile();

      const serviceWithNullUpdate = module.get<WorkflowsService>(WorkflowsService);
      const id = createObjectId().toString();

      await expect(serviceWithNullUpdate.update(id, { name: 'New' })).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('remove', () => {
    it('should soft delete a workflow', async () => {
      const id = createObjectId().toString();

      const result = await service.remove(id);

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when removing non-existent workflow', async () => {
      const mockModel = createMockWorkflowModel();
      mockModel.findOneAndUpdate = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WorkflowsService,
          {
            provide: getModelToken(Workflow.name),
            useValue: mockModel,
          },
          {
            provide: WorkflowInterfaceService,
            useValue: {
              computeWorkflowInterface: vi.fn().mockReturnValue({ inputs: [], outputs: [] }),
            },
          },
        ],
      }).compile();

      const serviceWithNullRemove = module.get<WorkflowsService>(WorkflowsService);
      const id = createObjectId().toString();

      await expect(serviceWithNullRemove.remove(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('duplicate', () => {
    it('should duplicate a workflow with "(copy)" suffix', async () => {
      const id = createObjectId().toString();

      const result = await service.duplicate(id);

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when duplicating non-existent workflow', async () => {
      const mockModel = createMockWorkflowModel();
      mockModel.findOne = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WorkflowsService,
          {
            provide: getModelToken(Workflow.name),
            useValue: mockModel,
          },
          {
            provide: WorkflowInterfaceService,
            useValue: {
              computeWorkflowInterface: vi.fn().mockReturnValue({ inputs: [], outputs: [] }),
            },
          },
        ],
      }).compile();

      const serviceWithNullFind = module.get<WorkflowsService>(WorkflowsService);
      const id = createObjectId().toString();

      await expect(serviceWithNullFind.duplicate(id)).rejects.toThrow(NotFoundException);
    });
  });
});
