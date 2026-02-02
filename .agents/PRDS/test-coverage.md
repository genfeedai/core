# PRD: Comprehensive Test Coverage for Genfeed

**Status:** Done
**Target Coverage:** 80-100%
**Executor:** Ralph Loop (autonomous)

---

## Executive Summary

Add comprehensive test coverage to the content-workflow monorepo covering both the NestJS API backend and Next.js web frontend. Mock all Replicate API integrations to avoid external API costs during testing.

---

## Current State Analysis

### Existing Test Infrastructure
- **Test files:** 1 (apps/api/src/app.controller.spec.ts - basic, unmaintained)
- **Test runner:** None configured
- **Coverage tools:** None
- **Test scripts:** None in package.json

### Codebase Metrics
| Component | Location | Lines | Files to Test |
|-----------|----------|-------|---------------|
| API Backend | apps/api/src/ | ~1,859 | 15+ |
| Web Frontend | apps/web/src/ | ~2,000+ | 30+ |
| Shared Types | packages/types/src/ | ~300 | 3 |

### Replicate Integration Points (MUST MOCK)
| File | Type | Lines |
|------|------|-------|
| `apps/api/src/replicate/replicate.service.ts` | Backend Service | 291 |
| `apps/web/src/lib/replicate/client.ts` | Frontend Client | 180 |
| `apps/web/src/lib/api/replicate.ts` | API Proxy | 86 |
| `apps/web/src/app/api/replicate/[...path]/route.ts` | API Routes | ~50 |

---

## Implementation Plan

### Phase 1: Test Infrastructure Setup

#### Task 1.1: Install Test Dependencies (API)
```bash
cd apps/api
bun add -D vitest @vitest/coverage-v8 supertest @types/supertest
bun add -D @nestjs/testing mongodb-memory-server
```

**Files to create:**
- `apps/api/vitest.config.ts`
- `apps/api/src/test/setup.ts`
- `apps/api/src/test/mocks/replicate.mock.ts`

#### Task 1.2: Install Test Dependencies (Web)
```bash
cd apps/web
bun add -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom
bun add -D @testing-library/user-event jsdom msw
```

**Files to create:**
- `apps/web/vitest.config.ts`
- `apps/web/src/test/setup.ts`
- `apps/web/src/test/mocks/replicate.mock.ts`
- `apps/web/src/test/mocks/handlers.ts` (MSW)

#### Task 1.3: Add Test Scripts to package.json
```json
// Root package.json
{
  "scripts": {
    "test": "bun run --filter '*' test",
    "test:api": "bun run --filter @content-workflow/api test",
    "test:web": "bun run --filter @content-workflow/web test",
    "test:coverage": "bun run --filter '*' test:coverage"
  }
}

// apps/api/package.json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}

// apps/web/package.json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

### Phase 2: Replicate Mock Implementation

#### Task 2.1: Backend Replicate Mock
**File:** `apps/api/src/test/mocks/replicate.mock.ts`

```typescript
// Mock Replicate SDK responses
export const mockReplicateClient = {
  predictions: {
    create: vi.fn().mockResolvedValue({
      id: 'mock-prediction-id',
      status: 'starting',
      urls: { get: 'https://api.replicate.com/v1/predictions/mock-prediction-id' }
    }),
    get: vi.fn().mockResolvedValue({
      id: 'mock-prediction-id',
      status: 'succeeded',
      output: ['https://replicate.delivery/mock-output.png']
    }),
    cancel: vi.fn().mockResolvedValue({ status: 'canceled' })
  }
};

// Mock responses per model type
export const mockImageGenResponse = {
  id: 'img-prediction-123',
  status: 'succeeded',
  output: ['https://replicate.delivery/mock-image.png'],
  metrics: { predict_time: 2.5 }
};

export const mockVideoGenResponse = {
  id: 'vid-prediction-456',
  status: 'succeeded',
  output: 'https://replicate.delivery/mock-video.mp4',
  metrics: { predict_time: 15.2 }
};

export const mockLLMResponse = {
  id: 'llm-prediction-789',
  status: 'succeeded',
  output: ['Generated text response from mock LLM'],
  metrics: { input_token_count: 50, output_token_count: 100 }
};
```

#### Task 2.2: Frontend Replicate Mock (MSW)
**File:** `apps/web/src/test/mocks/handlers.ts`

```typescript
import { http, HttpResponse } from 'msw';

export const replicateHandlers = [
  // Image generation
  http.post('*/api/replicate/image', () => {
    return HttpResponse.json({
      id: 'mock-img-id',
      status: 'starting'
    });
  }),

  // Video generation
  http.post('*/api/replicate/video', () => {
    return HttpResponse.json({
      id: 'mock-vid-id',
      status: 'starting'
    });
  }),

  // LLM generation
  http.post('*/api/replicate/llm', () => {
    return HttpResponse.json({
      id: 'mock-llm-id',
      status: 'starting'
    });
  }),

  // Get prediction status
  http.get('*/api/replicate/predictions/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      status: 'succeeded',
      output: ['https://replicate.delivery/mock-output.png']
    });
  }),

  // Cancel prediction
  http.post('*/api/replicate/predictions/:id/cancel', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      status: 'canceled'
    });
  })
];
```

---

### Phase 3: Backend Unit Tests (NestJS API)

#### Task 3.1: ReplicateService Tests
**File:** `apps/api/src/replicate/replicate.service.spec.ts`

**Test cases:**
- [ ] `generateImage()` - creates prediction with correct model params
- [ ] `generateImage()` - handles nano-banana model selection
- [ ] `generateImage()` - handles nano-banana-pro model selection
- [ ] `generateVideo()` - creates video prediction with correct params
- [ ] `generateVideo()` - handles veo-fast model
- [ ] `generateVideo()` - handles veo model
- [ ] `generateLLM()` - creates LLM prediction with correct params
- [ ] `getPredictionStatus()` - returns prediction details
- [ ] `cancelPrediction()` - cancels running prediction
- [ ] `handleWebhook()` - processes completed webhook
- [ ] `handleWebhook()` - updates job status in database
- [ ] `handleWebhook()` - calculates cost correctly
- [ ] Error handling - API failures throw appropriate exceptions

#### Task 3.2: ExecutionsService Tests
**File:** `apps/api/src/executions/executions.service.spec.ts`

**Test cases:**
- [ ] `create()` - creates new execution with pending status
- [ ] `findAll()` - returns executions for workflow (excludes deleted)
- [ ] `findOne()` - returns single execution by ID
- [ ] `updateNodeResult()` - updates specific node result
- [ ] `updateStatus()` - updates execution status
- [ ] `complete()` - marks execution as completed with total cost
- [ ] `fail()` - marks execution as failed with error
- [ ] `cancel()` - marks execution as cancelled
- [ ] Soft delete - respects isDeleted filter

#### Task 3.3: WorkflowsService Tests
**File:** `apps/api/src/workflows/workflows.service.spec.ts`

**Test cases:**
- [ ] `create()` - creates new workflow
- [ ] `findAll()` - returns all workflows (excludes deleted)
- [ ] `findOne()` - returns single workflow by ID
- [ ] `update()` - updates workflow properties
- [ ] `update()` - updates workflow nodes
- [ ] `update()` - updates workflow edges
- [ ] `remove()` - soft deletes workflow (sets isDeleted: true)
- [ ] Validation - rejects invalid workflow structure

#### Task 3.4: TemplatesService Tests
**File:** `apps/api/src/templates/templates.service.spec.ts`

**Test cases:**
- [ ] `create()` - creates new template
- [ ] `findAll()` - returns all templates (excludes deleted)
- [ ] `findOne()` - returns single template by ID
- [ ] `update()` - updates template properties
- [ ] `remove()` - soft deletes template

#### Task 3.5: Controller Integration Tests
**Files:** `apps/api/src/*/\*.controller.spec.ts`

**ReplicateController tests:**
- [ ] `POST /api/replicate/image` - generates image
- [ ] `POST /api/replicate/video` - generates video
- [ ] `POST /api/replicate/llm` - generates text
- [ ] `GET /api/replicate/predictions/:id` - gets status
- [ ] `POST /api/replicate/predictions/:id/cancel` - cancels prediction
- [ ] `POST /api/replicate/webhook` - handles webhook

**ExecutionsController tests:**
- [ ] `POST /api/executions` - creates execution
- [ ] `GET /api/executions` - lists executions
- [ ] `GET /api/executions/:id` - gets single execution
- [ ] `PATCH /api/executions/:id` - updates execution

**WorkflowsController tests:**
- [ ] `POST /api/workflows` - creates workflow
- [ ] `GET /api/workflows` - lists workflows
- [ ] `GET /api/workflows/:id` - gets single workflow
- [ ] `PATCH /api/workflows/:id` - updates workflow
- [ ] `DELETE /api/workflows/:id` - soft deletes workflow

**TemplatesController tests:**
- [ ] `POST /api/templates` - creates template
- [ ] `GET /api/templates` - lists templates
- [ ] `GET /api/templates/:id` - gets single template
- [ ] `PATCH /api/templates/:id` - updates template
- [ ] `DELETE /api/templates/:id` - soft deletes template

---

### Phase 4: Frontend Unit Tests (Next.js Web)

#### Task 4.1: Zustand Store Tests
**File:** `apps/web/src/store/*.test.ts`

**useWorkflowStore tests:**
- [ ] Initial state is correct
- [ ] `addNode()` - adds node to canvas
- [ ] `removeNode()` - removes node
- [ ] `updateNodeData()` - updates node data
- [ ] `addEdge()` - connects nodes
- [ ] `removeEdge()` - disconnects nodes
- [ ] `setSelectedNode()` - selects node
- [ ] `clearSelection()` - clears selection
- [ ] `reset()` - resets to initial state

#### Task 4.2: API Client Tests
**File:** `apps/web/src/lib/api/*.test.ts`

**replicateApi tests:**
- [ ] `generateImage()` - calls correct endpoint with params
- [ ] `generateVideo()` - calls correct endpoint with params
- [ ] `generateText()` - calls correct endpoint with params
- [ ] `getPredictionStatus()` - fetches prediction status
- [ ] `cancelPrediction()` - sends cancel request
- [ ] Error handling - throws on API errors
- [ ] AbortController - respects abort signal

**workflowApi tests:**
- [ ] `create()` - creates workflow via API
- [ ] `getAll()` - fetches all workflows
- [ ] `getById()` - fetches single workflow
- [ ] `update()` - updates workflow
- [ ] `delete()` - deletes workflow

#### Task 4.3: React Component Tests
**Files:** `apps/web/src/components/*.test.tsx`

**Node Components:**
- [ ] `ImageGenNode` - renders correctly
- [ ] `ImageGenNode` - handles model selection
- [ ] `VideoGenNode` - renders correctly
- [ ] `LLMNode` - renders correctly
- [ ] `PromptNode` - renders and accepts input
- [ ] `OutputNode` - displays output correctly

**Canvas Components:**
- [ ] `WorkflowCanvas` - renders React Flow canvas
- [ ] `WorkflowCanvas` - handles node drag
- [ ] `WorkflowCanvas` - handles connection creation
- [ ] `NodePalette` - renders all node types
- [ ] `NodePalette` - drag and drop creates node

**UI Components:**
- [ ] `ExecutionPanel` - shows execution status
- [ ] `ExecutionPanel` - displays node results
- [ ] `SettingsPanel` - renders node settings
- [ ] `ToolbarActions` - run/stop/save buttons work

#### Task 4.4: Custom Hook Tests
**File:** `apps/web/src/hooks/*.test.ts`

- [ ] `useWorkflow()` - manages workflow state
- [ ] `useExecution()` - manages execution state
- [ ] `useNodeExecution()` - tracks individual node execution

---

### Phase 5: Integration Tests

#### Task 5.1: API E2E Tests
**File:** `apps/api/src/test/e2e/*.spec.ts`

**Full workflow execution test:**
- [ ] Create workflow with image gen node
- [ ] Execute workflow
- [ ] Mock Replicate responds successfully
- [ ] Verify execution status updates
- [ ] Verify job records created
- [ ] Verify cost calculated correctly

#### Task 5.2: Database Integration Tests
**File:** `apps/api/src/test/integration/*.spec.ts`

Using mongodb-memory-server:
- [ ] Execution CRUD operations
- [ ] Job CRUD operations
- [ ] Workflow CRUD operations
- [ ] Compound index queries work correctly
- [ ] Soft delete filter works

---

### Phase 6: Coverage Configuration

#### Task 6.1: Vitest Coverage Config (API)
**File:** `apps/api/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.spec.ts',
        'src/**/*.dto.ts',
        'src/**/*.schema.ts',
        'src/main.ts',
        'src/test/**'
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80
      }
    }
  }
});
```

#### Task 6.2: Vitest Coverage Config (Web)
**File:** `apps/web/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/types/**',
        'src/test/**'
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

---

## File Creation Checklist

### Test Configuration Files
- [ ] `apps/api/vitest.config.ts`
- [ ] `apps/api/src/test/setup.ts`
- [ ] `apps/web/vitest.config.ts`
- [ ] `apps/web/src/test/setup.ts`

### Mock Files
- [ ] `apps/api/src/test/mocks/replicate.mock.ts`
- [ ] `apps/api/src/test/mocks/mongoose.mock.ts`
- [ ] `apps/web/src/test/mocks/handlers.ts`
- [ ] `apps/web/src/test/mocks/server.ts`

### Backend Test Files
- [ ] `apps/api/src/replicate/replicate.service.spec.ts`
- [ ] `apps/api/src/replicate/replicate.controller.spec.ts`
- [ ] `apps/api/src/executions/executions.service.spec.ts`
- [ ] `apps/api/src/executions/executions.controller.spec.ts`
- [ ] `apps/api/src/workflows/workflows.service.spec.ts`
- [ ] `apps/api/src/workflows/workflows.controller.spec.ts`
- [ ] `apps/api/src/templates/templates.service.spec.ts`
- [ ] `apps/api/src/templates/templates.controller.spec.ts`
- [ ] `apps/api/src/test/e2e/workflow-execution.spec.ts`

### Frontend Test Files
- [ ] `apps/web/src/store/workflow.store.test.ts`
- [ ] `apps/web/src/lib/api/replicate.test.ts`
- [ ] `apps/web/src/lib/api/workflows.test.ts`
- [ ] `apps/web/src/components/nodes/ImageGenNode.test.tsx`
- [ ] `apps/web/src/components/nodes/VideoGenNode.test.tsx`
- [ ] `apps/web/src/components/nodes/LLMNode.test.tsx`
- [ ] `apps/web/src/components/canvas/WorkflowCanvas.test.tsx`
- [ ] `apps/web/src/components/panels/ExecutionPanel.test.tsx`

---

## Execution Order

```
Phase 1: Infrastructure Setup (Tasks 1.1 → 1.2 → 1.3)
    ↓
Phase 2: Replicate Mocks (Tasks 2.1 → 2.2)
    ↓
Phase 3: Backend Tests (Tasks 3.1 → 3.2 → 3.3 → 3.4 → 3.5)
    ↓
Phase 4: Frontend Tests (Tasks 4.1 → 4.2 → 4.3 → 4.4)
    ↓
Phase 5: Integration Tests (Tasks 5.1 → 5.2)
    ↓
Phase 6: Coverage Thresholds (Tasks 6.1 → 6.2)
```

---

## Success Criteria

1. **Coverage thresholds met:**
   - Statements: ≥80%
   - Branches: ≥80%
   - Functions: ≥80%
   - Lines: ≥80%

2. **All Replicate calls mocked:**
   - No real API calls during tests
   - Zero cost from test runs

3. **Tests pass in CI:**
   - All unit tests green
   - All integration tests green
   - Coverage report generated

4. **Test scripts functional:**
   - `bun run test` works from root
   - `bun run test:coverage` generates reports

---

## Notes for Ralph Loop

- Execute phases sequentially (infrastructure must come first)
- Run `bun run test` after each phase to verify
- Check coverage after Phase 6 with `bun run test:coverage`
- If coverage < 80%, add more tests to uncovered files
- Prioritize service tests over controller tests (more logic)
- Use mongodb-memory-server for database tests (no external DB)
