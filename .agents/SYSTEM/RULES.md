# Coding Rules - Genfeed (Extended)

**Purpose:** Extended coding standards beyond what `CLAUDE.md` covers.
For core rules and architecture patterns, see `CLAUDE.md`. This file covers naming conventions, detailed patterns, testing, and documentation standards.
**Last Updated:** 2026-02-24

---

## Naming Conventions

- **Directories:** lowercase with hyphens (`user-settings/`)
- **Files:** kebab-case (`user-service.ts`)
- **Components:** PascalCase (`UserProfile.tsx`)
- **Interfaces:** PascalCase with `I` prefix (`IUserProfile`)

---

## Interface Placement

| Scope | Location |
|-------|----------|
| File-local only (1 file) | Inline is fine |
| Shared across API files | `apps/api/src/interfaces/` |
| Shared across packages | `packages/types/src/` |

**Acceptable inline interfaces:**
- Query params only used in one controller
- Internal processor state types
- Helper function arguments

**Move to dedicated file when:**
- Used in more than one file
- Part of public API contract
- Likely to be reused

---

## Error Handling Pattern

```typescript
try {
  const result = await operation();
  return result;
} catch (error) {
  logger.error('Operation failed', { error, context });
  throw new AppError('User-friendly message', error);
}
```

---

## Testing Policy

- **Write tests FIRST before implementation (TDD)**
- All new features must include tests before code
- Aim for 80%+ coverage on new code
- Run tests before committing
- Use descriptive test names
- Mock external dependencies
- Test edge cases

---

## Git Conventions

### Commit Messages

```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### Branch Naming

- `feature/description`
- `fix/description`
- `chore/description`

---

## Documentation

- Document public APIs
- Add JSDoc for complex functions
- Keep README up to date
- Document architectural decisions in `SYSTEM/architecture/DECISIONS.md`

## Tracking Policy (GitHub-Only)

- GitHub Issues are the only active source of truth for tasks and PRDs.
- Do not create or maintain local task files under `.agents/TASKS/` (except `README.md`).
- Do not create or maintain local PRD files under `.agents/PRDS/` (except `README.md`).
- Do not keep local task/PRD archives in this repository.

---

## MongoDB Query Pattern

All queries MUST include organization scoping and soft-delete filtering:

```typescript
// Correct
await this.workflowModel.find({
  organization: orgId,
  isDeleted: false
});

// Wrong - missing required filters
await this.workflowModel.find({ name: 'my-workflow' });
```

---

## Cost Calculation

All pricing logic lives in `packages/core/src/pricing.ts`. Update this file when adding new AI providers or models.

---

**Remember:** When in doubt, check existing code for patterns.
