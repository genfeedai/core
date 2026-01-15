import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TopazImageUpscaleNode } from './TopazImageUpscaleNode';

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

vi.mock('@/components/ui/comparison-slider', () => ({
  ComparisonSlider: ({
    beforeSrc,
    afterSrc,
    onPositionChange,
  }: {
    beforeSrc: string;
    afterSrc: string;
    onPositionChange: (pos: number) => void;
  }) => (
    <div data-testid="comparison-slider" data-before={beforeSrc} data-after={afterSrc}>
      <button onClick={() => onPositionChange(75)}>Slide</button>
    </div>
  ),
}));

describe('TopazImageUpscaleNode', () => {
  const defaultProps = {
    id: 'node-1',
    type: 'topazImageUpscale',
    data: {
      enhanceModel: 'Standard V2',
      upscaleFactor: '2x',
      outputFormat: 'png',
      faceEnhancement: false,
      faceEnhancementStrength: 50,
      faceEnhancementCreativity: 25,
      showComparison: false,
      comparisonPosition: 50,
      inputImage: null,
      outputImage: null,
      originalPreview: null,
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
    it('should render enhance model selector', () => {
      render(<TopazImageUpscaleNode {...defaultProps} />);

      expect(screen.getByText('Enhance Model')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Standard V2')).toBeInTheDocument();
    });

    it('should render upscale factor selector', () => {
      render(<TopazImageUpscaleNode {...defaultProps} />);

      expect(screen.getByText('Upscale Factor')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2x')).toBeInTheDocument();
    });

    it('should render output format selector', () => {
      render(<TopazImageUpscaleNode {...defaultProps} />);

      expect(screen.getByText('Output Format')).toBeInTheDocument();
      expect(screen.getByDisplayValue('PNG')).toBeInTheDocument();
    });

    it('should render face enhancement checkbox', () => {
      render(<TopazImageUpscaleNode {...defaultProps} />);

      expect(screen.getByText('Face Enhancement')).toBeInTheDocument();
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });

    it('should render process button', () => {
      render(<TopazImageUpscaleNode {...defaultProps} />);

      expect(screen.getByText('Upscale Image')).toBeInTheDocument();
    });
  });

  describe('enhance models', () => {
    it('should show all enhance model options', () => {
      render(<TopazImageUpscaleNode {...defaultProps} />);

      const select = screen.getByDisplayValue('Standard V2');
      const options = select.querySelectorAll('option');
      expect(options.length).toBe(5);
    });
  });

  describe('upscale factors', () => {
    it('should show all upscale factor options', () => {
      render(<TopazImageUpscaleNode {...defaultProps} />);

      const select = screen.getByDisplayValue('2x');
      const options = select.querySelectorAll('option');
      expect(options.length).toBe(4);
    });
  });

  describe('face enhancement sliders', () => {
    it('should show sliders when face enhancement is enabled', () => {
      const propsWithFaceEnhancement = {
        ...defaultProps,
        data: { ...defaultProps.data, faceEnhancement: true },
      };
      render(<TopazImageUpscaleNode {...propsWithFaceEnhancement} />);

      expect(screen.getByText('Strength')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('Creativity')).toBeInTheDocument();
      expect(screen.getByText('25%')).toBeInTheDocument();
    });

    it('should hide sliders when face enhancement is disabled', () => {
      render(<TopazImageUpscaleNode {...defaultProps} />);

      expect(screen.queryByText('Strength')).not.toBeInTheDocument();
      expect(screen.queryByText('Creativity')).not.toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call updateNodeData on enhance model change', () => {
      render(<TopazImageUpscaleNode {...defaultProps} />);

      const select = screen.getByDisplayValue('Standard V2');
      fireEvent.change(select, { target: { value: 'CGI' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', {
        enhanceModel: 'CGI',
      });
    });

    it('should call updateNodeData on upscale factor change', () => {
      render(<TopazImageUpscaleNode {...defaultProps} />);

      const select = screen.getByDisplayValue('2x');
      fireEvent.change(select, { target: { value: '4x' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', {
        upscaleFactor: '4x',
      });
    });

    it('should call updateNodeData on output format change', () => {
      render(<TopazImageUpscaleNode {...defaultProps} />);

      const select = screen.getByDisplayValue('PNG');
      fireEvent.change(select, { target: { value: 'jpg' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', {
        outputFormat: 'jpg',
      });
    });

    it('should call updateNodeData on face enhancement toggle', () => {
      render(<TopazImageUpscaleNode {...defaultProps} />);

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', {
        faceEnhancement: true,
      });
    });

    it('should call updateNodeData on strength slider change', () => {
      const propsWithFaceEnhancement = {
        ...defaultProps,
        data: { ...defaultProps.data, faceEnhancement: true },
      };
      render(<TopazImageUpscaleNode {...propsWithFaceEnhancement} />);

      const sliders = screen.getAllByRole('slider');
      fireEvent.change(sliders[0], { target: { value: '75' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', {
        faceEnhancementStrength: 75,
      });
    });

    it('should call executeNode on process button click', () => {
      const propsWithInput = {
        ...defaultProps,
        data: { ...defaultProps.data, inputImage: '/test.jpg' },
      };
      render(<TopazImageUpscaleNode {...propsWithInput} />);

      const button = screen.getByText('Upscale Image');
      fireEvent.click(button);

      expect(mockExecuteNode).toHaveBeenCalledWith('node-1');
    });
  });

  describe('comparison slider', () => {
    it('should render comparison slider when enabled', () => {
      const propsWithComparison = {
        ...defaultProps,
        data: {
          ...defaultProps.data,
          inputImage: '/input.jpg',
          outputImage: '/output.jpg',
          originalPreview: '/preview.jpg',
          showComparison: true,
        },
      };
      render(<TopazImageUpscaleNode {...propsWithComparison} />);

      expect(screen.getByTestId('comparison-slider')).toBeInTheDocument();
    });

    it('should update comparison position', () => {
      const propsWithComparison = {
        ...defaultProps,
        data: {
          ...defaultProps.data,
          inputImage: '/input.jpg',
          outputImage: '/output.jpg',
          originalPreview: '/preview.jpg',
          showComparison: true,
        },
      };
      render(<TopazImageUpscaleNode {...propsWithComparison} />);

      const slideButton = screen.getByText('Slide');
      fireEvent.click(slideButton);

      expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', {
        comparisonPosition: 75,
      });
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
      render(<TopazImageUpscaleNode {...propsWithOutput} />);

      const img = screen.getByAltText('Upscaled image');
      expect(img).toHaveAttribute('src', '/output.jpg');
    });
  });
});
