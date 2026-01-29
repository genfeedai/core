import type { ICreatePrompt, IPrompt, IQueryPrompts, PromptCategory } from '@genfeedai/types';
import { create } from 'zustand';
import { promptsApi } from '@/lib/api';
import { logger } from '@/lib/logger';

interface PromptLibraryStore {
  // State
  items: IPrompt[];
  featuredItems: IPrompt[];
  selectedItem: IPrompt | null;
  isLoading: boolean;
  error: string | null;

  // Filters
  searchQuery: string;
  categoryFilter: PromptCategory | null;

  // Quick picker state (for dropdown in nodes)
  isPickerOpen: boolean;

  // Modal state
  isCreateModalOpen: boolean;
  editingItem: IPrompt | null;

  // Actions - UI
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: PromptCategory | null) => void;
  setSelectedItem: (item: IPrompt | null) => void;
  openPicker: () => void;
  closePicker: () => void;
  openCreateModal: (editItem?: IPrompt) => void;
  closeCreateModal: () => void;

  // Actions - API
  loadItems: (query?: IQueryPrompts, signal?: AbortSignal) => Promise<void>;
  loadFeatured: (signal?: AbortSignal) => Promise<void>;
  createItem: (data: ICreatePrompt, signal?: AbortSignal) => Promise<IPrompt>;
  updateItem: (id: string, data: Partial<ICreatePrompt>, signal?: AbortSignal) => Promise<IPrompt>;
  deleteItem: (id: string, signal?: AbortSignal) => Promise<void>;
  duplicateItem: (id: string, signal?: AbortSignal) => Promise<IPrompt>;
  recordItemUsage: (id: string, signal?: AbortSignal) => Promise<IPrompt>;
}

export const usePromptLibraryStore = create<PromptLibraryStore>((set, get) => ({
  // Initial state
  items: [],
  featuredItems: [],
  selectedItem: null,
  isLoading: false,
  error: null,
  searchQuery: '',
  categoryFilter: null,
  isPickerOpen: false,
  isCreateModalOpen: false,
  editingItem: null,

  // UI Actions
  setSearchQuery: (query) => set({ searchQuery: query }),

  setCategoryFilter: (category) => set({ categoryFilter: category }),

  setSelectedItem: (item) => set({ selectedItem: item }),

  openPicker: () => set({ isPickerOpen: true }),

  closePicker: () => set({ isPickerOpen: false }),

  openCreateModal: (editItem) =>
    set({
      isCreateModalOpen: true,
      editingItem: editItem ?? null,
    }),

  closeCreateModal: () =>
    set({
      isCreateModalOpen: false,
      editingItem: null,
    }),

  // API Actions
  loadItems: async (query, signal) => {
    set({ isLoading: true, error: null });
    try {
      const { searchQuery, categoryFilter } = get();
      const finalQuery: IQueryPrompts = {
        ...query,
        search: query?.search ?? (searchQuery || undefined),
        category: query?.category ?? categoryFilter ?? undefined,
      };
      const items = await promptsApi.getAll(finalQuery, signal);
      set({ items, isLoading: false });
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        set({ error: (error as Error).message, isLoading: false });
      }
    }
  },

  loadFeatured: async (signal) => {
    try {
      const featuredItems = await promptsApi.getFeatured(10, signal);
      set({ featuredItems });
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        logger.error('Failed to load featured items', error, { context: 'promptLibraryStore' });
      }
    }
  },

  createItem: async (data, signal) => {
    set({ isLoading: true, error: null });
    try {
      const item = await promptsApi.create(data, signal);
      set((state) => ({
        items: [item, ...state.items],
        isLoading: false,
        isCreateModalOpen: false,
        editingItem: null,
      }));
      return item;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  updateItem: async (id, data, signal) => {
    set({ isLoading: true, error: null });
    try {
      const item = await promptsApi.update(id, data, signal);
      set((state) => ({
        items: state.items.map((i) => (i._id === id ? item : i)),
        selectedItem: state.selectedItem?._id === id ? item : state.selectedItem,
        isLoading: false,
        isCreateModalOpen: false,
        editingItem: null,
      }));
      return item;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  deleteItem: async (id, signal) => {
    try {
      await promptsApi.delete(id, signal);
      set((state) => ({
        items: state.items.filter((i) => i._id !== id),
        selectedItem: state.selectedItem?._id === id ? null : state.selectedItem,
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  duplicateItem: async (id, signal) => {
    try {
      const item = await promptsApi.duplicate(id, signal);
      set((state) => ({
        items: [item, ...state.items],
      }));
      return item;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  recordItemUsage: async (id, signal) => {
    try {
      const item = await promptsApi.use(id, signal);
      set((state) => ({
        items: state.items.map((i) => (i._id === id ? item : i)),
        isPickerOpen: false,
      }));
      return item;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },
}));
