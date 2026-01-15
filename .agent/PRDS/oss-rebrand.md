# Open Source Rebrand: genfeedai/genfeed

**Status:** Planning
**Priority:** High
**Created:** 2026-01-15
**Category:** Infrastructure / Branding

---

## Overview

### Problem Statement
The project is currently named "content-workflow" with `@content-workflow/*` package scope. To open source this project and build the Genfeed brand, we need to rebrand to `genfeedai/genfeed` with `@genfeedai/*` package scope. This aligns with the Vercel/Next.js model where the OSS project builds brand awareness for the commercial SaaS offering.

### Goals
- Rebrand monorepo from `content-workflow` to `genfeed`
- Change package scope from `@content-workflow/*` to `@genfeedai/*`
- Prepare repository for public open source release
- Add proper licensing (AGPL-3.0)
- Create self-hosting documentation
- Remove proprietary/internal references

### Non-Goals
- Building the commercial SaaS offering (separate effort)
- Marketing or launch strategy
- npm package publishing (packages remain workspace-local)
- CI/CD pipeline setup (separate task)

## User Stories

### Primary User Story
**As a** developer interested in workflow automation
**I want** to self-host Genfeed
**So that** I can build AI-powered content workflows without vendor lock-in

### Additional Stories
- As a contributor, I want clear guidelines on how to contribute
- As a user, I want one-command Docker setup for self-hosting
- As a developer, I want to understand the architecture quickly
- As a potential customer, I want to evaluate the product before buying the SaaS

## Requirements

### Functional Requirements

#### Package Renaming
- FR-001: Rename root package from `content-workflow-monorepo` to `genfeed`
- FR-002: Rename `@content-workflow/api` to `@genfeedai/api`
- FR-003: Rename `@content-workflow/web` to `@genfeedai/web`
- FR-004: Rename `@content-workflow/types` to `@genfeedai/types`
- FR-005: Rename `@content-workflow/core` to `@genfeedai/core`
- FR-006: Rename `@content-workflow/storage` to `@genfeedai/storage`
- FR-007: Update all workspace references (`workspace:*`) to use new names

#### Documentation
- FR-008: Rewrite README.md for OSS audience
- FR-009: Add CONTRIBUTING.md with contribution guidelines
- FR-010: Add CODE_OF_CONDUCT.md
- FR-011: Create .env.example files for all apps
- FR-012: Add self-hosting documentation
- FR-013: Remove internal/proprietary documentation references

#### Licensing
- FR-014: Add AGPL-3.0 LICENSE file to root
- FR-015: Update all package.json `license` fields from "Private"/"UNLICENSED" to "AGPL-3.0"
- FR-016: Add license headers to source files (optional)

#### Self-Hosting
- FR-017: Create root docker-compose.yml for one-command self-hosting
- FR-018: Create Dockerfile for web app
- FR-019: Update existing API Dockerfile if needed
- FR-020: Document required environment variables
- FR-021: Provide example configurations (development, production)

#### Cleanup
- FR-022: Remove or sanitize `.agent/` internal documentation
- FR-023: Remove GitHub username references (VincentShipsIt → generic)
- FR-024: Ensure no hardcoded internal URLs remain
- FR-025: Verify .gitignore covers all sensitive files

### Non-Functional Requirements
- NFR-001: All existing functionality must continue to work after rebrand
- NFR-002: bun install must succeed after all renames
- NFR-003: bun dev must start both apps without errors
- NFR-004: Docker compose must build and run successfully
- NFR-005: README must be understandable by first-time visitors

## Technical Design

### File Changes Required

#### Root Level
```
package.json              # name: "genfeed"
README.md                 # Complete rewrite for OSS
LICENSE                   # New: AGPL-3.0
CONTRIBUTING.md           # New: Contribution guidelines
CODE_OF_CONDUCT.md        # New: Community standards
docker-compose.yml        # New: Self-hosting
.env.example              # New: Environment template
```

#### Apps
```
apps/api/package.json     # name: "@genfeedai/api"
apps/api/Dockerfile       # Update if needed
apps/api/.env.example     # New: API env template
apps/web/package.json     # name: "@genfeedai/web"
apps/web/Dockerfile       # New: Web Dockerfile
apps/web/.env.example     # New: Web env template
```

#### Packages
```
packages/types/package.json    # name: "@genfeedai/types"
packages/core/package.json     # name: "@genfeedai/core", update deps
packages/storage/package.json  # name: "@genfeedai/storage", update deps
```

### Import Updates

All files importing from `@content-workflow/*` must be updated:
```typescript
// Before
import { WorkflowNode } from '@content-workflow/types';

// After
import { WorkflowNode } from '@genfeedai/types';
```

### Docker Architecture

```yaml
# docker-compose.yml
services:
  web:
    build: ./apps/web
    ports: ["3000:3000"]
    depends_on: [api]

  api:
    build: ./apps/api
    ports: ["3001:3001"]
    depends_on: [mongodb, redis]

  mongodb:
    image: mongo:7
    volumes: [mongodb_data:/data/db]

  redis:
    image: redis:7-alpine
    volumes: [redis_data:/data]
```

## Implementation Plan

### Phase 1: Package Renaming
1. Update root package.json name
2. Update all apps/*/package.json names
3. Update all packages/*/package.json names
4. Update workspace dependency references
5. Run `bun install` to regenerate lockfile
6. Search/replace all imports from `@content-workflow/*` to `@genfeedai/*`
7. Verify `bun dev` works

### Phase 2: Licensing & Legal
1. Add AGPL-3.0 LICENSE file
2. Update all package.json license fields
3. Add license header comment template (optional)

### Phase 3: Documentation
1. Rewrite README.md for OSS
2. Create CONTRIBUTING.md
3. Create CODE_OF_CONDUCT.md
4. Create .env.example files
5. Remove/sanitize internal documentation

### Phase 4: Self-Hosting
1. Create apps/web/Dockerfile
2. Create root docker-compose.yml
3. Test full stack with Docker
4. Document deployment options

### Phase 5: Cleanup & Verification
1. Remove internal references
2. Search for hardcoded URLs
3. Verify .gitignore completeness
4. Test fresh clone and setup
5. Final review

## Success Criteria

1. [ ] All packages renamed to `@genfeedai/*`
2. [ ] `bun install && bun dev` works on fresh clone
3. [ ] `docker compose up` starts full stack
4. [ ] README provides clear getting started guide
5. [ ] AGPL-3.0 license properly applied
6. [ ] No internal/proprietary references remain
7. [ ] .env.example files document all required variables
8. [ ] CONTRIBUTING.md explains how to contribute

## Open Questions

1. Should we keep the `.agent/` directory or remove it entirely for OSS?
   - **Recommendation:** Keep but sanitize - it's useful for AI-assisted development
2. Should we add GitHub Actions for CI/CD?
   - **Recommendation:** Separate task, not blocking for initial release
3. Should we publish packages to npm?
   - **Recommendation:** No, keep as workspace packages for now

## References

- [AGPL-3.0 License](https://www.gnu.org/licenses/agpl-3.0.en.html)
- [n8n OSS Model](https://github.com/n8n-io/n8n) - Similar workflow tool using AGPL
- [Cal.com OSS Model](https://github.com/calcom/cal.com) - Open source with commercial SaaS
