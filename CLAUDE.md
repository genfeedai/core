# Genfeed Core (OSS)

Node-based AI workflow editor. TypeScript monorepo: React Flow canvas, 36 node types (image/video/audio/text), BullMQ queue processing, MongoDB + NestJS API, gallery output.

**Tech stack**: TypeScript, React 19, Next.js 16, NestJS, MongoDB, Redis, BullMQ, React Flow (@xyflow/react), bun

## Commands

```bash
# Development
bun run dev              # All services
bun run dev:app:fe       # Frontend only

# Testing (scoped only — NEVER run full suite)
bun test src/path/to/file.spec.ts    # Backend
bun test src/path/to/file.test.ts    # Frontend

# Type check
npx tsc --noEmit

# NEVER: bun test (no path), bun run build (CI/CD only)
```

## Critical Rules (Linter-Enforced)

1. **No `any` types** — define interfaces in `packages/types/` or `packages/interfaces/`
2. **No `console.log`** — use `LoggerService`
3. **No relative imports** for shared code — use path aliases (`@components/`, `@services/`, `@props/`)
4. **No `deletedAt`** — use `isDeleted: boolean` for soft deletes
5. **No inline interfaces** for shared types — file-local only is fine; shared goes to `packages/`

## Architecture Patterns

**MongoDB queries MUST include org + soft-delete:**
```typescript
{ organization: orgId, isDeleted: false }
```

**React effects MUST use AbortController:**
```typescript
useEffect(() => {
  const controller = new AbortController();
  fetchData({ signal: controller.signal });
  return () => controller.abort();
}, []);
```

**Serializers** live in `packages/`, NOT in API services.

**Compound indexes** go in module `useFactory`, NOT in schema files:
```typescript
MongooseModule.forFeatureAsync([{
  name: Workflow.name,
  useFactory: () => {
    const schema = WorkflowSchema;
    schema.index({ organization: 1, createdAt: -1 });
    return schema;
  }
}])
```

**New node types** must be added to `packages/types/src/nodes.ts`.

## Node System

36 node types across 4 categories: input (5), ai (7), processing (12), output (2).
Handle types are strict — only same-type connections: `image`→`image`, `text`→`text`, `video`→`video`, `audio`→`audio`.

## Queue Architecture

| Queue | Purpose |
|-------|---------|
| `workflow-orchestrator` | Workflow execution coordination |
| `image-generation` | Image AI operations |
| `video-generation` | Video AI operations |
| `llm-generation` | Text/LLM operations |
| `processing` | General processing tasks |

Pricing logic: `packages/core/src/pricing.ts`

## Skill Routing

| Need | Use Skill | NOT |
|------|-----------|-----|
| Fix a bug | `bugfix` | `react-flow` (unless canvas-specific) |
| New SDK node type | `node-creator` | `react-flow`, `workflow-creator` |
| Generate workflow JSON | `workflow-creator` | `react-flow`, `node-creator` |
| Canvas / viewport / edges | `react-flow` | `node-creator` |
| Sub-flows, DnD, undo/redo, dagre | `react-flow-advanced` | `react-flow` (basic) |
| Audit existing React Flow code | `react-flow-code-review` | `react-flow` (building new) |
| AI prompt optimization | `prompt-generator` | `node-creator` |
| MCP server / API key setup | `openclaw-integration` | `node-creator` |
| OSS vs Cloud scope question | `scope-validator` | any other |
| New user help | `onboarding` | specific feature skills |
| Infrastructure / SSH / deploy | `infra-reference` | coding skills |

## Common Pitfalls

- **Selector referential equality**: React selectors returning new array/object references cause infinite re-renders. Use memoized selectors or shallow equality.
- **Dev server restart**: After bug fixes, verify changes are active. May need restart or hard refresh.
- **Route file paths**: New API routes — verify file path matches expected URL pattern.
- **Node handle mismatch**: Only same-type connections allowed.
- **BullMQ queue name**: Must match constants in `queue.constants.ts`.

## Testing

Write tests FIRST (TDD). 80%+ coverage on new code. Run tests before committing.

## Sessions

Document all work in `.agents/SESSIONS/YYYY-MM-DD.md` (one file per day).

## Deep Reference

| Topic | Location |
|-------|----------|
| Full coding rules | `.agents/SYSTEM/RULES.md` |
| Critical violations | `.agents/SYSTEM/critical/CRITICAL-NEVER-DO.md` |
| Session docs + .agents/ nav | `.agents/README.md` |
| Architecture decisions | `.agents/SYSTEM/architecture/DECISIONS.md` |
| Code examples | `.agents/EXAMPLES/` |
