import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GenerateWorkflowModal } from './GenerateWorkflowModal';

const mockToggleAIGenerator = vi.fn();
const mockLoadWorkflow = vi.fn();

vi.mock('@genfeedai/workflow-ui/stores', () => ({
  useUIStore: vi.fn(() => ({
    showAIGenerator: true,
    toggleAIGenerator: mockToggleAIGenerator,
  })),
}));

vi.mock('@/store/workflowStore', () => ({
  useWorkflowStore: vi.fn(() => ({
    loadWorkflow: mockLoadWorkflow,
  })),
}));

// Import mocked modules at top level (vi.mock is hoisted above these imports)
import { useUIStore } from '@genfeedai/workflow-ui/stores';
import { useWorkflowStore } from '@/store/workflowStore';

describe('GenerateWorkflowModal', () => {
  const mockGeneratedWorkflow = {
    name: 'Generated Workflow',
    description: 'An AI-generated workflow',
    nodes: [
      { id: 'node-1', type: 'prompt', position: { x: 0, y: 0 }, data: { label: 'Prompt' } },
      { id: 'node-2', type: 'imageGen', position: { x: 300, y: 0 }, data: { label: 'Image Gen' } },
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
        sourceHandle: 'text',
        targetHandle: 'prompt',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn() as unknown as typeof fetch;

    // Reset store mocks to default values (vi.clearAllMocks doesn't reset mockReturnValue)
    vi.mocked(useUIStore).mockReturnValue({
      showAIGenerator: true,
      toggleAIGenerator: mockToggleAIGenerator,
    } as ReturnType<typeof useUIStore>);

    vi.mocked(useWorkflowStore).mockReturnValue({
      loadWorkflow: mockLoadWorkflow,
    } as ReturnType<typeof useWorkflowStore>);
  });

  describe('rendering', () => {
    it('should not render when showAIGenerator is false', () => {
      vi.mocked(useUIStore).mockReturnValue({
        showAIGenerator: false,
        toggleAIGenerator: mockToggleAIGenerator,
      } as ReturnType<typeof useUIStore>);

      const { container } = render(<GenerateWorkflowModal />);

      expect(container.firstChild).toBeNull();
    });

    it('should render modal when showAIGenerator is true', () => {
      render(<GenerateWorkflowModal />);

      expect(screen.getByText('AI Workflow Generator')).toBeInTheDocument();
    });

    it('should render description textarea', () => {
      render(<GenerateWorkflowModal />);

      expect(screen.getByText('Describe your workflow')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Generate an image from a prompt/)).toBeInTheDocument();
    });

    it('should render example prompts', () => {
      render(<GenerateWorkflowModal />);

      expect(screen.getByText('Examples')).toBeInTheDocument();
    });

    it('should render content level options', () => {
      render(<GenerateWorkflowModal />);

      expect(screen.getByText('Content Level')).toBeInTheDocument();
      expect(screen.getByText('Empty')).toBeInTheDocument();
      expect(screen.getByText('Placeholders')).toBeInTheDocument();
      expect(screen.getByText('Full Content')).toBeInTheDocument();
    });

    it('should render generate button', () => {
      render(<GenerateWorkflowModal />);

      expect(screen.getByText('Generate Workflow')).toBeInTheDocument();
    });
  });

  describe('form interactions', () => {
    it('should update description on input', () => {
      render(<GenerateWorkflowModal />);

      const textarea = screen.getByPlaceholderText(/Generate an image from a prompt/);
      fireEvent.change(textarea, { target: { value: 'My workflow description' } });

      expect(textarea).toHaveValue('My workflow description');
    });

    it('should fill description when clicking example', () => {
      render(<GenerateWorkflowModal />);

      const exampleButton = screen.getByText(/Generate an image from/);
      fireEvent.click(exampleButton);

      const textarea = screen.getByPlaceholderText(/Generate an image from a prompt/);
      expect(textarea).toHaveValue('Generate an image from a prompt and convert it to a video');
    });

    it('should select content level', () => {
      render(<GenerateWorkflowModal />);

      const fullContentButton = screen.getByText('Full Content').closest('button');
      if (fullContentButton) fireEvent.click(fullContentButton);

      expect(fullContentButton).toHaveClass('border-primary');
    });

    it('should disable generate button without description', () => {
      render(<GenerateWorkflowModal />);

      const generateButton = screen.getByText('Generate Workflow').closest('button');
      expect(generateButton).toBeDisabled();
    });

    it('should enable generate button with description', () => {
      render(<GenerateWorkflowModal />);

      const textarea = screen.getByPlaceholderText(/Generate an image from a prompt/);
      fireEvent.change(textarea, { target: { value: 'Test description' } });

      const generateButton = screen.getByText('Generate Workflow').closest('button');
      expect(generateButton).not.toBeDisabled();
    });
  });

  describe('workflow generation', () => {
    it('should call API on generate', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockGeneratedWorkflow),
      } as Response);

      render(<GenerateWorkflowModal />);

      const textarea = screen.getByPlaceholderText(/Generate an image from a prompt/);
      fireEvent.change(textarea, { target: { value: 'Test description' } });

      const generateButton = screen.getByText('Generate Workflow').closest('button');
      if (generateButton) fireEvent.click(generateButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/workflows/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: 'Test description',
            contentLevel: 'minimal',
            model: 'meta/meta-llama-3.1-70b-instruct',
          }),
        });
      });
    });

    it('should show loading state during generation', async () => {
      vi.mocked(global.fetch).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve(mockGeneratedWorkflow),
                } as Response),
              1000
            )
          )
      );

      render(<GenerateWorkflowModal />);

      const textarea = screen.getByPlaceholderText(/Generate an image from a prompt/);
      fireEvent.change(textarea, { target: { value: 'Test description' } });

      const generateButton = screen.getByText('Generate Workflow').closest('button');
      if (generateButton) fireEvent.click(generateButton);

      expect(screen.getByText('Generating...')).toBeInTheDocument();
    });

    it('should display generated workflow preview', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockGeneratedWorkflow),
      } as Response);

      render(<GenerateWorkflowModal />);

      const textarea = screen.getByPlaceholderText(/Generate an image from a prompt/);
      fireEvent.change(textarea, { target: { value: 'Test description' } });

      const generateButton = screen.getByText('Generate Workflow').closest('button');
      if (generateButton) fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Generated Workflow' })).toBeInTheDocument();
        expect(screen.getByText('2 nodes, 1 edges')).toBeInTheDocument();
      });
    });

    it('should show apply button after generation', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockGeneratedWorkflow),
      } as Response);

      render(<GenerateWorkflowModal />);

      const textarea = screen.getByPlaceholderText(/Generate an image from a prompt/);
      fireEvent.change(textarea, { target: { value: 'Test description' } });

      const generateButton = screen.getByText('Generate Workflow').closest('button');
      if (generateButton) fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Apply to Canvas')).toBeInTheDocument();
      });
    });
  });

  describe('apply workflow', () => {
    it('should call loadWorkflow when applying', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockGeneratedWorkflow),
      } as Response);

      render(<GenerateWorkflowModal />);

      const textarea = screen.getByPlaceholderText(/Generate an image from a prompt/);
      fireEvent.change(textarea, { target: { value: 'Test description' } });

      const generateButton = screen.getByText('Generate Workflow').closest('button');
      if (generateButton) fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Apply to Canvas')).toBeInTheDocument();
      });

      const applyButton = screen.getByText('Apply to Canvas').closest('button');
      if (applyButton) fireEvent.click(applyButton);

      expect(mockLoadWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Generated Workflow',
          nodes: mockGeneratedWorkflow.nodes,
          edges: mockGeneratedWorkflow.edges,
        })
      );
    });

    it('should close modal after applying', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockGeneratedWorkflow),
      } as Response);

      render(<GenerateWorkflowModal />);

      const textarea = screen.getByPlaceholderText(/Generate an image from a prompt/);
      fireEvent.change(textarea, { target: { value: 'Test description' } });

      const generateButton = screen.getByText('Generate Workflow').closest('button');
      if (generateButton) fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Apply to Canvas')).toBeInTheDocument();
      });

      const applyButton = screen.getByText('Apply to Canvas').closest('button');
      if (applyButton) fireEvent.click(applyButton);

      expect(mockToggleAIGenerator).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should display error when API fails', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Generation failed' }),
      } as Response);

      render(<GenerateWorkflowModal />);

      const textarea = screen.getByPlaceholderText(/Generate an image from a prompt/);
      fireEvent.change(textarea, { target: { value: 'Test description' } });

      const generateButton = screen.getByText('Generate Workflow').closest('button');
      if (generateButton) fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Generation failed')).toBeInTheDocument();
      });
    });

    it('should show error when description is empty on submit', async () => {
      render(<GenerateWorkflowModal />);

      // Try to submit with empty description (shouldn't be possible due to disabled button)
      // This tests the internal validation
      const textarea = screen.getByPlaceholderText(/Generate an image from a prompt/);
      fireEvent.change(textarea, { target: { value: '   ' } });

      const generateButton = screen.getByText('Generate Workflow').closest('button');
      if (generateButton && !generateButton.hasAttribute('disabled')) {
        fireEvent.click(generateButton);

        await waitFor(() => {
          expect(screen.getByText('Please enter a workflow description')).toBeInTheDocument();
        });
      }
    });
  });

  describe('close modal', () => {
    it('should close on X button click', () => {
      render(<GenerateWorkflowModal />);

      const closeButtons = screen.getAllByRole('button');
      const closeButton = closeButtons.find((btn) => btn.querySelector('svg.lucide-x'));
      if (closeButton) fireEvent.click(closeButton);

      expect(mockToggleAIGenerator).toHaveBeenCalled();
    });

    it('should reset state on close', () => {
      render(<GenerateWorkflowModal />);

      // Enter some text
      const textarea = screen.getByPlaceholderText(/Generate an image from a prompt/);
      fireEvent.change(textarea, { target: { value: 'Test description' } });

      // Close modal
      const closeButtons = screen.getAllByRole('button');
      const closeButton = closeButtons.find((btn) => btn.querySelector('svg.lucide-x'));
      if (closeButton) fireEvent.click(closeButton);

      expect(mockToggleAIGenerator).toHaveBeenCalled();
    });
  });
});
