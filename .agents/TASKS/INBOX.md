# Task Inbox

**Purpose:** Quick capture for tasks. Process regularly.
**Last Updated:** 2026-02-02

---

## How to Use

Add tasks here quickly. Format:

```
- [ ] Task description @priority @due
```

Process into proper task files or complete directly.

---

## Inbox

<!-- Add quick tasks below -->

- [x] ~~**Telegram Bot for Workflow Execution**~~ → **Moved to Cloud SaaS** (2026-02-02)
  - Bot integrations are Cloud-only. Core is UI-triggered only.
  - Cloud location: `cloud/apps/server/api/src/services/telegram-bot/`
  - See: `.agents/SYSTEM/FEATURE-SPLIT.md` for scope decision

- [x] ~~**UGC Factory Integration**~~ → **Done** (2026-02-02)
  - Processing pipeline wired: TTS, lip sync, video stitch, reframe, upscale all in `processing.processor.ts`
  - Distribution nodes implemented (Telegram, Discord, Google Drive) via `DistributionNodeRegistry` (`5042aef`)

- [x] ~~**Replace direct LLM calls with provider abstraction**~~ → **Done** (2026-02-02)
  - Provider selector in SettingsModal with `ProviderType` (`replicate | fal | huggingface`) in use
  - Settings UI allows switching between inference providers

---

## Processed

<!-- Move completed/processed items here with date -->

### 2026-02-02

- [x] UGC Factory Integration — processing pipeline wired, distribution nodes implemented (`5042aef`)
- [x] Replace direct LLM calls with provider abstraction — provider selector in SettingsModal, `ProviderType` in use

### 2026-01-21

- [x] Review and customize `.agent/SYSTEM/RULES.md` - Added project-specific rules section
- [x] Update `.agent/SYSTEM/ARCHITECTURE.md` with project architecture - Full rewrite with tech stack, components, data flow
- [x] Add project-specific rules to `SYSTEM/critical/CRITICAL-NEVER-DO.md` - Added 8 critical rules

### 2026-01-14

- [x] Initial `.agent/` setup complete
- [x] Restructured to kaiban format (TASKS + PRDS folders)
- [x] Created marketplace PRDs and tasks (OSS + Marketplace direction)
  - [marketplace-platform.md](./marketplace-platform.md) - Parent task
  - [seller-system.md](./seller-system.md) - Stripe Connect, payouts
  - [listing-system.md](./listing-system.md) - Listing CRUD
  - [purchase-flow.md](./purchase-flow.md) - Checkout, downloads
  - [reviews-ratings.md](./reviews-ratings.md) - Reviews system
