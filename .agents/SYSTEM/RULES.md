# Coding Rules - Genfeed

**Purpose:** Coding standards and patterns for this project.
**Last Updated:** 2026-01-20

---

## General Principles

1. **Follow existing patterns** - Search for 3+ similar implementations before writing new code
2. **Quality over speed** - Think through implementations before coding
3. **No `any` types** - Use proper TypeScript types
4. **No `console.log`** - Use a logging service

---

## File Organization

### Naming Conventions

- **Directories:** lowercase with hyphens (`user-settings/`)
- **Files:** kebab-case (`user-service.ts`)
- **Components:** PascalCase (`UserProfile.tsx`)
- **Interfaces:** PascalCase with `I` prefix (`IUserProfile`)

### Import Order

1. External packages
2. Internal packages/aliases
3. Relative imports
4. Types/interfaces

```typescript
// External
import { useState } from 'react';

// Internal aliases
import { Button } from '@components/ui';
import { UserService } from '@services/user';

// Relative
import { helpers } from './utils';

// Types
import type { IUser } from '@interfaces/user';
```

---

## TypeScript

### Do

- Use strict mode
- Define return types for functions
- Use path aliases (`@components/`, `@services/`)
- Export types from dedicated files

### Don't

- Use `any` type
- Use relative imports for shared code
- Ignore TypeScript errors

### Interface Placement

| Scope | Location |
|-------|----------|
| File-local only (1 file) | Inline is fine |
| Shared across API files | `apps/api/src/interfaces/` |
| Shared across packages | `packages/types/src/` |

**Examples of acceptable inline interfaces:**
- Query params only used in one controller
- Internal processor state types
- Helper function arguments

**Move to dedicated file when:**
- Used in more than one file
- Part of public API contract
- Likely to be reused

---

## Error Handling

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

## Git

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

---

## Project-Specific Rules

### MongoDB Queries

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

### Frontend Async Operations

All async operations in React effects MUST use AbortController:

```typescript
useEffect(() => {
  const controller = new AbortController();

  fetchWorkflows({ signal: controller.signal })
    .then(setWorkflows)
    .catch((err) => {
      if (!controller.signal.aborted) {
        setError(err);
      }
    });

  return () => controller.abort();
}, []);
```

### Serializers

Serializers belong in `packages/`, NOT in API services:

| Correct | Wrong |
|---------|-------|
| `packages/serializers/` | `apps/api/src/serializers/` |

### Database Indexes

Compound indexes go in module `useFactory`, NOT in schema files:

```typescript
// In module file
MongooseModule.forFeatureAsync([{
  name: Workflow.name,
  useFactory: () => {
    const schema = WorkflowSchema;
    schema.index({ organization: 1, createdAt: -1 });
    return schema;
  }
}])
```

### Node System

- **36 node types** defined in `packages/types/src/nodes.ts`
- **Handle types are strict** - only same-type connections allowed:
  - `image` → `image`
  - `text` → `text`
  - `video` → `video`
  - `audio` → `audio`

### Queue Architecture

5 BullMQ queues for job processing:

| Queue | Purpose |
|-------|---------|
| `workflow-orchestrator` | Workflow execution coordination |
| `image-generation` | Image AI operations |
| `video-generation` | Video AI operations |
| `llm-generation` | Text/LLM operations |
| `processing` | General processing tasks |

### Cost Calculation

All pricing logic lives in `packages/core/src/pricing.ts`. Update this file when adding new AI providers or models.

---

**Remember:** When in doubt, check existing code for patterns.
