# Perf & DRY Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate pricing drift, reduce payload size, tighten webhook security, remove server SDKs from client bundles, and improve query/index performance in a single batch.

**Architecture:** Centralize pricing/cost logic in `@genfeedai/core`, make workflow listing a summary response, add pagination/indexes for executions, and harden Replicate webhook auth. UI updates consume new summary and shared cost utilities.

**Tech Stack:** Next.js 16, NestJS 11, MongoDB/Mongoose, Bun, Vitest, Biome

---

### Task 1: Add shared cost utilities in `@genfeedai/core`

**Files:**
- Create: `packages/core/src/cost.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/src/__tests__/cost.test.ts`

**Step 1: Write failing test**
```ts
import { describe, expect, it } from 'vitest';
import { calculateWorkflowCost, calculateWorkflowCostWithBreakdown } from '../cost';

describe('cost utils', () => {
  it('calculates image and video costs from node data', () => {
    const nodes = [
      { id: '1', type: 'imageGen', data: { model: 'nano-banana' } },
      { id: '2', type: 'videoGen', data: { model: 'veo-3.1-fast', duration: 4, generateAudio: true } },
    ];
    const total = calculateWorkflowCost(nodes);
    expect(total).toBeGreaterThan(0);

    const { breakdown } = calculateWorkflowCostWithBreakdown(nodes);
    expect(breakdown).toHaveLength(2);
  });
});
```

**Step 2: Run test to verify it fails**
Run: `bun run --filter @genfeedai/core test`  
Expected: FAIL (missing cost utils)

**Step 3: Write minimal implementation**
- Add cost helpers (image/video/luma/topaz) in `packages/core/src/cost.ts` using `PRICING` and node type constants.
- Export from `packages/core/src/index.ts`.

**Step 4: Run test to verify it passes**
Run: `bun run --filter @genfeedai/core test`  
Expected: PASS

**Step 5: Commit**
```bash
git add packages/core/src/cost.ts packages/core/src/index.ts packages/core/src/__tests__/cost.test.ts
 git commit -m "feat(core): add shared cost utilities"
```

---

### Task 2: Remove web pricing duplication + use shared cost utils

**Files:**
- Modify: `apps/web/src/components/toolbar/Toolbar.tsx`
- Modify: `apps/web/src/store/workflow/slices/persistenceSlice.ts`
- Modify: `apps/web/src/components/cost/CostBreakdownTab.tsx`
- Modify/Delete: `apps/web/src/lib/replicate/client.ts` (remove PRICING + cost functions)
- Test: `apps/web/src/lib/replicate/client.test.ts` (update imports if needed)

**Step 1: Write failing test (if needed)**
- Update an existing web test to import `PRICING` from `@genfeedai/core` and ensure it renders pricing reference.

**Step 2: Run test to verify it fails**
Run: `bun run --filter @genfeedai/web test`  
Expected: FAIL (imports not updated)

**Step 3: Implement minimal changes**
- Replace `calculateWorkflowCost`/`calculateWorkflowCostWithBreakdown` imports to `@genfeedai/core`.
- Replace `PRICING` import to `@genfeedai/core`.
- Remove cost helpers/PRICING from `apps/web/src/lib/replicate/client.ts`.

**Step 4: Run test to verify it passes**
Run: `bun run --filter @genfeedai/web test`  
Expected: PASS

**Step 5: Commit**
```bash
git add apps/web/src/components/toolbar/Toolbar.tsx \
  apps/web/src/store/workflow/slices/persistenceSlice.ts \
  apps/web/src/components/cost/CostBreakdownTab.tsx \
  apps/web/src/lib/replicate/client.ts \
  apps/web/src/lib/replicate/client.test.ts
 git commit -m "refactor(web): use shared cost utils"
```

---

### Task 3: Split Replicate SDK into server-only module

**Files:**
- Create: `apps/web/src/lib/replicate/server.ts`
- Modify: `apps/web/src/app/api/replicate/*/route.ts`
- Modify: `apps/web/src/app/api/status/[id]/route.ts`
- Modify: `apps/web/src/lib/replicate/client.ts` (strip SDK usage)

**Step 1: Write failing test**
- Update an API route test to import from `server.ts` and ensure no client SDK import exists.

**Step 2: Run test to verify it fails**
Run: `bun run --filter @genfeedai/web test`

**Step 3: Implement minimal changes**
- Move Replicate SDK init + generateImage/generateVideo/generateText/generateLipSync/getPredictionStatus/cancelPrediction into `server.ts` with `import 'server-only'`.
- Update API route handlers to import from `server.ts`.

**Step 4: Run test to verify it passes**
Run: `bun run --filter @genfeedai/web test`

**Step 5: Commit**
```bash
git add apps/web/src/lib/replicate/server.ts \
  apps/web/src/lib/replicate/client.ts \
  apps/web/src/app/api/replicate/image/route.ts \
  apps/web/src/app/api/replicate/video/route.ts \
  apps/web/src/app/api/replicate/lipsync/route.ts \
  apps/web/src/app/api/replicate/llm/route.ts \
  apps/web/src/app/api/status/[id]/route.ts
 git commit -m "refactor(web): isolate Replicate SDK to server module"
```

---

### Task 4: Harden Replicate webhook security

**Files:**
- Modify: `apps/web/src/app/api/replicate/webhook/route.ts`
- Modify: `apps/web/src/app/api/replicate/image/route.ts`
- Modify: `apps/web/src/app/api/replicate/video/route.ts`
- Modify: `apps/web/src/app/api/replicate/lipsync/route.ts`
- Add/Modify: `apps/web/src/lib/replicate/webhook.ts` (helper to build URL)
- Test: `apps/web/src/app/api/replicate/webhook/route.test.ts`

**Step 1: Write failing test**
- Add test: webhook returns 401 when missing secret, 200 when correct.

**Step 2: Run test to verify it fails**
Run: `bun run --filter @genfeedai/web test`

**Step 3: Implement minimal changes**
- Create helper to build webhook URL including `?token=` from `REPLICATE_WEBHOOK_SECRET`.
- Enforce token check in webhook route (401 on mismatch).
- Only set webhook URL when secret exists.

**Step 4: Run test to verify it passes**
Run: `bun run --filter @genfeedai/web test`

**Step 5: Commit**
```bash
git add apps/web/src/app/api/replicate/webhook/route.ts \
  apps/web/src/app/api/replicate/image/route.ts \
  apps/web/src/app/api/replicate/video/route.ts \
  apps/web/src/app/api/replicate/lipsync/route.ts \
  apps/web/src/lib/replicate/webhook.ts \
  apps/web/src/app/api/replicate/webhook/route.test.ts
 git commit -m "fix(web): verify replicate webhook secret"
```

---

### Task 5: Workflow list summary payload + UI updates

**Files:**
- Modify: `apps/api/src/services/workflows.service.ts`
- Modify: `apps/api/src/controllers/workflows.controller.ts`
- Modify: `apps/web/src/lib/api/workflows.ts`
- Modify: `apps/web/src/store/workflow/slices/persistenceSlice.ts`
- Modify: `apps/web/src/components/workflow/WorkflowSwitcher.tsx`
- Test: `apps/api/src/services/workflows.service.spec.ts`
- Test: `apps/web/src/lib/api/workflows.test.ts`

**Step 1: Write failing test**
- Update web/api tests to expect summary shape from list endpoint.

**Step 2: Run test to verify it fails**
Run: `bun run --filter @genfeedai/api test` and `bun run --filter @genfeedai/web test`

**Step 3: Implement minimal changes**
- Update `findAll` to `.select()` summary fields + `.lean()`.
- Update web type to `WorkflowSummary` and adjust `WorkflowSwitcher` usage.

**Step 4: Run tests to verify they pass**
Run: `bun run --filter @genfeedai/api test` and `bun run --filter @genfeedai/web test`

**Step 5: Commit**
```bash
git add apps/api/src/services/workflows.service.ts \
  apps/api/src/controllers/workflows.controller.ts \
  apps/web/src/lib/api/workflows.ts \
  apps/web/src/store/workflow/slices/persistenceSlice.ts \
  apps/web/src/components/workflow/WorkflowSwitcher.tsx \
  apps/api/src/services/workflows.service.spec.ts \
  apps/web/src/lib/api/workflows.test.ts
 git commit -m "perf(api,web): return workflow summaries"
```

---

### Task 6: Add execution pagination + indexes

**Files:**
- Modify: `apps/api/src/services/executions.service.ts`
- Modify: `apps/api/src/controllers/executions.controller.ts`
- Modify: `apps/api/src/modules/executions.module.ts`
- Modify: `apps/api/src/modules/workflows.module.ts`
- Test: `apps/api/src/services/executions.service.spec.ts`
- Test: `apps/api/src/controllers/executions.controller.spec.ts`

**Step 1: Write failing tests**
- Update tests to expect pagination args.

**Step 2: Run test to verify it fails**
Run: `bun run --filter @genfeedai/api test`

**Step 3: Implement minimal changes**
- Add `offset`/`limit` to `findExecutionsByWorkflow`.
- Add indexes `{ isDeleted: 1, updatedAt: -1 }` and `{ workflowId: 1, isDeleted: 1, createdAt: -1 }` in module `useFactory`.

**Step 4: Run test to verify it passes**
Run: `bun run --filter @genfeedai/api test`

**Step 5: Commit**
```bash
git add apps/api/src/services/executions.service.ts \
  apps/api/src/controllers/executions.controller.ts \
  apps/api/src/modules/executions.module.ts \
  apps/api/src/modules/workflows.module.ts \
  apps/api/src/services/executions.service.spec.ts \
  apps/api/src/controllers/executions.controller.spec.ts
 git commit -m "perf(api): paginate executions and add indexes"
```

---

### Task 7: Align React/TS versions across workspace

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/api/package.json`

**Step 1: Update versions**
- Match React/ReactDOM to root and TypeScript to 5.9.3.

**Step 2: Verify**
Run: `bun install` (if required) then `bun run --filter @genfeedai/web test` and `bun run --filter @genfeedai/api test`.

**Step 3: Commit**
```bash
git add apps/web/package.json apps/api/package.json
 git commit -m "chore: align react and typescript versions"
```

---

### Task 8: A11y + design consistency fixes

**Files:**
- Modify: `apps/web/src/components/ui/modal.tsx`
- Modify: overlay files with `onClick` backdrops (listed in audit)
- Modify: `apps/web/src/lib/constants/colors.ts`
- Modify: `apps/web/src/components/WorkflowPreview.tsx`

**Step 1: Write failing tests (if applicable)**
- Add simple render test to assert close button has `aria-label`.

**Step 2: Implement minimal changes**
- Add `aria-label` to icon-only close button.
- Replace overlay divs with `button` or add `role`/`aria-hidden`.
- Swap category colors to CSS variables; update preview edge stroke to CSS var.
- Optimize `WorkflowPreview` group index lookup.

**Step 3: Verify**
Run: `bun run --filter @genfeedai/web test`

**Step 4: Commit**
```bash
git add apps/web/src/components/ui/modal.tsx \
  apps/web/src/components/WorkflowPreview.tsx \
  apps/web/src/lib/constants/colors.ts \
  apps/web/src/components/templates/TemplatesModal.tsx \
  apps/web/src/components/ui/modal.tsx
 git commit -m "fix(web): a11y and design consistency"
```

---

## Execution Handoff
Plan complete and saved to `docs/plans/2026-02-02-perf-dry-optimization.md`. Two execution options:

1. Subagent-Driven (this session) — I dispatch a fresh subagent per task, review between tasks.
2. Parallel Session (separate) — Open new session with executing-plans, batch execution with checkpoints.

Which approach?
