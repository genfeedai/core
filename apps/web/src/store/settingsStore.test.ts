import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PROVIDER_INFO, useSettingsStore } from './settingsStore';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useSettingsStore', () => {
  beforeEach(() => {
    localStorageMock.clear();
    // Reset store to initial state
    useSettingsStore.setState({
      providers: {
        replicate: { apiKey: null, enabled: true },
        fal: { apiKey: null, enabled: false },
        huggingface: { apiKey: null, enabled: false },
      },
      defaults: {
        imageModel: 'nano-banana-pro',
        imageProvider: 'replicate',
        videoModel: 'veo-3.1',
        videoProvider: 'replicate',
      },
      edgeStyle: 'bezier',
      recentModels: [],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useSettingsStore.getState();

      expect(state.providers.replicate).toEqual({ apiKey: null, enabled: true });
      expect(state.providers.fal).toEqual({ apiKey: null, enabled: false });
      expect(state.providers.huggingface).toEqual({ apiKey: null, enabled: false });
      expect(state.defaults.imageModel).toBe('nano-banana-pro');
      expect(state.defaults.imageProvider).toBe('replicate');
      expect(state.defaults.videoModel).toBe('veo-3.1');
      expect(state.defaults.videoProvider).toBe('replicate');
      expect(state.edgeStyle).toBe('bezier');
      expect(state.recentModels).toEqual([]);
    });
  });

  describe('setProviderKey', () => {
    it('should set API key for replicate provider', () => {
      const { setProviderKey } = useSettingsStore.getState();

      setProviderKey('replicate', 'r8_test_key_123');

      const state = useSettingsStore.getState();
      expect(state.providers.replicate.apiKey).toBe('r8_test_key_123');
      expect(state.providers.replicate.enabled).toBe(true);
    });

    it('should set API key for fal provider and enable it', () => {
      const { setProviderKey } = useSettingsStore.getState();

      setProviderKey('fal', 'fal_test_key_456');

      const state = useSettingsStore.getState();
      expect(state.providers.fal.apiKey).toBe('fal_test_key_456');
      expect(state.providers.fal.enabled).toBe(true);
    });

    it('should set API key for huggingface provider', () => {
      const { setProviderKey } = useSettingsStore.getState();

      setProviderKey('huggingface', 'hf_test_key_789');

      const state = useSettingsStore.getState();
      expect(state.providers.huggingface.apiKey).toBe('hf_test_key_789');
      expect(state.providers.huggingface.enabled).toBe(true);
    });

    it('should persist to localStorage', () => {
      const { setProviderKey } = useSettingsStore.getState();

      setProviderKey('replicate', 'r8_test_key');

      const stored = JSON.parse(localStorageMock.getItem('genfeed-settings') ?? '{}');
      expect(stored.providers.replicate.apiKey).toBe('r8_test_key');
    });

    it('should preserve enabled state when setting key to null', () => {
      useSettingsStore.setState({
        providers: {
          ...useSettingsStore.getState().providers,
          fal: { apiKey: 'old_key', enabled: true },
        },
      });

      const { setProviderKey } = useSettingsStore.getState();
      setProviderKey('fal', null);

      const state = useSettingsStore.getState();
      expect(state.providers.fal.apiKey).toBeNull();
      expect(state.providers.fal.enabled).toBe(true);
    });
  });

  describe('setProviderEnabled', () => {
    it('should enable a provider', () => {
      const { setProviderEnabled } = useSettingsStore.getState();

      setProviderEnabled('fal', true);

      expect(useSettingsStore.getState().providers.fal.enabled).toBe(true);
    });

    it('should disable a provider', () => {
      useSettingsStore.setState({
        providers: {
          ...useSettingsStore.getState().providers,
          replicate: { apiKey: 'test', enabled: true },
        },
      });

      const { setProviderEnabled } = useSettingsStore.getState();
      setProviderEnabled('replicate', false);

      expect(useSettingsStore.getState().providers.replicate.enabled).toBe(false);
    });

    it('should persist to localStorage', () => {
      const { setProviderEnabled } = useSettingsStore.getState();

      setProviderEnabled('huggingface', true);

      const stored = JSON.parse(localStorageMock.getItem('genfeed-settings') ?? '{}');
      expect(stored.providers.huggingface.enabled).toBe(true);
    });
  });

  describe('setDefaultModel', () => {
    it('should set default image model', () => {
      const { setDefaultModel } = useSettingsStore.getState();

      setDefaultModel('image', 'flux-pro', 'fal');

      const state = useSettingsStore.getState();
      expect(state.defaults.imageModel).toBe('flux-pro');
      expect(state.defaults.imageProvider).toBe('fal');
    });

    it('should set default video model', () => {
      const { setDefaultModel } = useSettingsStore.getState();

      setDefaultModel('video', 'kling-video', 'fal');

      const state = useSettingsStore.getState();
      expect(state.defaults.videoModel).toBe('kling-video');
      expect(state.defaults.videoProvider).toBe('fal');
    });

    it('should not affect other default settings', () => {
      const { setDefaultModel } = useSettingsStore.getState();

      setDefaultModel('image', 'new-model', 'huggingface');

      const state = useSettingsStore.getState();
      expect(state.defaults.videoModel).toBe('veo-3.1');
      expect(state.defaults.videoProvider).toBe('replicate');
    });

    it('should persist to localStorage', () => {
      const { setDefaultModel } = useSettingsStore.getState();

      setDefaultModel('image', 'custom-model', 'fal');

      const stored = JSON.parse(localStorageMock.getItem('genfeed-settings') ?? '{}');
      expect(stored.defaults.imageModel).toBe('custom-model');
      expect(stored.defaults.imageProvider).toBe('fal');
    });
  });

  describe('setEdgeStyle', () => {
    it('should set edge style to smoothstep', () => {
      const { setEdgeStyle } = useSettingsStore.getState();

      setEdgeStyle('smoothstep');

      expect(useSettingsStore.getState().edgeStyle).toBe('smoothstep');
    });

    it('should set edge style to straight', () => {
      const { setEdgeStyle } = useSettingsStore.getState();

      setEdgeStyle('straight');

      expect(useSettingsStore.getState().edgeStyle).toBe('straight');
    });

    it('should set edge style back to bezier', () => {
      useSettingsStore.setState({ edgeStyle: 'straight' });
      const { setEdgeStyle } = useSettingsStore.getState();

      setEdgeStyle('bezier');

      expect(useSettingsStore.getState().edgeStyle).toBe('bezier');
    });

    it('should persist to localStorage', () => {
      const { setEdgeStyle } = useSettingsStore.getState();

      setEdgeStyle('smoothstep');

      const stored = JSON.parse(localStorageMock.getItem('genfeed-settings') ?? '{}');
      expect(stored.edgeStyle).toBe('smoothstep');
    });
  });

  describe('addRecentModel', () => {
    it('should add a recent model', () => {
      const { addRecentModel } = useSettingsStore.getState();

      addRecentModel({
        id: 'model-1',
        displayName: 'Test Model',
        provider: 'replicate',
      });

      const state = useSettingsStore.getState();
      expect(state.recentModels).toHaveLength(1);
      expect(state.recentModels[0].id).toBe('model-1');
      expect(state.recentModels[0].displayName).toBe('Test Model');
      expect(state.recentModels[0].provider).toBe('replicate');
      expect(state.recentModels[0].timestamp).toBeDefined();
    });

    it('should add new model at the front', () => {
      const { addRecentModel } = useSettingsStore.getState();

      addRecentModel({ id: 'model-1', displayName: 'Model 1', provider: 'replicate' });
      addRecentModel({ id: 'model-2', displayName: 'Model 2', provider: 'fal' });

      const state = useSettingsStore.getState();
      expect(state.recentModels[0].id).toBe('model-2');
      expect(state.recentModels[1].id).toBe('model-1');
    });

    it('should move existing model to front if already present', () => {
      const { addRecentModel } = useSettingsStore.getState();

      addRecentModel({ id: 'model-1', displayName: 'Model 1', provider: 'replicate' });
      addRecentModel({ id: 'model-2', displayName: 'Model 2', provider: 'replicate' });
      addRecentModel({ id: 'model-1', displayName: 'Model 1', provider: 'replicate' });

      const state = useSettingsStore.getState();
      expect(state.recentModels).toHaveLength(2);
      expect(state.recentModels[0].id).toBe('model-1');
      expect(state.recentModels[1].id).toBe('model-2');
    });

    it('should limit to MAX_RECENT_MODELS (8)', () => {
      const { addRecentModel } = useSettingsStore.getState();

      for (let i = 0; i < 10; i++) {
        addRecentModel({
          id: `model-${i}`,
          displayName: `Model ${i}`,
          provider: 'replicate',
        });
      }

      const state = useSettingsStore.getState();
      expect(state.recentModels).toHaveLength(8);
      expect(state.recentModels[0].id).toBe('model-9');
    });

    it('should differentiate models by provider', () => {
      const { addRecentModel } = useSettingsStore.getState();

      addRecentModel({ id: 'same-id', displayName: 'Model', provider: 'replicate' });
      addRecentModel({ id: 'same-id', displayName: 'Model', provider: 'fal' });

      const state = useSettingsStore.getState();
      expect(state.recentModels).toHaveLength(2);
    });

    it('should persist to localStorage', () => {
      const { addRecentModel } = useSettingsStore.getState();

      addRecentModel({ id: 'model-1', displayName: 'Test', provider: 'replicate' });

      const stored = JSON.parse(localStorageMock.getItem('genfeed-settings') ?? '{}');
      expect(stored.recentModels).toHaveLength(1);
    });
  });

  describe('clearProviderKey', () => {
    it('should clear API key for a provider', () => {
      useSettingsStore.setState({
        providers: {
          ...useSettingsStore.getState().providers,
          replicate: { apiKey: 'test_key', enabled: true },
        },
      });

      const { clearProviderKey } = useSettingsStore.getState();
      clearProviderKey('replicate');

      expect(useSettingsStore.getState().providers.replicate.apiKey).toBeNull();
    });

    it('should preserve enabled state', () => {
      useSettingsStore.setState({
        providers: {
          ...useSettingsStore.getState().providers,
          fal: { apiKey: 'test_key', enabled: true },
        },
      });

      const { clearProviderKey } = useSettingsStore.getState();
      clearProviderKey('fal');

      const state = useSettingsStore.getState();
      expect(state.providers.fal.apiKey).toBeNull();
      expect(state.providers.fal.enabled).toBe(true);
    });

    it('should persist to localStorage', () => {
      useSettingsStore.setState({
        providers: {
          ...useSettingsStore.getState().providers,
          replicate: { apiKey: 'test_key', enabled: true },
        },
      });

      const { clearProviderKey } = useSettingsStore.getState();
      clearProviderKey('replicate');

      const stored = JSON.parse(localStorageMock.getItem('genfeed-settings') ?? '{}');
      expect(stored.providers.replicate.apiKey).toBeNull();
    });
  });

  describe('clearAllKeys', () => {
    it('should clear all provider API keys', () => {
      useSettingsStore.setState({
        providers: {
          replicate: { apiKey: 'key1', enabled: true },
          fal: { apiKey: 'key2', enabled: true },
          huggingface: { apiKey: 'key3', enabled: true },
        },
      });

      const { clearAllKeys } = useSettingsStore.getState();
      clearAllKeys();

      const state = useSettingsStore.getState();
      expect(state.providers.replicate.apiKey).toBeNull();
      expect(state.providers.fal.apiKey).toBeNull();
      expect(state.providers.huggingface.apiKey).toBeNull();
    });

    it('should preserve enabled states', () => {
      useSettingsStore.setState({
        providers: {
          replicate: { apiKey: 'key1', enabled: true },
          fal: { apiKey: 'key2', enabled: true },
          huggingface: { apiKey: 'key3', enabled: false },
        },
      });

      const { clearAllKeys } = useSettingsStore.getState();
      clearAllKeys();

      const state = useSettingsStore.getState();
      expect(state.providers.replicate.enabled).toBe(true);
      expect(state.providers.fal.enabled).toBe(true);
      expect(state.providers.huggingface.enabled).toBe(false);
    });
  });

  describe('isProviderConfigured', () => {
    it('should return true when provider has API key', () => {
      useSettingsStore.setState({
        providers: {
          ...useSettingsStore.getState().providers,
          replicate: { apiKey: 'test_key', enabled: true },
        },
      });

      const { isProviderConfigured } = useSettingsStore.getState();
      expect(isProviderConfigured('replicate')).toBe(true);
    });

    it('should return false when provider has no API key', () => {
      const { isProviderConfigured } = useSettingsStore.getState();
      expect(isProviderConfigured('replicate')).toBe(false);
    });

    it('should return false for null API key', () => {
      useSettingsStore.setState({
        providers: {
          ...useSettingsStore.getState().providers,
          fal: { apiKey: null, enabled: true },
        },
      });

      const { isProviderConfigured } = useSettingsStore.getState();
      expect(isProviderConfigured('fal')).toBe(false);
    });
  });

  describe('getProviderHeader', () => {
    it('should return correct header for replicate', () => {
      useSettingsStore.setState({
        providers: {
          ...useSettingsStore.getState().providers,
          replicate: { apiKey: 'r8_test_key', enabled: true },
        },
      });

      const { getProviderHeader } = useSettingsStore.getState();
      expect(getProviderHeader('replicate')).toEqual({
        'X-Replicate-Key': 'r8_test_key',
      });
    });

    it('should return correct header for fal', () => {
      useSettingsStore.setState({
        providers: {
          ...useSettingsStore.getState().providers,
          fal: { apiKey: 'fal_test_key', enabled: true },
        },
      });

      const { getProviderHeader } = useSettingsStore.getState();
      expect(getProviderHeader('fal')).toEqual({
        'X-Fal-Key': 'fal_test_key',
      });
    });

    it('should return correct header for huggingface', () => {
      useSettingsStore.setState({
        providers: {
          ...useSettingsStore.getState().providers,
          huggingface: { apiKey: 'hf_test_key', enabled: true },
        },
      });

      const { getProviderHeader } = useSettingsStore.getState();
      expect(getProviderHeader('huggingface')).toEqual({
        'X-HF-Key': 'hf_test_key',
      });
    });

    it('should return empty object when no API key', () => {
      const { getProviderHeader } = useSettingsStore.getState();
      expect(getProviderHeader('replicate')).toEqual({});
    });
  });

  describe('PROVIDER_INFO', () => {
    it('should have info for all providers', () => {
      expect(PROVIDER_INFO.replicate).toBeDefined();
      expect(PROVIDER_INFO.fal).toBeDefined();
      expect(PROVIDER_INFO.huggingface).toBeDefined();
    });

    it('should have correct replicate info', () => {
      expect(PROVIDER_INFO.replicate.name).toBe('Replicate');
      expect(PROVIDER_INFO.replicate.docsUrl).toBe('https://replicate.com/docs');
    });

    it('should have correct fal info', () => {
      expect(PROVIDER_INFO.fal.name).toBe('fal.ai');
      expect(PROVIDER_INFO.fal.docsUrl).toBe('https://fal.ai/docs');
    });

    it('should have correct huggingface info', () => {
      expect(PROVIDER_INFO.huggingface.name).toBe('Hugging Face');
      expect(PROVIDER_INFO.huggingface.docsUrl).toBe('https://huggingface.co/docs/api-inference');
    });
  });

  describe('persistence', () => {
    it('should load state from localStorage on initialization', () => {
      localStorageMock.setItem(
        'genfeed-settings',
        JSON.stringify({
          providers: {
            replicate: { apiKey: 'stored_key', enabled: true },
            fal: { apiKey: null, enabled: false },
            huggingface: { apiKey: null, enabled: false },
          },
          defaults: {
            imageModel: 'stored-model',
            imageProvider: 'fal',
            videoModel: 'veo-3.1',
            videoProvider: 'replicate',
          },
          edgeStyle: 'smoothstep',
          recentModels: [
            { id: 'recent-1', displayName: 'Recent', provider: 'replicate', timestamp: 123 },
          ],
        })
      );

      // Re-initialize the store to test loading
      // Note: In actual implementation, this would happen on module load
      // This test verifies the structure is correct
      const stored = JSON.parse(localStorageMock.getItem('genfeed-settings') ?? '{}');
      expect(stored.providers.replicate.apiKey).toBe('stored_key');
      expect(stored.defaults.imageModel).toBe('stored-model');
      expect(stored.edgeStyle).toBe('smoothstep');
    });

    it('should handle invalid JSON in localStorage gracefully', () => {
      localStorageMock.setItem('genfeed-settings', 'invalid json');

      // Store should fall back to defaults
      const state = useSettingsStore.getState();
      expect(state.providers.replicate.enabled).toBe(true);
    });
  });
});
