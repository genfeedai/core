import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OutputNode } from './OutputNode';

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

// Mock Button
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    onClick: () => void;
    className?: string;
  }) => (
    <button onClick={onClick} className={className} data-testid="download-button">
      {children}
    </button>
  ),
}));

describe('OutputNode', () => {
  const defaultProps = {
    id: 'output-1',
    type: 'output',
    data: {
      label: 'Output',
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

  describe('waiting state', () => {
    it('should show waiting message when no input', () => {
      render(<OutputNode {...defaultProps} />);

      expect(screen.getByText('Waiting for input...')).toBeInTheDocument();
    });
  });

  describe('with image input', () => {
    it('should display image when inputType is image', () => {
      render(
        <OutputNode
          {...defaultProps}
          data={{
            ...defaultProps.data,
            inputMedia: 'https://example.com/image.png',
            inputType: 'image',
          }}
        />
      );

      expect(screen.getByTestId('next-image')).toBeInTheDocument();
      expect(screen.getByAltText('Output')).toBeInTheDocument();
    });

    it('should show output ready indicator', () => {
      render(
        <OutputNode
          {...defaultProps}
          data={{
            ...defaultProps.data,
            inputMedia: 'https://example.com/image.png',
            inputType: 'image',
          }}
        />
      );

      expect(screen.getByText('Output Ready')).toBeInTheDocument();
    });

    it('should show download button', () => {
      render(
        <OutputNode
          {...defaultProps}
          data={{
            ...defaultProps.data,
            inputMedia: 'https://example.com/image.png',
            inputType: 'image',
          }}
        />
      );

      expect(screen.getByText('Download')).toBeInTheDocument();
    });
  });

  describe('with video input', () => {
    it('should display video when inputType is video', () => {
      render(
        <OutputNode
          {...defaultProps}
          data={{
            ...defaultProps.data,
            inputMedia: 'https://example.com/video.mp4',
            inputType: 'video',
          }}
        />
      );

      const video = document.querySelector('video');
      expect(video).toBeInTheDocument();
      expect(video?.getAttribute('src')).toBe('https://example.com/video.mp4');
    });

    it('should have video controls', () => {
      render(
        <OutputNode
          {...defaultProps}
          data={{
            ...defaultProps.data,
            inputMedia: 'https://example.com/video.mp4',
            inputType: 'video',
          }}
        />
      );

      const video = document.querySelector('video');
      expect(video?.hasAttribute('controls')).toBe(true);
    });
  });

  describe('with text input', () => {
    it('should display text content', () => {
      render(
        <OutputNode
          {...defaultProps}
          data={{
            ...defaultProps.data,
            inputMedia: 'Generated text output',
            inputType: 'text',
          }}
        />
      );

      expect(screen.getByText('Generated text output')).toBeInTheDocument();
    });
  });

  describe('download functionality', () => {
    it('should trigger download when button clicked', () => {
      const appendChildSpy = vi
        .spyOn(document.body, 'appendChild')
        .mockImplementation(() => document.createElement('a'));
      const removeChildSpy = vi
        .spyOn(document.body, 'removeChild')
        .mockImplementation(() => document.createElement('a'));

      render(
        <OutputNode
          {...defaultProps}
          data={{
            ...defaultProps.data,
            inputMedia: 'https://example.com/image.png',
            inputType: 'image',
            outputName: 'my-image',
          }}
        />
      );

      fireEvent.click(screen.getByTestId('download-button'));

      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();

      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });

    it('should not download when no inputMedia', () => {
      const appendChildSpy = vi.spyOn(document.body, 'appendChild');

      render(<OutputNode {...defaultProps} />);

      // No download button should exist when no input
      expect(screen.queryByTestId('download-button')).not.toBeInTheDocument();

      appendChildSpy.mockRestore();
    });

    it('should use correct extension for video', () => {
      let createdLink: HTMLAnchorElement | null = null;
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((el) => {
        createdLink = el as HTMLAnchorElement;
        return el;
      });
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => document.createElement('a'));

      render(
        <OutputNode
          {...defaultProps}
          data={{
            ...defaultProps.data,
            inputMedia: 'https://example.com/video.mp4',
            inputType: 'video',
            outputName: 'my-video',
          }}
        />
      );

      fireEvent.click(screen.getByTestId('download-button'));

      expect(createdLink?.download).toBe('my-video.mp4');

      appendChildSpy.mockRestore();
    });

    it('should use default output name when not provided', () => {
      let createdLink: HTMLAnchorElement | null = null;
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((el) => {
        createdLink = el as HTMLAnchorElement;
        return el;
      });
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => document.createElement('a'));

      render(
        <OutputNode
          {...defaultProps}
          data={{
            ...defaultProps.data,
            inputMedia: 'https://example.com/image.png',
            inputType: 'image',
          }}
        />
      );

      fireEvent.click(screen.getByTestId('download-button'));

      expect(createdLink?.download).toBe('output.png');

      appendChildSpy.mockRestore();
    });
  });
});
