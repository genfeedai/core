import { Types } from 'mongoose';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

// Type for mongoose model mock methods
export interface MockModelMethods {
  find: Mock;
  findOne: Mock;
  findById: Mock;
  findByIdAndUpdate: Mock;
  findOneAndUpdate: Mock;
  create: Mock;
  deleteOne: Mock;
  deleteMany: Mock;
  updateOne: Mock;
}

// Type for constructable mock model (can be called with new or as function)
export type MockModel = Mock & MockModelMethods;

// Create a constructable mock model with proper typing
export function createConstructableMockModel<T>(
  baseMethods: Partial<MockModelMethods>,
  instanceFactory: () => T
): MockModel {
  // Must use regular function (not arrow) so vi.fn() mock is constructable with `new`
  const mockModel = vi.fn().mockImplementation(function () {
    return instanceFactory();
  }) as MockModel;
  Object.assign(mockModel, baseMethods);
  return mockModel;
}

// Helper to create ObjectId
export function createObjectId(): Types.ObjectId {
  return new Types.ObjectId();
}

// Mock execution document
export function createMockExecution(overrides = {}) {
  return {
    _id: createObjectId(),
    completedAt: null,
    createdAt: new Date(),
    error: null,
    isDeleted: false,
    nodeResults: [],
    save: vi.fn().mockImplementation(function (this: unknown) {
      return Promise.resolve(this);
    }),
    startedAt: new Date(),
    status: 'pending',
    totalCost: 0,
    updatedAt: new Date(),
    workflowId: createObjectId(),
    ...overrides,
  };
}

// Mock job document
export function createMockJob(overrides = {}) {
  return {
    _id: createObjectId(),
    cost: 0,
    createdAt: new Date(),
    error: null,
    executionId: createObjectId(),
    nodeId: 'node-1',
    output: null,
    predictionId: 'prediction-123',
    progress: 0,
    save: vi.fn().mockImplementation(function (this: unknown) {
      return Promise.resolve(this);
    }),
    status: 'pending',
    updatedAt: new Date(),
    ...overrides,
  };
}

// Mock workflow document
export function createMockWorkflow(overrides = {}) {
  return {
    _id: createObjectId(),
    createdAt: new Date(),
    description: 'A test workflow',
    edgeStyle: 'bezier',
    edges: [],
    isDeleted: false,
    name: 'Test Workflow',
    nodes: [],
    save: vi.fn().mockImplementation(function (this: unknown) {
      return Promise.resolve(this);
    }),
    updatedAt: new Date(),
    ...overrides,
  };
}

// Mock template document
export function createMockTemplate(overrides = {}) {
  return {
    _id: createObjectId(),
    category: 'custom',
    createdAt: new Date(),
    description: 'A test template',
    edgeStyle: 'bezier',
    edges: [],
    isDeleted: false,
    isSystem: false,
    name: 'Test Template',
    nodes: [],
    save: vi.fn().mockImplementation(function (this: unknown) {
      return Promise.resolve(this);
    }),
    updatedAt: new Date(),
    ...overrides,
  };
}

// Create mock Mongoose model
export function createMockModel<T>(documents: T[] = []) {
  const findMock = vi.fn().mockReturnValue({
    exec: vi.fn().mockResolvedValue(documents),
    sort: vi.fn().mockReturnThis(),
  });

  const findOneMock = vi.fn().mockReturnValue({
    exec: vi.fn().mockResolvedValue(documents[0] || null),
  });

  const findByIdAndUpdateMock = vi.fn().mockReturnValue({
    exec: vi.fn().mockResolvedValue(documents[0] || null),
  });

  const findOneAndUpdateMock = vi.fn().mockReturnValue({
    exec: vi.fn().mockResolvedValue(documents[0] || null),
  });

  return {
    create: vi.fn().mockImplementation((doc) => Promise.resolve({ ...doc, _id: createObjectId() })),
    deleteMany: vi.fn().mockResolvedValue({ deletedCount: documents.length }),
    deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 }),
    find: findMock,
    findById: vi.fn().mockReturnValue({
      exec: vi.fn().mockResolvedValue(documents[0] || null),
    }),
    findByIdAndUpdate: findByIdAndUpdateMock,
    findOne: findOneMock,
    findOneAndUpdate: findOneAndUpdateMock,
  };
}
