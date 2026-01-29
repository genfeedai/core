# Genfeed

Open-source visual workflow editor for AI-powered content creation. Build automated pipelines that generate images, videos, and text using a drag-and-drop interface.

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](LICENSE)

## Features

- **Visual Workflow Editor** - Drag-and-drop nodes to build AI pipelines
- **Type-safe Connections** - Auto-validates connections (image→image, text→text, video→video)
- **Multi-Provider Support** - Replicate, fal.ai, HuggingFace integrations
- **Real-time Execution** - Run workflows and see results update live
- **AI Workflow Generator** - Describe what you want, get a workflow
- **Self-hostable** - Run on your own infrastructure

## Quick Start

```bash
# Clone the repo
git clone https://github.com/genfeedai/core.git
cd core

# Install dependencies
bun install

# Copy environment config
cp apps/api/.env.example apps/api/.env

# Add your API tokens to apps/api/.env (see Setup Guide below)

# Start development servers
bun dev
```

Open http://local.genfeed.ai:3000 in your browser.

## Self-Hosting with Docker

```bash
# Copy and configure environment
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your API tokens

# Start all services
docker compose up -d

# Access the app at http://localhost:3000
```

## Architecture

```
genfeed/
├── apps/
│   ├── web/         # Next.js 16 frontend
│   └── api/         # NestJS backend
├── packages/
│   ├── types/       # Shared TypeScript types
│   ├── core/        # Workflow engine (validation, DAG)
│   └── storage/     # Database adapters (MongoDB, SQLite)
```

## Video Generation Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        GENFEED VIDEO GENERATION PIPELINE                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │   WORKFLOW   │    │  EXECUTION   │    │ ORCHESTRATOR │                  │
│  │   EDITOR     │───▶│   SERVICE    │───▶│    QUEUE     │                  │
│  │  (React Flow)│    │   (NestJS)   │    │  (BullMQ)    │                  │
│  └──────────────┘    └──────────────┘    └──────┬───────┘                  │
│                                                  │                          │
│                          ┌───────────────────────┼───────────────────────┐  │
│                          │                       │                       │  │
│                          ▼                       ▼                       ▼  │
│               ┌──────────────────┐    ┌──────────────────┐    ┌────────────┐│
│               │ VIDEO GENERATION │    │ IMAGE GENERATION │    │    LLM     ││
│               │    Replicate     │    │    Replicate     │    │  OpenAI    ││
│               │  • veo-3.1-fast  │    │  • flux-dev      │    │  • GPT-4o  ││
│               │  • kling-v2.5    │    │  • sdxl          │    │  • Claude  ││
│               └────────┬─────────┘    └────────┬─────────┘    └─────┬──────┘│
│                        │                       │                     │      │
│                        └───────────────────────┼─────────────────────┘      │
│                                                ▼                            │
│                                    ┌──────────────────┐                     │
│                                    │  POST-PROCESSING │                     │
│                                    │    (Optional)    │                     │
│                                    │  • Frame Extract │                     │
│                                    │  • Video Upscale │                     │
│                                    │  • Lip Sync      │                     │
│                                    │  • TTS (11Labs)  │                     │
│                                    └────────┬─────────┘                     │
│                                             │                               │
│                                             ▼                               │
│                                    ┌──────────────────┐                     │
│                                    │     STORAGE      │                     │
│                                    │    (MongoDB)     │                     │
│                                    │  + Gallery View  │                     │
│                                    └──────────────────┘                     │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Queues: workflow-orchestrator │ video-generation │ image-generation │ llm  │
│  Concurrency:       10         │        2         │        5         │  10  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Node Types

| Category | Nodes |
|----------|-------|
| Input | Prompt, Image Input, Video Input, Template |
| AI | Image Generator, Video Generator, LLM |
| Processing | Animation, Video Stitch, Video Trim, Annotation |
| Output | Output, Preview, Social Publish |

## Setup Guide

### 1. Replicate API Token (Required)

Replicate hosts AI models for image/video generation.

1. Go to [replicate.com](https://replicate.com) and sign up (GitHub login works)
2. Navigate to [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens)
3. Click **Create token**, copy it
4. Add to `apps/api/.env`:
   ```
   REPLICATE_API_TOKEN=r8_your_token_here
   ```

> **Billing**: Replicate charges per prediction. New accounts get free credits. See [replicate.com/pricing](https://replicate.com/pricing).

### 2. MongoDB Database

#### Option A: Local (Development)

```bash
# macOS
brew install mongodb-community && brew services start mongodb-community

# Docker
docker run -d -p 27017:27017 --name mongodb mongo:7
```

Add to `apps/api/.env`:
```
MONGODB_URI=mongodb://localhost:27017/genfeed
```

#### Option B: MongoDB Atlas (Production)

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas/database) and create a free account
2. Create a free M0 cluster (512MB, free forever)
3. Click **Connect** → **Drivers** → Copy connection string
4. Replace `<password>` with your database user password
5. Add to `apps/api/.env`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/genfeed?retryWrites=true&w=majority
   ```

### 3. Redis (Required for job queues)

#### Option A: Local

```bash
# macOS
brew install redis && brew services start redis

# Docker
docker run -d -p 6379:6379 --name redis redis:7
```

Add to `apps/api/.env`:
```
REDIS_HOST=localhost
REDIS_PORT=6379
```

#### Option B: Upstash (Serverless)

1. Go to [upstash.com](https://upstash.com) and create a free account
2. Create a new Redis database
3. Copy the connection details
4. Add to `apps/api/.env`:
   ```
   REDIS_HOST=your-endpoint.upstash.io
   REDIS_PORT=6379
   REDIS_PASSWORD=your_password
   ```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `REPLICATE_API_TOKEN` | Replicate API key (required) |
| `MONGODB_URI` | MongoDB connection string |
| `REDIS_HOST` | Redis host for job queues |
| `REDIS_PORT` | Redis port (default: 6379) |
| `REDIS_PASSWORD` | Redis password (optional) |

See [apps/api/.env.example](apps/api/.env.example) for all options.

## Tech Stack

### Frontend
| Technology | Version | Description |
|------------|---------|-------------|
| [Next.js](https://nextjs.org) | 16 | React framework with App Router |
| [React](https://react.dev) | 19 | UI library |
| [React Flow](https://reactflow.dev) | 12.10 | Visual workflow editor |
| [Tailwind CSS](https://tailwindcss.com) | 4.1 | Utility-first CSS framework |
| [Zustand](https://zustand-demo.pmnd.rs) | 5.0 | State management |
| [Radix UI](https://radix-ui.com) | Latest | Accessible UI primitives |

### Backend
| Technology | Version | Description |
|------------|---------|-------------|
| [NestJS](https://nestjs.com) | 11 | Node.js framework |
| [MongoDB](https://mongodb.com) / [MongoDB Atlas](https://www.mongodb.com/atlas) | 8.9 (Mongoose) | Document database (local or cloud) |
| [Redis](https://redis.io) | 7 | In-memory data store |
| [BullMQ](https://bullmq.io) | 5.66 | Job queue system |
| [Replicate SDK](https://replicate.com) | 1.0 | AI model API client |

### Infrastructure
| Technology | Description |
|------------|-------------|
| [Bun](https://bun.sh) | JavaScript runtime & package manager |
| [Docker](https://docker.com) | Containerization |
| [Biome](https://biomejs.dev) | Linter & formatter |
| [Vitest](https://vitest.dev) | Testing framework |
| [Husky](https://typicode.github.io/husky) | Git hooks |

### AI Providers
| Provider | Use Case |
|----------|----------|
| [Replicate](https://replicate.com) | Image & video generation models |
| [fal.ai](https://fal.ai) | Fast inference endpoints |
| [HuggingFace](https://huggingface.co) | Open-source models |

### Database Options

**Local Development:**
```bash
# MongoDB local instance
MONGODB_URI=mongodb://localhost:27017/genfeed
```

**Production with MongoDB Atlas:**
```bash
# MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/genfeed?retryWrites=true&w=majority
```

Get a free MongoDB Atlas cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas/database)

## Commercial Offering

Looking for a managed solution? [Genfeed.ai](https://genfeed.ai) offers:
- Hosted infrastructure
- Team collaboration
- Priority support
- Additional AI models

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[AGPL-3.0](LICENSE) - You can use, modify, and distribute this software. If you run a modified version as a service, you must release your changes under AGPL-3.0.

## Credits

Built with [React Flow](https://reactflow.dev), powered by [Replicate](https://replicate.com).
