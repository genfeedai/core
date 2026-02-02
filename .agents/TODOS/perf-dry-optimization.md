# Perf & DRY Optimization TODO

- [ ] Add shared cost utilities in `packages/core` and export them
  - Verify: `bun run --filter @genfeedai/core test`

- [ ] Remove pricing/cost duplication in web (switch to shared cost utils)
  - Verify: `bun run --filter @genfeedai/web test`

- [ ] Split Replicate SDK server/client usage (no SDK in client bundle)
  - Verify: `bun run --filter @genfeedai/web test`

- [ ] Tighten Replicate webhook security (shared secret + URL token)
  - Verify: `bun run --filter @genfeedai/web test`

- [ ] Change workflow list API to summary payload + update UI callers
  - Verify: `bun run --filter @genfeedai/api test` and `bun run --filter @genfeedai/web test`

- [ ] Add execution pagination + indexes
  - Verify: `bun run --filter @genfeedai/api test`

- [ ] Align React/ReactDOM/TypeScript versions across workspace
  - Verify: `bun run --filter @genfeedai/web test` and `bun run --filter @genfeedai/api test`

- [ ] Accessibility + design consistency fixes (labels, CSS vars)
  - Verify: `bun run --filter @genfeedai/web test`
