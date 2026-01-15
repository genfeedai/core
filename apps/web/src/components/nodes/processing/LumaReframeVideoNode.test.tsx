import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LumaReframeVideoNode } from './LumaReframeVideoNode';

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

describe('LumaReframeVideoNode', () => {
  const defaultProps = {
    id: 'node-1',
    type: 'lumaReframeVideo',
    data: {
      aspectRatio: '9:16',
      gridPosition: { x: 0.5, y: 0.5 },
      prompt: '',
      inputVideo: null,
      outputVideo: null,
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
    it('should render aspect ratio selector', () => {
      render(<LumaReframeVideoNode {...defaultProps} />);

      expect(screen.getByText('Target Aspect Ratio')).toBeInTheDocument();
      expect(screen.getByDisplayValue('9:16 (TikTok/Reels)')).toBeInTheDocument();
    });

    it('should render grid position selector', () => {
      render(<LumaReframeVideoNode {...defaultProps} />);

      expect(screen.getByText('Content Position')).toBeInTheDocument();
    });

    it('should render optional prompt input', () => {
      render(<LumaReframeVideoNode {...defaultProps} />);

      expect(screen.getByText('Prompt (optional)')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Guide the AI outpainting...')).toBeInTheDocument();
    });

    it('should render limits notice', () => {
      render(<LumaReframeVideoNode {...defaultProps} />);

      expect(
        screen.getByText('Max: 10 seconds, 100MB. Output: 720p @ $0.06/sec')
      ).toBeInTheDocument();
    });

    it('should render process button when no output', () => {
      render(<LumaReframeVideoNode {...defaultProps} />);

      expect(screen.getByText('Reframe Video')).toBeInTheDocument();
    });

    it('should disable process button without input video', () => {
      render(<LumaReframeVideoNode {...defaultProps} />);

      const button = screen.getByText('Reframe Video');
      expect(button).toBeDisabled();
    });

    it('should enable process button with input video', () => {
      const propsWithInput = {
        ...defaultProps,
        data: { ...defaultProps.data, inputVideo: '/test.mp4' },
      };
      render(<LumaReframeVideoNode {...propsWithInput} />);

      const button = screen.getByText('Reframe Video');
      expect(button).not.toBeDisabled();
    });
  });

  describe('aspect ratio options', () => {
    it('should show all aspect ratio options', () => {
      render(<LumaReframeVideoNode {...defaultProps} />);

      const select = screen.getByDisplayValue('9:16 (TikTok/Reels)');

      expect(select).toBeInTheDocument();
      // Check for presence of select element options
      const options = select.querySelectorAll('option');
      expect(options.length).toBe(7);
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
      render(<LumaReframeVideoNode {...propsWithOutput} />);

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
      render(<LumaReframeVideoNode {...propsWithOutput} />);

      expect(screen.queryByText('Reframe Video')).not.toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call updateNodeData on aspect ratio change', () => {
      render(<LumaReframeVideoNode {...defaultProps} />);

      const select = screen.getByDisplayValue('9:16 (TikTok/Reels)');
      fireEvent.change(select, { target: { value: '16:9' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', {
        aspectRatio: '16:9',
      });
    });

    it('should call updateNodeData on prompt change', () => {
      render(<LumaReframeVideoNode {...defaultProps} />);

      const input = screen.getByPlaceholderText('Guide the AI outpainting...');
      fireEvent.change(input, { target: { value: 'ocean background' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', {
        prompt: 'ocean background',
      });
    });

    it('should call executeNode on process button click', () => {
      const propsWithInput = {
        ...defaultProps,
        data: { ...defaultProps.data, inputVideo: '/test.mp4' },
      };
      render(<LumaReframeVideoNode {...propsWithInput} />);

      const button = screen.getByText('Reframe Video');
      fireEvent.click(button);

      expect(mockExecuteNode).toHaveBeenCalledWith('node-1');
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
      render(<LumaReframeVideoNode {...propsWithOutput} />);

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
      render(<LumaReframeVideoNode {...propsProcessing} />);

      expect(screen.queryByText('Reframe Video')).not.toBeInTheDocument();
    });
  });
});
