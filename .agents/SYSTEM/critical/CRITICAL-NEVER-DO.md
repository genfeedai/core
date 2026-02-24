# CRITICAL: Never Do This

**Purpose:** Quick reference for violations that break builds, lose data, or violate architecture.
For positive coding standards, see `CLAUDE.md`. This file covers violations only.
**Read this FIRST before making ANY changes.**
**Last Updated:** 2026-02-24

---

## File Management

### Never Delete Required Files

These files MUST exist at project root:
- `AGENTS.md`
- `CLAUDE.md`
- `CODEX.md`
- `README.md`

### Never Create Root-Level .md Files

Only these 4 `.md` files allowed at project root (listed above). Everything else goes in `.agents/`.

---

## Session Files

### One File Per Day

**CORRECT:**
```
.agents/SESSIONS/2025-01-15.md
```

**WRONG:**
```
.agents/SESSIONS/2025-01-15-feature.md
.agents/SESSIONS/FEATURE-2025-01-15.md
```

Multiple sessions same day -> Same file, Session 1, Session 2, etc.

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

- **NEVER use `any` type** -- see `CLAUDE.md` Critical Rules #1
- **NEVER skip error handling** on async operations -- wrap in try/catch with logger
- **NEVER use `console.log`** -- see `CLAUDE.md` Critical Rules #2
- **NEVER skip AbortController cleanup in React effects** -- see `CLAUDE.md` Architecture Patterns
- **NEVER put serializers in API services** -- see `CLAUDE.md` Architecture Patterns
- **NEVER add compound indexes in schema files** -- use module `useFactory`, see `CLAUDE.md`

---

## Project-Specific Violations

### Soft Deletes

**NEVER use `deletedAt`** -- use `isDeleted: boolean`. See `CLAUDE.md` Critical Rules #4.

### Node Types

**NEVER create new node types without updating `packages/types/src/nodes.ts`.**
All 36 node types must be defined there. Adding a node elsewhere causes type mismatches.

### Handle Type Connections

**NEVER connect incompatible handle types:**

WRONG: image -> text, video -> audio, text -> image
CORRECT: image -> image, text -> text, video -> video, audio -> audio

### Local Builds

**NEVER run `bun run build` locally** -- it attempts to build all 12 apps and crashes. Use CI/CD only.

```bash
# WRONG - never run locally
bun run build

# CORRECT - build single app if needed
bun run build:studio
```

### API Keys

**NEVER commit API keys** to the repository (Replicate, ElevenLabs, fal.ai, etc.). These belong in `.env` files (which are gitignored).

---

## Pre-Code Checklist

Before writing ANY code:

- [ ] Read this file
- [ ] Check `CLAUDE.md` for patterns
- [ ] Search for similar implementations
- [ ] Understand existing code before modifying

---

## If You Violate These Rules

1. **Acknowledge** -- Don't hide it
2. **Fix properly** -- No workarounds
3. **Document** -- Add to session file
4. **Learn** -- Update this file if needed

---

**5 minutes reading this = hours saved debugging later.**
