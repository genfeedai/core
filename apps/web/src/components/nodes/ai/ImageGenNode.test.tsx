import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImageGenNode } from './ImageGenNode';

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

// Mock Next.js Image
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} data-testid="next-image" />
  ),
}));

// Mock ModelBrowserModal
vi.mock('@/components/models/ModelBrowserModal', () => ({
  ModelBrowserModal: ({
    isOpen,
    onClose,
    onSelect,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (model: { id: string; provider: string; displayName: string }) => void;
  }) =>
    isOpen ? (
      <div data-testid="model-browser">
        <button onClick={onClose} data-testid="close-modal">
          Close
        </button>
        <button
          onClick={() =>
            onSelect({
              id: 'google/nano-banana-pro',
              provider: 'replicate',
              displayName: 'Nano Banana Pro',
            })
          }
          data-testid="select-model"
        >
          Select Model
        </button>
      </div>
    ) : null,
}));

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    title,
  }: {
    children: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    title?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} title={title} data-testid="button">
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

// Mock core constants
vi.mock('@genfeedai/core', () => ({
  ASPECT_RATIOS: ['1:1', '16:9', '9:16', '4:3', '3:4'],
  OUTPUT_FORMATS: ['jpg', 'png', 'webp'],
  RESOLUTIONS: ['1K', '2K', '4K'],
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

describe('ImageGenNode', () => {
  const defaultProps = {
    id: 'imagegen-1',
    type: 'imageGen',
    data: {
      label: 'Image Gen',
      model: 'nano-banana',
      aspectRatio: '1:1',
      resolution: '2K',
      outputFormat: 'jpg',
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
    it('should render model select', () => {
      render(<ImageGenNode {...defaultProps} />);

      expect(screen.getByText('Model')).toBeInTheDocument();
      expect(screen.getByDisplayValue(/Nano Banana/)).toBeInTheDocument();
    });

    it('should render aspect ratio select', () => {
      render(<ImageGenNode {...defaultProps} />);

      expect(screen.getByText('Aspect Ratio')).toBeInTheDocument();
    });

    it('should render format select', () => {
      render(<ImageGenNode {...defaultProps} />);

      expect(screen.getByText('Format')).toBeInTheDocument();
    });

    it('should render model browser button', () => {
      render(<ImageGenNode {...defaultProps} />);

      expect(screen.getByTitle('Browse models')).toBeInTheDocument();
    });

    it('should render generate button when no output', () => {
      render(<ImageGenNode {...defaultProps} />);

      expect(screen.getByText('Generate Image')).toBeInTheDocument();
    });
  });

  describe('model selection', () => {
    it('should update model when select changes', () => {
      render(<ImageGenNode {...defaultProps} />);

      const select = screen.getByDisplayValue(/Nano Banana -/);
      fireEvent.change(select, { target: { value: 'nano-banana-pro' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('imagegen-1', {
        model: 'nano-banana-pro',
      });
    });

    it('should open model browser when browse button clicked', () => {
      render(<ImageGenNode {...defaultProps} />);

      fireEvent.click(screen.getByTitle('Browse models'));

      expect(screen.getByTestId('model-browser')).toBeInTheDocument();
    });

    it('should close model browser when close clicked', () => {
      render(<ImageGenNode {...defaultProps} />);

      fireEvent.click(screen.getByTitle('Browse models'));
      fireEvent.click(screen.getByTestId('close-modal'));

      expect(screen.queryByTestId('model-browser')).not.toBeInTheDocument();
    });

    it('should update node data when model selected from browser', () => {
      render(<ImageGenNode {...defaultProps} />);

      fireEvent.click(screen.getByTitle('Browse models'));
      fireEvent.click(screen.getByTestId('select-model'));

      expect(mockUpdateNodeData).toHaveBeenCalledWith('imagegen-1', {
        model: 'nano-banana-pro',
        provider: 'replicate',
        selectedModel: {
          provider: 'replicate',
          modelId: 'google/nano-banana-pro',
          displayName: 'Nano Banana Pro',
        },
      });
    });
  });

  describe('aspect ratio', () => {
    it('should update aspect ratio when select changes', () => {
      render(<ImageGenNode {...defaultProps} />);

      const selects = screen.getAllByRole('combobox');
      const aspectRatioSelect = selects[1]; // Second select is aspect ratio
      fireEvent.change(aspectRatioSelect, { target: { value: '16:9' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('imagegen-1', {
        aspectRatio: '16:9',
      });
    });
  });

  describe('resolution (nano-banana-pro only)', () => {
    it('should show resolution select for nano-banana-pro', () => {
      render(
        <ImageGenNode {...defaultProps} data={{ ...defaultProps.data, model: 'nano-banana-pro' }} />
      );

      expect(screen.getByText('Resolution')).toBeInTheDocument();
    });

    it('should not show resolution select for nano-banana', () => {
      render(<ImageGenNode {...defaultProps} />);

      expect(screen.queryByText('Resolution')).not.toBeInTheDocument();
    });

    it('should update resolution when select changes', () => {
      render(
        <ImageGenNode {...defaultProps} data={{ ...defaultProps.data, model: 'nano-banana-pro' }} />
      );

      const selects = screen.getAllByRole('combobox');
      const resolutionSelect = selects[2]; // Third select is resolution (when visible)
      fireEvent.change(resolutionSelect, { target: { value: '4K' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('imagegen-1', {
        resolution: '4K',
      });
    });
  });

  describe('output format', () => {
    it('should update format when select changes', () => {
      render(<ImageGenNode {...defaultProps} />);

      const selects = screen.getAllByRole('combobox');
      const formatSelect = selects[selects.length - 1]; // Last select is format
      fireEvent.change(formatSelect, { target: { value: 'png' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('imagegen-1', {
        outputFormat: 'png',
      });
    });
  });

  describe('generate button', () => {
    it('should call executeNode when generate button clicked', () => {
      render(<ImageGenNode {...defaultProps} />);

      fireEvent.click(screen.getByText('Generate Image'));

      expect(mockExecuteNode).toHaveBeenCalledWith('imagegen-1');
    });

    it('should hide generate button when processing', () => {
      render(
        <ImageGenNode {...defaultProps} data={{ ...defaultProps.data, status: 'processing' }} />
      );

      expect(screen.queryByText('Generate Image')).not.toBeInTheDocument();
    });

    it('should hide generate button when output exists', () => {
      render(
        <ImageGenNode
          {...defaultProps}
          data={{ ...defaultProps.data, outputImage: 'https://example.com/image.png' }}
        />
      );

      expect(screen.queryByText('Generate Image')).not.toBeInTheDocument();
    });
  });

  describe('output display', () => {
    it('should display output image when available', () => {
      render(
        <ImageGenNode
          {...defaultProps}
          data={{
            ...defaultProps.data,
            outputImage: 'https://example.com/image.png',
          }}
        />
      );

      expect(screen.getByTestId('next-image')).toBeInTheDocument();
      expect(screen.getByAltText('Generated image')).toBeInTheDocument();
    });

    it('should show regenerate button with output', () => {
      render(
        <ImageGenNode
          {...defaultProps}
          data={{
            ...defaultProps.data,
            outputImage: 'https://example.com/image.png',
          }}
        />
      );

      // RefreshCw icon should be present in a button
      const buttons = screen.getAllByTestId('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
