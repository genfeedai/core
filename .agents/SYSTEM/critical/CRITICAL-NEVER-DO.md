# CRITICAL: Never Do This

**Purpose:** Quick reference for violations that break builds, lose data, or violate architecture.
**Read this FIRST before making ANY changes.**
**Last Updated:** 2026-01-14

---

## File Management

### Never Delete Required Files

These files MUST exist at project root:
- `AGENTS.md`
- `CLAUDE.md`
- `CODEX.md`
- `README.md`

### Never Create Root-Level .md Files

Only these 4 `.md` files allowed at project root:
1. `AGENTS.md`
2. `CLAUDE.md`
3. `CODEX.md`
4. `README.md`

Everything else goes in `.agent/`.

---

## Session Files

### One File Per Day

**Correct:**
```
.agent/SESSIONS/2025-01-15.md
```

**Wrong:**
```
.agent/SESSIONS/2025-01-15-feature.md  ❌
.agent/SESSIONS/FEATURE-2025-01-15.md  ❌
```

Multiple sessions same day → Same file, Session 1, Session 2, etc.

---

## Git

### Never Commit Without Approval

- Don't run `git commit` unless explicitly asked
- Don't run `git push` unless explicitly asked
- Make changes, show diff, wait for approval

### Never Force Push to Main

- No `git push --force` to main/master
- No `git reset --hard` on shared branches

---

## Coding

### Never Use `any` Type

```typescript
// Wrong
function process(data: any) { }

// Correct
function process(data: UserData) { }
```

### Never Skip Error Handling

```typescript
// Wrong
const result = await operation();

// Correct
try {
  const result = await operation();
} catch (error) {
  logger.error('Operation failed', error);
  throw error;
}
```

### Never Use console.log

Use a logging service instead.

---

## Project-Specific Rules

### Soft Deletes

**NEVER use `deletedAt`** - use `isDeleted: boolean`:

```typescript
// Wrong
{ deletedAt: Date | null }

// Correct
{ isDeleted: boolean }
```

### Serializer Location

**NEVER put serializers in API services** - they belong in `packages/`:

```
❌ apps/api/src/serializers/workflow.serializer.ts
✅ packages/serializers/src/workflow.serializer.ts
```

### Database Indexes

**NEVER add compound indexes in schema files** - use module `useFactory`:

```typescript
// ❌ Wrong - in schema file
@Schema()
export class Workflow {
  // indexes defined here
}

// ✅ Correct - in module useFactory
MongooseModule.forFeatureAsync([{
  name: Workflow.name,
  useFactory: () => {
    const schema = WorkflowSchema;
    schema.index({ organization: 1, createdAt: -1 });
    return schema;
  }
}])
```

### Node Types

**NEVER create new node types without updating `packages/types/src/nodes.ts`**

All 36 node types must be defined there. Adding a node elsewhere causes type mismatches.

### React Effects

**NEVER skip AbortController cleanup in React effects**:

```typescript
// ❌ Wrong - no cleanup
useEffect(() => {
  fetchData();
}, []);

// ✅ Correct - with AbortController
useEffect(() => {
  const controller = new AbortController();
  fetchData({ signal: controller.signal });
  return () => controller.abort();
}, []);
```

### Handle Type Connections

**NEVER connect incompatible handle types**:

```
❌ image → text
❌ video → audio
❌ text → image

✅ image → image
✅ text → text
✅ video → video
✅ audio → audio
```

### Local Builds

**NEVER run `bun run build` locally** - it attempts to build all 12 apps and crashes. Use CI/CD only.

```bash
# ❌ Never run locally
bun run build

# ✅ Build single app if needed
bun run build:studio
```

### API Keys

**NEVER commit API keys** to the repository:

- Replicate API Token
- ElevenLabs API Key
- fal.ai Key
- Any other provider secrets

These belong in `.env` files (which are gitignored).

---

## Pre-Code Checklist

Before writing ANY code:

- [ ] Read this file
- [ ] Check `../RULES.md` for patterns
- [ ] Search for similar implementations
- [ ] Understand existing code before modifying

---

## If You Violate These Rules

1. **Acknowledge** - Don't hide it
2. **Fix properly** - No workarounds
3. **Document** - Add to session file
4. **Learn** - Update this file if needed

---

**5 minutes reading this = hours saved debugging later.**
