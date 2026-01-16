import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LLMNode } from './LLMNode';

// Mock ReactFlow
vi.mock('@xyflow/react', () => ({
  Handle: () => null,
  Position: { Left: 'left', Right: 'right' },
}));

// Mock BaseNode
vi.mock('../BaseNode', () => ({
  BaseNode: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="base-node">{children}</div>
  ),
}));

// Mock stores
const mockUpdateNodeData = vi.fn();
const mockExecuteNode = vi.fn();

vi.mock('@/store/workflowStore', () => ({
  useWorkflowStore: (selector: (state: unknown) => unknown) => {
    const state = { updateNodeData: mockUpdateNodeData };
    return selector(state);
  },
}));

vi.mock('@/store/executionStore', () => ({
  useExecutionStore: (selector: (state: unknown) => unknown) => {
    const state = { executeNode: mockExecuteNode };
    return selector(state);
  },
}));

describe('LLMNode', () => {
  const defaultProps = {
    id: 'llm-1',
    type: 'llm',
    data: {
      label: 'LLM',
      systemPrompt: '',
      temperature: 0.7,
      maxTokens: 1024,
      status: 'idle',
    },
    selected: false,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    zIndex: 0,
    dragging: false,
    dragHandle: '',
    parentId: undefined,
    deletable: true,
    selectable: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render model info', () => {
      render(<LLMNode {...defaultProps} />);

      expect(screen.getByText(/meta-llama-3.1-405b-instruct/)).toBeInTheDocument();
    });

    it('should render system prompt textarea', () => {
      render(<LLMNode {...defaultProps} />);

      expect(screen.getByPlaceholderText("Define the AI's behavior...")).toBeInTheDocument();
    });

    it('should render temperature slider', () => {
      render(<LLMNode {...defaultProps} />);

      expect(screen.getByText(/Temperature:/)).toBeInTheDocument();
      expect(screen.getByRole('slider')).toBeInTheDocument();
    });

    it('should render max tokens input', () => {
      render(<LLMNode {...defaultProps} />);

      expect(screen.getByText('Max Tokens')).toBeInTheDocument();
      expect(screen.getByRole('spinbutton')).toBeInTheDocument();
    });

    it('should display current temperature value', () => {
      render(<LLMNode {...defaultProps} />);

      expect(screen.getByText('Temperature: 0.70')).toBeInTheDocument();
    });

    it('should display current max tokens value', () => {
      render(<LLMNode {...defaultProps} />);

      expect(screen.getByDisplayValue('1024')).toBeInTheDocument();
    });
  });

  describe('system prompt', () => {
    it('should update node data when system prompt changes', () => {
      render(<LLMNode {...defaultProps} />);

      const textarea = screen.getByPlaceholderText("Define the AI's behavior...");
      fireEvent.change(textarea, { target: { value: 'You are a helpful assistant' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('llm-1', {
        systemPrompt: 'You are a helpful assistant',
      });
    });

    it('should display existing system prompt', () => {
      render(
        <LLMNode
          {...defaultProps}
          data={{ ...defaultProps.data, systemPrompt: 'Existing prompt' }}
        />
      );

      expect(screen.getByDisplayValue('Existing prompt')).toBeInTheDocument();
    });
  });

  describe('temperature', () => {
    it('should update node data when temperature changes', () => {
      render(<LLMNode {...defaultProps} />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '1.5' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('llm-1', { temperature: 1.5 });
    });

    it('should show Precise and Creative labels', () => {
      render(<LLMNode {...defaultProps} />);

      expect(screen.getByText('Precise')).toBeInTheDocument();
      expect(screen.getByText('Creative')).toBeInTheDocument();
    });
  });

  describe('max tokens', () => {
    it('should update node data when max tokens changes', () => {
      render(<LLMNode {...defaultProps} />);

      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '2048' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('llm-1', { maxTokens: 2048 });
    });
  });

  describe('generate button', () => {
    it('should show generate button when no output', () => {
      render(<LLMNode {...defaultProps} />);

      expect(screen.getByText('Generate Text')).toBeInTheDocument();
    });

    it('should call executeNode when generate button clicked', () => {
      render(<LLMNode {...defaultProps} />);

      fireEvent.click(screen.getByText('Generate Text'));

      expect(mockExecuteNode).toHaveBeenCalledWith('llm-1');
    });

    it('should hide generate button when processing', () => {
      render(<LLMNode {...defaultProps} data={{ ...defaultProps.data, status: 'processing' }} />);

      expect(screen.queryByText('Generate Text')).not.toBeInTheDocument();
    });

    it('should hide generate button when output exists', () => {
      render(
        <LLMNode
          {...defaultProps}
          data={{ ...defaultProps.data, outputText: 'Generated output' }}
        />
      );

      expect(screen.queryByText('Generate Text')).not.toBeInTheDocument();
    });
  });

  describe('output display', () => {
    it('should display output text when available', () => {
      render(
        <LLMNode
          {...defaultProps}
          data={{ ...defaultProps.data, outputText: 'Generated output text' }}
        />
      );

      expect(screen.getByText('Generated output text')).toBeInTheDocument();
    });

    it('should show regenerate button when output exists', () => {
      render(
        <LLMNode
          {...defaultProps}
          data={{ ...defaultProps.data, outputText: 'Generated output' }}
        />
      );

      // Find the refresh button by its role or aria
      const buttons = screen.getAllByRole('button');
      const refreshButton = buttons.find((btn) => btn.querySelector('.lucide-refresh-cw') !== null);
      expect(refreshButton).toBeDefined();
    });

    it('should regenerate when refresh button clicked', () => {
      render(
        <LLMNode
          {...defaultProps}
          data={{ ...defaultProps.data, outputText: 'Generated output' }}
        />
      );

      // Click the first button (refresh button)
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[0]);

      expect(mockExecuteNode).toHaveBeenCalledWith('llm-1');
    });

    it('should disable refresh button when processing', () => {
      render(
        <LLMNode
          {...defaultProps}
          data={{
            ...defaultProps.data,
            outputText: 'Generated output',
            status: 'processing',
          }}
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).toBeDisabled();
    });
  });
});
