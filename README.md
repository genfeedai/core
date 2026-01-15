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

- **Frontend**: Next.js 16, React 19, Tailwind CSS, React Flow
- **Backend**: NestJS, MongoDB, Redis, BullMQ
- **Runtime**: Bun
- **AI**: Replicate, fal.ai, HuggingFace

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
