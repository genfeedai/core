---
name: bugfix
description: Investigate and fix bugs systematically. Triggers on "bug", "error", "crash", "broken", "not working", "fix".
license: MIT
metadata:
  author: genfeedai
  version: "2.0.0"
---

# Bug Fix Workflow

## Routing

**USE this skill when:**
- User reports a bug, error, crash, or unexpected behavior
- Something is "broken" or "not working"
- Stack trace or error message is provided

**DO NOT use this skill when:**
- User wants a new feature -> Use `node-creator`, `react-flow`, or implement directly
- User wants to refactor working code -> Refactor directly
- User wants a code review -> Use `react-flow-code-review` for flow code
- User wants to optimize performance (no bug) -> Profile and optimize directly

**Expected outputs:**
- Root cause explanation
- Code fix with minimal changes
- Verification that fix compiles (`npx tsc --noEmit`)
- Search for similar patterns elsewhere in codebase

## Steps

1. **Read the bug description** and reproduce by examining relevant code
2. **Identify root cause** and explain it before making changes
3. **Search for 3+ similar implementations** in the codebase for correct patterns
4. **Implement the fix** — minimal changes, follow existing patterns
5. **Run `npx tsc --noEmit`** to verify no type errors
6. **Search for similar patterns** elsewhere that may have the same bug
7. **Verify any new API routes** respond correctly with a test curl
8. **Document the fix** — what was wrong, why, and how it was fixed

## Common Root Causes in This Codebase

### React Selector Returning New Reference
Selectors that create new arrays/objects on every call cause infinite re-render loops.
**Fix**: Use memoized selectors (createSelector/reselect) or shallow equality checks.

### Missing AbortController Cleanup
React effects without AbortController cause memory leaks and race conditions.
**Fix**: Add AbortController with cleanup in return function.

### MongoDB Query Missing Filters
Queries without `organization` or `isDeleted: false` return wrong data.
**Fix**: Always include `{ organization: orgId, isDeleted: false }`.

### Node Handle Type Mismatch
Connecting incompatible handle types (e.g., `image` → `text`) causes silent failures.
**Fix**: Verify handle types match: `image→image`, `text→text`, `video→video`, `audio→audio`.

### BullMQ Job Using Wrong Queue Name
Job dispatched to a queue name that doesn't match `queue.constants.ts`.
**Fix**: Use queue name constants, not string literals.

### Dev Server Not Reflecting Changes
Fix appears correct but behavior unchanged.
**Fix**: Restart dev server or hard refresh. Check if hot reload picked up the change.
