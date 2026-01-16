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
git clone https://github.com/genfeedai/genfeed.git
cd genfeed

# Install dependencies
bun install

# Copy environment config
cp .env.example .env

# Add your Replicate API token to .env
# REPLICATE_API_TOKEN=r8_your_token_here

# Start development servers
bun dev
```

Open http://localhost:3000 in your browser.

## Self-Hosting with Docker

```bash
# Copy and configure environment
cp .env.example .env
# Edit .env with your API tokens

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

## Node Types

| Category | Nodes |
|----------|-------|
| Input | Prompt, Image Input, Video Input, Template |
| AI | Image Generator, Video Generator, LLM |
| Processing | Animation, Video Stitch, Video Trim, Annotation |
| Output | Output, Preview, Social Publish |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `REPLICATE_API_TOKEN` | Replicate API key (required) |
| `MONGODB_URI` | MongoDB connection string |
| `REDIS_HOST` | Redis host for job queues |

See [.env.example](.env.example) for all options.

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
