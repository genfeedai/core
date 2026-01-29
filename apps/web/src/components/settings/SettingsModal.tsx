'use client';

import {
  AlertTriangle,
  BookOpen,
  Bug,
  Code,
  HelpCircle,
  MessageCircle,
  Settings,
  Store,
  Twitter,
  X,
} from 'lucide-react';
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

type TabId = 'defaults' | 'api-keys' | 'appearance' | 'developer' | 'help';

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: 'defaults', label: 'Defaults' },
  { id: 'api-keys', label: 'API Keys' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'developer', label: 'Developer' },
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
    </div>
  );
}

// =============================================================================
// API KEYS TAB
// =============================================================================

const TTS_ENABLED = process.env.NEXT_PUBLIC_TTS_ENABLED === 'true';

interface ApiKeyStatus {
  name: string;
  envVar: string;
  location: 'api' | 'web' | 'both';
  isConfigured: boolean | null; // null = unknown (server-side only)
  description: string;
  docsUrl?: string;
}

const API_KEYS: ApiKeyStatus[] = [
  {
    name: 'Replicate',
    envVar: 'REPLICATE_API_TOKEN',
    location: 'api',
    isConfigured: null,
    description: 'Required for image/video generation (Nano Banana, Veo, Kling)',
    docsUrl: 'https://replicate.com/account/api-tokens',
  },
  {
    name: 'ElevenLabs',
    envVar: 'ELEVENLABS_API_KEY',
    location: 'both',
    isConfigured: TTS_ENABLED,
    description: 'Required for Text-to-Speech (Facecam Avatar template)',
    docsUrl: 'https://elevenlabs.io/app/settings/api-keys',
  },
  {
    name: 'fal.ai',
    envVar: 'FAL_API_KEY',
    location: 'api',
    isConfigured: null,
    description: 'Alternative provider for image/video generation',
    docsUrl: 'https://fal.ai/dashboard/keys',
  },
  {
    name: 'Hugging Face',
    envVar: 'HF_API_TOKEN',
    location: 'api',
    isConfigured: null,
    description: 'Alternative provider for AI models',
    docsUrl: 'https://huggingface.co/settings/tokens',
  },
];

function ApiKeysTab() {
  return (
    <div className="space-y-6">
      {/* Important Notice */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
        <h4 className="font-medium text-amber-600 dark:text-amber-400">
          API keys must be configured in .env files
        </h4>
        <p className="mt-1 text-sm text-amber-600/80 dark:text-amber-400/80">
          This app does not store API keys in the browser. You need to edit the environment files
          directly on the server.
        </p>
      </div>

      {/* File Locations */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-foreground">Configuration Files</h4>
        <div className="grid gap-2">
          <div className="rounded border border-border bg-secondary/30 p-3">
            <code className="text-xs font-medium text-primary">apps/api/.env</code>
            <p className="mt-1 text-xs text-muted-foreground">
              Backend API keys (Replicate, ElevenLabs, fal.ai, etc.)
            </p>
          </div>
          <div className="rounded border border-border bg-secondary/30 p-3">
            <code className="text-xs font-medium text-primary">apps/web/.env</code>
            <p className="mt-1 text-xs text-muted-foreground">
              Frontend flags (e.g., NEXT_PUBLIC_TTS_ENABLED=true)
            </p>
          </div>
        </div>
      </div>

      {/* API Keys Status */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-foreground">Required API Keys</h4>
        <div className="space-y-2">
          {API_KEYS.map((key) => (
            <div
              key={key.envVar}
              className="flex items-start gap-3 rounded-lg border border-border p-3"
            >
              {/* Status Indicator */}
              <div className="mt-0.5">
                {key.isConfigured === true && (
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500" title="Configured" />
                )}
                {key.isConfigured === false && (
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500" title="Not configured" />
                )}
                {key.isConfigured === null && (
                  <div
                    className="h-2.5 w-2.5 rounded-full bg-gray-400"
                    title="Status unknown (server-side)"
                  />
                )}
              </div>

              {/* Key Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-foreground">{key.name}</span>
                  <code className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">
                    {key.envVar}
                  </code>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{key.description}</p>
                {key.isConfigured === false && (
                  <p className="text-xs text-red-500 mt-1">
                    Add to apps/{key.location === 'both' ? 'api/.env & web/.env' : 'api/.env'}
                  </p>
                )}
              </div>

              {/* Get Key Link */}
              {key.docsUrl && (
                <a
                  href={key.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline whitespace-nowrap"
                >
                  Get key
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ElevenLabs specific instructions */}
      <div className="rounded-lg border border-border bg-secondary/30 p-4">
        <h4 className="font-medium text-foreground text-sm">ElevenLabs Setup</h4>
        <p className="mt-1 text-xs text-muted-foreground">To enable Text-to-Speech, add both:</p>
        <pre className="mt-2 overflow-x-auto rounded bg-background p-3 text-xs text-muted-foreground">
          {`# apps/api/.env
ELEVENLABS_API_KEY=your_key_here

# apps/web/.env
NEXT_PUBLIC_TTS_ENABLED=true`}
        </pre>
        <p className="mt-2 text-xs text-muted-foreground">
          Then restart both the API and web servers.
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// APPEARANCE TAB
// =============================================================================

const EDGE_STYLES: { value: EdgeStyle; label: string; description: string }[] = [
  { value: 'default', label: 'Curved', description: 'Smooth bezier curves' },
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
      <div className="rounded-lg border border-border bg-secondary/30 p-4">
        <div className="relative h-20 w-[232px] mx-auto">
          {/* Node A - left side, lower */}
          <div className="absolute left-0 bottom-2 flex h-8 w-16 items-center justify-center rounded border border-border bg-background text-xs text-muted-foreground">
            Node A
          </div>
          {/* Edge SVG - connects the nodes (64px gap between 64px nodes = 104px) */}
          <svg className="absolute left-16 top-0 text-primary" width="104" height="80">
            {edgeStyle === 'default' && (
              <path
                d="M 0 56 C 35 56, 69 24, 104 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
            )}
            {edgeStyle === 'smoothstep' && (
              <path
                d="M 0 56 L 42 56 Q 52 56 52 46 L 52 34 Q 52 24 62 24 L 104 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
            )}
            {edgeStyle === 'straight' && (
              <path d="M 0 56 L 104 24" fill="none" stroke="currentColor" strokeWidth="2" />
            )}
          </svg>
          {/* Node B - right side, higher */}
          <div className="absolute right-0 top-2 flex h-8 w-16 items-center justify-center rounded border border-border bg-background text-xs text-muted-foreground">
            Node B
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// DEVELOPER TAB
// =============================================================================

function DeveloperTab() {
  const { debugMode, setDebugMode } = useSettingsStore();

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Developer tools for debugging and testing workflows.
      </p>

      {/* Debug Mode Toggle */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Bug className="h-4 w-4" />
              Debug Mode
            </label>
            <p className="text-xs text-muted-foreground mt-1">
              Skip API calls and inspect payloads without paying for generations
            </p>
          </div>
          <button
            onClick={() => setDebugMode(!debugMode)}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              debugMode ? 'bg-amber-500' : 'bg-border'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                debugMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Warning when enabled */}
        {debugMode && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-600 dark:text-amber-400">
                  Debug mode is active
                </h4>
                <p className="mt-1 text-sm text-amber-600/80 dark:text-amber-400/80">
                  Use <strong>"Run Selected"</strong> to test nodes with mocked API calls. Full
                  workflow execution ("Run Workflow") will still make real API calls.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info about debug mode */}
      <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-3">
        <h4 className="font-medium text-foreground text-sm flex items-center gap-2">
          <Code className="h-4 w-4" />
          What debug mode does
        </h4>
        <ul className="text-xs text-muted-foreground space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Skips actual Replicate API calls to avoid charges</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Returns placeholder images/videos with "DEBUG" watermark</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Opens debug panel showing exact payloads that would be sent</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Works with "Run Selected" for testing individual nodes</span>
          </li>
        </ul>
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
            href="https://discord.gg/Qy867n83Z4"
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
          <a
            href="https://marketplace.genfeed.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg border border-border p-3 transition hover:border-primary/50 hover:bg-secondary/30"
          >
            <Store className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="font-medium text-foreground">Marketplace</div>
              <p className="text-xs text-muted-foreground">Browse workflows, prompts & assets</p>
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
      <div className="fixed inset-0 z-50 bg-black/70" onClick={closeModal} />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100%-2rem)] max-w-[600px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg bg-card shadow-xl">
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
          {activeTab === 'api-keys' && <ApiKeysTab />}
          {activeTab === 'appearance' && <AppearanceTab />}
          {activeTab === 'developer' && <DeveloperTab />}
          {activeTab === 'help' && <HelpTab />}
        </div>
      </div>
    </>
  );
}

export const SettingsModal = memo(SettingsModalComponent);
