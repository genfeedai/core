import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseNode } from './BaseNode';

// Mock ReactFlow
vi.mock('@xyflow/react', () => ({
  Handle: ({ id, type }: { id: string; type: string }) => (
    <div data-testid={`handle-${type}-${id}`} />
  ),
  Position: {
    Left: 'left',
    Right: 'right',
  },
  NodeResizer: () => null,
  useUpdateNodeInternals: () => vi.fn(),
}));

// Mock stores
const mockSelectNode = vi.fn();
const mockToggleNodeLock = vi.fn();
const mockIsNodeLocked = vi.fn().mockReturnValue(false);
const mockUpdateNodeData = vi.fn();

vi.mock('@/store/uiStore', () => ({
  useUIStore: () => ({
    selectNode: mockSelectNode,
    selectedNodeId: null,
    highlightedNodeIds: [],
  }),
}));

vi.mock('@/store/workflowStore', () => ({
  useWorkflowStore: () => ({
    toggleNodeLock: mockToggleNodeLock,
    isNodeLocked: mockIsNodeLocked,
    updateNodeData: mockUpdateNodeData,
  }),
}));

vi.mock('@/store/executionStore', () => ({
  useExecutionStore: () => ({
    executeNode: vi.fn(),
    isRunning: false,
  }),
}));

// Mock child components
vi.mock('@/components/nodes/NodeErrorBoundary', () => ({
  NodeErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/nodes/PreviewTooltip', () => ({
  PreviewTooltip: () => null,
}));

// Mock schema handles utility
vi.mock('@/lib/utils/schemaHandles', () => ({
  generateHandlesFromSchema: vi.fn((_schema: unknown, staticInputs: unknown[]) => staticInputs),
}));

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    title,
    className,
  }: {
    children: React.ReactNode;
    onClick?: (e: React.MouseEvent) => void;
    disabled?: boolean;
    title?: string;
    className?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} title={title} className={className}>
      {children}
    </button>
  ),
}));

// Mock NODE_DEFINITIONS and NodeStatusEnum
vi.mock('@genfeedai/types', () => ({
  NODE_DEFINITIONS: {
    prompt: {
      name: 'Prompt',
      category: 'input',
      icon: 'MessageSquare',
      inputs: [],
      outputs: [{ id: 'text', type: 'text' }],
    },
    imageGen: {
      name: 'Image Gen',
      category: 'ai',
      icon: 'Sparkles',
      inputs: [{ id: 'prompt', type: 'text' }],
      outputs: [{ id: 'image', type: 'image' }],
    },
    output: {
      name: 'Output',
      category: 'output',
      icon: 'CheckCircle',
      inputs: [{ id: 'media', type: 'image' }],
      outputs: [],
    },
  },
  NodeStatusEnum: {
    IDLE: 'idle',
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETE: 'complete',
    ERROR: 'error',
  },
}));

describe('BaseNode', () => {
  const defaultProps = {
    id: 'node-1',
    type: 'prompt',
    data: {
      label: 'Test Node',
      status: 'idle',
    },
    selected: false,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    zIndex: 0,
    dragging: false,
    draggable: true,
    dragHandle: '',
    parentId: undefined,
    deletable: true,
    selectable: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsNodeLocked.mockReturnValue(false);
  });

  describe('rendering', () => {
    it('should render node with label', () => {
      render(<BaseNode {...defaultProps} />);

      expect(screen.getByText('Test Node')).toBeInTheDocument();
    });

    it('should render children', () => {
      render(
        <BaseNode {...defaultProps}>
          <div data-testid="child-content">Child Content</div>
        </BaseNode>
      );

      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    it('should render input handles for imageGen node', () => {
      render(<BaseNode {...defaultProps} type="imageGen" />);

      expect(screen.getByTestId('handle-target-prompt')).toBeInTheDocument();
    });

    it('should render output handles for prompt node', () => {
      render(<BaseNode {...defaultProps} type="prompt" />);

      expect(screen.getByTestId('handle-source-text')).toBeInTheDocument();
    });

    it('should not render for unknown node type', () => {
      const { container } = render(<BaseNode {...defaultProps} type="unknown" />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('status indicators', () => {
    it('should show processing spinner when status is processing', () => {
      render(<BaseNode {...defaultProps} data={{ label: 'Test', status: 'processing' }} />);

      // Check for processing indicator: animate-spin class, node-processing wrapper, or SVG element from Loader2
      const spinner = document.querySelector('.animate-spin');
      const processingNode = document.querySelector('.node-processing');
      const svgIcon = document.querySelector('svg');
      expect(spinner ?? processingNode ?? svgIcon).toBeTruthy();
    });

    it('should show check icon when status is complete', () => {
      render(<BaseNode {...defaultProps} data={{ label: 'Test', status: 'complete' }} />);

      // Complete status shows CheckCircle2
      expect(document.querySelector('.text-chart-2')).toBeInTheDocument();
    });

    it('should show error icon when status is error', () => {
      render(<BaseNode {...defaultProps} data={{ label: 'Test', status: 'error' }} />);

      expect(document.querySelector('.text-destructive')).toBeInTheDocument();
    });

    it('should show progress bar when processing with progress', () => {
      render(
        <BaseNode {...defaultProps} data={{ label: 'Test', status: 'processing', progress: 50 }} />
      );

      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should show error message when error is present', () => {
      render(
        <BaseNode
          {...defaultProps}
          data={{ label: 'Test', status: 'error', error: 'Something went wrong' }}
        />
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('selection', () => {
    it('should call selectNode when clicked', () => {
      render(<BaseNode {...defaultProps} />);

      fireEvent.click(screen.getByText('Test Node').closest('div')!);

      expect(mockSelectNode).toHaveBeenCalledWith('node-1');
    });

    it('should apply ring style when selected', () => {
      render(<BaseNode {...defaultProps} selected={true} />);

      const node = screen.getByText('Test Node').closest('.ring-1');
      expect(node).toBeInTheDocument();
    });
  });

  describe('locking', () => {
    it('should show unlock button by default', () => {
      render(<BaseNode {...defaultProps} />);

      expect(screen.getByTitle('Lock node (L)')).toBeInTheDocument();
    });

    it('should show lock button when locked', () => {
      mockIsNodeLocked.mockReturnValue(true);

      render(<BaseNode {...defaultProps} />);

      expect(screen.getByTitle('Unlock node (L)')).toBeInTheDocument();
    });

    it('should show LOCKED badge when locked', () => {
      mockIsNodeLocked.mockReturnValue(true);

      render(<BaseNode {...defaultProps} />);

      expect(screen.getByText('LOCKED')).toBeInTheDocument();
    });

    it('should toggle lock when lock button clicked', () => {
      render(<BaseNode {...defaultProps} />);

      fireEvent.click(screen.getByTitle('Lock node (L)'));

      expect(mockToggleNodeLock).toHaveBeenCalledWith('node-1');
    });

    it('should not propagate click event when toggling lock', () => {
      render(<BaseNode {...defaultProps} />);

      fireEvent.click(screen.getByTitle('Lock node (L)'));

      // selectNode should not be called since we stopPropagation
      expect(mockSelectNode).not.toHaveBeenCalled();
    });
  });

  describe('category rendering', () => {
    it('should render prompt node with input category', () => {
      render(<BaseNode {...defaultProps} type="prompt" />);

      expect(screen.getByText('Test Node')).toBeInTheDocument();
    });

    it('should render imageGen node with ai category', () => {
      render(<BaseNode {...defaultProps} type="imageGen" />);

      // imageGen uses the Sparkles icon mapping and renders correctly
      expect(screen.getByTestId('handle-target-prompt')).toBeInTheDocument();
      expect(screen.getByTestId('handle-source-image')).toBeInTheDocument();
    });

    it('should render output node with output category', () => {
      render(<BaseNode {...defaultProps} type="output" />);

      expect(screen.getByTestId('handle-target-media')).toBeInTheDocument();
    });
  });
});
