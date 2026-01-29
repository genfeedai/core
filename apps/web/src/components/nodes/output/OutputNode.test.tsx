import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OutputNode } from './OutputNode';

// Mock ReactFlow
vi.mock('@xyflow/react', () => ({
  Handle: () => null,
  Position: { Left: 'left', Right: 'right' },
}));

// Mock BaseNode - render headerActions if passed
vi.mock('../BaseNode', () => ({
  BaseNode: ({
    children,
    headerActions,
  }: {
    children: React.ReactNode;
    headerActions?: React.ReactNode;
  }) => (
    <div data-testid="base-node">
      {headerActions && <div data-testid="header-actions">{headerActions}</div>}
      {children}
    </div>
  ),
}));

// Mock Next.js Image
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} data-testid="next-image" />
  ),
}));

// Mock Button
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    className,
    disabled,
  }: {
    children: React.ReactNode;
    onClick: () => void;
    className?: string;
    disabled?: boolean;
  }) => (
    <button
      onClick={onClick}
      className={className}
      disabled={disabled}
      data-testid="download-button"
    >
      {children}
    </button>
  ),
}));

// Mock stores
vi.mock('@/store/workflowStore', () => ({
  useWorkflowStore: (selector: (state: unknown) => unknown) => {
    const state = { updateNodeData: vi.fn(), edges: [] };
    return selector(state);
  },
}));

vi.mock('@/store/executionStore', () => ({
  useExecutionStore: (selector: (state: unknown) => unknown) => {
    const state = { isRunning: false };
    return selector(state);
  },
}));

// Mock Input component
vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

describe('OutputNode', () => {
  const defaultProps = {
    id: 'output-1',
    type: 'output',
    data: {
      label: 'Output',
      status: 'idle',
      inputImage: null,
      inputVideo: null,
      inputType: null,
      outputName: '',
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
  });

  describe('empty state (not connected)', () => {
    it('should show connect prompt when no input and not connected', () => {
      render(<OutputNode {...defaultProps} />);

      expect(screen.getByText('Connect image or video')).toBeInTheDocument();
    });

    it('should not show download button when no media', () => {
      render(<OutputNode {...defaultProps} />);

      expect(screen.queryByTestId('download-button')).not.toBeInTheDocument();
    });
  });

  describe('with image input', () => {
    const imageProps = {
      ...defaultProps,
      data: {
        ...defaultProps.data,
        inputImage: 'https://example.com/image.png',
        inputType: 'image' as const,
      },
    };

    it('should display image when inputImage is provided', () => {
      render(<OutputNode {...imageProps} />);

      expect(screen.getByTestId('next-image')).toBeInTheDocument();
      expect(screen.getByAltText('Output')).toBeInTheDocument();
    });

    it('should show download button', () => {
      render(<OutputNode {...imageProps} />);

      expect(screen.getByText('Download')).toBeInTheDocument();
      expect(screen.getByTestId('download-button')).toBeInTheDocument();
    });

    it('should show filename input with extension', () => {
      render(<OutputNode {...imageProps} />);

      expect(screen.getByText('.png')).toBeInTheDocument();
    });
  });

  describe('with video input', () => {
    const videoProps = {
      ...defaultProps,
      data: {
        ...defaultProps.data,
        inputVideo: 'https://example.com/video.mp4',
        inputType: 'video' as const,
      },
    };

    it('should display video when inputVideo is provided', () => {
      render(<OutputNode {...videoProps} />);

      const video = document.querySelector('video');
      expect(video).toBeInTheDocument();
      expect(video?.getAttribute('src')).toBe('https://example.com/video.mp4');
    });

    it('should have autoplay and loop attributes', () => {
      render(<OutputNode {...videoProps} />);

      const video = document.querySelector('video');
      expect(video?.hasAttribute('autoplay')).toBe(true);
      expect(video?.hasAttribute('loop')).toBe(true);
    });

    it('should show download button for video', () => {
      render(<OutputNode {...videoProps} />);

      expect(screen.getByText('Download')).toBeInTheDocument();
    });

    it('should show mp4 extension for video', () => {
      render(<OutputNode {...videoProps} />);

      expect(screen.getByText('.mp4')).toBeInTheDocument();
    });
  });

  describe('processing state', () => {
    it('should show processing overlay on image when status is processing', () => {
      render(
        <OutputNode
          {...defaultProps}
          data={{
            ...defaultProps.data,
            inputImage: 'https://example.com/image.png',
            inputType: 'image',
            status: 'processing',
          }}
        />
      );

      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('should show processing overlay on video when status is processing', () => {
      render(
        <OutputNode
          {...defaultProps}
          data={{
            ...defaultProps.data,
            inputVideo: 'https://example.com/video.mp4',
            inputType: 'video',
            status: 'processing',
          }}
        />
      );

      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });
  });

  describe('filename input', () => {
    it('should display default output name in input', () => {
      render(
        <OutputNode
          {...defaultProps}
          data={{
            ...defaultProps.data,
            inputImage: 'https://example.com/image.png',
            inputType: 'image',
            outputName: 'my-image',
          }}
        />
      );

      const input = screen.getByDisplayValue('my-image');
      expect(input).toBeInTheDocument();
    });

    it('should fall back to "output" when outputName is empty', () => {
      render(
        <OutputNode
          {...defaultProps}
          data={{
            ...defaultProps.data,
            inputImage: 'https://example.com/image.png',
            inputType: 'image',
            outputName: '',
          }}
        />
      );

      const input = screen.getByDisplayValue('output');
      expect(input).toBeInTheDocument();
    });
  });
});
