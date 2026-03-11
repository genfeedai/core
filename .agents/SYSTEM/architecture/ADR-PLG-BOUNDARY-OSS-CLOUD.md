# ADR: PLG Boundary Between Core (OSS) and Cloud (SaaS)

## Status
Accepted

## Boundary Spec Version
v1.1.0

## Last Updated
2026-03-11

## Canonical Source
Cloud ADR mirror.

## Public Canonical URL
https://docs.genfeed.ai/product/core-cloud-boundary

## Decision Summary
Genfeed follows a hybrid OSS + SaaS model:

- `core` is a complete self-hosted/BYOK workflow engine.
- `cloud` is the managed automation layer for outcomes at scale.
- PLG growth comes from convenience, orchestration, and distribution, not by crippling OSS basics.

## Product Boundary

| Capability | Core OSS | Cloud SaaS |
|---|---|---|
| Visual workflow builder | Yes | Yes |
| Local/self-hosted run | Yes | N/A |
| BYOK execution | Yes | Yes |
| Autonomous agent runs | No | Yes |
| Scheduling/cron orchestration | No | Yes |
| Social publishing connectors | Manual export/upload | Managed integrations |
| Cross-workflow analytics and optimization loops | Limited local insight | Full managed analytics |
| Team/org controls, billing, quotas | No | Yes |

## Non-Negotiables

1. Core must remain useful without a Cloud account.
2. Core must preserve workflow build and local/BYOK execution.
3. Cloud-only value should center on automation, publishing, scheduling, analytics, and collaboration.
4. Workflow portability between Core and Cloud remains a required direction.

## Synchronization Contract

- Cloud ADR is engineering source of truth for split decisions.
- Core mirrors this ADR at matching version/structure:
  - `../cloud/.agents/SYSTEM/architecture/ADR-PLG-BOUNDARY-OSS-CLOUD.md`
- `docs.genfeed.ai` reflects the same boundary version publicly.

## Version Bump Checklist

1. Update the Cloud ADR version and last-updated date first.
2. Sync the matching version/date into the Core mirror ADR.
3. Update the public docs page version/date at `../docs/content/product/core-cloud-boundary.mdx`.
4. Run `bash scripts/check-product-boundary-docs.sh` in both `cloud/` and `core/`.
