import type { ProviderModel } from '@genfeedai/types';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ModelBrowserModal } from './ModelBrowserModal';

const mockAddRecentModel = vi.fn();

// The component calls useSettingsStore with individual selectors:
// useSettingsStore((s) => s.recentModels)
// useSettingsStore((s) => s.addRecentModel)
// useSettingsStore((s) => s.providers.replicate.apiKey) etc.
vi.mock('@/store/settingsStore', () => {
  const state = {
    recentModels: [{ id: 'flux-dev', displayName: 'FLUX.1-dev', provider: 'replicate' }],
    addRecentModel: mockAddRecentModel,
    providers: {
      replicate: { apiKey: 'test-key' },
      fal: { apiKey: null },
      huggingface: { apiKey: null },
    },
  };

  return {
    useSettingsStore: vi.fn((selector: (s: unknown) => unknown) => selector(state)),
  };
});

// Mock logger to prevent console output in tests
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

// Mock createPortal to render inline instead of into document.body
vi.mock('react-dom', async () => {
  const actual = await vi.importActual<typeof import('react-dom')>('react-dom');
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  };
});

describe('ModelBrowserModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSelect: vi.fn(),
  };

  const mockModels: ProviderModel[] = [
    {
      id: 'flux-dev',
      displayName: 'FLUX.1-dev',
      provider: 'replicate',
      capabilities: ['text-to-image'],
      description: 'High quality image generation',
      pricing: '$0.05/image',
    },
    {
      id: 'stable-diffusion-xl',
      displayName: 'Stable Diffusion XL',
      provider: 'replicate',
      capabilities: ['text-to-image', 'image-to-image'],
      description: 'Fast image generation',
      pricing: '$0.02/image',
    },
    {
      id: 'fal-flux',
      displayName: 'FAL FLUX',
      provider: 'fal',
      capabilities: ['text-to-image'],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            models: mockModels,
            configuredProviders: ['replicate', 'fal', 'huggingface'],
          }),
      })
    );
  });

  describe('rendering', () => {
    it('should not render when not open', () => {
      const { container } = render(<ModelBrowserModal {...defaultProps} isOpen={false} />);

      expect(container.firstChild).toBeNull();
    });

    it('should render modal when open', () => {
      render(<ModelBrowserModal {...defaultProps} />);

      expect(screen.getByText('Browse Models')).toBeInTheDocument();
    });

    it('should render custom title', () => {
      render(<ModelBrowserModal {...defaultProps} title="Select Image Model" />);

      expect(screen.getByText('Select Image Model')).toBeInTheDocument();
    });

    it('should render search input', () => {
      render(<ModelBrowserModal {...defaultProps} />);

      expect(screen.getByPlaceholderText('Search models...')).toBeInTheDocument();
    });

    it('should render provider filter buttons', async () => {
      render(<ModelBrowserModal {...defaultProps} />);

      // Provider filter buttons appear after models are fetched (configuredProviders)
      await waitFor(() => {
        expect(screen.getByText('All')).toBeInTheDocument();
        expect(screen.getByText('Replicate')).toBeInTheDocument();
        expect(screen.getByText('fal.ai')).toBeInTheDocument();
        expect(screen.getByText('Hugging Face')).toBeInTheDocument();
      });
    });
  });

  describe('model loading', () => {
    it('should fetch models on open', async () => {
      render(<ModelBrowserModal {...defaultProps} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('should display models after loading', async () => {
      render(<ModelBrowserModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('FLUX.1-dev')).toBeInTheDocument();
        expect(screen.getByText('Stable Diffusion XL')).toBeInTheDocument();
      });
    });

    it('should show loading spinner during fetch', () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(
                () =>
                  resolve({
                    ok: true,
                    json: () => Promise.resolve({ models: [], configuredProviders: [] }),
                  }),
                1000
              )
            )
        )
      );

      render(<ModelBrowserModal {...defaultProps} />);

      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('search functionality', () => {
    it('should debounce search input', async () => {
      vi.useFakeTimers();
      render(<ModelBrowserModal {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search models...');
      fireEvent.change(searchInput, { target: { value: 'flux' } });

      // Should not have called fetch yet (debounce)
      expect(global.fetch).toHaveBeenCalledTimes(1); // Initial call

      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });

      vi.useRealTimers();
    });

    it('should pass search query to API', async () => {
      vi.useFakeTimers();
      render(<ModelBrowserModal {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search models...');
      fireEvent.change(searchInput, { target: { value: 'flux' } });

      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('query=flux'),
          expect.any(Object)
        );
      });

      vi.useRealTimers();
    });
  });

  describe('provider filtering', () => {
    it('should filter by provider when clicked', async () => {
      vi.useFakeTimers();
      render(<ModelBrowserModal {...defaultProps} />);

      // Wait for initial fetch and provider buttons to appear
      vi.advanceTimersByTime(300);
      await waitFor(() => {
        expect(screen.getByText('fal.ai')).toBeInTheDocument();
      });

      const falButton = screen.getByText('fal.ai');
      fireEvent.click(falButton);

      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('provider=fal'),
          expect.any(Object)
        );
      });

      vi.useRealTimers();
    });
  });

  describe('model selection', () => {
    it('should call onSelect when model is clicked', async () => {
      render(<ModelBrowserModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('FLUX.1-dev')).toBeInTheDocument();
      });

      const modelCard = screen.getByText('FLUX.1-dev').closest('button');
      if (modelCard) fireEvent.click(modelCard);

      expect(defaultProps.onSelect).toHaveBeenCalledWith(mockModels[0]);
    });

    it('should add model to recent models', async () => {
      render(<ModelBrowserModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('FLUX.1-dev')).toBeInTheDocument();
      });

      const modelCard = screen.getByText('FLUX.1-dev').closest('button');
      if (modelCard) fireEvent.click(modelCard);

      expect(mockAddRecentModel).toHaveBeenCalledWith({
        id: 'flux-dev',
        displayName: 'FLUX.1-dev',
        provider: 'replicate',
      });
    });

    it('should close modal after selection', async () => {
      render(<ModelBrowserModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('FLUX.1-dev')).toBeInTheDocument();
      });

      const modelCard = screen.getByText('FLUX.1-dev').closest('button');
      if (modelCard) fireEvent.click(modelCard);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('close modal', () => {
    it('should close on backdrop click', () => {
      render(<ModelBrowserModal {...defaultProps} />);

      const backdrop = document.querySelector('.bg-black\\/50');
      if (backdrop) fireEvent.click(backdrop);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should close on X button click', () => {
      render(<ModelBrowserModal {...defaultProps} />);

      // The X button is a Button with an X icon child
      const buttons = screen.getAllByRole('button');
      // Find the close button (in the header, contains SVG X icon)
      const closeButton = buttons.find((btn) => {
        const svg = btn.querySelector('svg');
        return svg !== null && btn.textContent === '';
      });
      if (closeButton) fireEvent.click(closeButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('capability filtering', () => {
    it('should pass capabilities to API', async () => {
      vi.useFakeTimers();
      render(
        <ModelBrowserModal {...defaultProps} capabilities={['text-to-image', 'image-to-image']} />
      );

      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('capabilities=text-to-image%2Cimage-to-image'),
          expect.any(Object)
        );
      });

      vi.useRealTimers();
    });
  });

  describe('empty state', () => {
    it('should show empty state when no models found', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ models: [], configuredProviders: [] }),
        })
      );

      render(<ModelBrowserModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('No models found')).toBeInTheDocument();
      });
    });
  });

  describe('model count', () => {
    it('should show model count in footer', async () => {
      render(<ModelBrowserModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('3 models available')).toBeInTheDocument();
      });
    });

    it('should use singular form for one model', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              models: [mockModels[0]],
              configuredProviders: ['replicate'],
            }),
        })
      );

      render(<ModelBrowserModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('1 model available')).toBeInTheDocument();
      });
    });
  });
});
