# PRD: Telegram Bot — Core + Cloud

**Status:** Draft → In Progress
**Priority:** High
**Created:** 2026-01-31
**Author:** Vincent (via Blaise)

---

## Problem

The TG bot was only built for cloud. Vincent needs it to work with core on localhost too — same functionality, self-hostable.

## Architecture

### Core (OSS — self-hosted)
```
core/apps/telegram-bot/          ← NEW standalone app
├── src/
│   ├── main.ts                  # Entry point
│   ├── bot.ts                   # Grammy bot with workflow execution
│   ├── state.ts                 # Conversation state machine
│   └── executor.ts              # Direct WorkflowEngine integration
├── package.json
├── tsconfig.json
├── Dockerfile
└── .env.example
```

- Runs standalone: `cd core/apps/telegram-bot && bun run start`
- Uses `@genfeedai/workflows` for workflow JSONs
- Uses `@genfeedai/core` for validation
- Executes via Replicate directly (bring your own API key)
- No database needed — stateless, in-memory session state
- Configurable via env vars only

### Cloud (SaaS — managed)
```
cloud/apps/server/api/src/services/telegram-bot/   ← EXISTING
```

- NestJS module inside the cloud API
- Uses cloud's ReplicateService, DB, auth, credits system
- Managed bot token — users don't need their own
- Usage tracking, credit deduction per execution

### Shared
Both read workflows from `@genfeedai/workflows` package and use the same state machine logic. Core version is simpler (no DB, no credits), cloud version extends with SaaS features.

## Core Bot Features
- `/start` — Welcome + commands
- `/workflows` — List available workflows as inline buttons
- `/status` — Check running workflow progress
- `/cancel` — Cancel current workflow
- State machine: idle → selecting → collecting → confirming → running → idle
- Block new workflows while one is running
- Download photos → pass as image input
- Execute via Replicate API directly
- Send results (images/videos) back in chat
- Real-time progress updates

## Environment Variables (Core)
```
TELEGRAM_BOT_TOKEN=
TELEGRAM_ALLOWED_USER_IDS=5681411083
REPLICATE_API_TOKEN=
```

## Docker
Add to core's docker-compose.yml as optional service:
```yaml
telegram-bot:
  build: ./apps/telegram-bot
  env_file: .env
  depends_on:
    - api
```

## Success Criteria
- [ ] `cd core/apps/telegram-bot && bun run start` — bot runs
- [ ] All 6 workflows selectable via buttons
- [ ] Photo upload → workflow execution → results in chat
- [ ] Works without cloud, DB, or any SaaS dependency
- [ ] Cloud version still works independently
