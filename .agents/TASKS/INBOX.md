# Task Inbox

**Purpose:** Quick capture for tasks. Process regularly.
**Last Updated:** 2026-01-21

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

- [ ] **Telegram Bot for Workflow Execution** @high
  - New app: `apps/telegram-bot/` — Telegram bot that lets users trigger GenFeed workflows
  - Bot shows available workflows as inline buttons (Single Image, Image Series, Image-to-Video, Full Pipeline, Single Video)
  - User selects workflow → bot asks for required inputs (images via photo upload, prompts via text)
  - Bot runs the workflow via `@genfeedai/core` SDK and returns results
  - Support: photo attachments as workflow image inputs, text prompts, workflow status updates
  - Tech: `grammy` or `telegraf`, `@genfeedai/sdk`, runs as standalone service
  - PRD: [telegram-bot-workflow.md](../PRDS/telegram-bot-workflow.md)

- [ ] **UGC Factory Integration** @high
  - Integrate UGC Factory into the core workflow system
  - The implementation exists (services, processors, controllers, DTOs) per UGC_FACTORY_README.md
  - Needs: wiring into the monorepo build, API routes, web UI for batch creation/monitoring
  - Connect TTS (ElevenLabs), motion video (Kling AI), lip sync pipeline
  - Add UGC Factory as a Telegram bot workflow option
  - PRD: [ugc-factory-integration.md](../PRDS/ugc-factory-integration.md)

- [ ] **Replace direct LLM calls with provider abstraction for AI workflow generator** @medium
  - Currently the workflow generator (`apps/web/src/app/api/ai/generate-workflow/route.ts`) calls Replicate directly via `@/lib/replicate/client`
  - Policy: ALL model interactions must go through inference providers (Replicate, fal.ai, Hugging Face) — never call model APIs directly (no Google Gemini SDK, no OpenAI SDK, etc.)
  - Evaluate adding fal.ai and Hugging Face as alternative LLM providers alongside Replicate
  - The existing `ProviderType` in `packages/types/src/nodes.ts` already defines `'replicate' | 'fal' | 'huggingface'`
  - Consider cost/speed tradeoffs: Replicate Llama 405B is expensive (~$3-5/M input tokens); fal.ai and HF may offer cheaper hosted open-source models
  - Scope: provider selection logic, fallback strategy, shared client interface

---

## Processed

<!-- Move completed/processed items here with date -->

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
