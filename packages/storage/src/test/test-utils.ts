import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import type { Model } from 'mongoose';
import { vi } from 'vitest';
import type {
  CreateExecutionData,
  ExecutionEntity,
  NodeResultData,
} from '../entities/execution.entity';
import type {
  CreatePromptData,
  PromptLibraryItemEntity,
  StyleSettingsData,
} from '../entities/prompt-library.entity';
import type { CreateTemplateData, TemplateEntity } from '../entities/template.entity';
import type {
  CreateWorkflowData,
  NodeGroupEntity,
  WorkflowEdgeEntity,
  WorkflowEntity,
  WorkflowNodeEntity,
} from '../entities/workflow.entity';

// Schema creation SQL
export const WORKFLOW_SCHEMA = `
  CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    version INTEGER DEFAULT 1,
    nodes TEXT DEFAULT '[]',
    edges TEXT DEFAULT '[]',
    edge_style TEXT DEFAULT 'smoothstep',
    groups TEXT DEFAULT '[]',
    is_deleted INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`;

export const EXECUTION_SCHEMA = `
  CREATE TABLE IF NOT EXISTS executions (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    started_at TEXT,
    completed_at TEXT,
    total_cost REAL DEFAULT 0,
    cost_summary TEXT DEFAULT '{}',
    node_results TEXT DEFAULT '[]',
    error TEXT,
    is_deleted INTEGER DEFAULT 0,
    execution_mode TEXT DEFAULT 'async',
    queue_job_ids TEXT DEFAULT '[]',
    resumed_from TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`;

export const TEMPLATE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT DEFAULT 'general',
    nodes TEXT DEFAULT '[]',
    edges TEXT DEFAULT '[]',
    thumbnail TEXT,
    is_system INTEGER DEFAULT 0,
    is_deleted INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`;

export const PROMPT_LIBRARY_SCHEMA = `
  CREATE TABLE IF NOT EXISTS prompt_library (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    prompt_text TEXT NOT NULL,
    style_settings TEXT DEFAULT '{}',
    aspect_ratio TEXT DEFAULT '16:9',
    preferred_model TEXT,
    category TEXT DEFAULT 'general',
    tags TEXT DEFAULT '[]',
    use_count INTEGER DEFAULT 0,
    is_featured INTEGER DEFAULT 0,
    thumbnail TEXT,
    is_deleted INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`;

/**
 * Create an in-memory SQLite database for testing
 */
export function createTestDatabase(...schemas: string[]): Database.Database {
  const db = new Database(':memory:');
  for (const schema of schemas) {
    db.exec(schema);
  }
  return db;
}

// Entity Factories

/**
 * Create a test workflow node
 */
export function createTestNode(overrides: Partial<WorkflowNodeEntity> = {}): WorkflowNodeEntity {
  return {
    id: randomUUID(),
    type: 'imageGen',
    position: { x: 100, y: 100 },
    data: {},
    ...overrides,
  };
}

/**
 * Create a test workflow edge
 */
export function createTestEdge(
  source: string,
  target: string,
  overrides: Partial<WorkflowEdgeEntity> = {}
): WorkflowEdgeEntity {
  return {
    id: randomUUID(),
    source,
    target,
    sourceHandle: 'output',
    targetHandle: 'input',
    ...overrides,
  };
}

/**
 * Create a test node group
 */
export function createTestGroup(
  nodeIds: string[],
  overrides: Partial<NodeGroupEntity> = {}
): NodeGroupEntity {
  return {
    id: randomUUID(),
    name: 'Test Group',
    nodeIds,
    isLocked: false,
    color: 'blue',
    collapsed: false,
    ...overrides,
  };
}

/**
 * Create test workflow data for creation
 */
export function createTestWorkflowData(
  overrides: Partial<CreateWorkflowData> = {}
): CreateWorkflowData {
  return {
    name: `Test Workflow ${Date.now()}`,
    description: 'A test workflow',
    nodes: [],
    edges: [],
    edgeStyle: 'smoothstep',
    groups: [],
    ...overrides,
  };
}

/**
 * Create a test workflow entity
 */
export function createTestWorkflowEntity(overrides: Partial<WorkflowEntity> = {}): WorkflowEntity {
  const now = new Date();
  return {
    id: randomUUID(),
    name: `Test Workflow ${Date.now()}`,
    description: 'A test workflow',
    version: 1,
    nodes: [],
    edges: [],
    edgeStyle: 'smoothstep',
    groups: [],
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create test node result data
 */
export function createTestNodeResult(
  nodeId: string,
  overrides: Partial<NodeResultData> = {}
): NodeResultData {
  return {
    nodeId,
    status: 'pending',
    ...overrides,
  };
}

/**
 * Create test execution data for creation
 */
export function createTestExecutionData(
  workflowId: string,
  overrides: Partial<CreateExecutionData> = {}
): CreateExecutionData {
  return {
    workflowId,
    executionMode: 'async',
    ...overrides,
  };
}

/**
 * Create a test execution entity
 */
export function createTestExecutionEntity(
  overrides: Partial<ExecutionEntity> = {}
): ExecutionEntity {
  const now = new Date();
  return {
    id: randomUUID(),
    workflowId: randomUUID(),
    status: 'pending',
    totalCost: 0,
    costSummary: {},
    nodeResults: [],
    isDeleted: false,
    executionMode: 'async',
    queueJobIds: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create test template data for creation
 */
export function createTestTemplateData(
  overrides: Partial<CreateTemplateData> = {}
): CreateTemplateData {
  return {
    name: `Test Template ${Date.now()}`,
    description: 'A test template',
    category: 'general',
    nodes: [],
    edges: [],
    isSystem: false,
    ...overrides,
  };
}

/**
 * Create a test template entity
 */
export function createTestTemplateEntity(overrides: Partial<TemplateEntity> = {}): TemplateEntity {
  const now = new Date();
  return {
    id: randomUUID(),
    name: `Test Template ${Date.now()}`,
    description: 'A test template',
    category: 'general',
    nodes: [],
    edges: [],
    isSystem: false,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create test style settings
 */
export function createTestStyleSettings(
  overrides: Partial<StyleSettingsData> = {}
): StyleSettingsData {
  return {
    mood: 'cinematic',
    style: 'photorealistic',
    camera: 'wide angle',
    lighting: 'natural',
    scene: 'outdoor',
    ...overrides,
  };
}

/**
 * Create test prompt data for creation
 */
export function createTestPromptData(overrides: Partial<CreatePromptData> = {}): CreatePromptData {
  return {
    name: `Test Prompt ${Date.now()}`,
    description: 'A test prompt',
    promptText: 'A beautiful sunset over the ocean',
    styleSettings: createTestStyleSettings(),
    aspectRatio: '16:9',
    category: 'nature',
    tags: ['sunset', 'ocean'],
    isFeatured: false,
    ...overrides,
  };
}

/**
 * Create a test prompt library item entity
 */
export function createTestPromptEntity(
  overrides: Partial<PromptLibraryItemEntity> = {}
): PromptLibraryItemEntity {
  const now = new Date();
  return {
    id: randomUUID(),
    name: `Test Prompt ${Date.now()}`,
    description: 'A test prompt',
    promptText: 'A beautiful sunset over the ocean',
    styleSettings: createTestStyleSettings(),
    aspectRatio: '16:9',
    preferredModel: undefined,
    category: 'nature',
    tags: ['sunset', 'ocean'],
    useCount: 0,
    isFeatured: false,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// MongoDB Mock Utilities

interface MockDocument {
  _id: string;
  save: ReturnType<typeof vi.fn>;
  [key: string]: unknown;
}

interface MockQuery<T> {
  exec: ReturnType<typeof vi.fn>;
  sort: ReturnType<typeof vi.fn>;
  skip: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  _result: T | T[] | null;
}

/**
 * Create a mock Mongoose query that chains sort/skip/limit/exec
 */
export function createMockQuery<T>(result: T | T[] | null): MockQuery<T> {
  const query: MockQuery<T> = {
    _result: result,
    exec: vi.fn().mockResolvedValue(result),
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  };
  return query;
}

/**
 * Create a mock Mongoose Model for testing MongoDB repositories
 */
export function createMockModel<T extends Record<string, unknown>>(): Model<T> & {
  _docs: MockDocument[];
  _addDoc: (doc: Partial<T>) => MockDocument;
  _reset: () => void;
} {
  const docs: MockDocument[] = [];

  const createMockDoc = (data: Partial<T>): MockDocument => {
    const now = new Date();
    const doc: MockDocument = {
      _id: (data._id as string) ?? randomUUID(),
      ...data,
      isDeleted: (data.isDeleted as boolean) ?? false,
      createdAt: (data.createdAt as Date) ?? now,
      updatedAt: (data.updatedAt as Date) ?? now,
      save: vi.fn().mockImplementation(async function (this: MockDocument) {
        return this;
      }),
    };
    return doc;
  };

  // Constructor for new Model(data)
  const MockModel = vi.fn().mockImplementation((data: Partial<T>) => {
    const doc = createMockDoc(data);
    docs.push(doc);
    return doc;
  }) as unknown as Model<T> & {
    _docs: MockDocument[];
    _addDoc: (doc: Partial<T>) => MockDocument;
    _reset: () => void;
  };

  // findOne
  MockModel.findOne = vi.fn().mockImplementation((filter: Record<string, unknown>) => {
    const doc = docs.find((d) => {
      if (filter._id && d._id !== filter._id) return false;
      if (filter.isDeleted !== undefined && d.isDeleted !== filter.isDeleted) return false;
      for (const [key, value] of Object.entries(filter)) {
        if (key === '_id' || key === 'isDeleted') continue;
        if (d[key] !== value) return false;
      }
      return true;
    });
    return createMockQuery(doc ?? null);
  });

  // find
  MockModel.find = vi.fn().mockImplementation((filter: Record<string, unknown>) => {
    const filtered = docs.filter((d) => {
      if (filter.isDeleted !== undefined && d.isDeleted !== filter.isDeleted) return false;
      for (const [key, value] of Object.entries(filter)) {
        if (key === 'isDeleted') continue;
        if (key === '$text') continue; // Skip text search in mock
        if (d[key] !== value) return false;
      }
      return true;
    });
    return createMockQuery(filtered);
  });

  // findOneAndUpdate
  MockModel.findOneAndUpdate = vi
    .fn()
    .mockImplementation(
      (
        filter: Record<string, unknown>,
        update: { $set?: Partial<T> },
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
        return createMockQuery(options?.new ? doc : null);
      }
    );

  // deleteOne
  MockModel.deleteOne = vi.fn().mockImplementation((filter: Record<string, unknown>) => {
    const index = docs.findIndex((d) => d._id === filter._id);
    const deleted = index >= 0;
    if (deleted) docs.splice(index, 1);
    return { exec: vi.fn().mockResolvedValue({ deletedCount: deleted ? 1 : 0 }) };
  });

  // countDocuments
  MockModel.countDocuments = vi.fn().mockImplementation((filter: Record<string, unknown>) => {
    const count = docs.filter((d) => {
      if (filter.isDeleted !== undefined && d.isDeleted !== filter.isDeleted) return false;
      for (const [key, value] of Object.entries(filter)) {
        if (key === 'isDeleted') continue;
        if (d[key] !== value) return false;
      }
      return true;
    }).length;
    return { exec: vi.fn().mockResolvedValue(count) };
  });

  // Helper to add pre-existing docs
  MockModel._docs = docs;
  MockModel._addDoc = (data: Partial<T>) => {
    const doc = createMockDoc(data);
    docs.push(doc);
    return doc;
  };
  MockModel._reset = () => {
    docs.length = 0;
    vi.clearAllMocks();
  };

  return MockModel;
}
