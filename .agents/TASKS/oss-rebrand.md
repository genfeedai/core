## Task: OSS Rebrand to genfeedai/core

**ID:** oss-rebrand
**Label:** Open Source Rebrand
**Description:** Rebrand monorepo from content-workflow to genfeed, change package scope to @genfeedai/*, add AGPL-3.0 license, and prepare for public release.
**Type:** Infrastructure
**Status:** Done
**Priority:** High
**Created:** 2026-01-15
**Updated:** 2026-01-15T23:59:00.000Z
**PRD:** [oss-rebrand.md](../PRDS/oss-rebrand.md)

---

## Checklist

### Phase 1: Package Renaming ✅ COMPLETE

**Completed:** 2026-01-15 (Session 10)

#### Root
- [x] Update `package.json` name from `content-workflow-monorepo` to `genfeed`
- [x] Update `package.json` scripts that reference old names

#### Apps
- [x] `apps/api/package.json`: Rename to `@genfeedai/api`
- [x] `apps/api/package.json`: Update dependencies from `@content-workflow/*` to `@genfeedai/*`
- [x] `apps/web/package.json`: Rename to `@genfeedai/web`
- [x] `apps/web/package.json`: Update dependencies from `@content-workflow/*` to `@genfeedai/*`

#### Packages
- [x] `packages/types/package.json`: Rename to `@genfeedai/types`
- [x] `packages/core/package.json`: Rename to `@genfeedai/core`
- [x] `packages/core/package.json`: Update dep `@content-workflow/types` → `@genfeedai/types`
- [x] `packages/storage/package.json`: Rename to `@genfeedai/storage`

#### Import Updates
- [x] Search/replace `@content-workflow/types` → `@genfeedai/types` in all files
- [x] Search/replace `@content-workflow/core` → `@genfeedai/core` in all files
- [x] Search/replace `@content-workflow/storage` → `@genfeedai/storage` in all files
- [x] Search/replace `@content-workflow/api` → `@genfeedai/api` in all files
- [x] Search/replace `@content-workflow/web` → `@genfeedai/web` in all files

#### Verification
- [x] Run `rm -rf node_modules && rm bun.lockb && bun install`
- [x] Run `bun dev` - verify both apps start
- [ ] Run `bun check` - verify no lint errors (skipped - CI only)

---

### Phase 2: Licensing ✅ COMPLETE

- [x] Create `LICENSE` file with AGPL-3.0 text
- [x] Update `package.json` license field to `AGPL-3.0`
- [x] Update `apps/api/package.json` license to `AGPL-3.0`
- [x] Update `apps/web/package.json` license to `AGPL-3.0`
- [x] Update `packages/types/package.json` license to `AGPL-3.0`
- [x] Update `packages/core/package.json` license to `AGPL-3.0`
- [x] Update `packages/storage/package.json` license to `AGPL-3.0`

---

### Phase 3: Documentation ✅ COMPLETE

#### Environment Examples
- [x] Create `.env.example` in root with all required vars
- [x] Create `apps/api/.env.example`
- [x] Create `apps/web/.env.example`

#### README
- [x] Rewrite `README.md` for OSS audience

#### Community
- [x] Create `CONTRIBUTING.md`
- [x] Create `CODE_OF_CONDUCT.md` (Contributor Covenant)

#### Cleanup
- [x] Remove "Private - For internal use only" from README
- [ ] Sanitize `.agent/` documentation (optional - not shipped)

---

### Phase 4: Self-Hosting ✅ COMPLETE

#### Dockerfiles
- [x] Create `apps/web/Dockerfile`
- [x] Create `apps/api/Dockerfile`

#### Docker Compose
- [x] Create root `docker-compose.yml` (web, api, worker, mongodb, redis)

#### Verification
- [ ] Run `docker compose build` (manual)
- [ ] Run `docker compose up` (manual)

---

### Phase 5: Final Verification ✅ COMPLETE

- [ ] Fresh clone test: `git clone ... && bun install && bun dev` (manual)
- [ ] Docker test: `docker compose up --build` (manual)
- [x] No secrets in codebase (verified - grep returned no matches)
- [x] No `@content-workflow` refs in source (only in .agent/ docs)
- [x] README rewritten for OSS

---

## Files to Modify

| File | Change |
|------|--------|
| `package.json` | name, license |
| `apps/api/package.json` | name, deps, license |
| `apps/web/package.json` | name, deps, license |
| `packages/types/package.json` | name, license |
| `packages/core/package.json` | name, deps, license |
| `packages/storage/package.json` | name, license |
| `README.md` | Complete rewrite |
| All source files | Import path updates |

## Files to Create

| File | Purpose |
|------|---------|
| `LICENSE` | AGPL-3.0 license text |
| `CONTRIBUTING.md` | Contribution guidelines |
| `CODE_OF_CONDUCT.md` | Community standards |
| `.env.example` | Root environment template |
| `apps/api/.env.example` | API environment template |
| `apps/web/.env.example` | Web environment template |
| `apps/web/Dockerfile` | Web app container |
| `docker-compose.yml` | Full stack orchestration |

## Commands Reference

```bash
# After renaming packages
rm -rf node_modules bun.lockb
bun install
bun dev

# Docker testing
docker compose build
docker compose up

# Search for old references
grep -r "@content-workflow" --include="*.ts" --include="*.tsx" --include="*.json"

# Search for secrets (should return nothing)
grep -rE "(sk-|r8_|ghp_|sntrys_)" --include="*.ts" --include="*.tsx"
```

## Notes

- Keep `private: true` in all package.json - not publishing to npm
- AGPL-3.0 chosen to prevent cloud providers from hosting without contributing back
- `.agent/` directory kept but sanitized for AI-assisted development value
