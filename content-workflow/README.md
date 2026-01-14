# Content Workflow

A visual node-based workflow editor for AI-powered content generation, built with Next.js 15 and React Flow.

## Features

### Visual Workflow Editor
- **Drag-and-drop interface** - Build workflows by dragging nodes onto the canvas
- **Type-safe connections** - Automatically validates connections between nodes (image→image, text→text, video→video)
- **Real-time execution** - Run workflows and see results update in real-time
- **Save/Load workflows** - Export workflows as JSON files for reuse

### AI Generation (Replicate)
- **Image Generation**
  - `google/nano-banana` - Fast, affordable image generation ($0.039/image)
  - `google/nano-banana-pro` - High-quality images with up to 14 reference images ($0.15-0.30/image)
- **Video Generation**
  - `google/veo-3.1-fast` - Fast video generation with audio ($0.10-0.15/sec)
  - `google/veo-3.1` - High-quality video with reference images ($0.20-0.40/sec)
- **Text Generation**
  - `meta/meta-llama-3.1-405b-instruct` - LLM for prompt expansion and content planning

### Animation System (from easy-peasy-ease)
- **Preset easing curves** - Linear, ease-in, ease-out, cubic, exponential
- **Custom bezier curves** - Drag control points to create custom animations
- **Visual curve editor** - Interactive SVG-based curve editor
- **Speed control** - Adjust playback speed (0.25x - 4x)

### Video Processing
- **Video stitching** - Concatenate multiple videos with transitions
- **Transition types** - Cut, crossfade, fade, wipe
- **Seamless loop** - Create seamless looping videos

## Node Types

### Input Nodes
| Node | Description | Output |
|------|-------------|--------|
| Image Input | Upload or reference images | Image |
| Prompt | Text prompt for AI generation | Text |
| Template | Preset prompt templates with variables | Text |

### AI Nodes
| Node | Description | Input | Output |
|------|-------------|-------|--------|
| Image Generator | Generate images with nano-banana | Text, Images | Image |
| Video Generator | Generate videos with veo-3.1 | Text, Image, Last Frame | Video |
| LLM | Generate text with meta-llama | Text | Text |

### Processing Nodes
| Node | Description | Input | Output |
|------|-------------|-------|--------|
| Animation | Apply easing curves to video | Video | Video |
| Video Stitch | Concatenate multiple videos | Videos[] | Video |

### Output Nodes
| Node | Description | Input |
|------|-------------|-------|
| Output | Final workflow output | Any |
| Preview | Preview with playback controls | Image/Video |

## Workflow Templates

### 1. Image Series
Generate a series of related images from a concept:
```
[Prompt] → [LLM Expander] → [ImageGen x3] → [Output]
```

### 2. Image to Video
Create interpolated video between two images:
```
[Image 1] ────────────→ [VideoGen] → [Animation] → [Output]
[Image 2] → (lastFrame) ↗     ↑
[Prompt] ──────────────────────
```

### 3. Full Content Pipeline
Complete workflow from concept to final video:
```
[Concept] → [LLM] → [Images x3]
                        ↓
              [Videos x2 (interpolation)]
                        ↓
              [Animation (ease curves)]
                        ↓
              [Video Stitch (seamless)]
                        ↓
                    [Output]
```

## Getting Started

### Prerequisites
- Node.js 18+
- Bun (recommended) or npm
- Replicate API token

### Installation

```bash
# Navigate to the project directory
cd content-workflow

# Install dependencies
bun install

# Copy environment variables
cp .env.example .env.local

# Add your Replicate API token to .env.local
# REPLICATE_API_TOKEN=r8_your_token_here
```

### Development

```bash
# Start the development server
bun dev

# Open http://localhost:3000 in your browser
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `REPLICATE_API_TOKEN` | Your Replicate API token |
| `NEXT_PUBLIC_URL` | Public URL for webhooks (use ngrok for local development) |

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/replicate/image` | POST | Generate image with nano-banana |
| `/api/replicate/video` | POST | Generate video with veo-3.1 |
| `/api/replicate/llm` | POST | Generate text with meta-llama |
| `/api/replicate/webhook` | POST | Handle async job completion |
| `/api/status/[id]` | GET | Check prediction status |
| `/api/video/process` | POST | Process video (animation, stitching) |

## Easing Curves

### Presets
| Name | Bezier Values | Description |
|------|---------------|-------------|
| linear | [0, 0, 1, 1] | No easing |
| easeIn | [0.42, 0, 1, 1] | Slow start |
| easeOut | [0, 0, 0.58, 1] | Slow end |
| easeInOut | [0.42, 0, 0.58, 1] | Slow start and end |
| easeInCubic | [0.55, 0.055, 0.675, 0.19] | Cubic ease in |
| easeOutCubic | [0.215, 0.61, 0.355, 1] | Cubic ease out |
| easeInOutCubic | [0.645, 0.045, 0.355, 1] | Cubic ease in/out |
| easeInExpo | [0.95, 0.05, 0.795, 0.035] | Exponential ease in |
| easeOutExpo | [0.19, 1, 0.22, 1] | Exponential ease out |
| easeInOutExpo | [1, 0, 0, 1] | Exponential ease in/out |

### Custom Curves
Use the Bezier Curve Editor in the Config Panel to create custom easing curves by dragging the control points.

## Project Structure

```
content-workflow/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── api/                # API routes
│   │   │   ├── replicate/      # Replicate API endpoints
│   │   │   ├── status/         # Job status endpoint
│   │   │   └── video/          # Video processing
│   │   ├── page.tsx            # Main workflow page
│   │   └── layout.tsx          # Root layout
│   │
│   ├── components/
│   │   ├── canvas/             # Workflow canvas
│   │   ├── nodes/              # Node components
│   │   │   ├── input/          # Input nodes
│   │   │   ├── ai/             # AI generation nodes
│   │   │   ├── processing/     # Processing nodes
│   │   │   └── output/         # Output nodes
│   │   └── panels/             # Side panels
│   │
│   ├── lib/
│   │   ├── replicate/          # Replicate API client
│   │   └── easing/             # Easing curve utilities
│   │
│   ├── store/                  # Zustand stores
│   │   ├── workflowStore.ts    # Nodes, edges, workflow ops
│   │   ├── executionStore.ts   # Execution state
│   │   └── uiStore.ts          # UI state
│   │
│   ├── templates/              # Workflow templates
│   └── types/                  # TypeScript types
│
├── package.json
├── next.config.ts
└── README.md
```

## Technologies

- **Framework**: Next.js 15 (App Router)
- **UI**: React 19, Tailwind CSS
- **Workflow**: React Flow (@xyflow/react)
- **State**: Zustand
- **AI**: Replicate API
- **Language**: TypeScript

## License

Private - For internal use only.

## Credits

- Node-based workflow architecture inspired by [node-banana](https://github.com/VincentShipsIt/node-banana)
- Easing curve system inspired by [easy-peasy-ease](https://github.com/VincentShipsIt/easy-peasy-ease)
- AI models powered by [Replicate](https://replicate.com)
