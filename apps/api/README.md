# Genfeed API

NestJS backend service for the Genfeed.ai content creation platform. Handles workflow execution, AI model orchestration, and media processing.

## Architecture

```
src/
├── executions/       # Workflow execution management
├── workflows/        # Workflow CRUD operations
├── queue/           # BullMQ job processing
│   ├── processors/  # Job processors by type
│   └── services/    # Queue management
├── replicate/       # Replicate AI integration
├── ffmpeg/          # Local media processing
├── tts/             # Text-to-speech services
└── cost/            # Usage cost calculation
```

## Queue System

The API uses BullMQ with Redis for job processing:

| Queue | Purpose |
|-------|---------|
| `workflow-orchestrator` | Coordinates workflow execution |
| `image-generation` | Image generation jobs (Replicate) |
| `video-generation` | Video generation jobs (Replicate) |
| `llm-generation` | LLM text generation |
| `processing` | Media processing (FFmpeg, TTS, upscaling) |

## Processing Nodes

### Video Frame Extract

Extracts frames from videos using FFmpeg. Useful for chaining video segments:

```
VideoGen → FrameExtract → LLM (continuation) → VideoGen → VideoStitch
```

**Selection Modes:**
- `first` - Extract the first frame
- `last` - Extract the last frame
- `timestamp` - Extract at specific timestamp (seconds)
- `percentage` - Extract at percentage position (0-100)

**Requirements:**
- FFmpeg must be installed on the server
- Videos are processed locally (no external API calls)

**Output:** Base64 data URL (`data:image/jpeg;base64,...`)

### Other Processing Nodes

| Node | Description | Backend |
|------|-------------|---------|
| `lumaReframeImage` | AI image reframing | Replicate |
| `lumaReframeVideo` | AI video reframing | Replicate |
| `topazImageUpscale` | Image upscaling | Replicate |
| `topazVideoUpscale` | Video upscaling | Replicate |
| `lipSync` | Lip sync audio to video | Replicate |
| `textToSpeech` | TTS generation | ElevenLabs/OpenAI |

## Environment Variables

```bash
# Required
MONGODB_URI=mongodb://localhost:27017/genfeed
REDIS_HOST=localhost
REDIS_PORT=6379
REPLICATE_API_TOKEN=r8_xxx

# Optional
REDIS_PASSWORD=
```

## Development

```bash
# Install dependencies
bun install

# Start in development mode
bun run dev

# Start API service only
bun run dev -- --projects=api
```

## Deployment Notes

- FFmpeg is required for video frame extraction
- Redis is required for BullMQ job queues
- MongoDB is required for data persistence
