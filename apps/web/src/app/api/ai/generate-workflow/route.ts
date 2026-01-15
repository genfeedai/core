import { type NextRequest, NextResponse } from 'next/server';
import { generateText } from '@/lib/replicate/client';

const SYSTEM_PROMPT = `You are a workflow generator for a visual node-based content creation tool. Given a user's request, output ONLY valid JSON for a workflow.

## Available Node Types

### Input Nodes
- prompt: Text input for prompts
  - outputs: { text }
  - defaultData: { label: "Prompt", status: "idle", prompt: "", variables: {} }

- imageInput: Upload or reference an image
  - outputs: { image }
  - defaultData: { label: "Image Input", status: "idle", image: null, filename: null, dimensions: null, source: "upload" }

- videoInput: Upload or reference a video
  - outputs: { video }
  - defaultData: { label: "Video Input", status: "idle", video: null, filename: null, duration: null, dimensions: null, source: "upload" }

### AI Generation Nodes
- imageGen: Generate images with AI (nano-banana models)
  - inputs: { prompt (text, required), images (image[], optional reference) }
  - outputs: { image }
  - defaultData: { label: "Image Generator", status: "idle", inputImages: [], inputPrompt: null, outputImage: null, model: "nano-banana-pro", aspectRatio: "16:9", resolution: "2K", outputFormat: "jpg", jobId: null }

- videoGen: Generate videos with AI (veo-3.1 models)
  - inputs: { prompt (text, required), image (starting frame), lastFrame (ending frame for interpolation) }
  - outputs: { video }
  - defaultData: { label: "Video Generator", status: "idle", inputImage: null, lastFrame: null, referenceImages: [], inputPrompt: null, negativePrompt: "", outputVideo: null, model: "veo-3.1-fast", duration: 4, aspectRatio: "16:9", resolution: "1080p", generateAudio: false, jobId: null }

- llm: Generate text with LLM
  - inputs: { prompt (text, required) }
  - outputs: { text }
  - defaultData: { label: "LLM", status: "idle", inputPrompt: null, outputText: null, systemPrompt: "You are a creative assistant.", temperature: 0.7, maxTokens: 1024, topP: 0.9, jobId: null }

### Processing Nodes
- imageGridSplit: Split an image into a grid of cells
  - inputs: { image (required) }
  - outputs: { images (multiple) }
  - defaultData: { label: "Grid Split", status: "idle", inputImage: null, outputImages: [], gridRows: 3, gridCols: 3, borderInset: 5, outputFormat: "jpg", quality: 95 }

- animation: Apply easing curve to video
  - inputs: { video (required) }
  - outputs: { video }
  - defaultData: { label: "Animation", status: "idle", inputVideo: null, outputVideo: null, curveType: "preset", preset: "easeInOutCubic", customCurve: [0.645, 0.045, 0.355, 1], speedMultiplier: 1 }

- videoStitch: Concatenate multiple videos
  - inputs: { videos (multiple, required) }
  - outputs: { video }
  - defaultData: { label: "Video Stitch", status: "idle", inputVideos: [], outputVideo: null, transitionType: "crossfade", transitionDuration: 0.5, seamlessLoop: false }

- videoTrim: Trim video to time range
  - inputs: { video (required) }
  - outputs: { video }
  - defaultData: { label: "Video Trim", status: "idle", inputVideo: null, outputVideo: null, startTime: 0, endTime: 60, duration: null, jobId: null }

### Output Nodes
- output: Final workflow output
  - inputs: { media (image/video/text) }
  - defaultData: { label: "Output", status: "idle", inputMedia: null, inputType: null, outputName: "output" }

- preview: Preview media
  - inputs: { media (image/video) }
  - defaultData: { label: "Preview", status: "idle", inputMedia: null, inputType: null, isPlaying: false, volume: 1 }

## Connection Rules (STRICT)
- text output → text input ONLY (sourceHandle: "text", targetHandle: "prompt" or "tweet")
- image output → image input ONLY (sourceHandle: "image", targetHandle: "image" or "images")
- video output → video input ONLY (sourceHandle: "video", targetHandle: "video" or "videos")

## Handle IDs
Input handles (targetHandle): "prompt", "images", "image", "lastFrame", "media", "video", "videos", "tweet"
Output handles (sourceHandle): "text", "image", "video", "images"

## Layout Guidelines
- Position nodes left-to-right, x increases by ~300 per stage
- Position parallel nodes vertically, y increases by ~100-150 per node
- Start x around 50, y around 200-400

## Output Format
Output ONLY a valid JSON object with this structure (no markdown, no explanation):
{
  "name": "Workflow Name",
  "description": "Brief description",
  "nodes": [
    {
      "id": "unique-id",
      "type": "nodeType",
      "position": { "x": number, "y": number },
      "data": { ...defaultData with any customizations }
    }
  ],
  "edges": [
    {
      "id": "edge-id",
      "source": "source-node-id",
      "target": "target-node-id",
      "sourceHandle": "output-handle-id",
      "targetHandle": "input-handle-id"
    }
  ]
}`;

interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
}

interface GeneratedWorkflow {
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

function parseWorkflowFromResponse(response: string): GeneratedWorkflow | null {
  try {
    // Try to extract JSON from the response
    // First, try direct parse
    const trimmed = response.trim();
    if (trimmed.startsWith('{')) {
      return JSON.parse(trimmed);
    }

    // Try to find JSON in markdown code block
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }

    // Try to find JSON object pattern
    const objectMatch = response.match(/\{[\s\S]*"nodes"[\s\S]*"edges"[\s\S]*\}/);
    if (objectMatch) {
      return JSON.parse(objectMatch[0]);
    }

    return null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, conversationHistory } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Build the user prompt with conversation context
    let userPrompt = prompt;
    if (conversationHistory && conversationHistory.length > 0) {
      const context = conversationHistory
        .map((msg: { role: string; content: string }) => `${msg.role}: ${msg.content}`)
        .join('\n');
      userPrompt = `Previous conversation:\n${context}\n\nNew request: ${prompt}`;
    }

    // Generate workflow using LLM
    const response = await generateText({
      prompt: userPrompt,
      system_prompt: SYSTEM_PROMPT,
      max_tokens: 4096,
      temperature: 0.3, // Lower temperature for more consistent JSON output
      top_p: 0.9,
    });

    // Parse the workflow from the response
    const workflow = parseWorkflowFromResponse(response);

    if (!workflow) {
      return NextResponse.json({
        success: false,
        message: response,
        error: 'Failed to parse workflow from response. The AI did not return valid JSON.',
      });
    }

    // Add metadata to workflow
    const completeWorkflow = {
      version: 1,
      ...workflow,
      edgeStyle: 'smoothstep',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: `Generated workflow "${workflow.name}" with ${workflow.nodes.length} nodes and ${workflow.edges.length} connections.`,
      workflow: completeWorkflow,
    });
  } catch (error) {
    console.error('Workflow generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
