import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LumaReframeImageNode } from './LumaReframeImageNode';

const mockUpdateNodeData = vi.fn();
const mockExecuteNode = vi.fn();

vi.mock('@/store/workflowStore', () => ({
  useWorkflowStore: vi.fn((selector) => selector({ updateNodeData: mockUpdateNodeData })),
}));

vi.mock('@/store/executionStore', () => ({
  useExecutionStore: vi.fn((selector) => selector({ executeNode: mockExecuteNode })),
}));

vi.mock('../BaseNode', () => ({
  BaseNode: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="base-node">{children}</div>
  ),
}));

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => (
    <img {...props} src={props.src as string} alt={props.alt as string} />
  ),
}));

describe('LumaReframeImageNode', () => {
  const defaultProps = {
    id: 'node-1',
    type: 'lumaReframeImage',
    data: {
      model: 'photon-flash-1',
      aspectRatio: '16:9',
      gridPosition: { x: 0.5, y: 0.5 },
      prompt: '',
      inputImage: null,
      outputImage: null,
      status: 'idle',
    },
    selected: false,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    zIndex: 0,
    dragging: false,
    selectable: true,
    deletable: true,
    draggable: true,
  } as const;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render with model selector', () => {
      render(<LumaReframeImageNode {...defaultProps} />);

      expect(screen.getByText('Model')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Photon Flash - $0.01')).toBeInTheDocument();
    });

    it('should render aspect ratio selector', () => {
      render(<LumaReframeImageNode {...defaultProps} />);

      expect(screen.getByText('Target Aspect Ratio')).toBeInTheDocument();
      expect(screen.getByDisplayValue('16:9')).toBeInTheDocument();
    });

    it('should render grid position selector', () => {
      render(<LumaReframeImageNode {...defaultProps} />);

      expect(screen.getByText('Content Position')).toBeInTheDocument();
    });

    it('should render optional prompt input', () => {
      render(<LumaReframeImageNode {...defaultProps} />);

      expect(screen.getByText('Prompt (optional)')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Guide the AI outpainting...')).toBeInTheDocument();
    });

    it('should render process button when no output', () => {
      render(<LumaReframeImageNode {...defaultProps} />);

      expect(screen.getByText('Reframe Image')).toBeInTheDocument();
    });

    it('should disable process button without input image', () => {
      render(<LumaReframeImageNode {...defaultProps} />);

      const button = screen.getByText('Reframe Image');
      expect(button).toBeDisabled();
    });

    it('should enable process button with input image', () => {
      const propsWithInput = {
        ...defaultProps,
        data: { ...defaultProps.data, inputImage: '/test.jpg' },
      };
      render(<LumaReframeImageNode {...propsWithInput} />);

      const button = screen.getByText('Reframe Image');
      expect(button).not.toBeDisabled();
    });
  });

  describe('output preview', () => {
    it('should render output image when available', () => {
      const propsWithOutput = {
        ...defaultProps,
        data: {
          ...defaultProps.data,
          inputImage: '/input.jpg',
          outputImage: '/output.jpg',
        },
      };
      render(<LumaReframeImageNode {...propsWithOutput} />);

      const img = screen.getByAltText('Reframed image');
      expect(img).toHaveAttribute('src', '/output.jpg');
    });

    it('should hide process button when output exists', () => {
      const propsWithOutput = {
        ...defaultProps,
        data: {
          ...defaultProps.data,
          inputImage: '/input.jpg',
          outputImage: '/output.jpg',
        },
      };
      render(<LumaReframeImageNode {...propsWithOutput} />);

      expect(screen.queryByText('Reframe Image')).not.toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call updateNodeData on model change', () => {
      render(<LumaReframeImageNode {...defaultProps} />);

      const select = screen.getByDisplayValue('Photon Flash - $0.01');
      fireEvent.change(select, { target: { value: 'photon-1' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', {
        model: 'photon-1',
      });
    });

    it('should call updateNodeData on aspect ratio change', () => {
      render(<LumaReframeImageNode {...defaultProps} />);

      const select = screen.getByDisplayValue('16:9');
      fireEvent.change(select, { target: { value: '9:16' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', {
        aspectRatio: '9:16',
      });
    });

    it('should call updateNodeData on prompt change', () => {
      render(<LumaReframeImageNode {...defaultProps} />);

      const input = screen.getByPlaceholderText('Guide the AI outpainting...');
      fireEvent.change(input, { target: { value: 'sunset background' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', {
        prompt: 'sunset background',
      });
    });

    it('should call executeNode on process button click', () => {
      const propsWithInput = {
        ...defaultProps,
        data: { ...defaultProps.data, inputImage: '/test.jpg' },
      };
      render(<LumaReframeImageNode {...propsWithInput} />);

      const button = screen.getByText('Reframe Image');
      fireEvent.click(button);

      expect(mockExecuteNode).toHaveBeenCalledWith('node-1');
    });
  });

  describe('processing state', () => {
    it('should hide process button during processing', () => {
      const propsProcessing = {
        ...defaultProps,
        data: {
          ...defaultProps.data,
          inputImage: '/test.jpg',
          status: 'processing',
        },
      };
      render(<LumaReframeImageNode {...propsProcessing} />);

      expect(screen.queryByText('Reframe Image')).not.toBeInTheDocument();
    });

    it('should disable refresh button during processing', () => {
      const propsProcessing = {
        ...defaultProps,
        data: {
          ...defaultProps.data,
          inputImage: '/test.jpg',
          outputImage: '/output.jpg',
          status: 'processing',
        },
      };
      render(<LumaReframeImageNode {...propsProcessing} />);

      const refreshButton = screen.getByRole('button');
      expect(refreshButton).toBeDisabled();
    });
  });
});
