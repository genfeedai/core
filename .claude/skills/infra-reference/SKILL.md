---
name: infra-reference
description: Infrastructure reference for SSH, deployment, services, and cloud commands. Use when asking about servers, deployment, infrastructure, or cloud/ monorepo commands.
license: MIT
metadata:
  author: genfeedai
  version: "1.0.0"
---

# Infrastructure Reference

## Routing

**USE this skill when:**
- User asks about SSH access, server connections, deployment
- User needs EC2 instance details, start/stop commands
- User asks about cloud/ monorepo commands (build, dev, test)
- User asks about service locations and ports
- User needs the full repo table with git remotes

**DO NOT use this skill when:**
- User is writing code in core/ -> Use project CLAUDE.md patterns
- User needs React Flow help -> Use `react-flow` skill
- User wants to create a node -> Use `node-creator` skill
- User is fixing a bug -> Use `bugfix` skill

**Expected outputs:**
- SSH commands, instance IDs, connection details
- Service port mappings
- Cloud/ monorepo commands

## EC2 API Instance (us-west-1)

- **SSH**: `ssh ec2-user@api.genfeed.ai`
- **Instance**: `i-0616d0f4e5d254fa0`
- **EBS Volume**: `vol-0d7ba6d26237600fe` (200GB gp3)
- **Services**: Redis, API, MCP, Notifications, Files, Telegram, Discord, Slack, Fanvue, Clips, Workers

## EC2 GPU / Darkroom Instance (us-east-1)

- **Tailscale**: `ssh ubuntu@100.106.229.81` (hostname: `comfyui-genfeed-ai`)
- **Instance**: `i-0f1bff4edf6049433` (g6e.xlarge)
- **Region**: `us-east-1`
- **Start**: `aws ec2 start-instances --region us-east-1 --instance-ids i-0f1bff4edf6049433`
- **Stop**: `aws ec2 stop-instances --region us-east-1 --instance-ids i-0f1bff4edf6049433`
- **ComfyUI**: `http://127.0.0.1:8188` (on the instance)
- **SSH key**: `~/.ssh/genfeedai.pem`
- **Services**: ComfyUI, LoRA training, PuLID, ESRGAN upscaling

## Repository Table

| Repository | Remote | Description |
|------------|--------|-------------|
| **cloud/** | `git@github.com:genfeedai/cloud.git` | Main SaaS monorepo |
| **darkroom/** | `git@github.com:genfeedai/darkroom.git` | AI influencer pipeline |
| **core/** | `git@github.com:genfeedai/core.git` | Open source core |
| **cli/** | `git@github.com:genfeedai/cli.git` | CLI tool |
| **design/** | `git@github.com:genfeedai/design.git` | Design studio |
| **docs/** | `git@github.com:genfeedai/docs.git` | Nextra documentation |
| **skills/** | `git@github.com:genfeedai/skills.git` | Claude Code skills (OSS) |
| **skills-pro/** | `git@github.com:genfeedai/skills-pro.git` | Premium skills installer |
| **tools/** | `git@github.com:genfeedai/tools.git` | Internal tools monorepo |

## Active Projects

| Project | Stack | Port |
|---------|-------|------|
| `cloud/apps/web/*` | Next.js 16, 6 apps, bun | 3000+ |
| `cloud/apps/server/*` | NestJS, MongoDB, Redis, BullMQ | 3001-3020 |
| `cloud/packages/*` | Shared types, serializers, enums | - |
| `cloud/apps/extension/` | Plasmo browser extension | - |
| `cloud/apps/mobile/` | React Native (Expo) | - |
| `cli/` | Node.js CLI (@genfeedai/cli) | - |
| `design/` | Vite 6 + React 19 + Tailwind CSS 4 | 4000 |
| `docs/` | Nextra | 3007 |

## Cloud/ Monorepo Commands

```bash
cd cloud  # All commands run from cloud/ directory

# Frontend (cloud/apps/web/)
bun run dev:app:fe    # Start main app (includes studio, automation, workflows)
bun run dev:studio:fe # Start main app (studio routes consolidated)
bun run build:app     # Build single app
# NEVER: bun run build (crashes - builds all apps)

# Backend (cloud/apps/server/)
bun run dev                     # All services
bun run dev -- --projects=api   # API only

# Build packages
bunx turbo build --filter=@genfeedai/enums

# Testing (scoped only — NEVER run full suite)
cd cloud/apps/server/api && bun test src/path/to/file.spec.ts
cd cloud/apps/web/<app> && bun test src/path/to/file.test.ts
cd cloud/packages/<pkg> && bun test src/path/to/file.test.ts
```

## Workspace Directory Structure

```
genfeedai/
├── cloud/                    <- Genfeed Cloud SaaS
│   ├── apps/
│   │   ├── server/           <- NestJS services
│   │   ├── web/              <- Next.js apps (6 apps)
│   │   ├── mobile/           <- Expo React Native
│   │   ├── extension/        <- Plasmo browser extension
│   │   └── ide/              <- VS Code/Cursor extension
│   └── packages/             <- Shared types, serializers, enums
├── cli/                      <- CLI tool
├── core/                     <- OSS Core
├── darkroom/                 <- AI influencer pipeline
├── design/                   <- Design studio
├── docs/                     <- Nextra documentation
├── others/                   <- Parked projects
├── skills/                   <- Claude Code skills (OSS)
├── skills-pro/               <- Premium skills installer
├── tools/                    <- Internal tools monorepo
└── scripts/                  <- Workspace scripts
```

## Parked Projects (in `others/`, not active)

| Project | Stack | Notes |
|---------|-------|-------|
| `others/crm/` | NestJS + Next.js | Merged into admin app |
| `others/getshareable/` | Expo React Native | Uses `api.genfeed.ai` |
| `others/shopify/` | Vite + Remix | Shopify public app |
| `others/studio/` | Next.js | Consolidated into main app |
| `others/workflows/` | Next.js | Consolidated into main app |
