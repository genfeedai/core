import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkflowData } from './workflows';
import { workflowsApi } from './workflows';

// Mock the apiClient
vi.mock('./client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('workflowsApi', () => {
  const mockWorkflow: WorkflowData = {
    _id: 'workflow-1',
    name: 'Test Workflow',
    description: 'A test workflow',
    version: 1,
    nodes: [],
    edges: [],
    edgeStyle: 'bezier',
    groups: [],
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getAll', () => {
    it('should fetch all workflows', async () => {
      const { apiClient } = await import('./client');
      (apiClient.get as any).mockResolvedValueOnce([mockWorkflow]);

      const result = await workflowsApi.getAll();

      expect(apiClient.get).toHaveBeenCalledWith('/workflows', { signal: undefined });
      expect(result).toEqual([mockWorkflow]);
    });

    it('should pass abort signal when provided', async () => {
      const { apiClient } = await import('./client');
      (apiClient.get as any).mockResolvedValueOnce([]);

      const controller = new AbortController();
      await workflowsApi.getAll(controller.signal);

      expect(apiClient.get).toHaveBeenCalledWith('/workflows', { signal: controller.signal });
    });
  });

  describe('getById', () => {
    it('should fetch workflow by ID', async () => {
      const { apiClient } = await import('./client');
      (apiClient.get as any).mockResolvedValueOnce(mockWorkflow);

      const result = await workflowsApi.getById('workflow-1');

      expect(apiClient.get).toHaveBeenCalledWith('/workflows/workflow-1', { signal: undefined });
      expect(result).toEqual(mockWorkflow);
    });
  });

  describe('create', () => {
    it('should create a new workflow', async () => {
      const { apiClient } = await import('./client');
      (apiClient.post as any).mockResolvedValueOnce(mockWorkflow);

      const createData = {
        name: 'Test Workflow',
        nodes: [],
        edges: [],
      };

      const result = await workflowsApi.create(createData);

      expect(apiClient.post).toHaveBeenCalledWith('/workflows', createData, { signal: undefined });
      expect(result).toEqual(mockWorkflow);
    });

    it('should handle optional fields', async () => {
      const { apiClient } = await import('./client');
      (apiClient.post as any).mockResolvedValueOnce(mockWorkflow);

      const createData = {
        name: 'Full Workflow',
        description: 'With all fields',
        nodes: [],
        edges: [],
        edgeStyle: 'step',
        groups: [],
      };

      await workflowsApi.create(createData);

      expect(apiClient.post).toHaveBeenCalledWith('/workflows', createData, { signal: undefined });
    });
  });

  describe('update', () => {
    it('should update an existing workflow', async () => {
      const { apiClient } = await import('./client');
      const updatedWorkflow = { ...mockWorkflow, name: 'Updated Workflow' };
      (apiClient.put as any).mockResolvedValueOnce(updatedWorkflow);

      const updateData = { name: 'Updated Workflow' };
      const result = await workflowsApi.update('workflow-1', updateData);

      expect(apiClient.put).toHaveBeenCalledWith('/workflows/workflow-1', updateData, {
        signal: undefined,
      });
      expect(result.name).toBe('Updated Workflow');
    });

    it('should update nodes and edges', async () => {
      const { apiClient } = await import('./client');
      (apiClient.put as any).mockResolvedValueOnce(mockWorkflow);

      const updateData = {
        nodes: [
          {
            id: 'node-1',
            type: 'prompt',
            position: { x: 0, y: 0 },
            data: { label: 'Prompt', status: 'idle', prompt: '' },
          },
        ],
        edges: [],
      };

      await workflowsApi.update(
        'workflow-1',
        updateData as unknown as Parameters<typeof workflowsApi.update>[1]
      );

      expect(apiClient.put).toHaveBeenCalledWith(
        '/workflows/workflow-1',
        expect.objectContaining({
          nodes: expect.any(Array),
          edges: expect.any(Array),
        }),
        { signal: undefined }
      );
    });
  });

  describe('delete', () => {
    it('should delete a workflow', async () => {
      const { apiClient } = await import('./client');
      (apiClient.delete as any).mockResolvedValueOnce(undefined);

      await workflowsApi.delete('workflow-1');

      expect(apiClient.delete).toHaveBeenCalledWith('/workflows/workflow-1', { signal: undefined });
    });
  });

  describe('duplicate', () => {
    it('should duplicate a workflow', async () => {
      const { apiClient } = await import('./client');
      const duplicatedWorkflow = {
        ...mockWorkflow,
        _id: 'workflow-2',
        name: 'Test Workflow (Copy)',
      };
      (apiClient.post as any).mockResolvedValueOnce(duplicatedWorkflow);

      const result = await workflowsApi.duplicate('workflow-1');

      expect(apiClient.post).toHaveBeenCalledWith('/workflows/workflow-1/duplicate', undefined, {
        signal: undefined,
      });
      expect(result._id).toBe('workflow-2');
      expect(result.name).toBe('Test Workflow (Copy)');
    });
  });
});
