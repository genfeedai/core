# Genfeed

Claude-specific entry point. Documentation in `.agents/`.

## Commands

Check `.agents/SYSTEM/RULES.md` for coding standards.

## Sessions

Document all work in `.agents/SESSIONS/YYYY-MM-DD.md` (one file per day).

## React / State Management

When fixing React selectors or derived state, always check for referential equality issues (e.g., creating new array/object references on every render). Use memoization or shallow equality checks to prevent infinite re-render loops.

## Development Workflow

After implementing bug fixes, verify the fix is active in the running dev server. If changes don't seem to take effect, check if a dev server restart or hard refresh is needed before assuming the fix failed.

## API Routes

When adding new API routes (e.g., Next.js route handlers), always verify the route file path matches the expected URL pattern and test with a curl request before considering the task complete.

## Testing Policy
- Write tests FIRST before implementation (TDD)
- All new features must include tests before code
- Aim for 80%+ coverage on new code
- Run tests before committing
