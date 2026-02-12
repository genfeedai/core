<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/genfeedai/core/master/.github/banner-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/genfeedai/core/master/.github/banner-light.svg">
    <img alt="Genfeed - AI-Powered Visual Workflow Editor" src="https://raw.githubusercontent.com/genfeedai/core/master/.github/banner-dark.svg" width="800">
  </picture>
</p>

Open-source visual workflow editor for AI-powered content creation. Build automated pipelines that generate images, videos, and text using a drag-and-drop interface.

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](LICENSE)

## Features

- **Visual Workflow Editor** - Drag-and-drop 25+ node types to build AI pipelines
- **Type-safe Connections** - Auto-validates connections by data type (image→image, text→text, video→video)
- **Multi-Provider Support** - Replicate, fal.ai, ElevenLabs, OpenAI integrations
- **Real-time Execution** - SSE streaming with live progress updates
- **AI Workflow Generator** - Describe what you want, get a workflow
- **Debug Mode** - Mock API responses for testing workflows without API costs
- **23 Pre-built Templates** - Ready-to-use workflows for common tasks
- **Prompts Library** - 24+ curated prompts with style settings
- **Multi-Image Output** - Batch generation with gallery view
- **Negative Prompt Selector** - One-click quality controls
- **Subworkflows** - Compose complex pipelines from reusable parts
- **Self-hostable** - Run on your own infrastructure

## Prerequisites

- [Bun](https://bun.sh) (v1.3+) — JavaScript runtime & package manager
- [MongoDB](https://www.mongodb.com/atlas/database) — Document database (local or Atlas free tier)
- [Redis](https://redis.io) — Required for job queues (local or Upstash free tier)
- [Docker](https://docker.com) — Optional, for containerized deployment

### Hosts File (Required)

The app runs on `local.genfeed.ai`. Add this entry to your hosts file:

```bash
# macOS/Linux
echo '127.0.0.1 local.genfeed.ai' | sudo tee -a /etc/hosts

# Windows (run as Administrator)
# Add to C:\Windows\System32\drivers\etc\hosts:
# 127.0.0.1 local.genfeed.ai
```

## Quick Start

```bash
# Clone the repo
git clone https://github.com/genfeedai/core.git
cd core

# Install dependencies
bun install

# Copy environment config
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# Add your API tokens (see Setup Guide below)

# Start development servers
bun dev
```

Open http://local.genfeed.ai:3000 in your browser.

## Self-Hosting with Docker

Docker Compose includes MongoDB and Redis — no manual install needed.

```bash
# Create a root .env with your API tokens
cat > .env << 'EOF'
REPLICATE_API_TOKEN=r8_your_token_here
# Add any other optional keys (see Environment Variables below)
EOF

# Start all services (MongoDB, Redis, API, Web, Worker)
docker compose up -d

# Access the app
# http://local.genfeed.ai:3000 (if hosts entry added)
# http://localhost:3000
```

> **Note:** Docker Compose reads from a root `.env` file and passes variables to all services via `env_file`. The `MONGODB_URI` and `REDIS_HOST` are set automatically to use the containerized MongoDB and Redis instances.

## Architecture

```
genfeed/
├── apps/
│   ├── web/            # Next.js 16 frontend
│   └── api/            # NestJS backend
├── packages/
│   ├── types/          # Shared TypeScript types & Replicate schemas
│   ├── core/           # Workflow engine (validation, DAG, topological sort)
│   ├── workflow-ui/    # Shared UI components (React Flow canvas, nodes, panels)
│   ├── workflows/      # Pre-built workflow templates (23 JSON definitions)
│   └── prompts/        # Curated prompts library (24+ prompts)
```

```mermaid
flowchart LR
    subgraph Frontend
        WE[Workflow Editor<br/>React Flow]
    end

    subgraph Backend
        ES[Execution Service<br/>NestJS]
        OQ[Orchestrator Queue<br/>BullMQ]
    end

    subgraph Processors
        VP[Video Processor]
        IP[Image Processor]
        LP[LLM Processor]
        AP[Audio Processor]
    end

    subgraph Providers
        R[Replicate]
        E[ElevenLabs]
        O[OpenAI]
    end

    WE --> ES --> OQ
    OQ --> VP & IP & LP & AP
    VP & IP --> R
    AP --> E
    LP --> O
```

## Node Types

| Category | Nodes |
|----------|-------|
| Input | Prompt, Image Input, Audio Input, Video Input, Template |
| AI Generation | Image Generator, Video Generator, LLM, Lip Sync, Voice Change, Text to Speech, Transcribe, Motion Control |
| Processing | Resize, Reframe, Upscale, Animation, Video Stitch, Video Trim, Frame Extract, Grid Split, Annotation, Subtitle |
| Output | Output |
| Composition | Workflow Input, Workflow Output, Subworkflow |

## Templates

23 pre-built templates available:

| Category | Templates |
|----------|-----------|
| Video | Extended Video Pipeline, Grid to Video, Voice to Video, Dance Video |
| Social | YouTube Thumbnail Generator, YouTube 10-Min Video, Instagram Carousel, Social Media Brand Kit |
| Avatar | AI Influencer Avatar, Facecam Avatar |
| Content | Stream to Short-Form, Basic Image Generation, Image to Video |

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

#### Option B: MongoDB Atlas (Free Cloud)

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas/database) and create a free account
2. Click **Build a Database** → Select **M0 Free** tier (512MB, free forever)
3. Choose a cloud provider and region closest to you
4. Set a **Database User** username and password (save these — you'll need them)
5. Under **Network Access**, click **Add IP Address** → **Allow Access from Anywhere** (or add your IP)
6. Go to **Database** → Click **Connect** on your cluster → Choose **Drivers**
7. Copy the connection string and replace `<password>` with your database user password
8. Add to `apps/api/.env`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/genfeed?retryWrites=true&w=majority
   ```

> **Tip:** If you skip using Docker Compose, you need to install MongoDB locally or use Atlas. Docker Compose includes MongoDB automatically.

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

### 4. ElevenLabs — Text-to-Speech (Optional)

1. Go to [elevenlabs.io](https://elevenlabs.io) and create an account
2. Navigate to **Profile + API Key** in the bottom-left menu
3. Copy your API key
4. Add to `apps/api/.env`:
   ```
   ELEVENLABS_API_KEY=your_key_here
   ```
5. Enable TTS in the frontend — add to `apps/web/.env.local`:
   ```
   NEXT_PUBLIC_TTS_ENABLED=true
   ```

### 5. Ollama — Local LLM (Optional, Free)

Run LLMs locally without API costs using [Ollama](https://ollama.com).

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull llama3.2

# Ollama runs on http://localhost:11434 by default
```

Add to `apps/api/.env`:
```
OLLAMA_ENABLED=true
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=llama3.2
```

### 6. fal.ai — Fast Inference (Optional)

1. Go to [fal.ai](https://fal.ai) and create an account
2. Navigate to [fal.ai/dashboard/keys](https://fal.ai/dashboard/keys)
3. Create and copy an API key
4. Add to `apps/web/.env.local`:
   ```
   FAL_API_KEY=your_key_here
   ```

### 7. Hugging Face (Optional)

1. Go to [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Create a new token with **Read** access
3. Add to `apps/web/.env.local`:
   ```
   HF_API_TOKEN=hf_your_token_here
   ```

## Environment Variables

### API (`apps/api/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `REPLICATE_API_TOKEN` | Yes | Replicate API key for image/video generation |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `REDIS_HOST` | Yes | Redis host for job queues |
| `REDIS_PORT` | Yes | Redis port (default: `6379`) |
| `REDIS_PASSWORD` | No | Redis password (if required by your provider) |
| `ELEVENLABS_API_KEY` | No | ElevenLabs API key for text-to-speech |
| `OLLAMA_ENABLED` | No | Enable Ollama local LLM (`true`/`false`) |
| `OLLAMA_BASE_URL` | No | Ollama server URL (default: `http://localhost:11434`) |
| `OLLAMA_DEFAULT_MODEL` | No | Ollama model name (default: `llama3.2`) |

### Web (`apps/web/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API URL (default: `http://localhost:3001/api`) |
| `NEXT_PUBLIC_URL` | Yes | Frontend URL (default: `http://localhost:3000`) |
| `REPLICATE_API_TOKEN` | Yes | Replicate API key (for server-side API routes) |
| `FAL_API_KEY` | No | fal.ai API key for fast inference |
| `HF_API_TOKEN` | No | Hugging Face token for model access |
| `NEXT_PUBLIC_TTS_ENABLED` | No | Enable TTS UI (`true`/`false`, default: `false`) |

See [apps/api/.env.example](apps/api/.env.example) and [apps/web/.env.example](apps/web/.env.example) for all options.

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
| [ElevenLabs](https://elevenlabs.io) | Text-to-speech & voice cloning |
| [OpenAI](https://openai.com) | LLM & text generation |

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
