# Workspace Performance Audit Report
**Project:** Genfeed Core
**Date:** 2026-02-02
**Scope:** Full static audit (apps/web, apps/api, packages/*)
**Method:** Static code/config review only (no Lighthouse/APM/profiler runs)

## Executive Summary
- **Provisional Health:** 6.8/10 (static-only; no runtime metrics)
- **Critical:** 0
- **High:** 3
- **Medium:** 5
- **Low:** 4
- **Primary themes:** Client bundle pollution, DRY violations in pricing/cost logic, oversized workflow list payloads, missing index support for hot sorts, version drift.

## Coverage & Constraints
- No production metrics, DB profiler, or Lighthouse data available.
- Did not run `bun run build` (project rule).
- Findings are based on code/config inspection and grep patterns.

---

## Phase 0: Workspace Discovery
- Apps: `apps/web` (Next.js 16), `apps/api` (NestJS 11)
- Packages: `packages/core`, `packages/prompts`, `packages/types`, `packages/workflows`
- Shared infra: Bun workspaces, Turbo, Biome

---

## Phase 1: Frontend Audit (apps/web)

### High Impact
1) **Server-only Replicate SDK pulled into client bundle**
- **Evidence:** `apps/web/src/components/toolbar/Toolbar.tsx` imports `calculateWorkflowCost` from `apps/web/src/lib/replicate/client.ts` (client component). `persistenceSlice.ts` also imports it.
- **Why it matters:** The Replicate SDK is Node-centric and large; bundling it into client harms bundle size and may expose server-only assumptions.
- **Fix:** Split `apps/web/src/lib/replicate/client.ts` into:
  - `apps/web/src/lib/replicate/server.ts` (Replicate SDK + API calls, `import 'server-only'`),
  - `apps/web/src/lib/costs.ts` (cost calc only; no SDK), or better, move to `@genfeedai/core` and import from there.

2) **Workflow list payload too large for UI usage**
- **Evidence:** `apps/web/src/lib/api/workflows.ts#getAll` requests `/workflows` and expects full `WorkflowData` including `nodes`/`edges`/`groups`.
- **Why it matters:** `WorkflowSwitcher` only needs id/name/thumbnail; full graphs scale poorly and slow render/network.
- **Fix:** Add a summary endpoint or query param, return only required fields; update UI to use summary.

### Medium Impact
3) **React version drift (potential duplicate React in bundles)**
- **Evidence:** root `package.json` has `react: 19.2.4`; `apps/web/package.json` pins `react: 19.0.0`.
- **Why it matters:** Can cause extra bundles or hook identity issues in monorepo setups.
- **Fix:** Align React/ReactDOM versions across workspace.

4) **Cost estimation recompute on large graphs**
- **Evidence:** `Toolbar.tsx` recalculates cost after JSON.stringify of cost-relevant data; `persistenceSlice.ts` recalculates on load and per change.
- **Why it matters:** For very large workflows, stringify and cost scan are non-trivial.
- **Fix:** Centralize cost calc in store with memoized selectors or incremental updates per node change.

### Low Impact
5) **WorkflowPreview layout is O(n²)**
- **Evidence:** `apps/web/src/components/WorkflowPreview.tsx` uses `group.indexOf(node)` inside a map.
- **Why it matters:** For very large graphs this can be slow.
- **Fix:** Precompute index map per depth group.

---

## Phase 1b: Design Consistency & Accessibility

### Design Consistency (Medium)
- **Hardcoded color duplication**
  - **Evidence:** `apps/web/src/lib/constants/colors.ts` uses hex values with a note to keep in sync with CSS vars; `WorkflowPreview.tsx` uses inline hex; annotation palette uses many hex values.
  - **Fix:** Centralize on CSS variables or a shared theme token map; avoid dual sources of truth.

### Accessibility (Medium)
- **Icon-only controls without accessible labels**
  - **Evidence:** `apps/web/src/components/ui/modal.tsx` close button contains only `<X />` icon.
  - **Fix:** Add `aria-label="Close"` (or use Radix/Dialog for built-in a11y).

- **Clickable backdrop divs (not focusable)**
  - **Evidence:** multiple components use `<div onClick={...}>` for modal backdrops (e.g., `Modal.tsx`, `TemplatesModal.tsx`, `LightboxModal.tsx`).
  - **Fix:** Ensure keyboard-friendly close (Esc already present in modal), add `aria-hidden` and `role="presentation"`, or replace with `<button aria-label="Close dialog">` overlay to be focusable.

---

## Phase 2: Backend Audit (apps/api)

### High Impact
1) **Workflow list API returns full documents**
- **Evidence:** `WorkflowsService.findAll` returns full `WorkflowDocument` with nodes/edges (`apps/api/src/services/workflows.service.ts`).
- **Why it matters:** List view shouldn’t hydrate full graphs; large payloads hurt API latency and memory.
- **Fix:** Add projection + `lean()` for list endpoints; introduce `/workflows/summary` or `?fields=summary` for list usage.

### Medium Impact
2) **Index coverage for hot sort queries**
- **Evidence:** `WorkflowsService.findAll` sorts by `updatedAt`, but `WorkflowsModule` indexes only `{ isReusable, isDeleted }` and text index.
- **Fix:** Add compound index `{ isDeleted: 1, updatedAt: -1 }` in `apps/api/src/modules/workflows.module.ts` (via `useFactory`).

3) **Executions list is unbounded**
- **Evidence:** `ExecutionsService.findExecutionsByWorkflow` returns all executions with sort, no limit/pagination.
- **Fix:** Add limit/offset or cursor pagination; add compound index `{ workflowId: 1, isDeleted: 1, createdAt: -1 }` in `apps/api/src/modules/executions.module.ts`.

### Low Impact
4) **`lean()` not used on list reads**
- **Evidence:** list queries in `WorkflowsService`, `ExecutionsService` return full Mongoose documents.
- **Fix:** Use `.lean()` for read-only list endpoints to reduce memory/GC.

---

## Phase 3: Database Audit (MongoDB)

### Medium Impact
- **Missing compound indexes for sorted lists**
  - **Workflows:** add `{ isDeleted: 1, updatedAt: -1 }` to support `findAll`.
  - **Executions:** add `{ workflowId: 1, isDeleted: 1, createdAt: -1 }` to support `findExecutionsByWorkflow`.

**Note:** Queue job indexes already exist in `apps/api/src/modules/queue.module.ts`.

---

## Phase 4: Packages & Dependency Audit

### High Impact
1) **Pricing logic duplicated and inconsistent (DRY violation + user-visible mismatch)**
- **Evidence:** `packages/core/src/pricing.ts` vs `apps/web/src/lib/replicate/client.ts` have different values (e.g., nano-banana-pro 2K, llama token price).
- **Why it matters:** UI estimates won’t match backend billing.
- **Fix:** Move pricing + cost calculation to `@genfeedai/core` and import from both web and api. Remove pricing constants from `apps/web` replicate client.

### Medium Impact
2) **TypeScript version drift across packages**
- **Evidence:** root uses 5.9.3; `apps/web` uses 5.8.2; `apps/api` uses 5.7.3.
- **Fix:** Align TS versions to minimize typecheck skew and CI inconsistency.

---

## Security Review (Scoped)

### Medium Impact
1) **Webhook endpoint lacks verification**
- **Evidence:** `apps/web/src/app/api/replicate/webhook/route.ts` accepts any JSON body without signature/secret.
- **Fix:** Require a shared secret (header or query), validate signature per Replicate webhook docs.

2) **API keys persisted in localStorage**
- **Evidence:** `apps/web/src/store/settingsStore.ts` persists provider API keys despite comment saying not to store in plain text.
- **Fix:** Store keys server-side, or encrypt at rest in browser (at minimum, remove misleading comment or implement actual non-persistence).

---

## Prioritized Recommendations

### Quick Wins (High Impact / Low Effort)
1) **Split Replicate SDK from cost logic**
   - Move cost calc to `@genfeedai/core` and import into web; keep SDK in server-only module.
2) **Add workflow summary endpoint**
   - Return `{ _id, name, description, thumbnail, updatedAt }` only; update `WorkflowSwitcher` to use it.

### High Priority (High Impact / Medium Effort)
1) **Unify pricing constants across packages**
   - Single source in `@genfeedai/core` to eliminate estimate mismatch.
2) **Add compound indexes for sorted lists**
   - Workflows and executions as noted above.
3) **Add execution pagination**
   - Avoid unbounded execution history responses.

### Technical Debt / Medium Impact
1) **Align React + TS versions**
   - Standardize across workspace to reduce bundle duplication and CI inconsistency.
2) **A11y improvements for modals**
   - Add `aria-label`s, focus management, and improve overlay semantics.
3) **Design token consolidation**
   - Move hardcoded hex colors into CSS variables or a single token map.

---

## Optimization Plan (DRY + Performance)

1) **Centralize pricing & cost calculation**
   - Create a shared cost module in `packages/core` (or extend existing `pricing.ts`).
   - Refactor web to import cost calc from `@genfeedai/core`.
   - Keep Replicate SDK calls in `apps/web/src/lib/replicate/server.ts` (server-only).

2) **Reduce workflow list payload**
   - Add a `summary` list endpoint or `?fields=` query param in `WorkflowsController`.
   - Use `.select()` + `.lean()` on list endpoints.
   - Update `workflowsApi.getAll` and `WorkflowSwitcher` to use summary DTO.

3) **Pagination & indexes**
   - Add compound indexes for hot sorts in `WorkflowsModule` and `ExecutionsModule`.
   - Add cursor pagination for executions list (or capped limit with explicit paging params).

4) **Version alignment**
   - Pin React/ReactDOM/TypeScript versions consistently across workspace packages.

5) **A11y + design cleanup**
   - Add accessible labels to icon-only buttons; improve modal focus management.
   - Replace duplicate hex colors with CSS variables.

---

## Next Steps
- If you want a task-by-task implementation plan, I can generate it next.
- If you want runtime metrics, we can run Lighthouse and capture API timings (separate step).

