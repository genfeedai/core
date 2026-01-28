'use client';

import type { ModelCapability, ProviderModel, ProviderType } from '@genfeedai/types';
import { AlertTriangle, Clock, ExternalLink, Search, Sparkles, X } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { logger } from '@/lib/logger';
import { useSettingsStore } from '@/store/settingsStore';

// =============================================================================
// TYPES
// =============================================================================

interface ModelBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (model: ProviderModel) => void;
  capabilities?: ModelCapability[];
  title?: string;
}

// =============================================================================
// PROVIDER BADGE
// =============================================================================

const PROVIDER_COLORS: Record<ProviderType, string> = {
  replicate: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  fal: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  huggingface: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
};

function ProviderBadge({ provider }: { provider: ProviderType }) {
  const labels: Record<ProviderType, string> = {
    replicate: 'Replicate',
    fal: 'fal.ai',
    huggingface: 'Hugging Face',
  };

  return (
    <span
      className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${PROVIDER_COLORS[provider]}`}
    >
      {labels[provider]}
    </span>
  );
}

// =============================================================================
// CAPABILITY BADGE
// =============================================================================

function CapabilityBadge({ capability }: { capability: ModelCapability }) {
  const labels: Record<ModelCapability, string> = {
    'text-to-image': 'txt→img',
    'image-to-image': 'img→img',
    'text-to-video': 'txt→vid',
    'image-to-video': 'img→vid',
  };

  return (
    <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
      {labels[capability]}
    </span>
  );
}

// =============================================================================
// MODEL CARD
// =============================================================================

interface ModelCardProps {
  model: ProviderModel;
  onSelect: (model: ProviderModel) => void;
  isRecent?: boolean;
}

function ModelCard({ model, onSelect, isRecent }: ModelCardProps) {
  return (
    <button
      onClick={() => onSelect(model)}
      className="group w-full rounded-lg border border-border bg-card p-4 text-left transition hover:border-primary"
    >
      <div className="flex items-start gap-3">
        {/* Thumbnail or placeholder */}
        {model.thumbnail ? (
          <img
            src={model.thumbnail}
            alt={model.displayName}
            className="h-12 w-12 rounded object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded bg-secondary">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          {/* Name and provider */}
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-medium text-foreground">{model.displayName}</h3>
            {isRecent && <Clock className="h-3 w-3 text-muted-foreground" />}
          </div>

          {/* Model ID */}
          <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{model.id}</p>

          {/* Badges */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <ProviderBadge provider={model.provider} />
            {model.capabilities.map((cap) => (
              <CapabilityBadge key={cap} capability={cap} />
            ))}
          </div>

          {/* Description and pricing */}
          {(model.description || model.pricing) && (
            <div className="mt-2 flex items-center justify-between gap-2">
              {model.description && (
                <p className="line-clamp-1 text-xs text-muted-foreground">{model.description}</p>
              )}
              {model.pricing && (
                <span className="shrink-0 text-xs font-medium text-chart-2">{model.pricing}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// =============================================================================
// MAIN MODAL
// =============================================================================

function ModelBrowserModalComponent({
  isOpen,
  onClose,
  onSelect,
  capabilities,
  title = 'Browse Models',
}: ModelBrowserModalProps) {
  const recentModels = useSettingsStore((s) => s.recentModels);
  const addRecentModel = useSettingsStore((s) => s.addRecentModel);
  // Select individual API keys to avoid reference changes triggering re-renders
  const replicateKey = useSettingsStore((s) => s.providers.replicate.apiKey);
  const falKey = useSettingsStore((s) => s.providers.fal.apiKey);
  const hfKey = useSettingsStore((s) => s.providers.huggingface.apiKey);

  const [searchQuery, setSearchQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState<ProviderType | 'all'>('all');
  const [models, setModels] = useState<ProviderModel[]>([]);
  const [configuredProviders, setConfiguredProviders] = useState<ProviderType[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchModels = useCallback(
    async (signal: AbortSignal) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();

        if (providerFilter !== 'all') {
          params.set('provider', providerFilter);
        }

        if (capabilities?.length) {
          params.set('capabilities', capabilities.join(','));
        }

        if (searchQuery) {
          params.set('query', searchQuery);
        }

        // Build headers with API keys
        const headers: Record<string, string> = {};
        if (replicateKey) {
          headers['X-Replicate-Key'] = replicateKey;
        }
        if (falKey) {
          headers['X-Fal-Key'] = falKey;
        }
        if (hfKey) {
          headers['X-HF-Key'] = hfKey;
        }

        const response = await fetch(`/api/providers/models?${params.toString()}`, {
          headers,
          signal,
        });

        if (response.ok) {
          const data = await response.json();
          setModels(data.models);
          setConfiguredProviders(data.configuredProviders);
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          logger.error('Failed to fetch models', error, { context: 'ModelBrowserModal' });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [searchQuery, providerFilter, capabilities, replicateKey, falKey, hfKey]
  );

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetchModels(controller.signal);
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [isOpen, fetchModels]);

  // Filter recent models by capabilities
  const filteredRecentModels = useMemo(() => {
    if (!capabilities?.length) return recentModels.slice(0, 4);

    return recentModels
      .filter((recent) => {
        const model = models.find((m) => m.id === recent.id && m.provider === recent.provider);
        if (!model) return true; // Keep if not in current list
        return model.capabilities.some((c) => capabilities.includes(c));
      })
      .slice(0, 4);
  }, [recentModels, models, capabilities]);

  const handleSelect = useCallback(
    (model: ProviderModel) => {
      addRecentModel({
        id: model.id,
        displayName: model.displayName,
        provider: model.provider,
      });
      onSelect(model);
      onClose();
    },
    [addRecentModel, onSelect, onClose]
  );

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-4 z-50 flex flex-col overflow-hidden rounded-lg bg-card shadow-xl md:inset-10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 border-b border-border px-6 py-4">
          {/* Search */}
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search models..."
              className="pl-10"
            />
          </div>

          {/* Provider filter - only show configured providers */}
          {configuredProviders.length > 0 && (
            <div className="flex items-center gap-2">
              {(['all', ...configuredProviders] as const).map((provider) => (
                <button
                  key={provider}
                  onClick={() => setProviderFilter(provider)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    providerFilter === provider
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {provider === 'all'
                    ? 'All'
                    : provider === 'replicate'
                      ? 'Replicate'
                      : provider === 'fal'
                        ? 'fal.ai'
                        : 'Hugging Face'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Warning when no providers configured */}
          {!isLoading && configuredProviders.length === 0 && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-yellow-600">No AI providers configured</p>
                <p className="mt-1 text-xs text-yellow-600/80">
                  Add API keys to your .env file to enable model selection. Supported providers:
                  REPLICATE_API_TOKEN, FAL_API_KEY, HF_API_TOKEN
                </p>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Recent models */}
              {filteredRecentModels.length > 0 && !searchQuery && (
                <div>
                  <h3 className="mb-3 text-sm font-medium text-muted-foreground">Recently Used</h3>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {filteredRecentModels.map((recent) => {
                      const model = models.find(
                        (m) => m.id === recent.id && m.provider === recent.provider
                      );
                      if (!model) return null;
                      return (
                        <ModelCard
                          key={`${recent.provider}-${recent.id}`}
                          model={model}
                          onSelect={handleSelect}
                          isRecent
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* All models */}
              <div>
                <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                  {searchQuery ? `Results for "${searchQuery}"` : 'All Models'}
                </h3>
                {models.length === 0 ? (
                  <div className="flex h-40 flex-col items-center justify-center text-muted-foreground">
                    <Sparkles className="mb-2 h-8 w-8" />
                    <p className="text-sm">No models found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {models.map((model) => (
                      <ModelCard
                        key={`${model.provider}-${model.id}`}
                        model={model}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-3">
          <p className="text-xs text-muted-foreground">
            {models.length} model{models.length !== 1 ? 's' : ''} available
          </p>
          <a
            href="https://replicate.com/explore"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Explore more on Replicate
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </>,
    document.body
  );
}

export const ModelBrowserModal = memo(ModelBrowserModalComponent);
