import { Injectable, Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import Replicate from 'replicate';

// =============================================================================
// TYPES
// =============================================================================

export interface GenerateWorkflowDto {
  description: string;
  contentLevel: 'empty' | 'minimal' | 'full';
}

export interface GeneratedNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface GeneratedEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
}

export interface GeneratedWorkflow {
  name: string;
  description: string;
  nodes: GeneratedNode[];
  edges: GeneratedEdge[];
}

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

const SYSTEM_PROMPT = `You are a workflow generator for a visual content creation application. Your task is to convert natural language descriptions into structured JSON workflows.

## Available Node Types

### Input Nodes
- imageInput: Upload or URL image input. Outputs: image
- videoInput: Video file input. Outputs: video
- prompt: Text prompt input. Outputs: text
- template: Preset prompt template. Outputs: text
- audioInput: Audio file input. Outputs: audio

### AI Generation Nodes
- imageGen: Generate images from text/images. Inputs: prompt (text, required), images (image[], optional). Outputs: image
- videoGen: Generate videos from text/images. Inputs: prompt (text, required), image (image, optional). Outputs: video
- llm: Generate text with AI. Inputs: prompt (text, required). Outputs: text
- lipSync: Generate lip-synced video. Inputs: image (optional), video (optional), audio (required). Outputs: video

### Processing Nodes
- resize: Resize images/videos. Inputs: media (image/video, required). Outputs: media
- animation: Apply easing curves to video. Inputs: video (required). Outputs: video
- videoStitch: Concatenate videos. Inputs: videos (video[], required). Outputs: video
- videoTrim: Trim video to time range. Inputs: video (required). Outputs: video
- lumaReframeImage: AI reframe images to different aspect ratios. Inputs: image (required). Outputs: image
- lumaReframeVideo: AI reframe videos. Inputs: video (required). Outputs: video
- topazImageUpscale: AI image upscaling. Inputs: image (required). Outputs: image
- topazVideoUpscale: AI video upscaling. Inputs: video (required). Outputs: video
- imageGridSplit: Split image into grid. Inputs: image (required). Outputs: images[]
- annotation: Add shapes/text to images. Inputs: image (required). Outputs: image

### Output Nodes
- output: Final workflow output. Inputs: media (required)
- preview: Preview with playback. Inputs: media (required)
- socialPublish: Publish to social platforms. Inputs: video (required)

## Connection Rules
- image output can only connect to image input
- video output can only connect to video input
- text output can only connect to text input
- audio output can only connect to audio input

## Response Format
Return ONLY valid JSON with this structure:
{
  "name": "Workflow Name",
  "description": "Brief description",
  "nodes": [
    {
      "id": "unique-id",
      "type": "nodeType",
      "position": { "x": 100, "y": 100 },
      "data": { "label": "Node Label", "status": "idle", ...nodeSpecificData }
    }
  ],
  "edges": [
    {
      "id": "edge-id",
      "source": "sourceNodeId",
      "target": "targetNodeId",
      "sourceHandle": "outputHandleId",
      "targetHandle": "inputHandleId"
    }
  ]
}

## Layout Guidelines
- Arrange nodes left-to-right, top-to-bottom
- Input nodes on the left (x: 100-300)
- Processing nodes in the middle (x: 400-700)
- Output nodes on the right (x: 800-1000)
- Vertical spacing of 150-200px between nodes
- Horizontal spacing of 250-350px between stages

## Node Data Defaults

### imageGen
{
  "label": "Image Generator",
  "status": "idle",
  "model": "nano-banana-pro",
  "aspectRatio": "1:1",
  "resolution": "2K",
  "outputFormat": "jpg",
  "inputImages": [],
  "inputPrompt": null,
  "outputImage": null,
  "jobId": null
}

### videoGen
{
  "label": "Video Generator",
  "status": "idle",
  "model": "veo-3.1-fast",
  "duration": 8,
  "aspectRatio": "16:9",
  "resolution": "1080p",
  "generateAudio": true,
  "negativePrompt": "",
  "inputImage": null,
  "inputPrompt": null,
  "outputVideo": null,
  "jobId": null
}

### prompt
{
  "label": "Prompt",
  "status": "idle",
  "prompt": "",
  "variables": {}
}

### imageInput
{
  "label": "Image Input",
  "status": "idle",
  "image": null,
  "filename": null,
  "dimensions": null,
  "source": "upload"
}

### output
{
  "label": "Output",
  "status": "idle",
  "inputMedia": null,
  "inputType": null,
  "outputName": "output"
}`;

// =============================================================================
// SERVICE
// =============================================================================

@Injectable()
export class WorkflowGeneratorService {
  private readonly logger = new Logger(WorkflowGeneratorService.name);
  private replicate: Replicate | null = null;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('REPLICATE_API_TOKEN');
    if (apiKey) {
      this.replicate = new Replicate({ auth: apiKey });
    }
  }

  async generate(dto: GenerateWorkflowDto): Promise<GeneratedWorkflow> {
    const { description, contentLevel } = dto;

    if (!this.replicate) {
      throw new Error('Replicate API token not configured');
    }

    const userPrompt = this.buildUserPrompt(description, contentLevel);

    this.logger.log(`Generating workflow from description: ${description.substring(0, 100)}...`);

    try {
      // Use Llama for generation
      const output = await this.replicate.run('meta/meta-llama-3.1-70b-instruct', {
        input: {
          prompt: userPrompt,
          system_prompt: SYSTEM_PROMPT,
          max_tokens: 4096,
          temperature: 0.3,
          top_p: 0.9,
        },
      });

      // Parse the response
      const responseText = Array.isArray(output) ? output.join('') : String(output);
      const workflow = this.parseWorkflowResponse(responseText);

      // Validate and fix the workflow
      return this.validateAndFixWorkflow(workflow);
    } catch (error) {
      this.logger.error('Failed to generate workflow', error);
      throw error;
    }
  }

  private buildUserPrompt(description: string, contentLevel: 'empty' | 'minimal' | 'full'): string {
    let contentInstructions = '';

    switch (contentLevel) {
      case 'empty':
        contentInstructions =
          'Leave all input fields empty (prompts, images, etc). User will fill them in.';
        break;
      case 'minimal':
        contentInstructions =
          'Include placeholder text like "[Your prompt here]" in prompt fields. Leave media inputs empty.';
        break;
      case 'full':
        contentInstructions =
          'Generate creative, detailed content for all text fields based on the description. For prompts, write full, descriptive prompts suitable for AI generation.';
        break;
    }

    return `Generate a workflow for the following description:

"${description}"

Content level: ${contentLevel}
${contentInstructions}

Return ONLY the JSON workflow object, no explanations or markdown.`;
  }

  private parseWorkflowResponse(response: string): GeneratedWorkflow {
    // Try to extract JSON from the response
    let jsonStr = response;

    // Remove markdown code blocks if present
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    // Try to find JSON object in the response
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      jsonStr = objectMatch[0];
    }

    try {
      return JSON.parse(jsonStr.trim());
    } catch {
      this.logger.error('Failed to parse workflow JSON', { response: response.substring(0, 500) });
      throw new Error('Failed to parse generated workflow. Please try again.');
    }
  }

  private validateAndFixWorkflow(workflow: GeneratedWorkflow): GeneratedWorkflow {
    // Ensure required fields
    if (!workflow.name) {
      workflow.name = 'Generated Workflow';
    }
    if (!workflow.description) {
      workflow.description = '';
    }
    if (!Array.isArray(workflow.nodes)) {
      workflow.nodes = [];
    }
    if (!Array.isArray(workflow.edges)) {
      workflow.edges = [];
    }

    // Fix node IDs and ensure unique
    const nodeIdMap = new Map<string, string>();
    let nodeCounter = 0;

    for (const node of workflow.nodes) {
      const originalId = node.id;
      const newId = `node-${++nodeCounter}`;
      nodeIdMap.set(originalId, newId);
      node.id = newId;

      // Ensure node has required data
      if (!node.data) {
        node.data = { label: node.type, status: 'idle' };
      }
      if (!node.data.label) {
        node.data.label = node.type;
      }
      if (!node.data.status) {
        node.data.status = 'idle';
      }

      // Ensure position
      if (!node.position) {
        node.position = { x: 100 + nodeCounter * 300, y: 100 };
      }
    }

    // Fix edge references
    let edgeCounter = 0;
    for (const edge of workflow.edges) {
      edge.id = `edge-${++edgeCounter}`;
      edge.source = nodeIdMap.get(edge.source) ?? edge.source;
      edge.target = nodeIdMap.get(edge.target) ?? edge.target;
    }

    // Remove edges with invalid references
    const validNodeIds = new Set(workflow.nodes.map((n) => n.id));
    workflow.edges = workflow.edges.filter(
      (e) => validNodeIds.has(e.source) && validNodeIds.has(e.target)
    );

    return workflow;
  }
}
