# PRD: AI Quickstart - Natural Language Workflow Generation

**Status:** Done
**Priority:** High
**Complexity:** Medium

---

## Executive Summary

Enable users to generate complete workflows from natural language descriptions. Users describe what they want to create (e.g., "Generate 5 product images and create a promotional video"), and AI generates the appropriate node graph automatically.

---

## Current State

- **Preset templates:** YES - 3 hardcoded templates in `/apps/web/src/templates/`
- **Natural language generation:** NO - Users must manually build workflows or use presets
- **AI capability:** LLM node exists using Meta Llama 3.1 405B via Replicate

---

## User Stories

1. **As a user**, I want to describe my workflow in plain English so I don't need to understand node types
2. **As a user**, I want AI to suggest optimal node configurations based on my description
3. **As a user**, I want to refine generated workflows with follow-up prompts

---

## Technical Implementation

### Phase 1: Backend - Workflow Generation Endpoint

#### Task 1.1: Create WorkflowGenerator Service
**File:** `apps/api/src/workflows/workflow-generator.service.ts`

```typescript
interface GenerateWorkflowDto {
  prompt: string;
  preferences?: {
    imageModel?: 'nano-banana' | 'nano-banana-pro';
    videoModel?: 'veo-fast' | 'veo';
    quality?: 'fast' | 'balanced' | 'high';
  };
}

interface GeneratedWorkflow {
  name: string;
  description: string;
  nodes: Node[];
  edges: Edge[];
  explanation: string;
}
```

**Responsibilities:**
- Parse natural language prompt
- Determine required node types (image, video, LLM, etc.)
- Generate node positions with proper layout
- Create edge connections based on data flow
- Return structured workflow JSON

#### Task 1.2: Create Generation Prompt Template
**File:** `apps/api/src/workflows/prompts/workflow-generation.prompt.ts`

System prompt should include:
- Available node types and their capabilities
- Connection rules (image→image, text→text, etc.)
- Output format specification (JSON schema)
- Layout guidelines (left-to-right flow)

#### Task 1.3: Add Controller Endpoint
**File:** `apps/api/src/workflows/workflows.controller.ts`

```typescript
@Post('generate')
async generateFromPrompt(@Body() dto: GenerateWorkflowDto): Promise<GeneratedWorkflow>
```

---

### Phase 2: Frontend - AI Quickstart UI

#### Task 2.1: Create Quickstart Modal Component
**File:** `apps/web/src/components/quickstart/QuickstartModal.tsx`

**UI Elements:**
- Large text input for natural language description
- Preset template buttons (existing templates)
- "Generate" button with loading state
- Preview of generated workflow before applying
- "Apply" and "Cancel" buttons

#### Task 2.2: Add Quickstart Button to Toolbar
**File:** `apps/web/src/components/Toolbar.tsx`

Add sparkle/magic icon button that opens QuickstartModal.

#### Task 2.3: Create useWorkflowGeneration Hook
**File:** `apps/web/src/hooks/useWorkflowGeneration.ts`

```typescript
export function useWorkflowGeneration() {
  const generateWorkflow = async (prompt: string) => {
    // Call API endpoint
    // Return generated workflow
  };

  const applyWorkflow = (workflow: GeneratedWorkflow) => {
    // Clear current canvas
    // Add generated nodes and edges
  };

  return { generateWorkflow, applyWorkflow, isLoading, error };
}
```

---

### Phase 3: Prompt Engineering

#### Task 3.1: Define Node Type Descriptions

```typescript
const NODE_DESCRIPTIONS = {
  'image-gen': 'Generates images from text prompts using AI',
  'video-gen': 'Creates videos from images or generates from prompts',
  'llm': 'Generates or transforms text using language models',
  'prompt': 'Static text input for providing prompts',
  'output': 'Displays final results (images, videos, text)',
  'image-series': 'Generates multiple related images',
  // ... etc
};
```

#### Task 3.2: Define Connection Rules for AI

```typescript
const CONNECTION_RULES = {
  'prompt': { outputs: ['text'] },
  'llm': { inputs: ['text'], outputs: ['text'] },
  'image-gen': { inputs: ['text'], outputs: ['image'] },
  'video-gen': { inputs: ['image', 'text'], outputs: ['video'] },
  'output': { inputs: ['image', 'video', 'text'] }
};
```

---

## Example Prompts and Expected Outputs

### Example 1: Simple Image Generation
**Input:** "Generate a product photo of a coffee mug"

**Expected Output:**
```json
{
  "nodes": [
    { "type": "prompt", "data": { "text": "Professional product photo of a coffee mug, white background, studio lighting" } },
    { "type": "image-gen", "data": { "model": "nano-banana-pro" } },
    { "type": "output" }
  ],
  "edges": [
    { "source": "prompt-1", "target": "image-gen-1" },
    { "source": "image-gen-1", "target": "output-1" }
  ]
}
```

### Example 2: Complex Pipeline
**Input:** "Create a social media campaign: generate 3 variations of a sunset beach scene, then create a slideshow video"

**Expected Output:**
```json
{
  "nodes": [
    { "type": "prompt", "data": { "text": "Sunset beach scene, golden hour" } },
    { "type": "image-gen", "data": { "model": "nano-banana-pro", "count": 3 } },
    { "type": "video-gen", "data": { "model": "veo-fast" } },
    { "type": "output" }
  ],
  "edges": [...]
}
```

---

## File Creation Checklist

### Backend
- [ ] `apps/api/src/workflows/workflow-generator.service.ts`
- [ ] `apps/api/src/workflows/prompts/workflow-generation.prompt.ts`
- [ ] `apps/api/src/workflows/dto/generate-workflow.dto.ts`
- [ ] Update `apps/api/src/workflows/workflows.controller.ts`
- [ ] Update `apps/api/src/workflows/workflows.module.ts`

### Frontend
- [ ] `apps/web/src/components/quickstart/QuickstartModal.tsx`
- [ ] `apps/web/src/components/quickstart/PromptInput.tsx`
- [ ] `apps/web/src/components/quickstart/WorkflowPreview.tsx`
- [ ] `apps/web/src/hooks/useWorkflowGeneration.ts`
- [ ] Update `apps/web/src/components/Toolbar.tsx`

---

## Success Criteria

1. User can type "Generate product photos" and get a valid workflow
2. Generated workflows are syntactically correct and executable
3. Node positions are well-laid-out (no overlapping)
4. Connections follow data type rules
5. Modal provides clear feedback during generation

---

## Dependencies

- Existing LLM integration (Meta Llama via Replicate)
- React Flow workflow structure
- Zustand workflow store

---

## Estimated Complexity

- Backend: ~300-400 lines of code
- Frontend: ~400-500 lines of code
- Testing: ~200 lines
