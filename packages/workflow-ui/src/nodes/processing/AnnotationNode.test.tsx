import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnnotationNode } from './AnnotationNode';

const mockOpenAnnotation = vi.fn();
const mockGetConnectedInputs = vi.fn();
const mockOpenNodeDetailModal = vi.fn();

vi.mock('../../stores/annotationStore', () => ({
  useAnnotationStore: vi.fn((selector: (state: unknown) => unknown) =>
    selector({ openAnnotation: mockOpenAnnotation })
  ),
}));

vi.mock('../../stores/workflowStore', () => ({
  useWorkflowStore: vi.fn((selector: (state: unknown) => unknown) =>
    selector({ getConnectedInputs: mockGetConnectedInputs })
  ),
}));

vi.mock('../../stores/uiStore', () => ({
  useUIStore: vi.fn((selector: (state: unknown) => unknown) =>
    selector({ openNodeDetailModal: mockOpenNodeDetailModal })
  ),
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

// Mock UI button with variant support for class-based assertions
vi.mock('../../ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant = 'default',
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
    className?: string;
  }) => {
    const variantClasses: Record<string, string> = {
      default: 'bg-primary text-primary-foreground',
      outline: 'border bg-background',
      ghost: 'hover:bg-accent',
    };
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`${variantClasses[variant] ?? ''} ${className ?? ''}`}
      >
        {children}
      </button>
    );
  },
}));

describe('AnnotationNode', () => {
  const defaultProps = {
    id: 'node-1',
    type: 'annotation',
    data: {
      inputImage: null,
      outputImage: null,
      annotations: [],
      hasAnnotations: false,
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
    mockGetConnectedInputs.mockReturnValue(new Map());
  });

  describe('rendering without image', () => {
    it('should render placeholder when no image', () => {
      render(<AnnotationNode {...defaultProps} />);

      expect(screen.getByText('Connect an image')).toBeInTheDocument();
    });

    it('should render add annotations button', () => {
      render(<AnnotationNode {...defaultProps} />);

      expect(screen.getByText('Add Annotations')).toBeInTheDocument();
    });

    it('should disable button without image', () => {
      render(<AnnotationNode {...defaultProps} />);

      const button = screen.getByText('Add Annotations');
      expect(button).toBeDisabled();
    });
  });

  describe('rendering with image', () => {
    it('should render image preview', () => {
      const propsWithImage = {
        ...defaultProps,
        data: { ...defaultProps.data, inputImage: '/test.jpg' },
      };
      render(<AnnotationNode {...propsWithImage} />);

      const img = screen.getByAltText('Input image');
      expect(img).toHaveAttribute('src', '/test.jpg');
    });

    it('should enable button with image', () => {
      const propsWithImage = {
        ...defaultProps,
        data: { ...defaultProps.data, inputImage: '/test.jpg' },
      };
      render(<AnnotationNode {...propsWithImage} />);

      const button = screen.getByText('Add Annotations');
      expect(button).not.toBeDisabled();
    });

    it('should show placeholder removed when image is present', () => {
      const propsWithImage = {
        ...defaultProps,
        data: { ...defaultProps.data, inputImage: '/test.jpg' },
      };
      render(<AnnotationNode {...propsWithImage} />);

      expect(screen.queryByText('Connect an image')).not.toBeInTheDocument();
    });
  });

  describe('rendering with annotations', () => {
    it('should show annotation count badge', () => {
      const propsWithAnnotations = {
        ...defaultProps,
        data: {
          ...defaultProps.data,
          inputImage: '/test.jpg',
          hasAnnotations: true,
          annotations: [
            {
              id: '1',
              type: 'rectangle',
              strokeColor: '#fff',
              strokeWidth: 2,
              fillColor: null,
              props: {},
            },
            {
              id: '2',
              type: 'circle',
              strokeColor: '#fff',
              strokeWidth: 2,
              fillColor: null,
              props: {},
            },
          ],
        },
      };
      render(<AnnotationNode {...propsWithAnnotations} />);

      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should show edit annotations button text', () => {
      const propsWithAnnotations = {
        ...defaultProps,
        data: {
          ...defaultProps.data,
          inputImage: '/test.jpg',
          hasAnnotations: true,
          annotations: [
            {
              id: '1',
              type: 'rectangle',
              strokeColor: '#fff',
              strokeWidth: 2,
              fillColor: null,
              props: {},
            },
          ],
        },
      };
      render(<AnnotationNode {...propsWithAnnotations} />);

      expect(screen.getByText('Edit Annotations')).toBeInTheDocument();
    });

    it('should show annotation count in footer', () => {
      const propsWithAnnotations = {
        ...defaultProps,
        data: {
          ...defaultProps.data,
          inputImage: '/test.jpg',
          hasAnnotations: true,
          annotations: [
            {
              id: '1',
              type: 'rectangle',
              strokeColor: '#fff',
              strokeWidth: 2,
              fillColor: null,
              props: {},
            },
            {
              id: '2',
              type: 'circle',
              strokeColor: '#fff',
              strokeWidth: 2,
              fillColor: null,
              props: {},
            },
            {
              id: '3',
              type: 'arrow',
              strokeColor: '#fff',
              strokeWidth: 2,
              fillColor: null,
              props: {},
            },
          ],
        },
      };
      render(<AnnotationNode {...propsWithAnnotations} />);

      expect(screen.getByText('3 annotations')).toBeInTheDocument();
    });

    it('should show singular annotation text for one item', () => {
      const propsWithAnnotations = {
        ...defaultProps,
        data: {
          ...defaultProps.data,
          inputImage: '/test.jpg',
          hasAnnotations: true,
          annotations: [
            {
              id: '1',
              type: 'rectangle',
              strokeColor: '#fff',
              strokeWidth: 2,
              fillColor: null,
              props: {},
            },
          ],
        },
      };
      render(<AnnotationNode {...propsWithAnnotations} />);

      expect(screen.getByText('1 annotation')).toBeInTheDocument();
    });
  });

  describe('connected inputs', () => {
    it('should use connected image input when available', () => {
      mockGetConnectedInputs.mockReturnValue(new Map([['image', '/connected-image.jpg']]));

      render(<AnnotationNode {...defaultProps} />);

      const img = screen.getByAltText('Input image');
      expect(img).toHaveAttribute('src', '/connected-image.jpg');
    });

    it('should prefer connected image over data inputImage', () => {
      mockGetConnectedInputs.mockReturnValue(new Map([['image', '/connected-image.jpg']]));

      const propsWithImage = {
        ...defaultProps,
        data: { ...defaultProps.data, inputImage: '/data-image.jpg' },
      };
      render(<AnnotationNode {...propsWithImage} />);

      const img = screen.getByAltText('Input image');
      expect(img).toHaveAttribute('src', '/connected-image.jpg');
    });
  });

  describe('interactions', () => {
    it('should call openAnnotation on button click', () => {
      const propsWithImage = {
        ...defaultProps,
        data: { ...defaultProps.data, inputImage: '/test.jpg' },
      };
      render(<AnnotationNode {...propsWithImage} />);

      const button = screen.getByText('Add Annotations');
      fireEvent.click(button);

      expect(mockOpenAnnotation).toHaveBeenCalledWith('node-1', '/test.jpg', []);
    });

    it('should pass existing annotations to openAnnotation', () => {
      const annotations = [
        {
          id: 'ann-1',
          type: 'rectangle' as const,
          strokeColor: '#ff0000',
          strokeWidth: 3,
          fillColor: '#00ff00',
          props: { x: 10, y: 20, width: 100, height: 50 },
        },
      ];

      const propsWithAnnotations = {
        ...defaultProps,
        data: {
          ...defaultProps.data,
          inputImage: '/test.jpg',
          hasAnnotations: true,
          annotations,
        },
      };
      render(<AnnotationNode {...propsWithAnnotations} />);

      const button = screen.getByText('Edit Annotations');
      fireEvent.click(button);

      expect(mockOpenAnnotation).toHaveBeenCalledWith('node-1', '/test.jpg', [
        {
          id: 'ann-1',
          type: 'rectangle',
          strokeColor: '#ff0000',
          strokeWidth: 3,
          fillColor: '#00ff00',
          x: 10,
          y: 20,
          width: 100,
          height: 50,
        },
      ]);
    });

    it('should not call openAnnotation without image', () => {
      render(<AnnotationNode {...defaultProps} />);

      const button = screen.getByText('Add Annotations');
      fireEvent.click(button);

      expect(mockOpenAnnotation).not.toHaveBeenCalled();
    });
  });

  describe('button variant', () => {
    it('should use outline variant without annotations', () => {
      const propsWithImage = {
        ...defaultProps,
        data: { ...defaultProps.data, inputImage: '/test.jpg' },
      };
      render(<AnnotationNode {...propsWithImage} />);

      const button = screen.getByText('Add Annotations');
      expect(button.closest('button')).toHaveClass('border');
    });

    it('should use default variant with annotations', () => {
      const propsWithAnnotations = {
        ...defaultProps,
        data: {
          ...defaultProps.data,
          inputImage: '/test.jpg',
          hasAnnotations: true,
          annotations: [
            {
              id: '1',
              type: 'rectangle',
              strokeColor: '#fff',
              strokeWidth: 2,
              fillColor: null,
              props: {},
            },
          ],
        },
      };
      render(<AnnotationNode {...propsWithAnnotations} />);

      const button = screen.getByText('Edit Annotations');
      // Default variant uses bg-primary
      expect(button.closest('button')).toHaveClass('bg-primary');
    });
  });
});
