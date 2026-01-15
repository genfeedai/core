import type { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkflowGeneratorService } from './workflow-generator.service';

// Mock Replicate
vi.mock('replicate', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      run: vi.fn(),
    })),
  };
});

describe('WorkflowGeneratorService', () => {
  let service: WorkflowGeneratorService;
  let mockConfigService: ConfigService;
  let mockReplicateRun: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockReplicateRun = vi.fn();

    // Mock Replicate constructor to capture the run function
    const Replicate = (await import('replicate')).default;
    (Replicate as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      run: mockReplicateRun,
    }));

    mockConfigService = {
      get: vi.fn().mockReturnValue('test-api-token'),
    } as unknown as ConfigService;

    service = new WorkflowGeneratorService(mockConfigService);
  });

  describe('generate', () => {
    it('should generate a workflow from description', async () => {
      const mockWorkflow = {
        name: 'Image Generation',
        description: 'Generate an image',
        nodes: [
          {
            id: 'prompt-1',
            type: 'prompt',
            position: { x: 100, y: 100 },
            data: { label: 'Prompt', status: 'idle', prompt: 'A sunset' },
          },
          {
            id: 'image-gen-1',
            type: 'imageGen',
            position: { x: 400, y: 100 },
            data: { label: 'Image Generator', status: 'idle' },
          },
          {
            id: 'output-1',
            type: 'output',
            position: { x: 700, y: 100 },
            data: { label: 'Output', status: 'idle' },
          },
        ],
        edges: [
          {
            id: 'e1',
            source: 'prompt-1',
            target: 'image-gen-1',
            sourceHandle: 'text',
            targetHandle: 'prompt',
          },
          {
            id: 'e2',
            source: 'image-gen-1',
            target: 'output-1',
            sourceHandle: 'image',
            targetHandle: 'media',
          },
        ],
      };

      mockReplicateRun.mockResolvedValueOnce([JSON.stringify(mockWorkflow)]);

      const result = await service.generate({
        description: 'Create a workflow that generates an image from a prompt',
        contentLevel: 'full',
      });

      expect(mockReplicateRun).toHaveBeenCalledWith(
        'meta/meta-llama-3.1-70b-instruct',
        expect.objectContaining({
          input: expect.objectContaining({
            max_tokens: 4096,
            temperature: 0.3,
            top_p: 0.9,
          }),
        })
      );

      expect(result.name).toBe('Image Generation');
      expect(result.nodes).toHaveLength(3);
      expect(result.edges).toHaveLength(2);
    });

    it('should throw error when no API token configured', async () => {
      const noTokenConfig = {
        get: vi.fn().mockReturnValue(undefined),
      } as unknown as ConfigService;

      const serviceNoToken = new WorkflowGeneratorService(noTokenConfig);

      await expect(
        serviceNoToken.generate({
          description: 'test',
          contentLevel: 'empty',
        })
      ).rejects.toThrow('Replicate API token not configured');
    });

    it('should handle empty content level', async () => {
      const mockWorkflow = {
        name: 'Empty Workflow',
        description: '',
        nodes: [
          {
            id: 'p1',
            type: 'prompt',
            position: { x: 100, y: 100 },
            data: { label: 'Prompt', status: 'idle', prompt: '' },
          },
        ],
        edges: [],
      };

      mockReplicateRun.mockResolvedValueOnce([JSON.stringify(mockWorkflow)]);

      const result = await service.generate({
        description: 'Create workflow',
        contentLevel: 'empty',
      });

      // Verify the prompt includes empty content instructions
      const callArgs = mockReplicateRun.mock.calls[0][1].input.prompt;
      expect(callArgs).toContain('empty');
      expect(result.nodes).toHaveLength(1);
    });

    it('should handle minimal content level', async () => {
      const mockWorkflow = {
        name: 'Minimal Workflow',
        description: 'Test workflow',
        nodes: [
          {
            id: 'p1',
            type: 'prompt',
            position: { x: 100, y: 100 },
            data: { label: 'Prompt', prompt: '[Your prompt here]' },
          },
        ],
        edges: [],
      };

      mockReplicateRun.mockResolvedValueOnce([JSON.stringify(mockWorkflow)]);

      const result = await service.generate({
        description: 'Create workflow',
        contentLevel: 'minimal',
      });

      const callArgs = mockReplicateRun.mock.calls[0][1].input.prompt;
      expect(callArgs).toContain('placeholder');
      expect(result).toBeDefined();
    });

    it('should parse JSON from markdown code block', async () => {
      const responseWithMarkdown =
        '```json\n{"name": "Test", "description": "", "nodes": [], "edges": []}\n```';

      mockReplicateRun.mockResolvedValueOnce([responseWithMarkdown]);

      const result = await service.generate({
        description: 'test',
        contentLevel: 'empty',
      });

      expect(result.name).toBe('Test');
    });

    it('should parse JSON from plain markdown code block', async () => {
      const responseWithMarkdown =
        '```\n{"name": "Test2", "description": "", "nodes": [], "edges": []}\n```';

      mockReplicateRun.mockResolvedValueOnce([responseWithMarkdown]);

      const result = await service.generate({
        description: 'test',
        contentLevel: 'empty',
      });

      expect(result.name).toBe('Test2');
    });

    it('should extract JSON object from mixed response', async () => {
      const mixedResponse =
        'Here is your workflow:\n{"name": "Mixed", "description": "", "nodes": [], "edges": []}\nEnjoy!';

      mockReplicateRun.mockResolvedValueOnce([mixedResponse]);

      const result = await service.generate({
        description: 'test',
        contentLevel: 'empty',
      });

      expect(result.name).toBe('Mixed');
    });

    it('should throw error for invalid JSON response', async () => {
      mockReplicateRun.mockResolvedValueOnce(['This is not JSON at all']);

      await expect(
        service.generate({
          description: 'test',
          contentLevel: 'empty',
        })
      ).rejects.toThrow('Failed to parse generated workflow');
    });

    it('should validate and fix workflow structure', async () => {
      const incompleteWorkflow = {
        name: '',
        nodes: [
          {
            id: 'old-id',
            type: 'prompt',
            // Missing position
            data: {}, // Missing label and status
          },
        ],
        edges: [],
      };

      mockReplicateRun.mockResolvedValueOnce([JSON.stringify(incompleteWorkflow)]);

      const result = await service.generate({
        description: 'test',
        contentLevel: 'empty',
      });

      // Should fix missing name
      expect(result.name).toBe('Generated Workflow');
      // Should fix node ID
      expect(result.nodes[0].id).toBe('node-1');
      // Should add default label
      expect(result.nodes[0].data.label).toBe('prompt');
      // Should add default status
      expect(result.nodes[0].data.status).toBe('idle');
      // Should add default position
      expect(result.nodes[0].position).toBeDefined();
    });

    it('should fix edge references after node ID changes', async () => {
      const workflowWithEdges = {
        name: 'Edge Test',
        description: '',
        nodes: [
          { id: 'prompt', type: 'prompt', position: { x: 100, y: 100 }, data: {} },
          { id: 'image', type: 'imageGen', position: { x: 400, y: 100 }, data: {} },
        ],
        edges: [
          {
            id: 'e1',
            source: 'prompt',
            target: 'image',
            sourceHandle: 'text',
            targetHandle: 'prompt',
          },
        ],
      };

      mockReplicateRun.mockResolvedValueOnce([JSON.stringify(workflowWithEdges)]);

      const result = await service.generate({
        description: 'test',
        contentLevel: 'empty',
      });

      // Edge references should be updated to new IDs
      expect(result.edges[0].source).toBe('node-1');
      expect(result.edges[0].target).toBe('node-2');
    });

    it('should remove edges with invalid node references', async () => {
      const workflowWithInvalidEdge = {
        name: 'Invalid Edge Test',
        description: '',
        nodes: [{ id: 'node1', type: 'prompt', position: { x: 100, y: 100 }, data: {} }],
        edges: [
          {
            id: 'e1',
            source: 'node1',
            target: 'nonexistent',
            sourceHandle: 'text',
            targetHandle: 'prompt',
          },
        ],
      };

      mockReplicateRun.mockResolvedValueOnce([JSON.stringify(workflowWithInvalidEdge)]);

      const result = await service.generate({
        description: 'test',
        contentLevel: 'empty',
      });

      // Invalid edge should be removed
      expect(result.edges).toHaveLength(0);
    });

    it('should handle array output from Replicate', async () => {
      const _workflow = { name: 'Array Test', description: '', nodes: [], edges: [] };

      // Replicate returns array of strings
      mockReplicateRun.mockResolvedValueOnce([
        '{"name":',
        ' "Array Test",',
        ' "description": "", "nodes": [], "edges": []}',
      ]);

      const result = await service.generate({
        description: 'test',
        contentLevel: 'empty',
      });

      expect(result.name).toBe('Array Test');
    });

    it('should handle string output from Replicate', async () => {
      const workflow = { name: 'String Test', description: '', nodes: [], edges: [] };

      mockReplicateRun.mockResolvedValueOnce(JSON.stringify(workflow));

      const result = await service.generate({
        description: 'test',
        contentLevel: 'empty',
      });

      expect(result.name).toBe('String Test');
    });

    it('should pass error through from Replicate', async () => {
      mockReplicateRun.mockRejectedValueOnce(new Error('API rate limit exceeded'));

      await expect(
        service.generate({
          description: 'test',
          contentLevel: 'empty',
        })
      ).rejects.toThrow('API rate limit exceeded');
    });
  });

  describe('system prompt content', () => {
    it('should include all node types in system prompt', async () => {
      mockReplicateRun.mockResolvedValueOnce([
        '{"name":"Test","description":"","nodes":[],"edges":[]}',
      ]);

      await service.generate({ description: 'test', contentLevel: 'empty' });

      const systemPrompt = mockReplicateRun.mock.calls[0][1].input.system_prompt;

      // Input nodes
      expect(systemPrompt).toContain('imageInput');
      expect(systemPrompt).toContain('videoInput');
      expect(systemPrompt).toContain('prompt');
      expect(systemPrompt).toContain('template');

      // AI generation nodes
      expect(systemPrompt).toContain('imageGen');
      expect(systemPrompt).toContain('videoGen');
      expect(systemPrompt).toContain('llm');

      // Processing nodes
      expect(systemPrompt).toContain('lumaReframeImage');
      expect(systemPrompt).toContain('lumaReframeVideo');
      expect(systemPrompt).toContain('topazImageUpscale');
      expect(systemPrompt).toContain('topazVideoUpscale');
      expect(systemPrompt).toContain('videoStitch');
      expect(systemPrompt).toContain('videoTrim');
      expect(systemPrompt).toContain('annotation');

      // Output nodes
      expect(systemPrompt).toContain('output');
      expect(systemPrompt).toContain('preview');
    });

    it('should include connection rules in system prompt', async () => {
      mockReplicateRun.mockResolvedValueOnce([
        '{"name":"Test","description":"","nodes":[],"edges":[]}',
      ]);

      await service.generate({ description: 'test', contentLevel: 'empty' });

      const systemPrompt = mockReplicateRun.mock.calls[0][1].input.system_prompt;

      expect(systemPrompt).toContain('image output can only connect to image input');
      expect(systemPrompt).toContain('video output can only connect to video input');
      expect(systemPrompt).toContain('text output can only connect to text input');
    });

    it('should include layout guidelines in system prompt', async () => {
      mockReplicateRun.mockResolvedValueOnce([
        '{"name":"Test","description":"","nodes":[],"edges":[]}',
      ]);

      await service.generate({ description: 'test', contentLevel: 'empty' });

      const systemPrompt = mockReplicateRun.mock.calls[0][1].input.system_prompt;

      expect(systemPrompt).toContain('left-to-right');
      expect(systemPrompt).toContain('Input nodes on the left');
      expect(systemPrompt).toContain('Processing nodes in the middle');
      expect(systemPrompt).toContain('Output nodes on the right');
    });
  });
});
