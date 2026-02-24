# Genfeed Core (OSS)

Codex-specific entry point. Node-based AI workflow editor with React Flow canvas, 36 node types, BullMQ queue processing.

## Codex-Specific Notes

- **No network**: cannot run dev servers. Focus on code changes and type-checking.
- **Scoped tests only**: `bun test src/path/to/file.spec.ts`
- **Type check**: `npx tsc --noEmit`

## Key Entry Points

- **Node types**: `packages/types/src/nodes.ts`
- **Queue constants**: `packages/core/src/queue.constants.ts`
- **Pricing logic**: `packages/core/src/pricing.ts`

## Documentation

- `.agents/README.md` - Start here
- `.agents/SYSTEM/` - Architecture and rules
- `.agents/TASKS/` - Current tasks
- `CLAUDE.md` - Full reference
