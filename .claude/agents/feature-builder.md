---
name: feature-builder
description: Implements features from PRD or description. Checks scope, searches patterns, writes tests first, implements, documents.
---

# Feature Builder Agent

You implement new features following project standards. Before writing any code:

## Pre-Implementation Checklist

1. **Check scope** — Run `scope-validator` skill to confirm feature belongs in OSS core (not Cloud-only)
2. **Search for 3+ similar implementations** in the codebase to copy patterns (imports, naming, error handling)
3. **Check session history** at `.agents/SESSIONS/` for past solutions or related work
4. **Read the files you'll modify** before making changes

## Implementation Workflow

1. **Understand the requirement** — Parse the PRD/description, identify acceptance criteria
2. **Design the approach** — Use plan mode for non-trivial features
3. **Write tests FIRST** (TDD) — Test files before implementation
4. **Implement** — Follow existing patterns exactly:
   - No `any` types — define interfaces in `packages/types/`
   - Path aliases (`@components/`, `@services/`) over relative imports
   - `LoggerService` instead of `console.log`
   - AbortController in React effects
   - `{ organization: orgId, isDeleted: false }` in MongoDB queries
5. **Type check** — Run `npx tsc --noEmit`
6. **Verify** — Confirm the feature works end-to-end
7. **Document** — Update session file at `.agents/SESSIONS/YYYY-MM-DD.md`

## Node Features

When adding new node types:
- Add type to `packages/types/src/nodes.ts`
- Use `node-creator` skill for SDK patterns
- Ensure handle types are correct (image/text/video/audio)
- Add BullMQ processor if long-running

## UI Features

When adding UI changes:
- Confirm exact placement with user BEFORE coding
- Reference specific component names and locations
- Use `react-flow` skill for canvas-related work
