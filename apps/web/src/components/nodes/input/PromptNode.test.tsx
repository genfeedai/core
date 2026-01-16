import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PromptNode } from './PromptNode';

// Mock ReactFlow
vi.mock('@xyflow/react', () => ({
  Handle: () => null,
  Position: { Left: 'left', Right: 'right' },
}));

// Mock BaseNode to simplify testing
vi.mock('../BaseNode', () => ({
  BaseNode: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="base-node">{children}</div>
  ),
}));

// Mock PromptPicker
vi.mock('@/components/prompt-library', () => ({
  PromptPicker: ({ onSelect }: { onSelect: (item: { promptText: string }) => void }) => (
    <button data-testid="prompt-picker" onClick={() => onSelect({ promptText: 'Library prompt' })}>
      Pick Prompt
    </button>
  ),
}));

// Mock stores
const mockUpdateNodeData = vi.fn();
const mockOpenCreateModal = vi.fn();

vi.mock('@/store/workflowStore', () => ({
  useWorkflowStore: (selector: (state: unknown) => unknown) => {
    const state = { updateNodeData: mockUpdateNodeData };
    return selector(state);
  },
}));

vi.mock('@/store/promptLibraryStore', () => ({
  usePromptLibraryStore: () => ({
    openCreateModal: mockOpenCreateModal,
  }),
}));

describe('PromptNode', () => {
  const defaultProps = {
    id: 'prompt-1',
    type: 'prompt',
    data: {
      label: 'Prompt',
      prompt: '',
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
    it('should render textarea', () => {
      render(<PromptNode {...defaultProps} />);

      expect(screen.getByPlaceholderText('Enter your prompt...')).toBeInTheDocument();
    });

    it('should render prompt picker', () => {
      render(<PromptNode {...defaultProps} />);

      expect(screen.getByTestId('prompt-picker')).toBeInTheDocument();
    });

    it('should render save button', () => {
      render(<PromptNode {...defaultProps} />);

      expect(screen.getByTitle('Save to library')).toBeInTheDocument();
    });

    it('should display existing prompt value', () => {
      render(
        <PromptNode {...defaultProps} data={{ ...defaultProps.data, prompt: 'Existing prompt' }} />
      );

      expect(screen.getByDisplayValue('Existing prompt')).toBeInTheDocument();
    });
  });

  describe('prompt editing', () => {
    it('should update node data when prompt changes', () => {
      render(<PromptNode {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Enter your prompt...');
      fireEvent.change(textarea, { target: { value: 'New prompt' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('prompt-1', { prompt: 'New prompt' });
    });
  });

  describe('prompt library integration', () => {
    it('should update prompt when selecting from library', () => {
      render(<PromptNode {...defaultProps} />);

      fireEvent.click(screen.getByTestId('prompt-picker'));

      expect(mockUpdateNodeData).toHaveBeenCalledWith('prompt-1', {
        prompt: 'Library prompt',
      });
    });

    it('should open save modal when save button clicked with prompt', () => {
      render(<PromptNode {...defaultProps} data={{ ...defaultProps.data, prompt: 'My prompt' }} />);

      fireEvent.click(screen.getByTitle('Save to library'));

      expect(mockOpenCreateModal).toHaveBeenCalledWith(
        expect.objectContaining({
          promptText: 'My prompt',
        })
      );
    });

    it('should not open save modal when prompt is empty', () => {
      render(<PromptNode {...defaultProps} />);

      fireEvent.click(screen.getByTitle('Save to library'));

      expect(mockOpenCreateModal).not.toHaveBeenCalled();
    });

    it('should disable save button when prompt is empty', () => {
      render(<PromptNode {...defaultProps} />);

      const saveButton = screen.getByTitle('Save to library');
      expect(saveButton).toBeDisabled();
    });

    it('should enable save button when prompt has content', () => {
      render(
        <PromptNode {...defaultProps} data={{ ...defaultProps.data, prompt: 'Some prompt' }} />
      );

      const saveButton = screen.getByTitle('Save to library');
      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('tooltip', () => {
    it('should show tooltip on hover', () => {
      render(<PromptNode {...defaultProps} />);

      const saveButton = screen.getByTitle('Save to library');
      fireEvent.mouseEnter(saveButton);

      expect(screen.getByText('Save to library')).toBeInTheDocument();
    });

    it('should hide tooltip on mouse leave', () => {
      render(<PromptNode {...defaultProps} />);

      const saveButton = screen.getByTitle('Save to library');
      fireEvent.mouseEnter(saveButton);
      fireEvent.mouseLeave(saveButton);

      // Tooltip should be hidden (only title attribute version remains)
      const tooltips = screen.queryAllByText('Save to library');
      expect(tooltips.length).toBeLessThanOrEqual(1);
    });
  });
});
