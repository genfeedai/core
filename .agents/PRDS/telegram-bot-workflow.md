# PRD: Telegram Bot for Workflow Execution

**Status:** In Progress
**Priority:** High
**Created:** 2026-01-31
**Updated:** 2026-01-31
**Author:** Vincent (via Blaise)

---

## Problem

Running GenFeed workflows currently requires the web UI. Users (especially Vincent) want a fast, mobile-friendly way to trigger workflows on the go — snap a photo, pick a workflow, get results back in chat.

## Solution

A Telegram bot integrated as a NestJS module in the **cloud SaaS API** (`cloud/apps/server/api/src/services/telegram-bot/`) that exposes GenFeed workflows as an interactive conversational interface. A new `telegramInput` node type in **core** allows workflows to natively accept Telegram inputs.

## Architecture

### Core (OSS) Changes
- **New node type:** `telegramInput` in `core/packages/types/src/nodes.ts`
  - Category: input
  - Outputs: image handle + text handle
  - Stores chatId and messageId for result delivery
- **Node added to:** `NODE_DEFINITIONS`, `NODE_ORDER`, `WorkflowNodeData` union

### Cloud (SaaS) — Telegram Bot Module
Located at `cloud/apps/server/api/src/services/telegram-bot/`:

| File | Purpose |
|------|---------|
| `telegram-bot.module.ts` | NestJS module registration |
| `telegram-bot.service.ts` | Bot logic using grammy library |
| `telegram-bot.controller.ts` | Webhook endpoint + status check |
| `telegram-bot.constants.ts` | Config constants and env var keys |

**Separate from** the existing `TelegramModule` at `services/integrations/telegram/` (social auth integration).

### Configuration
| Env Var | Description | Default |
|---------|-------------|---------|
| `TELEGRAM_BOT_TOKEN` | Bot API token from @BotFather | — |
| `TELEGRAM_BOT_MODE` | `polling` (dev) or `webhook` (prod) | `polling` |
| `TELEGRAM_BOT_WEBHOOK_URL` | Webhook URL for production | — |
| `TELEGRAM_ALLOWED_USER_IDS` | Comma-separated user IDs (empty = all) | — |

## User Flow

1. User sends `/start` or `/workflows` → Bot displays available workflows as inline buttons
2. User taps a workflow (e.g., "Single Image", "UGC Factory")
3. Bot asks for required inputs based on the workflow's node graph:
   - **Image inputs** → "Send me the source image(s)"
   - **Prompt inputs** → "What style/prompt do you want?" (with defaults shown)
   - **Config inputs** → Inline buttons for options
4. User sends photos/text as requested
5. Bot confirms inputs → "Ready to run? [▶️ Run] [✏️ Edit] [❌ Cancel]"
6. Bot runs workflow → sends progress updates
7. Bot sends results (images/videos) directly in chat

## Available Workflows

| Workflow | Inputs | Output |
|----------|--------|--------|
| Single Image | 1 source image + style prompt | 1 AI-generated image |
| Image Series | 1 source image + prompt + count | Multiple image variations |
| Image to Video | 1 source image + motion prompt | 1 video |
| Single Video | Text prompt + config | 1 generated video |
| Full Pipeline | 1 source image + prompts | Images + videos |
| UGC Factory | Script + avatar image | Lip-synced UGC video |

## Implementation Status

- [x] `telegramInput` node type added to core
- [x] Telegram bot NestJS module created in cloud
- [x] Bot service with grammy (commands, inline keyboards, conversation state)
- [x] Webhook controller and status endpoint
- [x] Wired into cloud AppModule
- [ ] Wire into WorkflowExecutorService for actual execution
- [ ] Send progress updates during execution
- [ ] Send result media (images/videos) back to chat
- [ ] Add audio/video input handling in bot
- [ ] Production webhook setup
