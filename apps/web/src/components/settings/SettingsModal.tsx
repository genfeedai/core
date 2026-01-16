'use client';

import { BookOpen, HelpCircle, MessageCircle, Settings, Twitter, X } from 'lucide-react';
import { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type EdgeStyle, type ProviderType, useSettingsStore } from '@/store/settingsStore';
import { useUIStore } from '@/store/uiStore';

// =============================================================================
// TYPES
// =============================================================================

type TabId = 'defaults' | 'appearance' | 'help';

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: 'defaults', label: 'Defaults' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'help', label: 'Help' },
];

// =============================================================================
// DEFAULTS TAB
// =============================================================================

const IMAGE_MODELS = [
  { value: 'nano-banana', label: 'Nano Banana', description: 'Fast, $0.039/image' },
  {
    value: 'nano-banana-pro',
    label: 'Nano Banana Pro',
    description: 'High quality, $0.15-0.30/image',
  },
];

const VIDEO_MODELS = [
  { value: 'veo-3.1-fast', label: 'Veo 3.1 Fast', description: 'Fast, $0.10-0.15/sec' },
  { value: 'veo-3.1', label: 'Veo 3.1', description: 'High quality, $0.20-0.40/sec' },
];

function DefaultsTab() {
  const { defaults, setDefaultModel } = useSettingsStore();

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Set default models for new nodes. You can always change models per-node.
      </p>

      {/* Default Image Model */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Default Image Model</label>
        <Select
          value={defaults.imageModel}
          onValueChange={(value) => setDefaultModel('image', value, defaults.imageProvider)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {IMAGE_MODELS.map((model) => (
              <SelectItem key={model.value} value={model.value}>
                <span>{model.label}</span>
                <span className="ml-2 text-xs text-muted-foreground">{model.description}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Default Video Model */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Default Video Model</label>
        <Select
          value={defaults.videoModel}
          onValueChange={(value) => setDefaultModel('video', value, defaults.videoProvider)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VIDEO_MODELS.map((model) => (
              <SelectItem key={model.value} value={model.value}>
                <span>{model.label}</span>
                <span className="ml-2 text-xs text-muted-foreground">{model.description}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Default Provider */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Default Provider</label>
        <Select
          value={defaults.imageProvider}
          onValueChange={(value) => {
            const provider = value as ProviderType;
            setDefaultModel('image', defaults.imageModel, provider);
            setDefaultModel('video', defaults.videoModel, provider);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="replicate">Replicate (Recommended)</SelectItem>
            <SelectItem value="fal">fal.ai</SelectItem>
            <SelectItem value="huggingface">Hugging Face</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Replicate is recommended for best model availability and reliability.
        </p>
      </div>

      {/* API Setup Instructions */}
      <div className="mt-8 rounded-lg border border-border bg-secondary/30 p-4">
        <h4 className="font-medium text-foreground">API Configuration</h4>
        <p className="mt-1 text-sm text-muted-foreground">
          API keys are configured via environment variables. Add your keys to the{' '}
          <code className="rounded bg-background px-1.5 py-0.5 text-xs">.env</code> file:
        </p>
        <pre className="mt-3 overflow-x-auto rounded bg-background p-3 text-xs text-muted-foreground">
          {`REPLICATE_API_TOKEN=r8_...
FAL_API_KEY=...
HF_API_TOKEN=hf_...`}
        </pre>
      </div>
    </div>
  );
}

// =============================================================================
// APPEARANCE TAB
// =============================================================================

const EDGE_STYLES: { value: EdgeStyle; label: string; description: string }[] = [
  { value: 'bezier', label: 'Curved', description: 'Smooth bezier curves' },
  { value: 'smoothstep', label: 'Smooth Step', description: 'Right-angled with rounded corners' },
  { value: 'straight', label: 'Straight', description: 'Direct lines between nodes' },
];

function AppearanceTab() {
  const { edgeStyle, setEdgeStyle, showMinimap, setShowMinimap } = useSettingsStore();

  return (
    <div className="space-y-6">
      {/* Minimap Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-foreground">Show Minimap</label>
          <p className="text-xs text-muted-foreground">
            Display a miniature overview of the workflow canvas
          </p>
        </div>
        <button
          onClick={() => setShowMinimap(!showMinimap)}
          className={`relative h-6 w-11 rounded-full transition-colors ${
            showMinimap ? 'bg-primary' : 'bg-border'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
              showMinimap ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Edge Style */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Edge Style</label>
        <p className="text-xs text-muted-foreground">
          How connections between nodes are drawn on the canvas.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {EDGE_STYLES.map((style) => (
            <button
              key={style.value}
              onClick={() => setEdgeStyle(style.value)}
              className={`rounded-lg border p-3 text-left transition ${
                edgeStyle === style.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="font-medium text-sm text-foreground">{style.label}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{style.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-lg border border-border bg-secondary/30 p-6">
        <div className="flex items-center justify-center gap-8">
          <div className="flex h-12 w-24 items-center justify-center rounded border border-border bg-background text-xs text-muted-foreground">
            Node A
          </div>
          <svg width="80" height="40" className="text-primary">
            {edgeStyle === 'bezier' && (
              <path
                d="M 0 20 C 30 20, 50 20, 80 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
            )}
            {edgeStyle === 'smoothstep' && (
              <path
                d="M 0 20 L 30 20 Q 40 20 40 30 L 40 30 Q 40 20 50 20 L 80 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
            )}
            {edgeStyle === 'straight' && (
              <path d="M 0 20 L 80 20" fill="none" stroke="currentColor" strokeWidth="2" />
            )}
          </svg>
          <div className="flex h-12 w-24 items-center justify-center rounded border border-border bg-background text-xs text-muted-foreground">
            Node B
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// HELP TAB
// =============================================================================

function HelpTab() {
  const { openModal, closeModal } = useUIStore();

  const handleShowWelcome = () => {
    closeModal();
    // Small delay to let the settings modal close first
    setTimeout(() => openModal('welcome'), 100);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Screen */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Getting Started</h3>
        <button
          onClick={handleShowWelcome}
          className="flex w-full items-center gap-3 rounded-lg border border-border p-4 text-left transition hover:border-primary/50 hover:bg-secondary/30"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <HelpCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-medium text-foreground">Show Welcome Screen</div>
            <p className="text-sm text-muted-foreground">
              View the welcome modal with quick start options
            </p>
          </div>
        </button>
      </div>

      {/* External Links */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Resources</h3>
        <div className="space-y-2">
          <a
            href="https://docs.genfeed.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg border border-border p-3 transition hover:border-primary/50 hover:bg-secondary/30"
          >
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="font-medium text-foreground">Documentation</div>
              <p className="text-xs text-muted-foreground">Learn how to use Genfeed</p>
            </div>
          </a>
          <a
            href="https://discord.gg/genfeed"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg border border-border p-3 transition hover:border-primary/50 hover:bg-secondary/30"
          >
            <MessageCircle className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="font-medium text-foreground">Discord Community</div>
              <p className="text-xs text-muted-foreground">Get help and share workflows</p>
            </div>
          </a>
          <a
            href="https://twitter.com/genfeedai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg border border-border p-3 transition hover:border-primary/50 hover:bg-secondary/30"
          >
            <Twitter className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="font-medium text-foreground">Twitter / X</div>
              <p className="text-xs text-muted-foreground">Follow for updates</p>
            </div>
          </a>
        </div>
      </div>

      {/* Version Info */}
      <div className="rounded-lg border border-border bg-secondary/30 p-4">
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Genfeed</span> v0.1.0
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN MODAL
// =============================================================================

function SettingsModalComponent() {
  const { activeModal, closeModal } = useUIStore();
  const [activeTab, setActiveTab] = useState<TabId>('defaults');

  const isOpen = activeModal === 'settings';

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50" onClick={closeModal} />

      {/* Modal */}
      <div className="fixed inset-4 z-50 flex flex-col overflow-hidden rounded-lg bg-card shadow-xl md:inset-y-10 md:left-1/2 md:right-auto md:w-[600px] md:-translate-x-1/2">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Settings</h2>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={closeModal}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 py-3 text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'defaults' && <DefaultsTab />}
          {activeTab === 'appearance' && <AppearanceTab />}
          {activeTab === 'help' && <HelpTab />}
        </div>
      </div>
    </>
  );
}

export const SettingsModal = memo(SettingsModalComponent);
