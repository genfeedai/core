import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkflowsController } from '@/controllers/workflows.controller';
import type { CostCalculatorService } from '@/services/cost-calculator.service';
import type { WorkflowGeneratorService } from '@/services/workflow-generator.service';
import type { WorkflowsService } from '@/services/workflows.service';

describe('WorkflowsController', () => {
  let controller: WorkflowsController;

  const mockWorkflowId = new Types.ObjectId();

  const mockWorkflow = {
    _id: mockWorkflowId,
    createdAt: new Date(),
    description: 'A test workflow',
    edgeStyle: 'bezier',
    edges: [{ id: 'edge-1', source: 'node-1', target: 'node-2' }],
    isDeleted: false,
    name: 'Test Workflow',
    nodes: [
      { data: {}, id: 'node-1', position: { x: 0, y: 0 }, type: 'prompt' },
      {
        data: { model: 'nano-banana-pro' },
        id: 'node-2',
        position: { x: 200, y: 0 },
        type: 'imageGen',
      },
    ],
    updatedAt: new Date(),
  };

  const mockWorkflowsService = {
    create: vi.fn().mockResolvedValue(mockWorkflow),
    duplicate: vi.fn().mockResolvedValue({
      ...mockWorkflow,
      _id: new Types.ObjectId(),
      name: 'Test Workflow (Copy)',
    }),
    findAll: vi.fn().mockResolvedValue([mockWorkflow]),
    findOne: vi.fn().mockResolvedValue(mockWorkflow),
    remove: vi.fn().mockResolvedValue({ ...mockWorkflow, isDeleted: true }),
    update: vi.fn().mockResolvedValue(mockWorkflow),
  };

  const mockCostCalculatorService = {
    calculateWorkflowEstimate: vi.fn().mockReturnValue({
      items: [
        {
          model: 'nano-banana-pro',
          nodeId: 'node-2',
          nodeType: 'imageGen',
          quantity: 1,
          subtotal: 0.15,
          unitPrice: 0.15,
        },
      ],
      total: 0.15,
    }),
  };

  const mockWorkflowGeneratorService = {
    generateWorkflow: vi.fn().mockResolvedValue(mockWorkflow),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Instantiate controller directly with mocks (bypassing NestJS DI due to type-only imports)
    controller = new WorkflowsController(
      mockWorkflowsService as unknown as WorkflowsService,
      mockCostCalculatorService as unknown as CostCalculatorService,
      mockWorkflowGeneratorService as unknown as WorkflowGeneratorService
    );
  });

  describe('create', () => {
    it('should create a new workflow', async () => {
      const createDto = {
        description: 'A new workflow',
        name: 'New Workflow',
      };

      const result = await controller.create(createDto);

      expect(result).toEqual(mockWorkflow);
      expect(mockWorkflowsService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return all workflows', async () => {
      const result = await controller.findAll({});

      expect(result).toEqual([mockWorkflow]);
      expect(mockWorkflowsService.findAll).toHaveBeenCalledWith({});
    });
  });

  describe('findOne', () => {
    it('should return a single workflow', async () => {
      const result = await controller.findOne(mockWorkflowId.toString());

      expect(result).toEqual(mockWorkflow);
      expect(mockWorkflowsService.findOne).toHaveBeenCalledWith(mockWorkflowId.toString());
    });
  });

  describe('update', () => {
    it('should update a workflow', async () => {
      const updateDto = { name: 'Updated Workflow' };

      const result = await controller.update(mockWorkflowId.toString(), updateDto);

      expect(result).toEqual(mockWorkflow);
      expect(mockWorkflowsService.update).toHaveBeenCalledWith(
        mockWorkflowId.toString(),
        updateDto
      );
    });
  });

  describe('remove', () => {
    it('should remove a workflow', async () => {
      const result = await controller.remove(mockWorkflowId.toString());

      expect(result.isDeleted).toBe(true);
      expect(mockWorkflowsService.remove).toHaveBeenCalledWith(mockWorkflowId.toString());
    });
  });

  describe('duplicate', () => {
    it('should duplicate a workflow', async () => {
      const result = await controller.duplicate(mockWorkflowId.toString());

      expect(result.name).toBe('Test Workflow (Copy)');
      expect(mockWorkflowsService.duplicate).toHaveBeenCalledWith(mockWorkflowId.toString());
    });
  });

  describe('getCostEstimate', () => {
    it('should return cost estimate for workflow', async () => {
      const result = await controller.getCostEstimate(mockWorkflowId.toString());

      expect(result.total).toBe(0.15);
      expect(result.items).toHaveLength(1);
      expect(mockWorkflowsService.findOne).toHaveBeenCalledWith(mockWorkflowId.toString());
      expect(mockCostCalculatorService.calculateWorkflowEstimate).toHaveBeenCalled();
    });

    it('should pass workflow nodes to cost calculator', async () => {
      await controller.getCostEstimate(mockWorkflowId.toString());

      expect(mockCostCalculatorService.calculateWorkflowEstimate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'node-1' }),
          expect.objectContaining({ id: 'node-2' }),
        ])
      );
    });
  });
});
