import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CostCalculatorService } from '../cost/cost-calculator.service';
import { WorkflowsController } from './workflows.controller';
import type { WorkflowsService } from './workflows.service';

describe('WorkflowsController', () => {
  let controller: WorkflowsController;

  const mockWorkflowId = new Types.ObjectId();

  const mockWorkflow = {
    _id: mockWorkflowId,
    name: 'Test Workflow',
    description: 'A test workflow',
    nodes: [
      { id: 'node-1', type: 'prompt', position: { x: 0, y: 0 }, data: {} },
      {
        id: 'node-2',
        type: 'imageGen',
        position: { x: 200, y: 0 },
        data: { model: 'nano-banana-pro' },
      },
    ],
    edges: [{ id: 'edge-1', source: 'node-1', target: 'node-2' }],
    edgeStyle: 'bezier',
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockWorkflowsService = {
    create: vi.fn().mockResolvedValue(mockWorkflow),
    findAll: vi.fn().mockResolvedValue([mockWorkflow]),
    findOne: vi.fn().mockResolvedValue(mockWorkflow),
    update: vi.fn().mockResolvedValue(mockWorkflow),
    remove: vi.fn().mockResolvedValue({ ...mockWorkflow, isDeleted: true }),
    duplicate: vi.fn().mockResolvedValue({
      ...mockWorkflow,
      _id: new Types.ObjectId(),
      name: 'Test Workflow (Copy)',
    }),
  };

  const mockCostCalculatorService = {
    calculateWorkflowEstimate: vi.fn().mockReturnValue({
      total: 0.15,
      breakdown: [
        {
          nodeId: 'node-2',
          nodeType: 'imageGen',
          model: 'nano-banana-pro',
          unitPrice: 0.15,
          quantity: 1,
          subtotal: 0.15,
        },
      ],
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Instantiate controller directly with mocks (bypassing NestJS DI due to type-only imports)
    controller = new WorkflowsController(
      mockWorkflowsService as unknown as WorkflowsService,
      mockCostCalculatorService as unknown as CostCalculatorService
    );
  });

  describe('create', () => {
    it('should create a new workflow', async () => {
      const createDto = {
        name: 'New Workflow',
        description: 'A new workflow',
      };

      const result = await controller.create(createDto);

      expect(result).toEqual(mockWorkflow);
      expect(mockWorkflowsService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return all workflows', async () => {
      const result = await controller.findAll();

      expect(result).toEqual([mockWorkflow]);
      expect(mockWorkflowsService.findAll).toHaveBeenCalled();
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
      expect(result.breakdown).toHaveLength(1);
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
