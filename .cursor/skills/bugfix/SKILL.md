# Bug Fix Workflow

## Steps

1. Read the bug description and reproduce by examining relevant code
2. Identify root cause and explain it before making changes
3. Implement the fix
4. Run `npx tsc --noEmit` to verify no type errors
5. Search for similar patterns elsewhere in codebase that may have the same bug
6. Verify any new API routes respond correctly with a test curl
