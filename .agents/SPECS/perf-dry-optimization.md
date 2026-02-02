# Perf & DRY Optimization Spec

## Purpose
Reduce payload size, remove pricing drift, prevent client bundling of server SDKs, tighten webhook security, and improve DB/query performance across Genfeed Core (web + API + packages) in a single batch.

## Non-Goals
- No new UI features or redesigns.
- No runtime profiling/Lighthouse collection in this pass.
- No feature flags or compatibility shims (breaking changes are acceptable).

## Interfaces
### API
- **GET /workflows**
  - **Old:** Full workflow documents including nodes/edges/groups.
  - **New:** Summary only: `_id`, `name`, `description`, `thumbnail`, `thumbnailNodeId`, `updatedAt`, `createdAt`, `isReusable`.

- **GET /workflows/:id**
  - Unchanged: returns full workflow.

- **GET /workflows/:workflowId/executions**
  - **New:** Supports `?offset` and `?limit` (defaults: offset=0, limit=50).

### Web
- Workflow list UI uses summary type only.
- Cost calculations import from `@genfeedai/core` (no Replicate SDK in client bundles).
- Replicate webhook URL includes a secret query param when configured.

### Config
- New env var: `REPLICATE_WEBHOOK_SECRET` (required for webhooks).

## Key Decisions
See `.agents/DECISIONS/perf-dry-optimization.md`.

## Edge Cases & Failure Modes
- Missing `REPLICATE_WEBHOOK_SECRET` should prevent webhook use and return 401 on webhook calls.
- Workflows list API used by UI must not assume nodes/edges exist.
- Execution pagination must handle empty/short lists gracefully.
- Cost calculations must not require DOM/window.

## Acceptance Criteria
- `GET /workflows` returns summary payload only and the web UI still lists workflows.
- Cost estimate in UI uses a shared pricing source (no duplicate pricing constants in web).
- Replicate webhook rejects requests without valid secret.
- Execution list endpoint paginates and uses indexes for hot sorts.
- React/ReactDOM/TypeScript versions are aligned across workspace.
- Modal close button has accessible label; category colors use CSS variables.

## Test Plan
- Update/adjust affected unit tests in `apps/web` and `apps/api`.
- Run targeted tests:
  - `bun run test:api`
  - `bun run test:web`
- Spot-check: workflow list UI, webhook route auth, cost breakdown UI.
