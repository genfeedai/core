# Decisions: perf-dry-optimization

Date: 2026-02-02

## 1) Break compatibility for workflow list
- **Decision:** Change `GET /workflows` to return summary fields only (no nodes/edges/groups).
- **Alternatives:** Add `/workflows/summary` or `?fields=summary` while keeping old response.
- **Why:** User requested no backward compatibility and payload size is a major perf issue.

## 2) Enforce webhook verification
- **Decision:** Require a shared webhook secret for Replicate webhooks.
- **Alternatives:** Optional verification or signature-only validation.
- **Why:** Current endpoint accepts any payload; shared secret is the simplest reliable fix.

## 3) Do not persist provider API keys in localStorage
- **Decision:** Keep API keys in-memory only; do not read/write them to localStorage.
- **Alternatives:** Encrypt at rest in localStorage or store server-side.
- **Why:** Storing raw keys in localStorage is a security risk; this is the fastest clean fix.

## 4) Single source of truth for pricing/costs
- **Decision:** Move client cost calculation to `@genfeedai/core` and remove pricing duplication in web.
- **Alternatives:** Keep web pricing constants and manually sync.
- **Why:** Current duplication already drifted; single source prevents mismatches.

## 5) Add missing indexes and pagination
- **Decision:** Add compound indexes for hot sorts and add pagination to executions listing.
- **Alternatives:** Keep full list responses and rely on client filtering.
- **Why:** Unbounded queries and missing indexes are known latency and memory risks.

## 6) Align React/TypeScript versions across workspace
- **Decision:** Pin React/ReactDOM and TypeScript to the same versions in all packages.
- **Why:** Prevent bundle duplication and typecheck drift.

## 7) A11y and design consistency fixes in-place
- **Decision:** Use accessible labels on icon-only buttons and replace hardcoded category colors with CSS variables.
- **Why:** Low-effort improvements with immediate user impact.
