import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsModal } from './SettingsModal';

const mockSetProviderKey = vi.fn();
const mockClearProviderKey = vi.fn();
const mockSetDefaultModel = vi.fn();
const mockSetEdgeStyle = vi.fn();
const mockCloseModal = vi.fn();

vi.mock('@/store/settingsStore', () => ({
  useSettingsStore: vi.fn(() => ({
    providers: {
      replicate: { apiKey: null, enabled: true },
      fal: { apiKey: null, enabled: true },
      huggingface: { apiKey: null, enabled: true },
    },
    defaults: {
      imageModel: 'nano-banana-pro',
      videoModel: 'veo-3.1',
      imageProvider: 'replicate',
      videoProvider: 'replicate',
    },
    edgeStyle: 'bezier',
    setProviderKey: mockSetProviderKey,
    clearProviderKey: mockClearProviderKey,
    setDefaultModel: mockSetDefaultModel,
    setEdgeStyle: mockSetEdgeStyle,
  })),
  PROVIDER_INFO: {
    replicate: {
      name: 'Replicate',
      description: 'Run AI models in the cloud',
      docsUrl: 'https://replicate.com/docs',
    },
    fal: {
      name: 'fal.ai',
      description: 'Fast AI inference',
      docsUrl: 'https://fal.ai/docs',
    },
    huggingface: {
      name: 'Hugging Face',
      description: 'ML models and datasets',
      docsUrl: 'https://huggingface.co/docs',
    },
  },
}));

vi.mock('@/store/uiStore', () => ({
  useUIStore: vi.fn(() => ({
    activeModal: 'settings',
    closeModal: mockCloseModal,
  })),
}));

describe('SettingsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render modal when activeModal is settings', () => {
      render(<SettingsModal />);

      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should render all tabs', () => {
      render(<SettingsModal />);

      expect(screen.getByText('Providers')).toBeInTheDocument();
      expect(screen.getByText('Defaults')).toBeInTheDocument();
      expect(screen.getByText('Appearance')).toBeInTheDocument();
    });

    it('should show providers tab by default', () => {
      render(<SettingsModal />);

      // Providers tab content
      expect(screen.getByText('Replicate')).toBeInTheDocument();
      expect(screen.getByText('fal.ai')).toBeInTheDocument();
      expect(screen.getByText('Hugging Face')).toBeInTheDocument();
    });

    it('should show security notice', () => {
      render(<SettingsModal />);

      expect(screen.getByText(/API keys are stored locally in your browser/)).toBeInTheDocument();
    });
  });

  describe('tab navigation', () => {
    it('should switch to defaults tab', () => {
      render(<SettingsModal />);

      fireEvent.click(screen.getByText('Defaults'));

      expect(screen.getByText('Default Image Model')).toBeInTheDocument();
      expect(screen.getByText('Default Video Model')).toBeInTheDocument();
    });

    it('should switch to appearance tab', () => {
      render(<SettingsModal />);

      fireEvent.click(screen.getByText('Appearance'));

      expect(screen.getByText('Edge Style')).toBeInTheDocument();
      expect(screen.getByText('Curved')).toBeInTheDocument();
      expect(screen.getByText('Smooth Step')).toBeInTheDocument();
      expect(screen.getByText('Straight')).toBeInTheDocument();
    });
  });

  describe('close modal', () => {
    it('should close modal on backdrop click', () => {
      render(<SettingsModal />);

      // Find backdrop (first child with bg-black/50 class)
      const backdrop = document.querySelector('.bg-black\\/50');
      if (backdrop) fireEvent.click(backdrop);

      expect(mockCloseModal).toHaveBeenCalled();
    });

    it('should close modal on X button click', () => {
      render(<SettingsModal />);

      const closeButtons = screen.getAllByRole('button');
      const closeButton = closeButtons.find((btn) => btn.querySelector('svg.lucide-x'));
      if (closeButton) fireEvent.click(closeButton);

      expect(mockCloseModal).toHaveBeenCalled();
    });
  });

  describe('hidden when not active', () => {
    it('should not render when activeModal is not settings', async () => {
      const { useUIStore } = await import('@/store/uiStore');
      vi.mocked(useUIStore).mockReturnValue({
        activeModal: null,
        closeModal: mockCloseModal,
      } as ReturnType<typeof useUIStore>);

      const { container } = render(<SettingsModal />);

      expect(container.firstChild).toBeNull();
    });
  });
});

describe('SettingsModal - Provider Tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render provider inputs', () => {
    render(<SettingsModal />);

    // Check for placeholder text in inputs
    expect(screen.getByPlaceholderText('Enter Replicate API key')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter fal.ai API key')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter Hugging Face API key')).toBeInTheDocument();
  });

  it('should render external links to docs', () => {
    render(<SettingsModal />);

    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThanOrEqual(3);
  });
});

describe('SettingsModal - Appearance Tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call setEdgeStyle on edge style selection', () => {
    render(<SettingsModal />);

    fireEvent.click(screen.getByText('Appearance'));

    const straightButton = screen.getByText('Straight').closest('button');
    if (straightButton) fireEvent.click(straightButton);

    expect(mockSetEdgeStyle).toHaveBeenCalledWith('straight');
  });

  it('should render edge preview', () => {
    render(<SettingsModal />);

    fireEvent.click(screen.getByText('Appearance'));

    expect(screen.getByText('Node A')).toBeInTheDocument();
    expect(screen.getByText('Node B')).toBeInTheDocument();
  });
});
