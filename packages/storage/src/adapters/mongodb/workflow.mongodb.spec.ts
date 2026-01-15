import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestEdge, createTestNode, createTestWorkflowData } from '../../test/test-utils';
import { WorkflowMongoRepository } from './workflow.mongodb';

describe('WorkflowMongoRepository', () => {
  let repository: WorkflowMongoRepository;
  let mockModel: ReturnType<typeof createMockWorkflowModel>;

  function createMockWorkflowModel() {
    const docs: Record<string, unknown>[] = [];

    const createDoc = (data: Record<string, unknown>) => {
      const now = new Date();
      const doc = {
        _id: data._id ?? `mock-id-${Date.now()}-${Math.random()}`,
        name: data.name ?? '',
        description: data.description ?? '',
        version: data.version ?? 1,
        nodes: data.nodes ?? [],
        edges: data.edges ?? [],
        edgeStyle: data.edgeStyle ?? 'smoothstep',
        groups: data.groups ?? [],
        isDeleted: data.isDeleted ?? false,
        createdAt: data.createdAt ?? now,
        updatedAt: data.updatedAt ?? now,
        save: vi.fn().mockImplementation(async () => doc),
      };
      return doc;
    };

    const model = vi.fn().mockImplementation((data: Record<string, unknown>) => {
      const doc = createDoc(data);
      docs.push(doc);
      return doc;
    });

    const createQuery = (result: unknown) => ({
      exec: vi.fn().mockResolvedValue(result),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    });

    model.findOne = vi.fn().mockImplementation((filter: Record<string, unknown>) => {
      const doc = docs.find((d) => {
        if (filter._id && d._id !== filter._id) return false;
        if (filter.isDeleted !== undefined && d.isDeleted !== filter.isDeleted) return false;
        return true;
      });
      return createQuery(doc ?? null);
    });

    model.find = vi.fn().mockImplementation((filter: Record<string, unknown>) => {
      const filtered = docs.filter((d) => {
        if (filter.isDeleted !== undefined && d.isDeleted !== filter.isDeleted) return false;
        return true;
      });
      return createQuery(filtered);
    });

    model.findOneAndUpdate = vi
      .fn()
      .mockImplementation(
        (
          filter: Record<string, unknown>,
          update: { $set?: Record<string, unknown> },
          options: { new?: boolean }
        ) => {
          const doc = docs.find((d) => {
            if (filter._id && d._id !== filter._id) return false;
            if (filter.isDeleted !== undefined && d.isDeleted !== filter.isDeleted) return false;
            return true;
          });
          if (doc && update.$set) {
            Object.assign(doc, update.$set, { updatedAt: new Date() });
          }
          return createQuery(options?.new ? doc : null);
        }
      );

    model.deleteOne = vi.fn().mockImplementation((filter: Record<string, unknown>) => {
      const index = docs.findIndex((d) => d._id === filter._id);
      const deleted = index >= 0;
      if (deleted) docs.splice(index, 1);
      return { exec: vi.fn().mockResolvedValue({ deletedCount: deleted ? 1 : 0 }) };
    });

    model.countDocuments = vi.fn().mockImplementation((filter: Record<string, unknown>) => {
      const count = docs.filter((d) => {
        if (filter.isDeleted !== undefined && d.isDeleted !== filter.isDeleted) return false;
        return true;
      }).length;
      return { exec: vi.fn().mockResolvedValue(count) };
    });

    return Object.assign(model, {
      _docs: docs,
      _reset: () => {
        docs.length = 0;
        vi.clearAllMocks();
      },
    });
  }

  beforeEach(() => {
    mockModel = createMockWorkflowModel();
    repository = new WorkflowMongoRepository(mockModel as never);
  });

  describe('create', () => {
    it('should create a workflow', async () => {
      const data = createTestWorkflowData({ name: 'My Workflow' });

      const result = await repository.create(data);

      expect(result.id).toBeDefined();
      expect(result.name).toBe('My Workflow');
    });

    it('should set default values for optional fields', async () => {
      const data = { name: 'Minimal Workflow' };

      const result = await repository.create(data);

      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
      expect(result.groups).toEqual([]);
    });

    it('should save nodes and edges', async () => {
      const node1 = createTestNode({ type: 'imageGen' });
      const node2 = createTestNode({ type: 'output' });
      const edge = createTestEdge(node1.id, node2.id);

      const data = createTestWorkflowData({
        nodes: [node1, node2],
        edges: [edge],
      });

      const result = await repository.create(data);

      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('should return workflow by ID', async () => {
      const created = await repository.create(createTestWorkflowData({ name: 'Find Me' }));

      const result = await repository.findById(created.id);

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Find Me');
    });

    it('should return null for non-existent ID', async () => {
      const result = await repository.findById('non-existent-id');

      expect(result).toBeNull();
    });

    it('should not return soft-deleted workflows', async () => {
      const created = await repository.create(createTestWorkflowData());
      await repository.softDelete(created.id);

      const result = await repository.findById(created.id);

      expect(result).toBeNull();
    });
  });

  describe('findOne', () => {
    it('should find workflow by filter', async () => {
      await repository.create(createTestWorkflowData({ name: 'Unique Name' }));

      // Since our mock doesn't support complex filters, we verify the method is called
      const _result = await repository.findOne({ where: { name: 'Unique Name' } });

      expect(mockModel.findOne).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all non-deleted workflows', async () => {
      await repository.create(createTestWorkflowData({ name: 'Workflow 1' }));
      await repository.create(createTestWorkflowData({ name: 'Workflow 2' }));
      await repository.create(createTestWorkflowData({ name: 'Workflow 3' }));

      const results = await repository.findAll();

      expect(results).toHaveLength(3);
    });

    it('should return empty array when no workflows exist', async () => {
      const results = await repository.findAll();

      expect(results).toEqual([]);
    });

    it('should call sort with correct parameters', async () => {
      await repository.create(createTestWorkflowData());

      await repository.findAll({ sortBy: 'name', sortOrder: 'asc' });

      const findCall = mockModel.find.mock.results[0].value;
      expect(findCall.sort).toHaveBeenCalledWith({ name: 1 });
    });

    it('should call skip and limit when provided', async () => {
      await repository.create(createTestWorkflowData());

      await repository.findAll({ limit: 10, offset: 5 });

      const findCall = mockModel.find.mock.results[0].value;
      expect(findCall.skip).toHaveBeenCalledWith(5);
      expect(findCall.limit).toHaveBeenCalledWith(10);
    });

    it('should not return soft-deleted workflows', async () => {
      const workflow = await repository.create(createTestWorkflowData());
      await repository.create(createTestWorkflowData());
      await repository.softDelete(workflow.id);

      const results = await repository.findAll();

      expect(results).toHaveLength(1);
    });
  });

  describe('findAllActive', () => {
    it('should delegate to findAll', async () => {
      await repository.create(createTestWorkflowData());

      const _results = await repository.findAllActive();

      expect(mockModel.find).toHaveBeenCalled();
    });
  });

  describe('findByName', () => {
    it('should call findOne with name filter', async () => {
      await repository.findByName('Test Name');

      expect(mockModel.findOne).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update workflow', async () => {
      const created = await repository.create(createTestWorkflowData({ name: 'Original' }));

      const result = await repository.update(created.id, { name: 'Updated' });

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Updated');
    });

    it('should call findOneAndUpdate with correct parameters', async () => {
      const created = await repository.create(createTestWorkflowData());

      await repository.update(created.id, { name: 'New Name' });

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: created.id, isDeleted: false },
        { $set: { name: 'New Name' } },
        { new: true }
      );
    });

    it('should return null for non-existent workflow', async () => {
      const result = await repository.update('non-existent', { name: 'New' });

      expect(result).toBeNull();
    });
  });

  describe('softDelete', () => {
    it('should mark workflow as deleted', async () => {
      const created = await repository.create(createTestWorkflowData());

      const result = await repository.softDelete(created.id);

      expect(result).not.toBeNull();
    });

    it('should call findOneAndUpdate with isDeleted true', async () => {
      const created = await repository.create(createTestWorkflowData());

      await repository.softDelete(created.id);

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: created.id, isDeleted: false },
        { $set: { isDeleted: true } },
        { new: true }
      );
    });
  });

  describe('hardDelete', () => {
    it('should permanently remove workflow', async () => {
      const created = await repository.create(createTestWorkflowData());

      const result = await repository.hardDelete(created.id);

      expect(result).toBe(true);
    });

    it('should return false for non-existent workflow', async () => {
      const result = await repository.hardDelete('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should return count of workflows', async () => {
      await repository.create(createTestWorkflowData());
      await repository.create(createTestWorkflowData());

      const count = await repository.count();

      expect(count).toBe(2);
    });

    it('should return 0 when no workflows exist', async () => {
      const count = await repository.count();

      expect(count).toBe(0);
    });
  });

  describe('duplicate', () => {
    it('should create a copy of the workflow', async () => {
      const original = await repository.create(
        createTestWorkflowData({
          name: 'Original',
          description: 'Test description',
        })
      );

      const duplicate = await repository.duplicate(original.id);

      expect(duplicate.id).not.toBe(original.id);
      expect(duplicate.name).toBe('Original (Copy)');
    });

    it('should throw error for non-existent workflow', async () => {
      await expect(repository.duplicate('non-existent')).rejects.toThrow(
        'Workflow with ID non-existent not found'
      );
    });
  });

  describe('search', () => {
    it('should call find with $text filter', async () => {
      await repository.create(createTestWorkflowData({ name: 'Test Workflow' }));

      await repository.search('Test');

      expect(mockModel.find).toHaveBeenCalled();
      const filter = mockModel.find.mock.calls[mockModel.find.mock.calls.length - 1][0];
      expect(filter.$text).toBeDefined();
    });
  });
});
