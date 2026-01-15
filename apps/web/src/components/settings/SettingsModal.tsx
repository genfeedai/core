'use client';

import { Check, ExternalLink, Eye, EyeOff, Settings, Trash2, X } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  type EdgeStyle,
  PROVIDER_INFO,
  type ProviderType,
  useSettingsStore,
} from '@/store/settingsStore';
import { useUIStore } from '@/store/uiStore';

// =============================================================================
// TYPES
// =============================================================================

type TabId = 'providers' | 'defaults' | 'appearance';

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: 'providers', label: 'Providers' },
  { id: 'defaults', label: 'Defaults' },
  { id: 'appearance', label: 'Appearance' },
];

// =============================================================================
// PROVIDER KEY INPUT
// =============================================================================

interface ProviderKeyInputProps {
  provider: ProviderType;
}

function ProviderKeyInput({ provider }: ProviderKeyInputProps) {
  const { providers, setProviderKey, clearProviderKey } = useSettingsStore();
  const config = providers[provider];
  const info = PROVIDER_INFO[provider];

  const [showKey, setShowKey] = useState(false);
  const [localKey, setLocalKey] = useState(config.apiKey ?? '');
  const [isSaved, setIsSaved] = useState(!!config.apiKey);

  const handleSave = useCallback(() => {
    if (localKey.trim()) {
      setProviderKey(provider, localKey.trim());
      setIsSaved(true);
    }
  }, [localKey, provider, setProviderKey]);

  const handleClear = useCallback(() => {
    clearProviderKey(provider);
    setLocalKey('');
    setIsSaved(false);
  }, [provider, clearProviderKey]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSave();
      }
    },
    [handleSave]
  );

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium text-foreground">{info.name}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{info.description}</p>
        </div>
        <a
          href={info.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            type={showKey ? 'text' : 'password'}
            value={localKey}
            onChange={(e) => {
              setLocalKey(e.target.value);
              setIsSaved(false);
            }}
            onKeyDown={handleKeyDown}
            placeholder={`Enter ${info.name} API key`}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {localKey && !isSaved && (
          <Button size="sm" onClick={handleSave}>
            <Check className="h-4 w-4" />
            Save
          </Button>
        )}

        {isSaved && (
          <Button size="sm" variant="ghost" onClick={handleClear}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isSaved && (
        <div className="mt-2 flex items-center gap-1 text-xs text-chart-2">
          <Check className="h-3 w-3" />
          API key configured
        </div>
      )}
    </div>
  );
}

// =============================================================================
// PROVIDERS TAB
// =============================================================================

function ProvidersTab() {
  const providers: ProviderType[] = ['replicate', 'fal', 'huggingface'];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-sm text-amber-600 dark:text-amber-400">
          API keys are stored locally in your browser. They are sent securely to our backend for
          provider requests and are never logged or stored on our servers.
        </p>
      </div>

      {providers.map((provider) => (
        <ProviderKeyInput key={provider} provider={provider} />
      ))}
    </div>
  );
}

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
  const { edgeStyle, setEdgeStyle } = useSettingsStore();

  return (
    <div className="space-y-6">
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
// MAIN MODAL
// =============================================================================

function SettingsModalComponent() {
  const { activeModal, closeModal } = useUIStore();
  const [activeTab, setActiveTab] = useState<TabId>('providers');

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
          {activeTab === 'providers' && <ProvidersTab />}
          {activeTab === 'defaults' && <DefaultsTab />}
          {activeTab === 'appearance' && <AppearanceTab />}
        </div>
      </div>
    </>
  );
}

export const SettingsModal = memo(SettingsModalComponent);
