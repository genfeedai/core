# Architecture - Genfeed Core

**Purpose:** Document what IS implemented (not what WILL BE).
**Last Updated:** 2026-01-21

---

## Overview

Genfeed Core is an AI workflow orchestration platform for content creation. It provides a visual node-based editor for building AI-powered content generation pipelines, connecting various AI services (image, video, audio, text generation) into automated workflows.

The platform enables users to:
- Design visual workflows using a node-based interface
- Chain multiple AI operations together
- Process content through queued job execution
- Track costs and usage across AI providers

---

## Tech Stack

### Frontend
- **Framework:** Next.js 16, React 19
- **Flow Editor:** @xyflow/react (React Flow)
- **State Management:** Zustand
- **Styling:** Tailwind CSS 4.1

### Backend
- **Framework:** NestJS 11
- **Database:** MongoDB 8.9 (Mongoose)
- **Cache/Queue:** Redis 7, BullMQ 5.66
- **Runtime:** Node.js

### Build Tools
- **Package Manager:** Bun 1.3.5
- **Monorepo:** Turbo 2.7.5
- **Linting:** Biome 2.3

---

## Project Structure

```
core/
├── apps/
│   ├── api/                 # NestJS backend services
│   │   ├── src/
│   │   │   ├── modules/     # Feature modules (workflows, nodes, jobs)
│   │   │   ├── processors/  # BullMQ job processors
│   │   │   └── services/    # Shared services
│   │   └── main.ts
│   └── web/                 # Next.js frontend
│       ├── app/             # App router pages
│       ├── components/      # React components
│       └── stores/          # Zustand stores
├── packages/
│   ├── core/                # Shared business logic
│   │   └── src/
│   │       ├── pricing.ts   # Cost calculation
│   │       └── workflow/    # Workflow execution
│   ├── types/               # TypeScript definitions
│   │   └── src/
│   │       └── nodes.ts     # 36 node type definitions
│   ├── prompts/             # Prompt templates
│   └── workflows/            # Workflow definitions
└── turbo.json
```

---

## Key Components

### WorkflowProcessor

**Purpose:** Executes workflow graphs by traversing nodes in dependency order
**Location:** `apps/api/src/processors/workflow.processor.ts`
**Dependencies:** BullMQ, NodeExecutor, CostCalculator

### QueueManager

**Purpose:** Manages BullMQ queues for async job processing
**Location:** `apps/api/src/services/queue.service.ts`
**Dependencies:** Redis, BullMQ

### CostCalculator

**Purpose:** Calculates costs for AI operations across providers
**Location:** `packages/core/src/pricing.ts`
**Dependencies:** Provider pricing data

### ReplicateService

**Purpose:** Integration with Replicate API for model inference
**Location:** `apps/api/src/services/replicate.service.ts`
**Dependencies:** Replicate SDK, QueueManager

### NodeExecutor

**Purpose:** Executes individual node operations based on type
**Location:** `apps/api/src/services/node-executor.service.ts`
**Dependencies:** AI provider services, type handlers

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                  │
│  │  React   │───▶│  Zustand │───▶│ REST API │                  │
│  │  Flow    │    │  Store   │    │  Client  │                  │
│  └──────────┘    └──────────┘    └────┬─────┘                  │
│                                                                  │
│  Trigger: User clicks "Run" in the web UI (only trigger method) │
└────────────────────────────────────────┼────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                          BACKEND                                │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                  │
│  │  NestJS  │───▶│  Queue   │───▶│Processors│                  │
│  │   API    │    │ Manager  │    │          │                  │
│  └──────────┘    └──────────┘    └────┬─────┘                  │
│                                       │                         │
│                                       ▼                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    BullMQ Queues                          │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │  │
│  │  │ workflow-   │ │  image-     │ │  video-     │        │  │
│  │  │ orchestrator│ │ generation  │ │ generation  │        │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘        │  │
│  │  ┌─────────────┐ ┌─────────────┐                        │  │
│  │  │  llm-       │ │ processing  │                        │  │
│  │  │ generation  │ │             │                        │  │
│  │  └─────────────┘ └─────────────┘                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────┼────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EXTERNAL AI APIS                           │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                  │
│  │Replicate │    │  fal.ai  │    │ElevenLabs│                  │
│  │          │    │          │    │          │                  │
│  └──────────┘    └──────────┘    └──────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## External Services

| Service | Purpose | Documentation |
|---------|---------|---------------|
| Replicate | Model inference (Flux, SDXL, Llama) | https://replicate.com/docs |
| fal.ai | Fast image generation | https://fal.ai/docs |
| ElevenLabs | Voice synthesis | https://elevenlabs.io/docs |

---

## Configuration

### Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `MONGODB_URI` | MongoDB connection string | Yes |
| `REDIS_URL` | Redis connection for queues | Yes |
| `REPLICATE_API_TOKEN` | Replicate API authentication | Yes |
| `FAL_KEY` | fal.ai API key | Yes |
| `ELEVENLABS_API_KEY` | ElevenLabs API key | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `NODE_ENV` | Environment (development/production) | Yes |

---

## Node System

### Handle Types

Strict type compatibility enforced:
- `image` → `image`
- `text` → `text`
- `video` → `video`
- `audio` → `audio`

Incompatible connections are rejected at the editor level.

### Node Categories

36 node types defined in `packages/types/src/nodes.ts`:
- **Input:** ImageInput, TextInput, VideoInput, AudioInput
- **Generation:** TextToImage, ImageToImage, TextToVideo, TextToAudio
- **Processing:** ImageResize, VideoTrim, AudioMix
- **Output:** FileOutput, Preview

---

## Security

See `quality/SECURITY-CHECKLIST.md` for security considerations.

---

## Related Documentation

- `RULES.md` - Coding standards
- `architecture/DECISIONS.md` - Architectural decisions
- `architecture/PROJECT-MAP.md` - Project map
