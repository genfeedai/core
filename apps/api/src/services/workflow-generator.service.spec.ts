import type { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkflowGeneratorService } from '@/services/workflow-generator.service';

// Mock Replicate
vi.mock('replicate', () => {
  return {
    default: vi.fn().mockImplementation(function () {
      return { run: vi.fn() };
    }),
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
    (Replicate as unknown as ReturnType<typeof vi.fn>).mockImplementation(function () {
      return { run: mockReplicateRun };
    });

    mockConfigService = {
      get: vi.fn().mockReturnValue('test-api-token'),
    } as unknown as ConfigService;

    service = new WorkflowGeneratorService(mockConfigService);
  });

  describe('generate', () => {
    it('should generate a workflow from description', async () => {
      const mockWorkflow = {
        description: 'Generate an image',
        edges: [
          {
            id: 'e1',
            source: 'prompt-1',
            sourceHandle: 'text',
            target: 'image-gen-1',
            targetHandle: 'prompt',
          },
          {
            id: 'e2',
            source: 'image-gen-1',
            sourceHandle: 'image',
            target: 'output-1',
            targetHandle: 'media',
          },
        ],
        name: 'Image Generation',
        nodes: [
          {
            data: { label: 'Prompt', prompt: 'A sunset', status: 'idle' },
            id: 'prompt-1',
            position: { x: 100, y: 100 },
            type: 'prompt',
          },
          {
            data: { label: 'Image Generator', status: 'idle' },
            id: 'image-gen-1',
            position: { x: 400, y: 100 },
            type: 'imageGen',
          },
          {
            data: { label: 'Output', status: 'idle' },
            id: 'output-1',
            position: { x: 700, y: 100 },
            type: 'output',
          },
        ],
      };

      mockReplicateRun.mockResolvedValueOnce([JSON.stringify(mockWorkflow)]);

      const result = await service.generate({
        contentLevel: 'full',
        description: 'Create a workflow that generates an image from a prompt',
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
          contentLevel: 'empty',
          description: 'test',
        })
      ).rejects.toThrow('Replicate API token not configured');
    });

    it('should handle empty content level', async () => {
      const mockWorkflow = {
        description: '',
        edges: [],
        name: 'Empty Workflow',
        nodes: [
          {
            data: { label: 'Prompt', prompt: '', status: 'idle' },
            id: 'p1',
            position: { x: 100, y: 100 },
            type: 'prompt',
          },
        ],
      };

      mockReplicateRun.mockResolvedValueOnce([JSON.stringify(mockWorkflow)]);

      const result = await service.generate({
        contentLevel: 'empty',
        description: 'Create workflow',
      });

      // Verify the prompt includes empty content instructions
      const callArgs = mockReplicateRun.mock.calls[0][1].input.prompt;
      expect(callArgs).toContain('empty');
      expect(result.nodes).toHaveLength(1);
    });

    it('should handle minimal content level', async () => {
      const mockWorkflow = {
        description: 'Test workflow',
        edges: [],
        name: 'Minimal Workflow',
        nodes: [
          {
            data: { label: 'Prompt', prompt: '[Your prompt here]' },
            id: 'p1',
            position: { x: 100, y: 100 },
            type: 'prompt',
          },
        ],
      };

      mockReplicateRun.mockResolvedValueOnce([JSON.stringify(mockWorkflow)]);

      const result = await service.generate({
        contentLevel: 'minimal',
        description: 'Create workflow',
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
        contentLevel: 'empty',
        description: 'test',
      });

      expect(result.name).toBe('Test');
    });

    it('should parse JSON from plain markdown code block', async () => {
      const responseWithMarkdown =
        '```\n{"name": "Test2", "description": "", "nodes": [], "edges": []}\n```';

      mockReplicateRun.mockResolvedValueOnce([responseWithMarkdown]);

      const result = await service.generate({
        contentLevel: 'empty',
        description: 'test',
      });

      expect(result.name).toBe('Test2');
    });

    it('should extract JSON object from mixed response', async () => {
      const mixedResponse =
        'Here is your workflow:\n{"name": "Mixed", "description": "", "nodes": [], "edges": []}\nEnjoy!';

      mockReplicateRun.mockResolvedValueOnce([mixedResponse]);

      const result = await service.generate({
        contentLevel: 'empty',
        description: 'test',
      });

      expect(result.name).toBe('Mixed');
    });

    it('should throw error for invalid JSON response', async () => {
      mockReplicateRun.mockResolvedValueOnce(['This is not JSON at all']);

      await expect(
        service.generate({
          contentLevel: 'empty',
          description: 'test',
        })
      ).rejects.toThrow('Failed to parse generated workflow');
    });

    it('should validate and fix workflow structure', async () => {
      const incompleteWorkflow = {
        edges: [],
        name: '',
        nodes: [
          {
            // Missing position
            data: {}, // Missing label and status
            id: 'old-id',
            type: 'prompt',
          },
        ],
      };

      mockReplicateRun.mockResolvedValueOnce([JSON.stringify(incompleteWorkflow)]);

      const result = await service.generate({
        contentLevel: 'empty',
        description: 'test',
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
        description: '',
        edges: [
          {
            id: 'e1',
            source: 'prompt',
            sourceHandle: 'text',
            target: 'image',
            targetHandle: 'prompt',
          },
        ],
        name: 'Edge Test',
        nodes: [
          { data: {}, id: 'prompt', position: { x: 100, y: 100 }, type: 'prompt' },
          { data: {}, id: 'image', position: { x: 400, y: 100 }, type: 'imageGen' },
        ],
      };

      mockReplicateRun.mockResolvedValueOnce([JSON.stringify(workflowWithEdges)]);

      const result = await service.generate({
        contentLevel: 'empty',
        description: 'test',
      });

      // Edge references should be updated to new IDs
      expect(result.edges[0].source).toBe('node-1');
      expect(result.edges[0].target).toBe('node-2');
    });

    it('should remove edges with invalid node references', async () => {
      const workflowWithInvalidEdge = {
        description: '',
        edges: [
          {
            id: 'e1',
            source: 'node1',
            sourceHandle: 'text',
            target: 'nonexistent',
            targetHandle: 'prompt',
          },
        ],
        name: 'Invalid Edge Test',
        nodes: [{ data: {}, id: 'node1', position: { x: 100, y: 100 }, type: 'prompt' }],
      };

      mockReplicateRun.mockResolvedValueOnce([JSON.stringify(workflowWithInvalidEdge)]);

      const result = await service.generate({
        contentLevel: 'empty',
        description: 'test',
      });

      // Invalid edge should be removed
      expect(result.edges).toHaveLength(0);
    });

    it('should handle array output from Replicate', async () => {
      const _workflow = { description: '', edges: [], name: 'Array Test', nodes: [] };

      // Replicate returns array of strings
      mockReplicateRun.mockResolvedValueOnce([
        '{"name":',
        ' "Array Test",',
        ' "description": "", "nodes": [], "edges": []}',
      ]);

      const result = await service.generate({
        contentLevel: 'empty',
        description: 'test',
      });

      expect(result.name).toBe('Array Test');
    });

    it('should handle string output from Replicate', async () => {
      const workflow = { description: '', edges: [], name: 'String Test', nodes: [] };

      mockReplicateRun.mockResolvedValueOnce(JSON.stringify(workflow));

      const result = await service.generate({
        contentLevel: 'empty',
        description: 'test',
      });

      expect(result.name).toBe('String Test');
    });

    it('should pass error through from Replicate', async () => {
      mockReplicateRun.mockRejectedValueOnce(new Error('API rate limit exceeded'));

      await expect(
        service.generate({
          contentLevel: 'empty',
          description: 'test',
        })
      ).rejects.toThrow('API rate limit exceeded');
    });
  });

  describe('system prompt content', () => {
    it('should include all node types in system prompt', async () => {
      mockReplicateRun.mockResolvedValueOnce([
        '{"name":"Test","description":"","nodes":[],"edges":[]}',
      ]);

      await service.generate({ contentLevel: 'empty', description: 'test' });

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

      // Processing nodes (using generic types with inputType)
      expect(systemPrompt).toContain('reframe');
      expect(systemPrompt).toContain('upscale');
      expect(systemPrompt).toContain('videoStitch');
      expect(systemPrompt).toContain('videoTrim');
      expect(systemPrompt).toContain('annotation');

      // Output nodes
      expect(systemPrompt).toContain('output');
      expect(systemPrompt).toContain('socialPublish');
    });

    it('should include connection rules in system prompt', async () => {
      mockReplicateRun.mockResolvedValueOnce([
        '{"name":"Test","description":"","nodes":[],"edges":[]}',
      ]);

      await service.generate({ contentLevel: 'empty', description: 'test' });

      const systemPrompt = mockReplicateRun.mock.calls[0][1].input.system_prompt;

      expect(systemPrompt).toContain('image output can only connect to image input');
      expect(systemPrompt).toContain('video output can only connect to video input');
      expect(systemPrompt).toContain('text output can only connect to text input');
    });

    it('should include layout guidelines in system prompt', async () => {
      mockReplicateRun.mockResolvedValueOnce([
        '{"name":"Test","description":"","nodes":[],"edges":[]}',
      ]);

      await service.generate({ contentLevel: 'empty', description: 'test' });

      const systemPrompt = mockReplicateRun.mock.calls[0][1].input.system_prompt;

      expect(systemPrompt).toContain('left-to-right');
      expect(systemPrompt).toContain('Input nodes on the left');
      expect(systemPrompt).toContain('Processing nodes in the middle');
      expect(systemPrompt).toContain('Output nodes on the right');
    });
  });
});
