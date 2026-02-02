# PRD: Kling Motion Control Integration

**Status:** Done
**Priority:** High
**Feature ID:** KLING-MOTION-CONTROL

---

## Executive Summary

Integrate the Kling v2.6 Motion Control model from Replicate (`kwaivgi/kling-v2.6-motion-control`) into the workflow system. This model enables users to animate static images by painting precise motion paths directly onto elements, creating natural-looking animated videos with controlled movement.

---

## Background & Research

### Kling Motion Control Model

The Kling v2.6 Motion Control model allows users to:
- **Animate static images** by defining motion paths with a brush-based interface
- **Control up to 6 elements** in a single image, each with its own motion trajectory
- **Use reference videos** (3-30 seconds) for complex movements like dance or martial arts
- **Mark static areas** to prevent unwanted camera movement or background shifts

### Model Capabilities

- **Input**: Static image + motion paths (or reference video)
- **Output**: Animated video (MP4)
- **Motion Path System**: Brush-based interface to draw movement trajectories
- **Static Brush**: Mark areas that should remain completely still
- **Reference Videos**: Transfer detailed full-body motion from 3-30 second videos

### Replicate API Details

**Model ID:** `kwaivgi/kling-v2.6-motion-control`

**Input Parameters** (based on Replicate API schema):
- `image` (required): Static image to animate
- `prompt` (optional): Text description of the desired motion
- `reference_video` (optional): Reference video (3-30 seconds) for complex motion transfer
- `motion_paths` (optional): Array of motion path objects (if using brush interface)
- `static_mask` (optional): Areas marked as static to prevent movement
- `duration` (optional): Output video duration in seconds
- `fps` (optional): Frames per second for output video

**Output**: Video URL (MP4 format)

**Pricing**: TBD - Need to verify current Replicate pricing for this model

---

## Feature Requirements

### FR1: Node Type Definition
Create a new `motionControl` node type in the workflow system:
- Category: `ai` (AI generation node)
- Inputs: `image` (required), `video` (optional, for reference), `text` (optional, for prompt)
- Output: `video` (animated video output)
- Icon: `Move` or `Wand2`

### FR2: Backend Service Integration
Add service method to `ReplicateService`:
- Method: `generateMotionControl()`
- Handles image + motion paths input
- Handles image + reference video input
- Creates async prediction with webhook
- Returns prediction ID for tracking

### FR3: API Route
Create Next.js API route:
- Path: `/api/replicate/motion-control`
- Method: `POST`
- Accepts: `nodeId`, `inputs`, `config`
- Returns: `predictionId`, `status`
- Handles webhook callbacks

### FR4: Frontend Node Component
Create React component for motion control node:
- Image upload/selection interface
- Motion path editor (brush-based interface for drawing paths)
- Reference video upload (optional)
- Prompt input field
- Static mask editor (optional)
- Video preview/output display
- Configuration panel for duration, FPS, etc.

### FR5: Cost Tracking
- Add pricing to `PRICING` constant in `replicate.service.ts`
- Integrate cost calculation in webhook handler
- Track costs per prediction in job records

### FR6: Workflow Integration
- Node appears in workflow editor node palette
- Supports connections from `imageInput` and `videoInput` nodes
- Output connects to `video` type nodes (preview, download, social publish)
- Execution flow integrated with existing workflow processor

---

## Technical Design

### Schema Updates

#### 1. Add MotionControlNodeData Type
**File:** `packages/types/src/nodes.ts`

```typescript
export interface MotionControlNodeData extends BaseNodeData {
  // Inputs from connections
  inputImage: string | null;
  inputVideo: string | null; // Reference video for motion transfer
  inputPrompt: string | null;

  // Motion path data (serialized from brush interface)
  motionPaths: Array<{
    id: string;
    element: string; // Element identifier
    path: Array<{ x: number; y: number }>; // Motion path coordinates
    brushSize: number;
  }> | null;

  // Static mask (areas that should not move)
  staticMask: string | null; // Base64 encoded mask image

  // Output
  outputVideo: string | null;

  // Model config
  duration: number; // Output video duration in seconds (default: 5)
  fps: number; // Frames per second (default: 24)
  useReferenceVideo: boolean; // Whether to use reference video instead of motion paths

  // Job state
  jobId: string | null;
}
```

#### 2. Add Node Type to Union
**File:** `packages/types/src/nodes.ts`

```typescript
export type NodeType =
  // ... existing types
  | 'motionControl'
  // ... rest of types

export type WorkflowNodeData =
  // ... existing types
  | MotionControlNodeData
  // ... rest of types
```

#### 3. Add Node Definition
**File:** `packages/types/src/nodes.ts`

```typescript
export const NODE_DEFINITIONS: Record<NodeType, NodeDefinition> = {
  // ... existing definitions
  motionControl: {
    type: 'motionControl',
    label: 'Motion Control',
    description: 'Animate static images with precise motion paths using Kling AI',
    category: 'ai',
    icon: 'Move',
    inputs: [
      { id: 'image', type: 'image', label: 'Image', required: true },
      { id: 'video', type: 'video', label: 'Reference Video' },
      { id: 'prompt', type: 'text', label: 'Motion Prompt' },
    ],
    outputs: [{ id: 'video', type: 'video', label: 'Animated Video' }],
    defaultData: {
      label: 'Motion Control',
      status: 'idle',
      inputImage: null,
      inputVideo: null,
      inputPrompt: null,
      motionPaths: null,
      staticMask: null,
      outputVideo: null,
      duration: 5,
      fps: 24,
      useReferenceVideo: false,
      jobId: null,
    },
  },
  // ... rest of definitions
};
```

### Service Updates

#### 1. Add Model Constant
**File:** `apps/api/src/replicate/replicate.service.ts`

```typescript
export const MODELS = {
  // ... existing models
  klingMotionControl: 'kwaivgi/kling-v2.6-motion-control',
} as const;
```

#### 2. Add Pricing
**File:** `apps/api/src/replicate/replicate.service.ts`

```typescript
export const PRICING = {
  // ... existing pricing
  'kling-motion-control': 0.XX, // TBD - verify pricing on Replicate
} as const;
```

#### 3. Add Service Method
**File:** `apps/api/src/replicate/replicate.service.ts`

```typescript
/**
 * Generate animated video using Kling Motion Control
 */
async generateMotionControl(
  executionId: string,
  nodeId: string,
  input: MotionControlInput
): Promise<PredictionResult> {
  const webhookUrl = this.webhookBaseUrl
    ? `${this.webhookBaseUrl}/api/replicate/webhook`
    : undefined;

  // Build input based on whether using reference video or motion paths
  const modelInput: Record<string, unknown> = {
    image: input.image,
    prompt: input.prompt,
    duration: input.duration ?? 5,
    fps: input.fps ?? 24,
  };

  if (input.useReferenceVideo && input.referenceVideo) {
    modelInput.reference_video = input.referenceVideo;
  } else if (input.motionPaths) {
    // Serialize motion paths for API
    modelInput.motion_paths = input.motionPaths;
  }

  if (input.staticMask) {
    modelInput.static_mask = input.staticMask;
  }

  const prediction = await this.replicate.predictions.create({
    model: MODELS.klingMotionControl,
    input: modelInput,
    ...(webhookUrl && {
      webhook: webhookUrl,
      webhook_events_filter: ['completed'],
    }),
  });

  // Create job record in database
  await this.executionsService.createJob(executionId, nodeId, prediction.id);

  this.logger.log(`Created motion control prediction ${prediction.id} for node ${nodeId}`);

  return prediction as PredictionResult;
}
```

#### 4. Add DTO
**File:** `apps/api/src/replicate/dto/generate-motion-control.dto.ts`

```typescript
export class GenerateMotionControlDto {
  @IsString()
  nodeId: string;

  @IsString()
  @IsUrl()
  image: string;

  @IsString()
  @IsOptional()
  prompt?: string;

  @IsString()
  @IsUrl()
  @IsOptional()
  referenceVideo?: string;

  @IsArray()
  @IsOptional()
  motionPaths?: Array<{
    id: string;
    element: string;
    path: Array<{ x: number; y: number }>;
    brushSize: number;
  }>;

  @IsString()
  @IsOptional()
  staticMask?: string;

  @IsNumber()
  @IsOptional()
  duration?: number;

  @IsNumber()
  @IsOptional()
  fps?: number;

  @IsBoolean()
  @IsOptional()
  useReferenceVideo?: boolean;
}
```

### API Routes

#### 1. Next.js API Route
**File:** `apps/web/src/app/api/replicate/motion-control/route.ts`

```typescript
import { type NextRequest, NextResponse } from 'next/server';
import { generateMotionControl } from '@/lib/replicate/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nodeId, inputs, config } = body;

    const image = inputs.image || config.inputImage;
    if (!image) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 });
    }

    const webhookUrl = process.env.NEXT_PUBLIC_URL
      ? `${process.env.NEXT_PUBLIC_URL}/api/replicate/webhook`
      : undefined;

    const prediction = await generateMotionControl(
      {
        image,
        prompt: inputs.prompt || config.inputPrompt,
        referenceVideo: inputs.video || config.inputVideo,
        motionPaths: config.motionPaths,
        staticMask: config.staticMask,
        duration: config.duration || 5,
        fps: config.fps || 24,
        useReferenceVideo: config.useReferenceVideo ?? false,
      },
      webhookUrl
    );

    return NextResponse.json({
      nodeId,
      predictionId: prediction.id,
      status: prediction.status,
    });
  } catch (error) {
    console.error('Motion control generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
```

#### 2. Frontend Client Method
**File:** `apps/web/src/lib/replicate/client.ts`

```typescript
export interface MotionControlInput {
  image: string;
  prompt?: string;
  referenceVideo?: string;
  motionPaths?: Array<{
    id: string;
    element: string;
    path: Array<{ x: number; y: number }>;
    brushSize: number;
  }>;
  staticMask?: string;
  duration?: number;
  fps?: number;
  useReferenceVideo?: boolean;
}

export async function generateMotionControl(
  input: MotionControlInput,
  webhookUrl?: string
): Promise<PredictionResult> {
  const modelInput: Record<string, unknown> = {
    image: input.image,
    duration: input.duration ?? 5,
    fps: input.fps ?? 24,
  };

  if (input.prompt) {
    modelInput.prompt = input.prompt;
  }

  if (input.useReferenceVideo && input.referenceVideo) {
    modelInput.reference_video = input.referenceVideo;
  } else if (input.motionPaths) {
    modelInput.motion_paths = input.motionPaths;
  }

  if (input.staticMask) {
    modelInput.static_mask = input.staticMask;
  }

  const prediction = await replicate.predictions.create({
    model: MODELS.klingMotionControl,
    input: modelInput,
    ...(webhookUrl && {
      webhook: webhookUrl,
      webhook_events_filter: ['completed'],
    }),
  });

  return prediction as PredictionResult;
}
```

### Frontend Components

#### 1. Motion Control Node Component
**File:** `apps/web/src/components/nodes/motion-control-node.tsx`

```typescript
// Component structure:
// - Image preview/upload
// - Motion path editor (canvas-based brush interface)
// - Reference video upload (optional)
// - Prompt input
// - Static mask editor (optional)
// - Configuration panel (duration, FPS)
// - Output video preview
```

#### 2. Motion Path Editor Component
**File:** `apps/web/src/components/nodes/motion-control-editor.tsx`

```typescript
// Canvas-based brush interface for:
// - Drawing motion paths on image
// - Selecting elements to animate
// - Marking static areas
// - Managing multiple motion paths (up to 6)
```

### Workflow Processor Updates

#### 1. Add Case to Execution Store
**File:** `apps/web/src/store/executionStore.ts`

```typescript
case 'motionControl': {
  const response = await fetch(`/api/replicate/motion-control`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nodeId,
      inputs: Object.fromEntries(inputs),
      config: node.data,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  const result = await response.json();

  if (result.predictionId) {
    get().addJob(nodeId, result.predictionId);
    await pollJob(result.predictionId, nodeId, workflowStore, get());
  } else if (result.output) {
    updateNodeOutput(nodeId, 'motionControl', result.output, workflowStore);
  }
  break;
}
```

#### 2. Add Processor (Backend)
**File:** `apps/api/src/queue/processors/motion-control.processor.ts`

```typescript
@Processor('motion-control')
export class MotionControlProcessor extends WorkerHost {
  // Similar structure to ImageProcessor/VideoProcessor
  // Handles motion control job execution
}
```

---

## Implementation Phases

### Phase 1: Core Integration (MVP)
1. Add `MotionControlNodeData` type to `packages/types/src/nodes.ts`
2. Add node definition to `NODE_DEFINITIONS`
3. Add model constant and pricing to `replicate.service.ts`
4. Create `generateMotionControl()` service method
5. Create API route `/api/replicate/motion-control`
6. Add frontend client method
7. Add case to execution store
8. Basic node component (image upload + simple config)

### Phase 2: Motion Path Editor
1. Create canvas-based motion path editor component
2. Implement brush interface for drawing paths
3. Support for multiple motion paths (up to 6)
4. Static mask editor
5. Path serialization/deserialization

### Phase 3: Reference Video Support
1. Reference video upload interface
2. Video duration validation (3-30 seconds)
3. Toggle between motion paths and reference video modes

### Phase 4: Polish & Testing
1. Error handling and validation
2. Loading states and progress indicators
3. Cost tracking integration
4. Unit and integration tests
5. Documentation

---

## File Changes Summary

### New Files
- `apps/api/src/replicate/dto/generate-motion-control.dto.ts`
- `apps/api/src/queue/processors/motion-control.processor.ts`
- `apps/web/src/app/api/replicate/motion-control/route.ts`
- `apps/web/src/components/nodes/motion-control-node.tsx`
- `apps/web/src/components/nodes/motion-control-editor.tsx`

### Modified Files
- `packages/types/src/nodes.ts` - Add `MotionControlNodeData`, node type, definition
- `apps/api/src/replicate/replicate.service.ts` - Add model, pricing, service method
- `apps/api/src/replicate/replicate.module.ts` - Register new DTO
- `apps/web/src/lib/replicate/client.ts` - Add `generateMotionControl()` method
- `apps/web/src/store/executionStore.ts` - Add `motionControl` case
- `apps/web/src/components/nodes/index.ts` - Export new component
- `apps/api/src/cost/cost-calculator.service.ts` - Add pricing for motion control

---

## Success Criteria

1. **Node Integration:**
   - `motionControl` node appears in workflow editor
   - Node accepts image input and outputs video
   - Node configuration panel works correctly

2. **API Integration:**
   - `/api/replicate/motion-control` route handles requests
   - Service method creates predictions successfully
   - Webhook handler processes completed predictions

3. **Motion Control:**
   - Users can upload image and draw motion paths
   - Users can upload reference video for motion transfer
   - Generated video matches motion paths or reference video

4. **Cost Tracking:**
   - Costs calculated correctly per prediction
   - Cost breakdown stored in job records
   - Cost summary updated in execution records

5. **No Regressions:**
   - All existing tests pass
   - Existing nodes continue to work
   - Workflow execution flow unchanged

---

## Open Questions

1. **Pricing**: What is the current Replicate pricing for `kwaivgi/kling-v2.6-motion-control`? Need to verify on Replicate pricing page.

2. **Motion Path Format**: What exact format does the Replicate API expect for `motion_paths`? Need to check API schema or test with playground.

3. **Static Mask Format**: What format is required for `static_mask`? Base64 image, URL, or specific format?

4. **Reference Video Limits**: Are there file size or resolution limits for reference videos?

5. **Motion Path Editor**: Should we build a custom canvas editor or use an existing library? Consider Fabric.js, Konva.js, or custom implementation.

---

## References

- [Replicate Model: Kling v2.6 Motion Control](https://replicate.com/kwaivgi/kling-v2.6-motion-control)
- [Replicate API Documentation](https://replicate.com/docs/reference/http)
- [Replicate Pricing](https://replicate.com/pricing)
- [Kling AI Motion Control Guide](https://replicate.com/kwaivgi/kling-v2.6-motion-control)
