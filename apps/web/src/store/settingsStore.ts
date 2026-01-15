import { create } from 'zustand';

// =============================================================================
// TYPES
// =============================================================================

export type ProviderType = 'replicate' | 'fal' | 'huggingface';
export type EdgeStyle = 'bezier' | 'smoothstep' | 'straight';

export interface ProviderConfig {
  apiKey: string | null;
  enabled: boolean;
}

export interface ProviderSettings {
  replicate: ProviderConfig;
  fal: ProviderConfig;
  huggingface: ProviderConfig;
}

export interface DefaultModelSettings {
  imageModel: string;
  imageProvider: ProviderType;
  videoModel: string;
  videoProvider: ProviderType;
}

export interface RecentModel {
  id: string;
  displayName: string;
  provider: ProviderType;
  timestamp: number;
}

interface SettingsStore {
  // Provider API Keys
  providers: ProviderSettings;

  // Default Models
  defaults: DefaultModelSettings;

  // UI Preferences
  edgeStyle: EdgeStyle;

  // Recent models (for model browser)
  recentModels: RecentModel[];

  // Actions
  setProviderKey: (provider: ProviderType, key: string | null) => void;
  setProviderEnabled: (provider: ProviderType, enabled: boolean) => void;
  setDefaultModel: (type: 'image' | 'video', model: string, provider: ProviderType) => void;
  setEdgeStyle: (style: EdgeStyle) => void;
  addRecentModel: (model: Omit<RecentModel, 'timestamp'>) => void;
  clearProviderKey: (provider: ProviderType) => void;
  clearAllKeys: () => void;

  // Computed
  isProviderConfigured: (provider: ProviderType) => boolean;
  getProviderHeader: (provider: ProviderType) => Record<string, string>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEY = 'genfeed-settings';
const MAX_RECENT_MODELS = 8;

const DEFAULT_SETTINGS = {
  providers: {
    replicate: { apiKey: null, enabled: true },
    fal: { apiKey: null, enabled: false },
    huggingface: { apiKey: null, enabled: false },
  },
  defaults: {
    imageModel: 'nano-banana-pro',
    imageProvider: 'replicate' as ProviderType,
    videoModel: 'veo-3.1',
    videoProvider: 'replicate' as ProviderType,
  },
  edgeStyle: 'bezier' as EdgeStyle,
  recentModels: [] as RecentModel[],
};

// =============================================================================
// PERSISTENCE
// =============================================================================

function loadFromStorage(): Partial<typeof DEFAULT_SETTINGS> {
  if (typeof window === 'undefined') return {};

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        providers: { ...DEFAULT_SETTINGS.providers, ...parsed.providers },
        defaults: { ...DEFAULT_SETTINGS.defaults, ...parsed.defaults },
        edgeStyle: parsed.edgeStyle ?? DEFAULT_SETTINGS.edgeStyle,
        recentModels: parsed.recentModels ?? [],
      };
    }
  } catch {
    // Invalid JSON or storage error
  }
  return {};
}

function saveToStorage(state: {
  providers: ProviderSettings;
  defaults: DefaultModelSettings;
  edgeStyle: EdgeStyle;
  recentModels: RecentModel[];
}) {
  if (typeof window === 'undefined') return;

  try {
    // Don't persist API keys in plain text - only enabled status and non-sensitive settings
    const toSave = {
      providers: {
        replicate: {
          apiKey: state.providers.replicate.apiKey,
          enabled: state.providers.replicate.enabled,
        },
        fal: {
          apiKey: state.providers.fal.apiKey,
          enabled: state.providers.fal.enabled,
        },
        huggingface: {
          apiKey: state.providers.huggingface.apiKey,
          enabled: state.providers.huggingface.enabled,
        },
      },
      defaults: state.defaults,
      edgeStyle: state.edgeStyle,
      recentModels: state.recentModels.slice(0, MAX_RECENT_MODELS),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // Storage error (quota exceeded, etc.)
  }
}

// =============================================================================
// STORE
// =============================================================================

const initialState = { ...DEFAULT_SETTINGS, ...loadFromStorage() };

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  providers: initialState.providers,
  defaults: initialState.defaults,
  edgeStyle: initialState.edgeStyle,
  recentModels: initialState.recentModels,

  setProviderKey: (provider, key) => {
    set((state) => {
      const newState = {
        providers: {
          ...state.providers,
          [provider]: {
            ...state.providers[provider],
            apiKey: key,
            enabled: key ? true : state.providers[provider].enabled,
          },
        },
      };
      saveToStorage({ ...state, ...newState });
      return newState;
    });
  },

  setProviderEnabled: (provider, enabled) => {
    set((state) => {
      const newState = {
        providers: {
          ...state.providers,
          [provider]: {
            ...state.providers[provider],
            enabled,
          },
        },
      };
      saveToStorage({ ...state, ...newState });
      return newState;
    });
  },

  setDefaultModel: (type, model, provider) => {
    set((state) => {
      const newState = {
        defaults: {
          ...state.defaults,
          ...(type === 'image'
            ? { imageModel: model, imageProvider: provider }
            : { videoModel: model, videoProvider: provider }),
        },
      };
      saveToStorage({ ...state, ...newState });
      return newState;
    });
  },

  setEdgeStyle: (style) => {
    set((state) => {
      const newState = { edgeStyle: style };
      saveToStorage({ ...state, ...newState });
      return newState;
    });
  },

  addRecentModel: (model) => {
    set((state) => {
      // Remove existing entry for same model
      const filtered = state.recentModels.filter(
        (m) => !(m.id === model.id && m.provider === model.provider)
      );
      // Add to front with timestamp
      const newRecentModels = [{ ...model, timestamp: Date.now() }, ...filtered].slice(
        0,
        MAX_RECENT_MODELS
      );

      const newState = { recentModels: newRecentModels };
      saveToStorage({ ...state, ...newState });
      return newState;
    });
  },

  clearProviderKey: (provider) => {
    set((state) => {
      const newState = {
        providers: {
          ...state.providers,
          [provider]: {
            ...state.providers[provider],
            apiKey: null,
          },
        },
      };
      saveToStorage({ ...state, ...newState });
      return newState;
    });
  },

  clearAllKeys: () => {
    set((state) => {
      const newState = {
        providers: {
          replicate: { ...state.providers.replicate, apiKey: null },
          fal: { ...state.providers.fal, apiKey: null },
          huggingface: { ...state.providers.huggingface, apiKey: null },
        },
      };
      saveToStorage({ ...state, ...newState });
      return newState;
    });
  },

  isProviderConfigured: (provider) => {
    const state = get();
    return !!state.providers[provider].apiKey;
  },

  getProviderHeader: (provider) => {
    const state = get();
    const key = state.providers[provider].apiKey;
    if (!key) return {};

    const headerMap: Record<ProviderType, string> = {
      replicate: 'X-Replicate-Key',
      fal: 'X-Fal-Key',
      huggingface: 'X-HF-Key',
    };

    return { [headerMap[provider]]: key };
  },
}));

// =============================================================================
// PROVIDER DISPLAY INFO
// =============================================================================

export const PROVIDER_INFO: Record<
  ProviderType,
  { name: string; description: string; docsUrl: string }
> = {
  replicate: {
    name: 'Replicate',
    description: 'Access thousands of open-source AI models',
    docsUrl: 'https://replicate.com/docs',
  },
  fal: {
    name: 'fal.ai',
    description: 'Fast inference for image and video generation',
    docsUrl: 'https://fal.ai/docs',
  },
  huggingface: {
    name: 'Hugging Face',
    description: 'The AI community platform with 500k+ models',
    docsUrl: 'https://huggingface.co/docs/api-inference',
  },
};
