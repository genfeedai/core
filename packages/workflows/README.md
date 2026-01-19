# @genfeedai/workflows

Official workflow templates for Genfeed - the AI-first content creation platform.

## Installation

```bash
npm install @genfeedai/workflows
# or
bun add @genfeedai/workflows
```

## Usage

### Using the Registry

```typescript
import {
  WORKFLOW_REGISTRY,
  getWorkflowIds,
  getWorkflowMetadata,
  getWorkflowsByCategory,
  searchWorkflowsByTag,
} from '@genfeedai/workflows';

// List all workflow IDs
const ids = getWorkflowIds();
// ['single-image', 'single-video', 'image-series', ...]

// Get metadata for a specific workflow
const metadata = getWorkflowMetadata('single-image');
// { id: 'single-image', name: 'Single Image Generation', ... }

// Get workflows by category
const imageWorkflows = getWorkflowsByCategory('image');

// Search by tag
const simpleWorkflows = searchWorkflowsByTag('simple');
```

### Accessing Workflow Files

The actual workflow JSON files are in the `workflows/` directory:

```typescript
import singleImage from '@genfeedai/workflows/workflows/single-image.json';
import singleVideo from '@genfeedai/workflows/workflows/single-video.json';
```

## Available Workflows

### Image Workflows

| ID | Name | Description |
|----|------|-------------|
| `single-image` | Single Image Generation | Generate an AI image from a source image (img2img) |
| `image-series` | Image Series | Generate related images using LLM expansion |

### Video Workflows

| ID | Name | Description |
|----|------|-------------|
| `single-video` | Single Video Generation | Generate a video from a source image (img2video) |
| `image-to-video` | Image to Video | Create interpolated video between two images |

### Full Pipeline Workflows

| ID | Name | Description |
|----|------|-------------|
| `full-pipeline` | Full Content Pipeline | Complete workflow: concept → images → videos → stitched output |

## Workflow Schema

Each workflow follows the `WorkflowFile` interface from `@genfeedai/types`:

```typescript
interface WorkflowFile {
  version: number;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  edgeStyle: 'bezier' | 'smoothstep' | 'straight';
  groups?: NodeGroup[];
  createdAt: string;
  updatedAt: string;
}
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on submitting new workflows.

## License

AGPL-3.0
