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
  const mockModel = vi.fn().mockImplementation(instanceFactory) as MockModel;
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
    workflowId: createObjectId(),
    status: 'pending',
    startedAt: new Date(),
    completedAt: null,
    totalCost: 0,
    nodeResults: [],
    error: null,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: vi.fn().mockImplementation(function (this: unknown) {
      return Promise.resolve(this);
    }),
    ...overrides,
  };
}

// Mock job document
export function createMockJob(overrides = {}) {
  return {
    _id: createObjectId(),
    executionId: createObjectId(),
    nodeId: 'node-1',
    predictionId: 'prediction-123',
    status: 'pending',
    progress: 0,
    output: null,
    error: null,
    cost: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: vi.fn().mockImplementation(function (this: unknown) {
      return Promise.resolve(this);
    }),
    ...overrides,
  };
}

// Mock workflow document
export function createMockWorkflow(overrides = {}) {
  return {
    _id: createObjectId(),
    name: 'Test Workflow',
    description: 'A test workflow',
    nodes: [],
    edges: [],
    edgeStyle: 'bezier',
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: vi.fn().mockImplementation(function (this: unknown) {
      return Promise.resolve(this);
    }),
    ...overrides,
  };
}

// Mock template document
export function createMockTemplate(overrides = {}) {
  return {
    _id: createObjectId(),
    name: 'Test Template',
    description: 'A test template',
    category: 'custom',
    nodes: [],
    edges: [],
    edgeStyle: 'bezier',
    isSystem: false,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: vi.fn().mockImplementation(function (this: unknown) {
      return Promise.resolve(this);
    }),
    ...overrides,
  };
}

// Create mock Mongoose model
export function createMockModel<T>(documents: T[] = []) {
  const findMock = vi.fn().mockReturnValue({
    sort: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(documents),
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
    find: findMock,
    findOne: findOneMock,
    findById: vi.fn().mockReturnValue({
      exec: vi.fn().mockResolvedValue(documents[0] || null),
    }),
    findByIdAndUpdate: findByIdAndUpdateMock,
    findOneAndUpdate: findOneAndUpdateMock,
    create: vi.fn().mockImplementation((doc) => Promise.resolve({ ...doc, _id: createObjectId() })),
    deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 }),
    deleteMany: vi.fn().mockResolvedValue({ deletedCount: documents.length }),
  };
}
