import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TopazVideoUpscaleNode } from './TopazVideoUpscaleNode';

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

describe('TopazVideoUpscaleNode', () => {
  const defaultProps = {
    id: 'node-1',
    type: 'topazVideoUpscale',
    data: {
      targetResolution: '1080p',
      targetFps: 30,
      showComparison: false,
      comparisonPosition: 50,
      inputVideo: null,
      outputVideo: null,
      originalPreview: null,
      outputPreview: null,
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
    it('should render resolution selector', () => {
      render(<TopazVideoUpscaleNode {...defaultProps} />);

      expect(screen.getByText('Target Resolution')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1080p (Full HD)')).toBeInTheDocument();
    });

    it('should render FPS selector', () => {
      render(<TopazVideoUpscaleNode {...defaultProps} />);

      expect(screen.getByText('Target Frame Rate')).toBeInTheDocument();
      expect(screen.getByDisplayValue('30 fps')).toBeInTheDocument();
    });

    it('should render pricing notice', () => {
      render(<TopazVideoUpscaleNode {...defaultProps} />);

      expect(screen.getByText(/Estimated cost:/)).toBeInTheDocument();
    });

    it('should render process button', () => {
      render(<TopazVideoUpscaleNode {...defaultProps} />);

      expect(screen.getByText('Upscale Video')).toBeInTheDocument();
    });

    it('should disable process button without input video', () => {
      render(<TopazVideoUpscaleNode {...defaultProps} />);

      const button = screen.getByText('Upscale Video');
      expect(button).toBeDisabled();
    });
  });

  describe('resolution options', () => {
    it('should show all resolution options', () => {
      render(<TopazVideoUpscaleNode {...defaultProps} />);

      const select = screen.getByDisplayValue('1080p (Full HD)');
      const options = select.querySelectorAll('option');
      expect(options.length).toBe(3);
    });
  });

  describe('fps options', () => {
    it('should show all fps options', () => {
      render(<TopazVideoUpscaleNode {...defaultProps} />);

      const select = screen.getByDisplayValue('30 fps');
      const options = select.querySelectorAll('option');
      expect(options.length).toBe(4);
    });
  });

  describe('pricing estimates', () => {
    it('should show price for 720p-30fps', () => {
      const props720p = {
        ...defaultProps,
        data: { ...defaultProps.data, targetResolution: '720p', targetFps: 30 },
      };
      render(<TopazVideoUpscaleNode {...props720p} />);

      expect(screen.getByText(/\$0\.027\/5s/)).toBeInTheDocument();
    });

    it('should show price for 4k-60fps', () => {
      const props4k = {
        ...defaultProps,
        data: { ...defaultProps.data, targetResolution: '4k', targetFps: 60 },
      };
      render(<TopazVideoUpscaleNode {...props4k} />);

      expect(screen.getByText(/\$0\.747\/5s/)).toBeInTheDocument();
    });

    it('should show price for 1080p-30fps', () => {
      render(<TopazVideoUpscaleNode {...defaultProps} />);

      expect(screen.getByText(/\$0\.101\/5s/)).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call updateNodeData on resolution change', () => {
      render(<TopazVideoUpscaleNode {...defaultProps} />);

      const select = screen.getByDisplayValue('1080p (Full HD)');
      fireEvent.change(select, { target: { value: '4k' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', {
        targetResolution: '4k',
      });
    });

    it('should call updateNodeData on fps change', () => {
      render(<TopazVideoUpscaleNode {...defaultProps} />);

      const select = screen.getByDisplayValue('30 fps');
      fireEvent.change(select, { target: { value: '60' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', {
        targetFps: 60,
      });
    });

    it('should call executeNode on process button click', () => {
      const propsWithInput = {
        ...defaultProps,
        data: { ...defaultProps.data, inputVideo: '/test.mp4' },
      };
      render(<TopazVideoUpscaleNode {...propsWithInput} />);

      const button = screen.getByText('Upscale Video');
      fireEvent.click(button);

      expect(mockExecuteNode).toHaveBeenCalledWith('node-1');
    });
  });

  describe('output preview', () => {
    it('should render output video when available', () => {
      const propsWithOutput = {
        ...defaultProps,
        data: {
          ...defaultProps.data,
          inputVideo: '/input.mp4',
          outputVideo: '/output.mp4',
        },
      };
      render(<TopazVideoUpscaleNode {...propsWithOutput} />);

      const video = document.querySelector('video');
      expect(video).toHaveAttribute('src', '/output.mp4');
    });

    it('should hide process button when output exists', () => {
      const propsWithOutput = {
        ...defaultProps,
        data: {
          ...defaultProps.data,
          inputVideo: '/input.mp4',
          outputVideo: '/output.mp4',
        },
      };
      render(<TopazVideoUpscaleNode {...propsWithOutput} />);

      expect(screen.queryByText('Upscale Video')).not.toBeInTheDocument();
    });
  });

  describe('comparison slider', () => {
    it('should render comparison slider when enabled', () => {
      const propsWithComparison = {
        ...defaultProps,
        data: {
          ...defaultProps.data,
          inputVideo: '/input.mp4',
          outputVideo: '/output.mp4',
          originalPreview: '/preview-before.jpg',
          outputPreview: '/preview-after.jpg',
          showComparison: true,
        },
      };
      render(<TopazVideoUpscaleNode {...propsWithComparison} />);

      expect(screen.getByTestId('comparison-slider')).toBeInTheDocument();
    });

    it('should toggle comparison view', () => {
      const propsWithOutput = {
        ...defaultProps,
        data: {
          ...defaultProps.data,
          inputVideo: '/input.mp4',
          outputVideo: '/output.mp4',
          originalPreview: '/preview-before.jpg',
          outputPreview: '/preview-after.jpg',
          showComparison: false,
        },
      };
      render(<TopazVideoUpscaleNode {...propsWithOutput} />);

      // Find the comparison toggle button
      const toggleButton = screen.getByTitle('Compare frames');
      fireEvent.click(toggleButton);

      expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', {
        showComparison: true,
      });
    });
  });

  describe('video playback', () => {
    it('should toggle video playback on click', () => {
      const mockPlay = vi.fn().mockResolvedValue(undefined);
      const mockPause = vi.fn();

      const propsWithOutput = {
        ...defaultProps,
        data: {
          ...defaultProps.data,
          inputVideo: '/input.mp4',
          outputVideo: '/output.mp4',
        },
      };
      render(<TopazVideoUpscaleNode {...propsWithOutput} />);

      const video = document.querySelector('video') as HTMLVideoElement;
      video.play = mockPlay;
      video.pause = mockPause;

      fireEvent.click(video);
      expect(mockPlay).toHaveBeenCalled();
    });
  });

  describe('processing state', () => {
    it('should hide process button during processing', () => {
      const propsProcessing = {
        ...defaultProps,
        data: {
          ...defaultProps.data,
          inputVideo: '/test.mp4',
          status: 'processing',
        },
      };
      render(<TopazVideoUpscaleNode {...propsProcessing} />);

      expect(screen.queryByText('Upscale Video')).not.toBeInTheDocument();
    });
  });
});
